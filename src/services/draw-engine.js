/**
 * 抽卡引擎（纯函数，无 I/O，可独立单测）
 * 概率：基础 UR 1% / SSR 4%，软保底 + 硬保底
 */
import { CONFIG } from '../config/index.js';

function getPityConfig() {
  return CONFIG.PITY;
}

export function calcSoftPityProbs(ssrPity, urPity, pityConfig = getPityConfig()) {
  let urProb = 1;
  let ssrProb = 4;
  const ur = pityConfig.UR;
  const ssr = pityConfig.SSR;
  if (ur.softStart && urPity >= ur.softStart) {
    urProb += (urPity - ur.softStart + 1) * ur.softRate;
  }
  if (ssr.softStart && ssrPity >= ssr.softStart) {
    ssrProb += (ssrPity - ssr.softStart + 1) * ssr.softRate;
  }
  return { urProb: Math.min(urProb, 100), ssrProb: Math.min(ssrProb, 100) };
}

export function applyPity(rarity, ssrPity, urPity, pityConfig = getPityConfig()) {
  const ssrAt = pityConfig.SSR.at;
  const urAt = pityConfig.UR.at;
  if (urAt > 0 && urPity >= urAt - 1) return { rarity: 'UR', isPity: true };
  if (ssrAt > 0 && ssrPity >= ssrAt - 1) return { rarity: 'SSR', isPity: true };
  return { rarity, isPity: false };
}

export function rollRarity(ssrPity, urPity, pityConfig = getPityConfig()) {
  const { urProb, ssrProb } = calcSoftPityProbs(ssrPity, urPity, pityConfig);
  const rand = Math.random() * 100;
  let rarity;
  if (rand < urProb) rarity = 'UR';
  else if (rand < urProb + ssrProb) rarity = 'SSR';
  else if (rand < urProb + ssrProb + 15) rarity = 'SR';
  else if (rand < urProb + ssrProb + 50) rarity = 'R';
  else rarity = 'N';
  return applyPity(rarity, ssrPity, urPity, pityConfig);
}

export function advancePity(pity, rarity) {
  const next = { ssr: pity.ssr + 1, ur: pity.ur + 1 };
  if (rarity === 'SSR' || rarity === 'UR') next.ssr = 0;
  if (rarity === 'UR') next.ur = 0;
  return next;
}

export function planMultiDraw(count, initialPity, pityConfig = getPityConfig()) {
  const plan = [];
  let pity = { ssr: initialPity.ssr, ur: initialPity.ur };
  for (let i = 0; i < count; i++) {
    const { rarity, isPity } = rollRarity(pity.ssr, pity.ur, pityConfig);
    pity = advancePity(pity, rarity);
    plan.push({ index: i, rarity, isPity, ssrPity: pity.ssr, urPity: pity.ur });
  }
  return plan;
}
