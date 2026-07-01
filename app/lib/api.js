const API_BASE = '';

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionToken');
  }
  return null;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Session-Token': token } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `请求失败: ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // User
  getUserInfo: () => apiFetch('/api/user/info'),
  getInventory: () => apiFetch('/api/user/inventory'),
  checkIn: () => apiFetch('/api/user/check-in', { method: 'POST' }),
  getTitles: () => apiFetch('/api/user/titles'),
  equipTitle: (titleId) => apiFetch('/api/user/equip-title', { method: 'POST', body: JSON.stringify({ titleId }) }),
  updateProfile: (nickname) => apiFetch('/api/user/update-profile', { method: 'POST', body: JSON.stringify({ nickname }) }),
  claimReward: (targetLevel) => apiFetch('/api/user/claim-reward', { method: 'POST', body: JSON.stringify({ targetLevel }) }),

  // Draw
  draw: () => apiFetch('/api/draw'),
  multiDraw: (count = 10) => apiFetch('/api/draw/multi', { method: 'POST', body: JSON.stringify({ count }) }),
  drawLimited: (poolId, count = 1) => apiFetch('/api/draw/limited', { method: 'POST', body: JSON.stringify({ poolId, count }) }),
  getLimitedPools: () => apiFetch('/api/limited/pools'),
  getDrawHistory: (page = 1, rarity) => apiFetch(`/api/draw/draw-history?page=${page}${rarity ? `&rarity=${rarity}` : ''}`),

  // Game
  decompose: (rarity, count = 1) => apiFetch('/api/decompose', { method: 'POST', body: JSON.stringify({ rarity, count }) }),
  playDice: (betAmount) => apiFetch('/api/game/dice', { method: 'POST', body: JSON.stringify({ betAmount }) }),
  craft: (targetRarity) => apiFetch('/api/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity }) }),
  shopBuy: (targetRarity) => apiFetch('/api/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity }) }),

  // Public
  likeCard: (galleryId) => apiFetch('/api/library/like', { method: 'POST', body: JSON.stringify({ galleryId }) }),
  unlikeCard: (galleryId) => apiFetch('/api/library/like', { method: 'DELETE', body: JSON.stringify({ galleryId }) }),
  getLikeCounts: (ids) => apiFetch(`/api/library/like-counts?ids=${ids.join(',')}`),
  bookmarkCard: (galleryId) => apiFetch('/api/library/bookmark', { method: 'POST', body: JSON.stringify({ galleryId }) }),
  unbookmarkCard: (galleryId) => apiFetch('/api/library/bookmark', { method: 'DELETE', body: JSON.stringify({ galleryId }) }),
  getMyInteractions: () => apiFetch('/api/library/my-interactions'),

  // Admin
  adminVerify: (password) => apiFetch('/api/admin/verify', { method: 'POST', body: JSON.stringify({ password }) }),
  adminUsers: (password, page = 1, limit = 20) => apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ password, page, limit }) }),
  adminUploads: (password, status = 'pending', page = 1) => apiFetch('/api/admin/uploads', { method: 'POST', body: JSON.stringify({ password, status, page }) }),
  adminSaveAnnouncement: (password, announcement) => apiFetch('/api/admin/save-announcement', { method: 'POST', body: JSON.stringify({ password, announcement }) }),
};
