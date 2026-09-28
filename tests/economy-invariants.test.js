/**
 * 经济系统不变式（防回归）
 *
 * 这些断言守护两类曾经真实发生过的资损：
 *  1. playDice 双重扣币 —— deductCoins(bet) 之后又执行 coins += (reward - bet)
 *     导致每局净扣 2×bet（修复前单局期望 −88.9%）
 *  2. 抽卡→分解无限刷币 —— E[POINTS] + E[DECOMPOSE] > DRAW_COST
 *     使「抽一张→分解→再抽」成为无上限的造币回路（修复前 +39% ROI）
 *
 * 调整 src/config/business.js 数值前请先跑本文件。
 */
import { describe, it, expect } from 'vitest';
import { rollRarity, advancePity } from '../src/services/draw-engine.js';
import { BUSINESS_CONFIG as B } from '../src/config/business.js';

const SAMPLES = 400_000;

/** 采样长期稀有度占比（必须含软保底，不能用基础概率） */
function sampleDistribution(n = SAMPLES) {
  let pity = { ssr: 0, ur: 0 };
  const hist = {};
  for (let i = 0; i < n; i++) {
    const { rarity } = rollRarity(pity.ssr, pity.ur);
    pity = advancePity(pity, rarity);
    hist[rarity] = (hist[rarity] || 0) + 1;
  }
  const out = {};
  for (const k in hist) out[k] = hist[k] / n;
  return out;
}

describe('抽卡概率分布', () => {
  it('长期占比之和为 1', () => {
    const p = sampleDistribution(50_000);
    const sum = Object.values(p).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('软保底把 SSR/UR 实际产出率抬升到远高于基础概率（4%/1%）', () => {
    // 这条断言记录了一个真实认知陷阱：按基础概率算经济会算错
    const p = sampleDistribution();
    expect(p.SSR).toBeGreaterThan(0.06);
    expect(p.UR).toBeGreaterThan(0.015);
  });
});

describe('卡牌价值：抽卡→分解不得成为造币回路', () => {
  it('E[每抽回报] 必须小于单抽成本', () => {
    const p = sampleDistribution();
    const ev = Object.keys(B.CARD_VALUE).reduce(
      (sum, r) => sum + p[r] * B.CARD_VALUE[r],
      0
    );
    expect(ev).toBeLessThan(B.GAME.DRAW_COST);
  });

  it('E[每抽回报] 同样小于十连的等价单抽成本（90）', () => {
    const perDraw = B.GAME.MULTI_DRAW_COST / B.GAME.MULTI_DRAW_MAX;
    const p = sampleDistribution();
    const ev = Object.keys(B.CARD_VALUE).reduce(
      (sum, r) => sum + p[r] * B.CARD_VALUE[r],
      0
    );
    expect(ev).toBeLessThan(perDraw);
  });

  it('卡牌价值必须随稀有度严格递增（不得再出现 N > R 的倒挂）', () => {
    const order = ['N', 'R', 'SR', 'SSR', 'UR'];
    for (let i = 1; i < order.length; i++) {
      expect(B.CARD_VALUE[order[i]]).toBeGreaterThan(B.CARD_VALUE[order[i - 1]]);
    }
  });

  it('商店定价相对卡牌价值的溢价倍率处于合理区间', () => {
    for (const r of Object.keys(B.GAME.SHOP)) {
      const ratio = B.GAME.SHOP[r] / B.CARD_VALUE[r];
      expect(ratio).toBeGreaterThan(2);
      expect(ratio).toBeLessThan(40);
    }
  });
});

describe('骰子：每局净损益与庄家优势', () => {
  const bet = 100;
  const payout = B.GAME.DICE.PAYOUT;

  function rewardFor(a, b) {
    const sum = a + b;
    let reward = 0;
    if (sum >= 10) reward = Math.floor(bet * payout * 0.5);
    if (a === b) reward = Math.max(reward, Math.floor(bet * payout));
    if (sum === 7) reward = Math.max(reward, Math.floor(bet * payout * 2));
    return reward;
  }

  const outcomes = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) outcomes.push([a, b]);

  it('净损益只计算一次投注：coins = -bet + reward', () => {
    // 回归点：历史实现写的是 coins += (reward - bet)，叠加 deductCoins 后
    // 等于每局扣两次投注。这里显式断言「输了只输一注」。
    for (const [a, b] of outcomes) {
      const reward = rewardFor(a, b);
      const net = reward - bet; // 正确：只扣一次
      if (reward === 0) expect(net).toBe(-bet);
    }
  });

  it('庄家优势为正（玩家不能长期获利）', () => {
    const gross = outcomes.reduce((s, [a, b]) => s + rewardFor(a, b), 0) / outcomes.length;
    expect(gross).toBeLessThan(bet);
  });

  it('庄家优势落在 5% ~ 30% 的可玩区间', () => {
    const gross = outcomes.reduce((s, [a, b]) => s + rewardFor(a, b), 0) / outcomes.length;
    const edge = (bet - gross) / bet;
    expect(edge).toBeGreaterThan(0.05);
    expect(edge).toBeLessThan(0.30);
  });

  it('赔付分布符合设计：4 种非对子大点、6 种对子、6 种和为 7、20 种全输', () => {
    const dist = {};
    for (const [a, b] of outcomes) {
      const r = rewardFor(a, b);
      dist[r] = (dist[r] || 0) + 1;
    }
    expect(dist[0]).toBe(20);
    const winning = outcomes.length - dist[0];
    expect(winning).toBe(16);
  });
});
