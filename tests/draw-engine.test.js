// tests/draw-engine.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calcSoftPityProbs, applyPity, rollRarity, advancePity, planMultiDraw } from '../src/services/draw-engine.js';

// 测试用固定配置（与 src/config/business.js 一致）
const PITY = {
  SSR: { at: 15, softStart: 10, softRate: 5 },
  UR: { at: 80, softStart: 50, softRate: 2 },
};

afterEach(() => { vi.restoreAllMocks(); });

describe('calcSoftPityProbs', () => {
  it('软保底开始前为基础概率 (UR 1%, SSR 4%)', () => {
    const { urProb, ssrProb } = calcSoftPityProbs(0, 0, PITY);
    expect(urProb).toBe(1);
    expect(ssrProb).toBe(4);
  });

  it('UR 50 抽后每抽 +2%', () => {
    const { urProb } = calcSoftPityProbs(0, 52, PITY);
    expect(urProb).toBe(1 + (52 - 50 + 1) * 2); // 7
  });

  it('概率封顶 100', () => {
    const { urProb } = calcSoftPityProbs(0, 200, PITY);
    expect(urProb).toBe(100);
  });
});

describe('applyPity', () => {
  it('SSR 保底：ssrPity >= 14 强制 SSR', () => {
    expect(applyPity('N', 14, 0, PITY)).toEqual({ rarity: 'SSR', isPity: true });
  });

  it('UR 保底：urPity >= 79 强制 UR', () => {
    expect(applyPity('N', 0, 79, PITY)).toEqual({ rarity: 'UR', isPity: true });
  });

  it('未达保底时保持原稀有度', () => {
    expect(applyPity('SR', 5, 10, PITY)).toEqual({ rarity: 'SR', isPity: false });
  });
});

describe('rollRarity', () => {
  it('random=0 必出 UR，random=99 出 N（未触发保底）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollRarity(0, 0, PITY).rarity).toBe('UR');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(rollRarity(0, 0, PITY).rarity).toBe('N');
  });
});

describe('advancePity', () => {
  it('普通抽两计数 +1', () => {
    expect(advancePity({ ssr: 3, ur: 3 }, 'N')).toEqual({ ssr: 4, ur: 4 });
  });
  it('出 SSR 重置 ssr，出 UR 双重置', () => {
    expect(advancePity({ ssr: 5, ur: 5 }, 'SSR')).toEqual({ ssr: 0, ur: 6 });
    expect(advancePity({ ssr: 5, ur: 5 }, 'UR')).toEqual({ ssr: 0, ur: 0 });
  });
});

describe('planMultiDraw', () => {
  it('生成 count 项计划，保底计数器逐步推进', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plan = planMultiDraw(3, { ssr: 0, ur: 0 }, PITY);
    expect(plan).toHaveLength(3);
    expect(plan[0]).toHaveProperty('index', 0);
    expect(plan[0]).toHaveProperty('rarity');
    expect(plan[2].ssrPity).toBeGreaterThanOrEqual(plan[1].ssrPity);
  });

  it('79 连内未出 UR 时，第 80 抽必为 UR（硬保底）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plan = planMultiDraw(80, { ssr: 0, ur: 0 }, PITY);
    expect(plan[79].rarity).toBe('UR');
    expect(plan[79].isPity).toBe(true);
    expect(plan[79].urPity).toBe(0);
  });
});
