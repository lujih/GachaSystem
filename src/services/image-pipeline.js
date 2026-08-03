/**
 * 图片管道：图源拉取 → 压缩 → R2 上传 → KV buffer 缓存 → 黑名单防重
 * 机制（保留自旧 GachaService）：
 * - 每稀有度 5 个 KV slot 预缓存，消费时"最旧 3 选 1 随机"
 * - D1 buffer_claims INSERT ON CONFLICT 作原子锁防并发重复发图
 * - 消费后写黑名单（10 分钟）并后台 refill
 */
import { CONFIG } from '../config/index.js';

async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export class ImagePipeline {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  async hashString(str) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  /**
   * 拉取图源并上传 R2。wsrv.nl 压缩失败时降级直传原图。
   * @returns {{success: boolean, imageUrl?: string, rarity?: string, sourceName?: string}}
   */
  async fetchAndUpload(source) {
    try {
      let requestUrl = source.url;
      try { new URL(source.url); } catch { requestUrl = encodeURI(source.url); }

      const initRes = await fetch(requestUrl, { method: 'GET', redirect: 'follow' });
      const contentType = initRes.headers.get('content-type') || '';
      let finalUrl = source.url;

      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        try {
          const data = await initRes.json();
          finalUrl = data.url || data.img || data.image || data.data ||
            data.text || data.msg || data.result ||
            (data.data && (data.data.url || data.data.img || data.data[0])) ||
            (Array.isArray(data.data) && data.data[0]?.url) || source.url;
        } catch {
          finalUrl = initRes.url;
        }
      } else {
        finalUrl = initRes.url;
      }
      if (!finalUrl || finalUrl === 'null' || finalUrl === 'undefined') {
        return { success: false, rarity: source.rarity, imageUrl: null };
      }

      // 尝试 wsrv.nl 压缩转 webp
      const compressedUrl = `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&q=75&w=1200&il`;
      let buffer;
      let filename;
      let r2ContentType = 'image/webp';
      let compressed = true;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const imgRes = await fetch(compressedUrl, { signal: controller.signal });
        if (imgRes.ok) {
          const ab = await imgRes.arrayBuffer();
          if (ab.byteLength >= 100) {
            buffer = ab;
            const hashStr = await calculateHash(ab);
            filename = `images/${source.rarity}_${hashStr}.webp`;
          }
        }
      } catch { /* fallthrough to original */ }
      clearTimeout(timeout);

      if (!buffer) {
        // 降级：直传原图
        compressed = false;
        const origRes = await fetch(finalUrl, { redirect: 'follow' });
        if (!origRes.ok) throw new Error('Original fetch failed');
        buffer = await origRes.arrayBuffer();
        if (buffer.byteLength < 100) throw new Error('Image too small');
        const ext = (origRes.headers.get('content-type') || 'image/jpeg').split('/')[1] || 'jpg';
        r2ContentType = `image/${ext === 'jpeg' ? 'jpeg' : ext}`;
        const hashStr = await calculateHash(buffer);
        filename = `images/${source.rarity}_${hashStr}.${ext === 'jpeg' ? 'jpg' : ext}`;
      }

      await this.env.R2_BUCKET.put(filename, buffer, {
        httpMetadata: { contentType: r2ContentType, cacheControl: `public, max-age=${CONFIG.TTL.STATIC_ASSET}, immutable` },
      });

      return {
        success: true,
        imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`,
        rarity: source.rarity,
        sourceName: source.name,
        compressed,
      };
    } catch (e) {
      console.error('[ImagePipeline] fetch/compress error:', e);
    }
    return { success: false, rarity: source.rarity, imageUrl: null };
  }

  async fetchAndUploadWithFallback(source) {
    const result = await this.fetchAndUpload(source);
    if (result.success) return result;
    const fallbacks = (CONFIG.FALLBACK_SOURCES || []).filter(s => s.rarity === source.rarity);
    for (const fb of fallbacks) {
      try {
        const r = await this.fetchAndUpload({ ...fb, name: 'Fallback' });
        if (r.success) return r;
      } catch (e) { console.warn(`[Fallback] ${fb.url} failed:`, e.message); }
    }
    return result;
  }

  async preReadBufferSlots(rarity) {
    const slotCount = CONFIG.TTL.BUFFER_SLOTS;
    const reads = Array.from({ length: slotCount }, (_, i) =>
      this.env.KV_CACHE.get(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${i}`, { type: 'json' })
        .then(cached => cached?.success ? { index: i, asset: cached, lastUsed: cached.lastUsed || 0 } : null)
    );
    return (await Promise.all(reads)).filter(Boolean);
  }

  async tryClaimBufferSlot(urlHash, rarity, slotIndex, now) {
    try {
      const result = await this.env.DB.prepare(
        'INSERT INTO buffer_claims (url_hash, rarity, slot_index, claimed_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING'
      ).bind(urlHash, rarity, slotIndex, now).run();
      return result.meta.changes > 0;
    } catch (e) {
      console.warn('[Buffer] D1 claim failed, proceeding without lock:', e.message);
      return true;
    }
  }

  async cleanupStaleClaims() {
    try {
      const cutoff = Date.now() - 600000;
      await this.env.DB.prepare('DELETE FROM buffer_claims WHERE claimed_at < ?').bind(cutoff).run();
    } catch (e) { console.warn('[Buffer] Cleanup failed:', e.message); }
  }

  async safeRefillBuffer(rarity, sourceList, slotIndex) {
    try {
      const asset = await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]);
      if (asset.success) {
        const idx = slotIndex !== undefined ? slotIndex : Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
        await this.env.KV_CACHE.put(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${idx}`, JSON.stringify(asset), { expirationTtl: CONFIG.TTL.STATIC_ASSET });
      }
    } catch (e) { console.error(`[Refill Error] ${rarity}:`, e); }
  }

  /** 标准消费：读 slots → 黑名单过滤 → 最旧3选1 → 原子锁 → 黑名单 → refill */
  async consumeBuffer(rarity, sourceList) {
    const now = Date.now();
    const slots = await this.preReadBufferSlots(rarity);

    const blacklistChecks = slots.map(async (slot) => {
      if (!slot.asset.imageUrl) return null;
      const urlHash = await this.hashString(slot.asset.imageUrl);
      slot._urlHash = urlHash;
      const blacklisted = await this.env.KV_CACHE.get(`${CONFIG.KEYS.DRAW_BLACKLIST}${rarity}:${urlHash}`);
      return blacklisted ? null : slot;
    });
    const filteredSlots = (await Promise.all(blacklistChecks)).filter(Boolean);

    let selectedSlot;
    if (filteredSlots.length > 0) {
      filteredSlots.sort((a, b) => a.lastUsed - b.lastUsed);
      const oldestSlots = filteredSlots.slice(0, Math.min(3, filteredSlots.length));
      selectedSlot = oldestSlots[Math.floor(Math.random() * oldestSlots.length)];
    }

    if (!selectedSlot || !selectedSlot.asset.success) {
      selectedSlot = { asset: await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]), index: -1 };
    }

    if (selectedSlot.asset.imageUrl && selectedSlot.index >= 0) {
      const urlHash = selectedSlot._urlHash || await this.hashString(selectedSlot.asset.imageUrl);
      if (!(await this.tryClaimBufferSlot(urlHash, rarity, selectedSlot.index, now))) {
        selectedSlot = { asset: await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]), index: -1 };
        return selectedSlot.asset;
      }
      await this.env.KV_CACHE.put(`${CONFIG.KEYS.DRAW_BLACKLIST}${rarity}:${urlHash}`, now.toString(), { expirationTtl: CONFIG.TTL.BLACKLIST_TTL });
      selectedSlot.asset.lastUsed = now;
      await this.env.KV_CACHE.put(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${selectedSlot.index}`, JSON.stringify(selectedSlot.asset), { expirationTtl: CONFIG.TTL.BUFFER });
    }

    if (selectedSlot.index >= 0) {
      this.safeWaitUntil(this.safeRefillBuffer(rarity, sourceList, selectedSlot.index));
    }
    this.safeWaitUntil(this.cleanupStaleClaims());
    return selectedSlot.asset;
  }

  /** 十连快速路径：跳过黑名单检查，从预读 slots 中取一个 */
  consumeSlot(slots, sourceList) {
    if (slots.length > 0) {
      slots.sort((a, b) => a.lastUsed - b.lastUsed);
      const slot = slots.shift();
      return { ...slot.asset, success: true };
    }
    return { success: false, imageUrl: null, rarity: sourceList[0]?.rarity || 'N', sourceName: 'Buffer' };
  }
}
