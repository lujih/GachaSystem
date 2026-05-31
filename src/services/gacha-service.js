/**
 * 抽卡服务类
 * 
 * 新增功能（2026-04-02）:
 * - 保底机制（SSR 50 抽保底、UR 500 抽保底）
 * - 多连抽（十连抽）
 * - 抽卡历史记录
 * - Rate Limiting（注册防刷 + 骰子冷却）
 * - 图片源 fallback（主源失败自动切换备用）
 */

import { CONFIG, TECHNICAL_CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { getBeijingISOString } from '../utils/time.js';

// 辅助函数
export { arrayBufferToBase64, calculateHash, uploadToGithub, updateLeaderboard, updateGalleryIndex };
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function updateLeaderboard(env, newItem) {
  if (!env.RECENT_REQUESTS) return;
  const key = CONFIG.KEYS.LEADERBOARD;
  let list = [];
  try {
    const cached = await env.RECENT_REQUESTS.get(key);
    if (cached) list = JSON.parse(cached);
  } catch (e) {}
  list.unshift(newItem);
  if (list.length > 50) list = list.slice(0, 50);
  await env.RECENT_REQUESTS.put(key, JSON.stringify(list), { expirationTtl: CONFIG.TTL.LEADERBOARD });
}

async function updateGalleryIndex(env, newItem) {
  try {
    const ts = typeof newItem.ts === 'string' ? Date.parse(newItem.ts) : newItem.ts;
    await env.DB.prepare(
      'INSERT INTO gallery (url, user_id, username, rarity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(url) DO UPDATE SET user_id = excluded.user_id, username = excluded.username, rarity = excluded.rarity, source_name = excluded.source_name, created_at = excluded.created_at'
    ).bind(newItem.url, newItem.userId, newItem.username, newItem.rarity || 'N', newItem.sourceName || null, ts).run();
  } catch (e) {
    console.error('Gallery D1 error:', e);
  }
}

async function uploadToGithub(env, path, content, extension, message) {
  try {
    const githubToken = env.GITHUB_TOKEN;
    const repoOwner = env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER;
    const repoName = env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO;
    if (!githubToken) return { error: 'GitHub Token 未配置，请在 CF 后台环境变量中设置 GITHUB_TOKEN' };

    let base64Content;
    try { base64Content = arrayBufferToBase64(content); } catch (e) {
      return { error: '图片编码处理失败，请更换其他图片' };
    }

    const apiUrl = `${TECHNICAL_CONFIG.GITHUB.API_BASE}/repos/${repoOwner}/${repoName}/contents/${path}`;
    const requestBody = { message, content: base64Content, branch: TECHNICAL_CONFIG.GITHUB.BRANCH };
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Gacha-System'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[GitHub Upload] API Error:', response.status, response.statusText, errText);
      return { error: `GitHub API 错误: ${response.status}` };
    }

    const data = await response.json();
    const cdnUrl = `${TECHNICAL_CONFIG.GITHUB.CDN_BASE}/${repoOwner}/${repoName}/${TECHNICAL_CONFIG.GITHUB.BRANCH}/${path}`;
    console.log(`[GitHub Upload] Success: ${cdnUrl}`);
    return { success: true, url: cdnUrl };
  } catch (e) {
    console.error('[GitHub Upload] Error:', e);
    return { error: '上传失败，请稍后重试' };
  }
}

export class GachaService {
  constructor(env, ctx = null, userService = null) {
    this.env = env;
    this.ctx = ctx;
    this.userService = userService;
  }

