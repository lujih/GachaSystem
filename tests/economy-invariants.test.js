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
  /**
   * 关键：抽卡同时给「金币 + 卡」，卡又能分解成金币，所以每抽总收入是
   * CARD_VALUE × (1 + DRAW_COIN_RATIO)，不是 CARD_VALUE 本身。
   * 只断言 E[CARD_VALUE] < DRAW_COST 会漏掉一半收入——这正是曾经发生过的情况：
   * E[CARD_VALUE]=70 < 100 被判定为安全，但真实收入是 140，刷币回路从未闭合。
   */
  const totalReturnPerDraw = (p) =>
    Object.keys(B.CARD_VALUE).reduce(
      (sum, r) => sum + p[r] * B.CARD_VALUE[r] * (1 + B.DRAW_COIN_RATIO),
      0
    );

  it('每抽总回报（金币 + 同卡分解价值）必须小于单抽成本', () => {
    const ev = totalReturnPerDraw(sampleDistribution());
    expect(ev).toBeLessThan(B.GAME.DRAW_COST);
  });

  it('每抽总回报同样小于十连的等价单抽成本（90）', () => {
    const perDraw = B.GAME.MULTI_DRAW_COST / B.GAME.MULTI_DRAW_MAX;
    expect(totalReturnPerDraw(sampleDistribution())).toBeLessThan(perDraw);
  });

  it('DRAW_COIN_RATIO 必须在 (0, 1] 区间', () => {
    expect(B.DRAW_COIN_RATIO).toBeGreaterThan(0);
    expect(B.DRAW_COIN_RATIO).toBeLessThanOrEqual(1);
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

  // 注意：这里只断言「配置层」的不变式（PAYOUT 取值是否产生正庄家优势）。
  // 骰子是否真的只扣一次投注，由 tests/gacha-service.test.js 驱动真实
  // GachaService.playDice 并断言 SQL 绑定参数来守护——本文件不 import 服务，
  // 此前在这里写过一个自指的空断言（reward-bet 恒等于 -bet），零覆盖，已删除。
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
