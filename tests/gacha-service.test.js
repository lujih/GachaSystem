/**
 * gacha-service 资损回归测试
 *
 * 覆盖两处曾经真实存在的 bug：
 *  1. playDice 双重扣币 —— deductCoins(bet) 之后又 UPDATE coins += (reward - bet)
 *  2. craft 幽灵卡 —— consumeBuffer 只返回 {success:false}（不抛异常），
 *     而 craft 未校验返回值就执行「扣 5 张材料 + 入库 1 张 imageUrl=null 的卡」
 *
 * 用内存 fake D1 / KV 驱动，不触网、不写文件。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GachaService } from '../src/services/gacha-service.js';

/** 记录所有执行过的 SQL 与绑定参数的最小 D1 stub */
function makeD1({ changes = 1 } = {}) {
  const log = [];
  return {
    log,
    prepare(sql) {
      const entry = { sql, args: null };
      log.push(entry);
      const stmt = {
        bind: (...args) => {
          entry.args = args;
          return stmt;
        },
        run: async () => ({ meta: { changes } }),
        first: async () => (entry.sql.includes('FROM inventory') ? { count: 99 } : null),
        all: async () => ({ results: [] }),
      };
      return stmt;
    },
    batch: async (stmts) => {
      log.push({ sql: '__BATCH__', args: null });
      return stmts;
    },
  };
}

function makeKv({ skipKeys = [] } = {}) {
  const store = new Map();
  const skip = (k) => skipKeys.some((p) => k.startsWith(p));
  return {
    get: async (k) => (skip(k) ? null : store.get(k) ?? null),
    put: async (k, v) => { if (!skip(k)) store.set(k, v); },
    delete: async (k) => { store.delete(k); },
  };
}

function makeService(overrides = {}) {
  const DB = makeD1(overrides.d1);
  const KV_CACHE = makeKv({ skipKeys: overrides.skipKeys ?? [] });
  const imagePipeline = {
    consumeBuffer: overrides.asset ?? (async () => ({ success: true, imageUrl: 'https://x/y.webp' })),
  };
  const userService = {
    invalidateUserCache: async () => {},
    calculateLevelFromTotalExp: (totalExp) => ({ level: 1, currentExp: totalExp, isMax: false }),
  };
  const galleryService = { updateIndex: async () => {}, updateLeaderboard: async () => {} };
  const service = new GachaService({ DB, KV_CACHE }, null, { userService, imagePipeline, galleryService });
  return { service, DB };
}

const payoutStmtOf = (DB) => DB.log.find((e) => /coins = coins \+ \?, wins/.test(e.sql));

describe('playDice：投注只扣一次', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('押输时派奖语句绑定 0，而不是 0 - bet', async () => {
    const { service, DB } = makeService();
    // 1 与 5：既非对子、点数 6 非 7、也不 ≥10 → 必输
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.7);

    const res = await service.playDice({ id: 1, total_exp: 0, level: 1 }, 100);

    expect(res.reward).toBe(0);
    const stmt = payoutStmtOf(DB);
    expect(stmt).toBeDefined();
    // 回归点：修复前此处绑定的是 netChange = reward - bet = -100
    expect(stmt.args[0]).toBe(0);
  });

  it('输一局只损失一注', async () => {
    const { service } = makeService();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.7);

    const res = await service.playDice({ id: 1, total_exp: 0, level: 1 }, 100);

    expect(res.reward).toBe(0);
    expect(res.cost).toBe(100);
    expect(res.netChange).toBe(-100);
  });

  it('押中时派奖金额等于 reward，净额 = reward - bet', async () => {
    const { service, DB } = makeService();
    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0); // 1+1 对子

    const res = await service.playDice({ id: 1, total_exp: 0, level: 1 }, 100);

    expect(res.reward).toBeGreaterThan(0);
    expect(payoutStmtOf(DB).args[0]).toBe(res.reward);
    expect(res.netChange).toBe(res.reward - res.cost);
  });

  it('多局累计：派奖总额 === 逐局 reward 之和（不存在重复扣款）', async () => {
    // 跳过 rl:dice 冷却键，否则第 2 局起会被冷却拦截
    const { service, DB } = makeService({ skipKeys: ['rl:dice:'] });

    const bet = 100;
    let totalReward = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const res = await service.playDice({ id: 1, total_exp: 0, level: 1 }, bet);
      totalReward += res.reward;
    }

    const credited = DB.log
      .filter((e) => /coins = coins \+ \?, wins/.test(e.sql))
      .reduce((s, e) => s + e.args[0], 0);

    // 修复前 credited 会是 Σ(reward - bet)，比 totalReward 少 N×bet
    expect(credited).toBe(totalReward);
    // 每局净 = reward - bet，累计净额为负（庄家优势）
    expect(credited - N * bet).toBeLessThan(0);
  });
});

describe('craft：取图失败不得消耗材料', () => {
  it('consumeBuffer 返回失败态时抛错，且不执行任何扣材料/入库语句', async () => {
    const { service, DB } = makeService({
      asset: async () => ({ success: false, imageUrl: null, rarity: 'R' }),
    });

    await expect(service.craft({ id: 1, total_exp: 0, level: 1 }, 'R')).rejects.toThrow();

    // 关键回归点：修复前这里会出现
    //   UPDATE inventory SET count = count - ? ...（扣掉 5 张材料）
    expect(DB.log.some((e) => /UPDATE inventory SET count = count - /.test(e.sql))).toBe(false);
    expect(DB.log.some((e) => e.sql === '__BATCH__')).toBe(false);
  });

  it('取图成功时才扣材料并入库', async () => {
    const { service, DB } = makeService();

    const res = await service.craft({ id: 1, total_exp: 0, level: 1 }, 'R');

    expect(res.card.success).toBe(true);
    expect(DB.log.some((e) => /UPDATE inventory SET count = count - /.test(e.sql))).toBe(true);
    expect(DB.log.some((e) => e.sql === '__BATCH__')).toBe(true);
  });
});
