import { BUSINESS_CONFIG } from './business.js';
import { TECHNICAL_CONFIG } from './technical.js';
import { HTTP_STATUS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, GAME_ACTIONS } from './constants.js';

function mergeConfig(env = {}) {
  return {
    ...BUSINESS_CONFIG,
    ...TECHNICAL_CONFIG,
    KEYS: TECHNICAL_CONFIG.KEYS,
    TTL: TECHNICAL_CONFIG.TTL,
    R2_DOMAIN: env.R2_DOMAIN || TECHNICAL_CONFIG.INFRASTRUCTURE.R2_DOMAIN,
    GITHUB: {
      ...TECHNICAL_CONFIG.GITHUB,
      OWNER: env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER,
      REPO: env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO
    },
    HTTP_STATUS,
    RARITY_ORDER,
    RARITY_LABELS,
    RARITY_COLORS,
    GAME_ACTIONS
  };
}

export const CONFIG = mergeConfig();

export function getConfig(env = {}) {
  return mergeConfig(env);
}

export const DEFAULT_CHANGELOG = [
  { 
    date: new Date().toISOString().split('T')[0], 
    ver: 'v1.0.0', 
    content: '暂无变更日志。', 
    tag: 'info' 
  }
];

export { BUSINESS_CONFIG, TECHNICAL_CONFIG, HTTP_STATUS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, GAME_ACTIONS };