  async safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else await promise;
  }

  // ==================== Rate Limiting ====================
  async checkRateLimit(key, limit, windowSeconds) {
    if (!this.env.KV_CACHE) return false;
    try {
      const value = await this.env.KV_CACHE.get(`rl:${key}`);
      const now = Date.now();
      if (value) {
        const { count, resetAt } = JSON.parse(value);
        if (now < resetAt) return count >= limit;
      }
      await this.env.KV_CACHE.put(`rl:${key}`, JSON.stringify({ count: 1, resetAt: now + windowSeconds * 1000 }), { expirationTtl: windowSeconds });
      return false;
    } catch { return false; }
  }

  async checkDiceCooldown(userId) {
    return this.checkRateLimit(`dice:${userId}`, 1, (CONFIG.GAME.DICE.COOLDOWN_MS || 3000) / 1000);
  }

  async checkRegisterRateLimit(ip) {
    return this.checkRateLimit(`reg:${ip || 'unknown'}`, 3, 600);
  }

  // ==================== 保底计数器 ====================
  async getPityCounters(userId) {
    if (!this.env.KV_CACHE) return { ssrPity: 0, urPity: 0 };
    try {
      const [ssr, ur] = await Promise.all([
        this.env.KV_CACHE.get(`pity:ssr:${userId}`),
        this.env.KV_CACHE.get(`pity:ur:${userId}`)
      ]);
      return {
        ssrPity: parseInt(ssr || '0', 10),
        urPity: parseInt(ur || '0', 10)
      };
    } catch { return { ssrPity: 0, urPity: 0 }; }
  }

  async updatePityCounters(userId, rarity, current = null) {
    if (!this.env.KV_CACHE) return;
    try {
      let ssrPity, urPity;
      if (current) {
        ssrPity = current.ssrPity + 1;
        urPity = current.urPity + 1;
      } else {
        ssrPity = parseInt(await this.env.KV_CACHE.get(`pity:ssr:${userId}`) || '0', 10) + 1;
        urPity = parseInt(await this.env.KV_CACHE.get(`pity:ur:${userId}`) || '0', 10) + 1;
      }
      if (rarity === 'SSR' || rarity === 'UR') ssrPity = 0;
      if (rarity === 'UR') urPity = 0;
      await Promise.all([
        this.env.KV_CACHE.put(`pity:ssr:${userId}`, String(ssrPity), { expirationTtl: 86400 * 7 }),
        this.env.KV_CACHE.put(`pity:ur:${userId}`, String(urPity), { expirationTtl: 86400 * 7 })
      ]);
    } catch (e) { console.error('[Pity] update counters failed:', e); }
  }

  applyPity(rarity, ssrPity, urPity) {
    const ssrAt = CONFIG.PITY.SSR.at;
    const urAt = CONFIG.PITY.UR.at;
    if (urAt > 0 && urPity >= urAt) return { rarity: 'UR', isPity: true };
    if (ssrAt > 0 && ssrPity >= ssrAt) return { rarity: 'SSR', isPity: true };
    return { rarity, isPity: false };
  }

  // ==================== 图片源 Fallback ====================
  async fetchAndUploadWithFallback(source) {
    const result = await this.fetchAndUpload(source);
    if (result.success) return result;
    const fallbacks = (CONFIG.FALLBACK_SOURCES || []).filter(s => s.rarity === source.rarity);
    for (const fb of fallbacks) {
      try {
        console.log(`[Fallback] Trying ${fb.url} for ${source.rarity}`);
        const result = await this.fetchAndUpload({ ...fb, name: 'Fallback' });
        if (result.success) return result;
      } catch (e) { console.warn(`[Fallback] ${fb.url} failed:`, e.message); }
    }
    return result;
  }

  // ==================== Global Buffer ====================
  async safeRefillGlobalBuffer(rarity, sourceList, slotIndex) {
    try {
      const asset = await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]);
      if (asset.success) {
        const idx = slotIndex !== undefined ? slotIndex : Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
        await this.env.KV_CACHE.put(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${idx}`, JSON.stringify(asset), { expirationTtl: CONFIG.TTL.STATIC_ASSET });
      }
    } catch (e) { console.error(`[Refill Error] ${rarity}:`, e); }
  }

  async consumeGlobalBuffer(rarity, sourceList) {
    const now = Date.now();
    const slotCount = CONFIG.TTL.BUFFER_SLOTS;
    const bufferPrefix = CONFIG.KEYS.BUFFER_PREFIX;
    const blacklistPrefix = CONFIG.KEYS.DRAW_BLACKLIST;

    // 并行读取所有 buffer slot
    const slotReads = Array.from({ length: slotCount }, (_, i) =>
      this.env.KV_CACHE.get(`${bufferPrefix}${rarity}:${i}`, { type: 'json' })
        .then(cached => cached?.success ? { index: i, asset: cached, lastUsed: cached.lastUsed || 0 } : null)
    );
    const slots = (await Promise.all(slotReads)).filter(Boolean);

    // 并行检查黑名单，缓存hash避免重复计算
    const blacklistChecks = slots.map(async (slot) => {
      if (!slot.asset.imageUrl) return null;
      const urlHash = await this.hashString(slot.asset.imageUrl);
      slot._urlHash = urlHash;
      const blacklisted = await this.env.KV_CACHE.get(`${blacklistPrefix}${rarity}:${urlHash}`);
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
      await this.env.KV_CACHE.put(`${blacklistPrefix}${rarity}:${urlHash}`, now.toString(), { expirationTtl: CONFIG.TTL.BLACKLIST_TTL });
      selectedSlot.asset.lastUsed = now;
      await this.env.KV_CACHE.put(`${bufferPrefix}${rarity}:${selectedSlot.index}`, JSON.stringify(selectedSlot.asset), { expirationTtl: CONFIG.TTL.BUFFER });
    }

    this.safeWaitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, selectedSlot.index));
    return selectedSlot.asset;
  }

  // 预读指定稀有度的所有 buffer slots（十连抽优化：同稀有度只读一次）
  async preReadBufferSlots(rarity) {
    const slotCount = CONFIG.TTL.BUFFER_SLOTS;
    const bufferPrefix = CONFIG.KEYS.BUFFER_PREFIX;
    const reads = Array.from({ length: slotCount }, (_, i) =>
      this.env.KV_CACHE.get(`${bufferPrefix}${rarity}:${i}`, { type: 'json' })
        .then(cached => cached?.success ? { index: i, asset: cached, lastUsed: cached.lastUsed || 0 } : null)
    );
    return (await Promise.all(reads)).filter(Boolean);
  }

  // consumeGlobalBuffer 的快速路径：跳过 buffer slot 读取（十连抽优化）
  async consumeGlobalBufferFast(rarity, sourceList, preReadSlots) {
    const now = Date.now();
    const blacklistPrefix = CONFIG.KEYS.DRAW_BLACKLIST;
    const bufferPrefix = CONFIG.KEYS.BUFFER_PREFIX;

    const blacklistChecks = preReadSlots.map(async (slot) => {
      if (!slot.asset.imageUrl) return null;
      const urlHash = await this.hashString(slot.asset.imageUrl);
      slot._urlHash = urlHash;
      const blacklisted = await this.env.KV_CACHE.get(`${blacklistPrefix}${rarity}:${urlHash}`);
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
      await this.env.KV_CACHE.put(`${blacklistPrefix}${rarity}:${urlHash}`, now.toString(), { expirationTtl: CONFIG.TTL.BLACKLIST_TTL });
      selectedSlot.asset.lastUsed = now;
      await this.env.KV_CACHE.put(`${bufferPrefix}${rarity}:${selectedSlot.index}`, JSON.stringify(selectedSlot.asset), { expirationTtl: CONFIG.TTL.BUFFER });
    }

    this.safeWaitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, selectedSlot.index));
    return selectedSlot.asset;
  }

  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  async fetchAndUploadRandom(sourceList) {
    return await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]);
  }

  async fetchAndUpload(source) {
    try {
      console.log('[fetchAndUpload] Fetching from:', source.url);
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
        } catch (e) {
          console.log('[fetchAndUpload] JSON parse error:', e);
          finalUrl = initRes.url;
        }
      } else {
        finalUrl = initRes.url;
      }
      if (!finalUrl || finalUrl === 'null' || finalUrl === 'undefined') {
        return { success: false, rarity: 'N', imageUrl: null };
      }
      console.log('[fetchAndUpload] URL:', finalUrl);

      const compressedUrl = `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&q=75&w=1200&il`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const imgRes = await fetch(compressedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (imgRes.ok) {
        const compressedBuffer = await imgRes.arrayBuffer();
        if (compressedBuffer.byteLength < 100) throw new Error('Compressed image too small');
        const hashStr = await calculateHash(compressedBuffer);
        const filename = `images/${source.rarity}_${hashStr}.webp`;
        await this.env.R2_BUCKET.put(filename, compressedBuffer, {
          httpMetadata: { contentType: 'image/webp', cacheControl: `public, max-age=${CONFIG.TTL.STATIC_ASSET}, immutable` }
        });
        return {
          success: true,
          imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`,
          rarity: source.rarity,
          sourceName: source.name
        };
      }
    } catch (e) {
      console.error('Fetch/Compress Error:', e);
    }
    return { success: false, rarity: 'N', imageUrl: null };
  }

  calculateLevelUpRaw(currentUser, expGained) {
    const originalTotalExp = currentUser.total_exp || 0;
    const newTotalExp = originalTotalExp + expGained;
    const originalLevel = this.userService.calculateLevelFromTotalExp(originalTotalExp).level;
    const newLevelInfo = this.userService.calculateLevelFromTotalExp(newTotalExp);
    if (newLevelInfo.level > originalLevel) {
      const levelsGained = newLevelInfo.level - originalLevel;
      const coinsReward = levelsGained * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL;
      return { hasLevelUp: true, newLevel: newLevelInfo.level, newExp: newLevelInfo.currentExp, coinsReward };
    }
    return { hasLevelUp: false, newExp: (currentUser.exp || 0) + expGained, coinsReward: 0 };
  }

  // 计算软保底概率（单抽/十连复用）
  calcSoftPityProbs(ssrPity, urPity) {
    let urProb = 1;
    let ssrProb = 4;
    const urConfig = CONFIG.PITY.UR;
    const ssrConfig = CONFIG.PITY.SSR;
    if (urConfig.softStart && urPity >= urConfig.softStart) {
      urProb += (urPity - urConfig.softStart + 1) * urConfig.softRate;
    }
    if (ssrConfig.softStart && ssrPity >= ssrConfig.softStart) {
      ssrProb += (ssrPity - ssrConfig.softStart + 1) * ssrConfig.softRate;
    }
    return { urProb: Math.min(urProb, 100), ssrProb: Math.min(ssrProb, 100) };
  }

  // ==================== 抽卡核心逻辑（无 DB） ====================
  // pity 参数可选：不传则从 KV 读取（单抽用），传入则直接用（多连抽用）
  async executeDrawLogic(userId, username, pity = null) {
    const { ssrPity, urPity } = pity || await this.getPityCounters(userId);

    const { urProb, ssrProb } = this.calcSoftPityProbs(ssrPity, urPity);
    const rand = Math.random() * 100;
    let rarity;
    if (rand < urProb) rarity = 'UR';
    else if (rand < urProb + ssrProb) rarity = 'SSR';
    else if (rand < urProb + ssrProb + 15) rarity = 'SR';
    else if (rand < urProb + ssrProb + 50) rarity = 'R';
    else rarity = 'N';

    const pityResult = this.applyPity(rarity, ssrPity, urPity);
    rarity = pityResult.rarity;

    const sourceList = CONFIG.SOURCES.filter(s => s.rarity === rarity);
    if (sourceList.length === 0) throw new Error(`配置错误: 无法找到 ${rarity} 的图源`);
    const asset = await this.consumeGlobalBuffer(rarity, sourceList);
    if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败，请重试`);

    const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;

    return { rarity, asset, expGain, coinsReward, isPity: pityResult.isPity, ssrPity, urPity };
  }

  // ==================== 单抽 ====================
  async draw(currentUser) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const cost = CONFIG.GAME.DRAW_COST || 0;
    if (currentUser.coins < cost) return jsonResponse({ error: '积分不足' }, 400);

    try {
      const result = await this.executeDrawLogic(currentUser.id, currentUser.username);
      const { rarity, asset, expGain, coinsReward, isPity, ssrPity, urPity } = result;

      // DB batch 与保底更新并行执行
      const pityUpdate = this.updatePityCounters(currentUser.id, rarity, { ssrPity, urPity });
      const netCoinsChange = coinsReward - cost;

      // 内存更新
      currentUser.coins = (currentUser.coins || 0) + netCoinsChange;
      currentUser.draw_count = (currentUser.draw_count || 0) + 1;
      currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
      const levelUpInfo = this.userService.calculateLevelFromTotalExp(currentUser.total_exp);
      let levelUpResult = null;
      if (levelUpInfo.level > currentUser.level) {
        levelUpResult = {
          newLevel: levelUpInfo.level,
          newExp: levelUpInfo.currentExp,
          coinsReward: (levelUpInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL
        };
        currentUser.level = levelUpResult.newLevel;
        currentUser.exp = levelUpResult.newExp;
      }

      // DB batch
      const userBatch = [
        this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + 1, total_exp = total_exp + ? WHERE id = ?').bind(netCoinsChange, expGain, currentUser.id)
      ];
      if (levelUpResult) {
        userBatch.push(this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?').bind(levelUpResult.newLevel, levelUpResult.newExp, currentUser.id));
      }
      userBatch.push(this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity));
      userBatch.push(this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, asset.sourceName || '常驻池', Date.now()));
      await Promise.all([this.env.DB.batch(userBatch), pityUpdate]);

      // 图库 & 排行榜
      if (asset.success) {
        this.safeWaitUntil(updateGalleryIndex(this.env, { url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: asset.sourceName, ts: getBeijingISOString() }));
        if (rarity === 'UR') {
          this.safeWaitUntil(updateLeaderboard(this.env, { username: currentUser.username, rarity, imageUrl: asset.imageUrl, ts: Date.now() }));
        }
      }

      this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

      return jsonResponse({
        success: true,
        card: asset,
        rarity,
        expGained: expGain,
        userCoins: currentUser.coins,
        isPity,
        pityInfo: { ssrPity, urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
        levelUp: levelUpResult ? { newLevel: levelUpResult.newLevel, reward: levelUpResult.coinsReward } : null
      });
    } catch (e) {
      console.error('[draw] Error:', e);
      return jsonResponse({ error: '抽卡失败: ' + e.message }, 500);
    }
  }

  // ==================== 多连抽（批量优化版） ====================
  async multiDraw(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const body = await request.json();
    const count = parseInt(body.count || body.times) || 10;
    const maxCount = CONFIG.GAME.MULTI_DRAW_MAX || 10;
    if (count < 1 || count > maxCount) return jsonResponse({ error: `连抽次数需在 1-${maxCount} 之间` }, 400);

    const isMulti = count >= 10;
    const cost = isMulti ? (CONFIG.GAME.MULTI_DRAW_COST || CONFIG.GAME.DRAW_COST * 10) : (CONFIG.GAME.DRAW_COST || 0) * count;
    if (currentUser.coins < cost) return jsonResponse({ error: '积分不足' }, 400);

    // 一次性读取保底计数器
    const pity = await this.getPityCounters(currentUser.id);
    const drawCost = Math.floor(cost / count);

    // ① 预抽所有稀有度（内存操作，无 I/O）— 含软保底
    const drawPlan = [];
    const tempPity = { ssrPity: pity.ssrPity, urPity: pity.urPity };
    for (let i = 0; i < count; i++) {
      const { urProb, ssrProb } = this.calcSoftPityProbs(tempPity.ssrPity, tempPity.urPity);
      const rand = Math.random() * 100;
      let rarity;
      if (rand < urProb) rarity = 'UR';
      else if (rand < urProb + ssrProb) rarity = 'SSR';
      else if (rand < urProb + ssrProb + 15) rarity = 'SR';
      else if (rand < urProb + ssrProb + 50) rarity = 'R';
      else rarity = 'N';
      const pityResult = this.applyPity(rarity, tempPity.ssrPity, tempPity.urPity);
      rarity = pityResult.rarity;
      tempPity.ssrPity++;
      tempPity.urPity++;
      if (rarity === 'SSR' || rarity === 'UR') tempPity.ssrPity = 0;
      if (rarity === 'UR') tempPity.urPity = 0;
      drawPlan.push({ index: i, rarity, isPity: pityResult.isPity, ssrPity: tempPity.ssrPity, urPity: tempPity.urPity });
    }

    // ② 按稀有度分组，每组预读 buffer slots 一次
    const rarityGroups = {};
    for (const d of drawPlan) {
      if (!rarityGroups[d.rarity]) rarityGroups[d.rarity] = [];
      rarityGroups[d.rarity].push(d);
    }
    const bufferCache = {};
    for (const rarity of Object.keys(rarityGroups)) {
      const sourceList = CONFIG.SOURCES.filter(s => s.rarity === rarity);
      if (sourceList.length === 0) throw new Error(`配置错误: 无法找到 ${rarity} 的图源`);
      bufferCache[rarity] = { slots: await this.preReadBufferSlots(rarity), sourceList };
    }

    let totalCoins = 0;
    let totalExp = 0;
    const cards = [];
    const dbStatements = [];
    const drawnUrls = new Set(); // 同批次去重
    const failedSlots = [];
    let levelUpResult = null;

    // ③ 按预抽计划逐张执行（跳过 rarity roll 和 buffer slot 读取）
    for (const plan of drawPlan) {
      const { index: i, rarity, isPity, ssrPity: sp, urPity: up } = plan;
      try {
        const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
        const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
        const netCoins = coinsReward - drawCost;
        const { slots, sourceList } = bufferCache[rarity];
        let asset = await this.consumeGlobalBufferFast(rarity, sourceList, slots);
        if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

        // 同批次图片去重：如果抽到重复图，尝试重新抽一次
        let finalAsset = asset;
        if (asset.success && drawnUrls.has(asset.imageUrl)) {
          try {
            const retrySources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
            const retry = await this.fetchAndUploadWithFallback(retrySources[Math.floor(Math.random() * retrySources.length)]);
            if (retry.success && !drawnUrls.has(retry.imageUrl)) {
              finalAsset = retry;
            }
          } catch {}
        }
        if (finalAsset.success) drawnUrls.add(finalAsset.imageUrl);

        currentUser.coins = (currentUser.coins || 0) + netCoins;
        currentUser.draw_count = (currentUser.draw_count || 0) + 1;
        currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
        totalCoins += netCoins;
        totalExp += expGain;

        const lvlInfo = this.userService.calculateLevelFromTotalExp(currentUser.total_exp);
        if (lvlInfo.level > currentUser.level) {
          levelUpResult = {
            fromLevel: currentUser.level,
            toLevel: lvlInfo.level,
            coinsReward: (lvlInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL
          };
          currentUser.level = lvlInfo.level;
          currentUser.exp = lvlInfo.currentExp;
        }

        cards.push({
          rarity,
          asset: finalAsset.success ? { url: finalAsset.imageUrl, sourceName: finalAsset.sourceName } : null,
          isPity,
          pityInfo: { ssrPity: sp, urPity: up, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at }
        });

        // 收集 DB statements（不立即执行）
        dbStatements.push(
          this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
          this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, finalAsset.sourceName || '常驻池', Date.now() + i)
        );

        // 异步更新图库和排行榜
        if (finalAsset.success) {
          this.safeWaitUntil(updateGalleryIndex(this.env, { url: finalAsset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: finalAsset.sourceName, ts: getBeijingISOString() }));
          if (rarity === 'UR') {
            this.safeWaitUntil(updateLeaderboard(this.env, { username: currentUser.username, rarity, imageUrl: finalAsset.imageUrl, ts: Date.now() + i }));
          }
        }
      } catch (e) {
        console.error(`[multiDraw] Draw ${i + 1} failed:`, e);
        failedSlots.push(i + 1);
      }
    }

    // 单次批量 DB 写入：用户数据 + 所有库存 + 所有历史
    const userStatements = [
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + ?, total_exp = total_exp + ? WHERE id = ?').bind(totalCoins, cards.length, totalExp, currentUser.id)
    ];
    if (levelUpResult) {
      userStatements.push(this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?').bind(levelUpResult.toLevel, currentUser.exp, currentUser.id));
    }
    await this.env.DB.batch([...userStatements, ...dbStatements]);

    // 单次批量写入保底计数器
    await Promise.all([
      this.env.KV_CACHE.put(`pity:ssr:${currentUser.id}`, String(tempPity.ssrPity), { expirationTtl: 86400 * 7 }),
      this.env.KV_CACHE.put(`pity:ur:${currentUser.id}`, String(tempPity.urPity), { expirationTtl: 86400 * 7 })
    ]);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return jsonResponse({
      success: true,
      cards,
      count: cards.length,
      totalCost: cost,
      userCoins: currentUser.coins,
      expGained: totalExp,
      levelUp: levelUpResult ? { newLevel: levelUpResult.toLevel, reward: levelUpResult.coinsReward } : null,
      pityInfo: { ssrPity: tempPity.ssrPity, urPity: tempPity.urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      failedSlots: failedSlots.length > 0 ? failedSlots : undefined
    });
  }

  // ==================== 抽卡历史记录 ====================
  async getDrawHistory(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
    const rarityFilter = url.searchParams.get('rarity');

    let query = 'SELECT * FROM draw_history WHERE user_id = ?';
    let params = [currentUser.id];

    if (rarityFilter) {
      query += ' AND rarity = ?';
      params.push(rarityFilter.toUpperCase());
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const countQuery = 'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?';
    const [results, countResult] = await Promise.all([
      this.env.DB.prepare(query).bind(...params).all(),
      this.env.DB.prepare(rarityFilter ? countQuery + ' AND rarity = ?' : countQuery).bind(currentUser.id, ...(rarityFilter ? [rarityFilter.toUpperCase()] : [])).first()
    ]);

    return jsonResponse({
      success: true,
      history: results.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit)
      }
    });
  }

  // ==================== 限定池独立保底计数器 ====================
  async getLimitedPityCounters(userId) {
    if (!this.env.KV_CACHE) return { ssrPity: 0, urPity: 0 };
    try {
      const [ssr, ur] = await Promise.all([
        this.env.KV_CACHE.get(`pity:limited:ssr:${userId}`),
        this.env.KV_CACHE.get(`pity:limited:ur:${userId}`)
      ]);
      return {
        ssrPity: parseInt(ssr || '0', 10),
        urPity: parseInt(ur || '0', 10)
      };
    } catch { return { ssrPity: 0, urPity: 0 }; }
  }

  async updateLimitedPityCounters(userId, rarity, current = null) {
    if (!this.env.KV_CACHE) return;
    try {
      let ssrPity, urPity;
      if (current) {
        ssrPity = current.ssrPity + 1;
        urPity = current.urPity + 1;
      } else {
        ssrPity = parseInt(await this.env.KV_CACHE.get(`pity:limited:ssr:${userId}`) || '0', 10) + 1;
        urPity = parseInt(await this.env.KV_CACHE.get(`pity:limited:ur:${userId}`) || '0', 10) + 1;
      }
      if (rarity === 'SSR' || rarity === 'UR') ssrPity = 0;
      if (rarity === 'UR') urPity = 0;
      await Promise.all([
        this.env.KV_CACHE.put(`pity:limited:ssr:${userId}`, String(ssrPity), { expirationTtl: 86400 * 7 }),
        this.env.KV_CACHE.put(`pity:limited:ur:${userId}`, String(urPity), { expirationTtl: 86400 * 7 })
      ]);
    } catch (e) { console.error('[Pity] limited update failed:', e); }
  }

  // ==================== 限定池抽卡（带独立保底，支持单抽/十连） ====================
  async drawLimited(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const { poolId, count: reqCount } = await request.json();
    const pool = poolId && CONFIG.LIMITED.POOLS[poolId] ? poolId : CONFIG.LIMITED.DEFAULT_POOL;
    const poolConfig = CONFIG.LIMITED.POOLS[pool];
    if (!poolConfig) return jsonResponse({ error: '卡池不存在' }, 400);
    const sources = poolConfig.sources;
    if (!sources?.length) return jsonResponse({ error: '卡池配置错误' }, 500);

    const count = Math.min(Math.max(parseInt(reqCount) || 1, 1), CONFIG.GAME.MULTI_DRAW_MAX || 10);
    const isMulti = count >= 10;
    const singleCost = poolConfig.cost || CONFIG.LIMITED.COST;
    const cost = isMulti ? (CONFIG.LIMITED.MULTI_COST || singleCost * 10) : singleCost * count;
    if (currentUser.coins < cost) return jsonResponse({ error: '积分不足' }, 400);

    const pityCounters = await this.getLimitedPityCounters(currentUser.id);
    const baseRarity = poolConfig.rarity || 'UR';
    const drawCost = Math.floor(cost / count);
    const tempPity = { ssrPity: pityCounters.ssrPity, urPity: pityCounters.urPity };

    const cards = [];
    const dbStatements = [];
    let totalExp = 0;
    let levelUpResult = null;
    const drawnUrls = new Set();

    for (let i = 0; i < count; i++) {
      const pityResult = this.applyPity(baseRarity, tempPity.ssrPity, tempPity.urPity);
      const rarity = pityResult.rarity;

      let asset;
      if (rarity === baseRarity) {
        asset = await this.fetchAndUploadWithFallback(sources[Math.floor(Math.random() * sources.length)]);
      } else {
        const fallbackSources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
        asset = await this.consumeGlobalBuffer(rarity, fallbackSources.length > 0 ? fallbackSources : sources);
      }
      if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

      // 同批次去重
      let finalAsset = asset;
      if (asset.success && drawnUrls.has(asset.imageUrl)) {
        try {
          const retrySrc = rarity === baseRarity ? sources : CONFIG.SOURCES.filter(s => s.rarity === rarity);
          const retry = await this.fetchAndUploadWithFallback(retrySrc[Math.floor(Math.random() * retrySrc.length)]);
          if (retry.success && !drawnUrls.has(retry.imageUrl)) finalAsset = retry;
        } catch {}
      }
      if (finalAsset.success) drawnUrls.add(finalAsset.imageUrl);

      tempPity.ssrPity++;
      tempPity.urPity++;
      if (rarity === 'SSR' || rarity === 'UR') tempPity.ssrPity = 0;
      if (rarity === 'UR') tempPity.urPity = 0;

      const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
      totalExp += expGain;

      cards.push({
        rarity,
        asset: finalAsset.success ? { url: finalAsset.imageUrl, sourceName: finalAsset.sourceName } : null,
        isPity: pityResult.isPity,
        pityInfo: { ssrPity: tempPity.ssrPity, urPity: tempPity.urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at }
      });

      dbStatements.push(
        this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
        this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, pityResult.isPity ? 1 : 0, finalAsset.sourceName || poolConfig.name || '限定池', Date.now() + i)
      );

      if (finalAsset.success) {
        this.safeWaitUntil(updateGalleryIndex(this.env, { url: finalAsset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: finalAsset.sourceName, ts: getBeijingISOString() }));
      }
    }

    currentUser.coins -= cost;
    currentUser.draw_count = (currentUser.draw_count || 0) + count;
    currentUser.total_exp = (currentUser.total_exp || 0) + totalExp;
    const levelUpInfo = this.userService.calculateLevelFromTotalExp(currentUser.total_exp);
    if (levelUpInfo.level > currentUser.level) {
      levelUpResult = {
        newLevel: levelUpInfo.level,
        newExp: levelUpInfo.currentExp,
        coinsReward: (levelUpInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL
      };
      currentUser.level = levelUpResult.newLevel;
      currentUser.exp = levelUpResult.newExp;
    }

    const userStatements = [
      this.env.DB.prepare('UPDATE users SET coins = coins - ?, draw_count = draw_count + ?, total_exp = total_exp + ? WHERE id = ?').bind(cost, count, totalExp, currentUser.id)
    ];
    if (levelUpResult) {
      userStatements.push(this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?').bind(levelUpResult.newLevel, levelUpResult.newExp, currentUser.id));
    }
    await this.env.DB.batch([...userStatements, ...dbStatements]);

    await Promise.all([
      this.env.KV_CACHE.put(`pity:limited:ssr:${currentUser.id}`, String(tempPity.ssrPity), { expirationTtl: 86400 * 7 }),
      this.env.KV_CACHE.put(`pity:limited:ur:${currentUser.id}`, String(tempPity.urPity), { expirationTtl: 86400 * 7 })
    ]);
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return jsonResponse({
      success: true,
      cards,
      count: cards.length,
      pool: poolConfig.name || pool,
      userCoins: currentUser.coins,
      expGained: totalExp,
      levelUp: levelUpResult ? { newLevel: levelUpResult.newLevel, reward: levelUpResult.coinsReward } : null,
      pityInfo: { ssrPity: tempPity.ssrPity, urPity: tempPity.urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at }
    });
  }

  // ==================== 获取限定池列表 ====================
  async getLimitedPools(currentUser) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const pools = [];
    for (const [id, config] of Object.entries(CONFIG.LIMITED.POOLS)) {
      let count = '可用';
      let available = config.sources && config.sources.length > 0;
      if (id === 'github_repo' && config.sources && config.sources[0]) {
        try {
          const res = await fetch(config.sources[0].url, { method: 'GET' });
          const data = await res.json();
          count = data.total || '可用';
        } catch (e) {
          console.error('[getLimitedPools] Failed to fetch count:', e);
        }
      }
      pools.push({
        id,
        name: config.name,
        description: config.description,
        cost: CONFIG.LIMITED.COST,
        available,
        count
      });
    }
    return jsonResponse({ success: true, pools, defaultPool: CONFIG.LIMITED.DEFAULT_POOL });
  }

  // ==================== 合成系统（消耗库存卡材料） ====================
  async craft(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const { targetRarity } = await request.json();
    const cost = CONFIG.GAME.CRAFT_COST;
    const rarityMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const sourceRarity = rarityMap[targetRarity];
    if (!sourceRarity) return jsonResponse({ error: '无效的合成目标' }, 400);
    const inventory = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, sourceRarity).first();
    if (!inventory || inventory.count < cost) {
      return jsonResponse({ error: `合成需要 ${cost} 张 ${sourceRarity} 卡` }, 400);
    }
    const targetSources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    if (targetSources.length === 0) return jsonResponse({ error: `找不到 ${targetRarity} 图源` }, 500);
    const asset = await this.consumeGlobalBuffer(targetRarity, targetSources);
    // batch 事务：扣除材料 + 增加成品
    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?').bind(cost, currentUser.id, sourceRarity),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity)
    ]);
    const expGain = CONFIG.LEVEL.EXP_GAIN.CRAFT || 50;
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
    const levelUpInfo = this.userService.calculateLevelFromTotalExp(currentUser.total_exp);
    let levelUpResult = null;
    if (levelUpInfo.level > currentUser.level) {
      levelUpResult = {
        newLevel: levelUpInfo.level,
        coinsReward: (levelUpInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL
      };
      currentUser.level = levelUpResult.newLevel;
      currentUser.exp = levelUpInfo.currentExp;
    }
    if (asset.success) this.safeWaitUntil(updateGalleryIndex(this.env, { url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: getBeijingISOString() }));
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    return jsonResponse({
      success: true,
      card: asset,
      consumed: `${cost} 张 ${sourceRarity}`,
      expGained: expGain,
      levelUp: levelUpResult
    });
  }

  // ==================== 商店购买 ====================
  async shopBuy(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const { targetRarity } = await request.json();
    const shopConfig = CONFIG.GAME.SHOP;
    if (!shopConfig) return jsonResponse({ error: '商店不存在' }, 400);
    const price = shopConfig[targetRarity];
    if (!price) return jsonResponse({ error: '商品不存在' }, 400);
    if (currentUser.coins < price) return jsonResponse({ error: '积分不足' }, 400);
    currentUser.coins -= price;
    const expGained = CONFIG.LEVEL.EXP_GAIN.SHOP_BUY || 20;
    currentUser.total_exp = (currentUser.total_exp || 0) + expGained;
    const levelUpInfo = this.userService.calculateLevelFromTotalExp(currentUser.total_exp);
    let levelUpResult = null;
    if (levelUpInfo.level > currentUser.level) {
      levelUpResult = {
        newLevel: levelUpInfo.level,
        coinsReward: (levelUpInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL
      };
      currentUser.level = levelUpResult.newLevel;
      currentUser.exp = levelUpInfo.currentExp;
    }
    const asset = await this.consumeGlobalBuffer(targetRarity, CONFIG.SOURCES.filter(s => s.rarity === targetRarity));
    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE users SET coins = coins - ?, total_exp = total_exp + ? WHERE id = ?').bind(price, expGained, currentUser.id),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity)
    ]);
    if (levelUpResult) {
      await this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?').bind(levelUpResult.newLevel, currentUser.exp, currentUser.id).run();
    }
    if (asset.success) this.safeWaitUntil(updateGalleryIndex(this.env, { url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: getBeijingISOString() }));
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    return jsonResponse({
      success: true,
      message: `成功购买 ${targetRarity} 卡片`,
      card: asset,
      userCoins: currentUser.coins,
      levelUp: levelUpResult
    });
  }

  // ==================== 骰子游戏 ====================
  async playDice(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const { poolId, betAmount } = await request.json() || {};
    const diceConfig = CONFIG.GAME.DICE;
    const bet = Math.min(Math.max(parseInt(betAmount) || 1, diceConfig.MIN_BET || 1), diceConfig.MAX_BET || 5);
    const cost = bet;
    if (currentUser.coins < cost) return jsonResponse({ error: '积分不足' }, 400);
    const onCooldown = await this.checkDiceCooldown(currentUser.id);
    if (onCooldown) return jsonResponse({ error: '骰子冷却中，请稍候再试' }, 429);
    currentUser.coins -= cost;
    if (bet >= diceConfig.MAX_BET) currentUser.diceCount = (currentUser.diceCount || 0) + 1;
    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const sum = roll1 + roll2;
    const payout = diceConfig.PAYOUT || 2;
    let reward = 0;
    if (sum >= 10) reward = Math.floor(cost * payout * 0.5);
    if (roll1 === roll2) reward = Math.max(reward, Math.floor(cost * payout));
    if (sum === 7) reward = Math.max(reward, Math.floor(cost * payout * 2));
    currentUser.coins += reward;
    const netChange = reward - cost;
    await this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(netChange, currentUser.id).run();
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    return jsonResponse({
      roll1, roll2, sum, reward, cost,
      message: `🎲 ${roll1} + ${roll2} = ${sum}, ${reward > cost ? '恭喜中奖！' : '下次好运！'}`,
      userCoins: currentUser.coins
    });
  }

  // ==================== 图片上传 ====================
  async uploadImage(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    try {
      const formData = await request.formData();
      const file = formData.get('image');
      const rarity = formData.get('rarity') || 'N';
      if (!file) return jsonResponse({ error: '未提供图片' }, 400);
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) return jsonResponse({ error: '无效的文件类型' }, 400);
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) return jsonResponse({ error: '文件过大，最大5MB' }, 400);
      const arrayBuffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop() || 'jpg';
      const r2Key = `uploads/${currentUser.id}_${timestamp}_${random}.${ext}`;
      const r2Url = `${CONFIG.R2_DOMAIN}/${r2Key}`;
      await this.env.R2_BUCKET.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=3600' }
      });
      await this.env.DB.prepare(
        'INSERT INTO user_uploads (user_id, username, r2_key, url, rarity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(currentUser.id, currentUser.username, r2Key, r2Url, rarity, 'pending', Date.now()).run();
      return jsonResponse({ success: true, url: r2Url, message: '上传成功，等待审核' });
    } catch (e) {
      console.error('Upload error:', e);
      return jsonResponse({ error: '上传失败: ' + e.message }, 500);
    }
  }

  async getUserUploads(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    const total = await this.env.DB.prepare('SELECT COUNT(*) as count FROM user_uploads WHERE user_id = ?').bind(currentUser.id).first();
    const uploads = await this.env.DB.prepare(
      'SELECT * FROM user_uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(currentUser.id, limit, offset).all();
    return jsonResponse({ success: true, uploads: uploads.results || [], total: total.count, page, totalPages: Math.ceil(total.count / limit) });
  }

  // ==================== 用户信息 ====================
  async getUserInfo(currentUser) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    return jsonResponse({ success: true, user: currentUser });
  }
}