/**
 * 常量集中管理
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  SERVER_ERROR: 500
};

export const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

export const RARITY_LABELS = {
  N: 'N',
  R: 'R',
  SR: 'SR',
  SSR: 'SSR',
  UR: 'UR'
};

export const RARITY_COLORS = {
  N: '#64748B',
  R: '#3B82F6',
  SR: '#8B5CF6',
  SSR: '#F59E0B',
  UR: '#EF4444'
};

export const GAME_ACTIONS = {
  DRAW: 'draw',
  CRAFT: 'craft',
  SHOP_BUY: 'shop_buy',
  DICE_WIN: 'dice_win',
  CHECK_IN: 'check_in'
};
