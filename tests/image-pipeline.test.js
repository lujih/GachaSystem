// tests/image-pipeline.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePipeline } from '../src/services/image-pipeline.js';

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(k, opts) {
      const v = store.get(k);
      if (v === undefined) return null;
      return opts?.type === 'json' ? JSON.parse(v) : v;
    },
    async put(k, v) { store.set(k, typeof v === 'string' ? v : JSON.stringify(v)); },
    async delete(k) { store.delete(k); },
  };
}

function makeEnv(dbChanges = 1) {
  const kv = makeKv();
  const db = {
    prepare: () => ({
      bind: () => ({ run: async () => ({ meta: { changes: dbChanges } }) }),
    }),
  };
  const r2 = { put: vi.fn(async () => ({})) };
  return { env: { KV_CACHE: kv, DB: db, R2_BUCKET: r2 }, kv, r2 };
}

function slotAsset(url, lastUsed = 0) {
  return { success: true, imageUrl: url, sourceName: 'Test', rarity: 'N', lastUsed };
}

describe('ImagePipeline.consumeBuffer', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('从已缓存 slots 中消费一个 asset', async () => {
    const { env, kv } = makeEnv();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network')));
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/a.png', 100)));
    kv.store.set('sys:buffer:N:1', JSON.stringify(slotAsset('https://cdn.test/b.png', 200)));

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(['https://cdn.test/a.png', 'https://cdn.test/b.png']).toContain(asset.imageUrl);
    expect(asset.success).toBe(true);
  });

  it('黑名单中的 URL 不会被消费', async () => {
    const { env, kv } = makeEnv();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); // 避免真实网络依赖
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/blocked.png')));
    const hash = await new ImagePipeline(env).hashString('https://cdn.test/blocked.png');
    kv.store.set(`sys:draw:blacklist:N:${hash}`, String(Date.now()));

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(asset.imageUrl).not.toBe('https://cdn.test/blocked.png');
    expect(asset.success).toBe(false);
  });

  it('D1 锁冲突（changes=0）时降级实时拉取', async () => {
    const { env, kv, r2 } = makeEnv(0); // DB run 返回 changes: 0 → 锁冲突
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/taken.png')));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://img.test/1.jpg' }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array(Array.from({ length: 1024 }, (_, i) => (i % 255) + 1)), { headers: { 'content-type': 'image/webp' } })));

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(r2.put).toHaveBeenCalled();
    expect(asset.imageUrl).toMatch(/^https:\/\/cft1\.cszxorx\.dpdns\.org\/images\/N_[0-9a-f]{16}\.webp$/);
  });
});

describe('ImagePipeline.consumeSlot（十连快路径）', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('必须抢 D1 原子锁：未抢到锁就不发放该图', async () => {
    const { env, kv, db } = makeEnv(0); // changes=0 → 锁已被其他并发请求持有
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/taken.png')));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const pipe = new ImagePipeline(env);
    const slots = [{ index: 0, asset: slotAsset('https://cdn.test/taken.png'), lastUsed: 0 }];
    const asset = await pipe.consumeSlot(slots, 'N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    // 回归点：修复前此路径完全不抢锁，直接把该图发给用户
    expect(asset.success).toBe(false);
    expect(asset.imageUrl).toBeNull();
  });

  it('抢到锁后正常发放，并写入黑名单', async () => {
    const { env, kv } = makeEnv(1);
    const pipe = new ImagePipeline(env);
    const url = 'https://cdn.test/ok.png';
    const slots = [{ index: 0, asset: slotAsset(url), lastUsed: 0 }];

    const asset = await pipe.consumeSlot(slots, 'N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(asset.success).toBe(true);
    expect(asset.imageUrl).toBe(url);
    const hash = await pipe.hashString(url);
    expect(kv.store.get(`sys:draw:blacklist:N:${hash}`)).toBeDefined();
  });

  it('同一请求内不会把同一张图发两次', async () => {
    const { env, kv } = makeEnv(1);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const pipe = new ImagePipeline(env);
    const mk = (i) => ({ index: i, asset: slotAsset(`https://cdn.test/${i}.png`), lastUsed: i });
    const slots = [mk(0), mk(1)];

    const a = await pipe.consumeSlot(slots, 'N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);
    const b = await pipe.consumeSlot(slots, 'N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(a.imageUrl).not.toBe(b.imageUrl);
  });

  it('slots 为空时返回 miss，由调用方走实时拉取', async () => {
    const { env } = makeEnv(1);
    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeSlot([], 'N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);
    expect(asset.success).toBe(false);
    expect(asset.imageUrl).toBeNull();
  });
});
