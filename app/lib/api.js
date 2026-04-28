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
  uploadImage: (formData) => {
    const token = getToken();
    return fetch('/api/user/upload', { method: 'POST', headers: { 'X-Session-Token': token }, body: formData }).then(r => r.json());
  },
  getUserUploads: (page = 1) => apiFetch(`/api/user/uploads?page=${page}`),

  // Draw
  draw: () => apiFetch('/api/draw'),
  multiDraw: (count = 10) => apiFetch('/api/draw/multi', { method: 'POST', body: JSON.stringify({ count }) }),
  drawLimited: (poolId) => apiFetch('/api/draw/limited', { method: 'POST', body: JSON.stringify({ poolId }) }),
  getLimitedPools: () => apiFetch('/api/limited/pools'),
  getDrawHistory: (page = 1, rarity) => apiFetch(`/api/draw/draw-history?page=${page}${rarity ? `&rarity=${rarity}` : ''}`),

  // Game
  playDice: (betAmount, prediction) => apiFetch('/api/game/dice', { method: 'POST', body: JSON.stringify({ betAmount, prediction }) }),
  craft: (targetRarity) => apiFetch('/api/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity }) }),
  shopBuy: (targetRarity) => apiFetch('/api/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity }) }),

  // Public
  getLibrary: (page = 1, limit = 20, rarity) => apiFetch(`/api/library/items?page=${page}&limit=${limit}${rarity ? `&rarity=${rarity}` : ''}`),
  getShowcase: () => apiFetch('/api/showcase'),
  getAnnouncement: () => apiFetch('/api/announcement'),
  getChangelog: () => apiFetch('/api/changelog'),

  // Admin
  adminVerify: (password) => apiFetch('/api/admin/verify', { method: 'POST', body: JSON.stringify({ password }) }),
  adminUsers: (password, page = 1, limit = 20) => apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ password, page, limit }) }),
  adminUpdatePoints: (password, targetId, amount) => apiFetch('/api/admin/update-points', { method: 'POST', body: JSON.stringify({ password, targetId, amount }) }),
  adminDeleteUser: (password, targetId) => apiFetch('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ password, targetId }) }),
  adminUploads: (password, status = 'pending', page = 1) => apiFetch('/api/admin/uploads', { method: 'POST', body: JSON.stringify({ password, status, page }) }),
  adminReviewUpload: (password, uploadId, action, rarity) => apiFetch('/api/admin/review-upload', { method: 'POST', body: JSON.stringify({ password, uploadId, action, rarity }) }),
  adminSaveChangelog: (password, logs) => apiFetch('/api/admin/save-changelog', { method: 'POST', body: JSON.stringify({ password, logs }) }),
  adminSaveAnnouncement: (password, announcement) => apiFetch('/api/admin/save-announcement', { method: 'POST', body: JSON.stringify({ password, announcement }) }),
};
