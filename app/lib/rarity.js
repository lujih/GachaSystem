/**
 * 共享稀有度配置 — 全站统一
 * 所有页面/组件从这里导入，不要各自定义
 */

export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

export const RARITY_COLORS = {
  N:   { bg: 'bg-gray-500',   border: 'border-gray-400',   text: 'text-gray-500',   dot: 'bg-n',   hex: '#64748b' },
  R:   { bg: 'bg-blue-500',   border: 'border-blue-400',   text: 'text-blue-500',   dot: 'bg-r',   hex: '#3b82f6' },
  SR:  { bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-500', dot: 'bg-sr',  hex: '#8b5cf6' },
  SSR: { bg: 'bg-amber-500',  border: 'border-amber-400',  text: 'text-amber-500',  dot: 'bg-ssr', hex: '#f59e0b' },
  UR:  { bg: 'bg-red-500',    border: 'border-red-400',    text: 'text-red-500',    dot: 'bg-ur',  hex: '#ef4444' },
};

export const RARITY_GRADIENT = {
  N: 'from-gray-400 to-gray-500',
  R: 'from-blue-400 to-blue-600',
  SR: 'from-purple-400 to-purple-600',
  SSR: 'from-amber-400 to-yellow-500',
  UR: 'from-red-500 to-rose-600',
};

export const RARITY_GLOW = {
  N: '',
  R: '',
  SR: 'shadow-[0_0_15px_rgba(139,92,246,0.4)]',
  SSR: 'shadow-[0_0_25px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/30',
  UR: 'shadow-[0_0_35px_rgba(239,68,68,0.5)] ring-2 ring-red-400/30',
};

export const RARITY_JAPANESE = {
  N: 'ノーマル',
  R: 'レア',
  SR: 'Sレア',
  SSR: 'SSレア',
  UR: 'ウルトラレア',
};

export function rarityBg(r) { return RARITY_COLORS[r]?.bg || RARITY_COLORS.N.bg; }
export function rarityBorder(r) { return RARITY_COLORS[r]?.border || RARITY_COLORS.N.border; }
export function rarityText(r) { return RARITY_COLORS[r]?.text || RARITY_COLORS.N.text; }
export function rarityGradient(r) { return RARITY_GRADIENT[r] || RARITY_GRADIENT.N; }
export function rarityGlow(r) { return RARITY_GLOW[r] || ''; }
export function rarityJapanese(r) { return RARITY_JAPANESE[r] || RARITY_JAPANESE.N; }
