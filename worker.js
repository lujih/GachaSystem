/**
 * =========================================
 * 1. 配置区域 (CONFIG)
 * =========================================
 */
const CONFIG = {
  // 图源配置
  SOURCES: [
    { name: 'Random Anime', url: 'https://api.anosu.top/img', rarity: 'N' },
    { name: 'Kemonomimi', url: 'https://api.anosu.top/img?sort=furry', rarity: 'R' },
    { name: 'Pixiv Best', url: 'https://api.anosu.top/img?sort=pixiv', rarity: 'SR' },
    { name: 'Stockings', url: 'https://api.anosu.top/img?sort=setu', rarity: 'SSR' },
    { name: 'Absolute Territory', url: 'https://moe.jitsu.top/api?sort=r18', rarity: 'UR' }
  ],
  LIMITED: {
    COST: 500,
    NAME: "Limited Festival",
    SOURCES: [
      { name: 'Genshin Impact', url: 'https://v2.xxapi.cn/api/ys?return=302', rarity: 'UR' }
    ]
  },
  GAME: {
    POINTS: { 'N': 5, 'R': 10, 'SR': 30, 'SSR': 100, 'UR': 500 },
    CRAFT_COST: 5,
    SHOP: { 'R': 100, 'SR': 500, 'SSR': 2000, 'UR': 8000 },
    DICE: { MIN_BET: 10, MAX_BET: 1000, PAYOUT: 2 },
    PRELOAD: { ENABLED: true },
    TITLES: [
      { id: 'newbie', name: '萌新', color: '#94A3B8', check: u => (u.drawCount || 0) < 10 },
      { id: 'veteran', name: '老司机', color: '#10B981', check: u => (u.drawCount || 0) >= 50 },
      { id: 'whale', name: '肝帝', color: '#F59E0B', check: u => (u.drawCount || 0) >= 200 },
      { id: 'gambler', name: '赌神', color: '#8B5CF6', check: u => (u.wins || 0) >= 50 },
      { id: 'rich', name: '大富豪', color: '#FCD34D', check: u => (u.coins || 0) >= 5000 },
      { id: 'unlucky', name: '非酋', color: '#64748B', check: u => (u.inventory?.N || 0) > 20 && (u.inventory?.SSR || 0) === 0 },
      { id: 'lucky', name: '欧皇', color: '#EC4899', check: u => (u.inventory?.UR || 0) >= 1 }
    ]
  },
  R2_DOMAIN: "https://cft1.cszxorx.dpdns.org", 
  DEFAULT_IMG: "https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif",
  TTL: { USER: 86400 * 365, BUFFER: 86400, LEADERBOARD: 86400 * 30, GALLERY_CACHE: 86400 * 7 },
  KEYS: { GALLERY_INDEX: 'SYSTEM_GALLERY_INDEX_V1', CHANGELOG: 'SYSTEM_CHANGELOG', LEADERBOARD: 'recent', ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT' }
};

const DEFAULT_CHANGELOG = [
  { date: '2026-01-12', ver: 'v6.1.0', content: 'System Upgrade: Added strict Account/Password registration system.', tag: 'feature' },
  { date: 'Future', ver: 'To-Do', content: '1. Global Trade System (玩家交易系统)\n2. Guild Wars (公会战模式)', tag: 'todo' },
  { date: '2026-01-08', ver: 'v6.0.0', content: 'Refactor: New High-Performance Preload System.', tag: 'optimization' }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    
    // CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-ID' }
      });
    }

    const userId = request.headers.get('X-User-ID'); // 这里的 userId 现在对应 username
    const userService = new UserService(env);
    const gachaService = new GachaService(env, ctx, userService);

    const routes = {
      'GET /': () => handleHome(),
      // Auth Routes
      'POST /auth/register': () => userService.handleRegister(request),
      'POST /auth/login': () => userService.handleLogin(request),
      
      // Game Routes
      'GET /draw': () => gachaService.handleDraw(userId),
      'POST /draw/limited': () => gachaService.handleLimitedDraw(userId),
      'POST /user/craft': () => gachaService.handleCraft(userId, request),
      'POST /shop/buy': () => gachaService.handleShopBuy(userId, request),
      'POST /game/dice': () => gachaService.handleDice(userId, request),
      'GET /showcase': () => handleShowcase(env),
      'GET /library': () => handleLibrary(request, env, url),
      // User Info
      'GET /user/info': () => userService.handleInfo(userId, ctx, gachaService),
      'POST /user/update-profile': () => userService.handleUpdateProfile(userId, request),

      // System
      'GET /changelog': () => handleChangelog(env),
      'GET /announcement': () => handleGetAnnouncement(env),
      'POST /admin/save-announcement': () => handleAdminSaveAnnouncement(request, env),
      
      // Admin
      'POST /admin/verify': () => handleAdminVerify(request, env),
      'POST /admin/save-changelog': () => handleAdminSaveLog(request, env),
      'POST /admin/users': () => userService.handleAdminGetUsers(request, env),
      'POST /admin/delete-user': () => userService.handleAdminDeleteUser(request, env),
      'POST /admin/update-points': () => userService.handleAdminUpdatePoints(request, env)
    };

    const routeKey = `${method} ${url.pathname}`;
    const handler = routes[routeKey];

    if (handler) {
      try {
        return await handler();
      } catch (err) {
        return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
      }
    }
    return new Response('Not Found', { status: 404 });
  }
};

/**
 * =========================================
 * 2. 核心服务类 (Service Layer)
 * =========================================
 */

class UserService {
  constructor(env) {
    this.env = env;
  }

  async get(username) {
    if (!username) return null;
    return safeJsonParse(await this.env.USER_RECORDS.get(`u:${username}`));
  }

  async save(username, data) {
    if (data.bufferQueue) delete data.bufferQueue;
    data.lastUpdated = Date.now();
    await this.env.USER_RECORDS.put(`u:${username}`, JSON.stringify(data), { expirationTtl: CONFIG.TTL.USER });
  }

  async handleRegister(request) {
    const { username, nickname, password } = await request.json();
    
    if (!username || !nickname || !password) return jsonResponse({ error: 'Missing fields' }, 400);
    
    const userRegex = /^[a-zA-Z0-9]+$/;
    if (!userRegex.test(username)) return jsonResponse({ error: 'Invalid Username Format' }, 400);
    if (username.length < 3 || username.length > 16) return jsonResponse({ error: 'Invalid Username Length' }, 400);
    if (nickname.length > 12) return jsonResponse({ error: 'Nickname Too Long' }, 400);

    const existingUser = await this.env.USER_RECORDS.get(`u:${username}`);
    if (existingUser) return jsonResponse({ error: 'Username Taken' }, 409);

    const existingNick = await this.env.USER_RECORDS.get(`n:${nickname}`);
    if (existingNick) return jsonResponse({ error: 'Nickname Taken' }, 409);

    const newUser = {
      username: username,
      nickname: nickname,
      password: password,
      createdAt: Date.now(),
      drawCount: 0,
      coins: 0,
      inventory: {}
    };

    await this.save(username, newUser);
    await this.env.USER_RECORDS.put(`n:${nickname}`, username); 

    return jsonResponse({ success: true, username: username, nickname: nickname });
  }

  async handleLogin(request) {
    const { username, password } = await request.json();
    if (!username || !password) return jsonResponse({ error: 'Missing fields' }, 400);

    const user = await this.get(username);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);

    if (user.password !== password) {
      return jsonResponse({ error: 'Invalid Password' }, 403);
    }

    return jsonResponse({ success: true, user: { username: user.username, nickname: user.nickname, coins: user.coins } });
  }

  async handleInfo(userId, ctx, gachaService) {
    if (!userId) return jsonResponse(null);
    let record = await this.get(userId);
    
    if (record) {
      if (CONFIG.GAME.PRELOAD.ENABLED) {
        ctx.waitUntil(gachaService.refillBuffer(userId, record.username));
      }
      const titles = CONFIG.GAME.TITLES.filter(t => t.check(record));
      record.title = titles.length > 0 ? titles[titles.length - 1] : null;
      const safeRecord = { ...record };
      delete safeRecord.password;
      return jsonResponse(safeRecord);
    }
    return jsonResponse(null); 
  }

  async handleUpdateProfile(userId, request) {
    if (!userId) return jsonResponse({ error: 'Not Logged In' }, 403);
    const { nickname, password } = await request.json();
    
    let user = await this.get(userId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);

    if (nickname && nickname !== user.nickname) {
       if (nickname.length > 12) return jsonResponse({ error: 'Nickname Too Long' }, 400);
       const existingNick = await this.env.USER_RECORDS.get(`n:${nickname}`);
       if (existingNick && existingNick !== userId) return jsonResponse({ error: 'Nickname Taken' }, 409);
       
       await this.env.USER_RECORDS.delete(`n:${user.nickname}`);
       await this.env.USER_RECORDS.put(`n:${nickname}`, userId);
       user.nickname = nickname;
    }

    if (password) user.password = password;

    await this.save(userId, user);
    return jsonResponse({ success: true, user: { nickname: user.nickname } });
  }

  async handleAdminGetUsers(request, env) {
    const { password } = await request.json();
    if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
    
    const list = await env.USER_RECORDS.list({ prefix: 'u:', limit: 100 });
    const users = await Promise.all(list.keys.map(async key => {
      const record = await safeJsonParse(await env.USER_RECORDS.get(key.name));
      return record ? {
        id: record.username,
        username: record.username,
        nickname: record.nickname,
        drawCount: record.drawCount || 0, 
        coins: record.coins || 0
      } : null;
    }));
    
    return jsonResponse({ success: true, users: users.filter(u => u !== null).sort((a, b) => b.drawCount - a.drawCount).slice(0, 50) });
  }

  async handleAdminDeleteUser(request, env) {
    const { password, targetId } = await request.json(); 
    if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
    
    const user = await this.get(targetId);
    if (user) {
        if (user.nickname) await env.USER_RECORDS.delete(`n:${user.nickname}`);
        await env.USER_RECORDS.delete(`u:${targetId}`);
        await env.USER_RECORDS.delete(`buffer:${targetId}`);
        return jsonResponse({ success: true });
    }
    return jsonResponse({ error: 'User Not Found' }, 404);
  }

  async handleAdminUpdatePoints(request, env) {
    const { password, targetId, amount } = await request.json();
    if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
    let user = await this.get(targetId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);
    user.coins = (user.coins || 0) + parseInt(amount);
    if (user.coins < 0) user.coins = 0;
    await this.save(targetId, user);
    return jsonResponse({ success: true, newBalance: user.coins });
  }
}

class GachaService {
  constructor(env, ctx, userService) {
    this.env = env;
    this.ctx = ctx;
    this.userService = userService;
  }

  getBufferKey(userId) { return `buffer:${userId}`; }

  async handleDraw(userId) {
    const [user, bufferData] = await Promise.all([
      this.userService.get(userId),
      this.env.USER_RECORDS.get(this.getBufferKey(userId))
    ]);

    if (!user) return jsonResponse({ error: 'User Not Found' }, 403);

    let assetData = safeJsonParse(bufferData);

    if (assetData && assetData.success) {
      this.ctx.waitUntil(this.env.USER_RECORDS.delete(this.getBufferKey(userId)));
    } else {
      const source = CONFIG.SOURCES[Math.floor(Math.random() * CONFIG.SOURCES.length)];
      assetData = await this.fetchAndUpload(user.username, source);
    }

    const result = await this.settleTransaction(userId, user, assetData);
    this.ctx.waitUntil(this.refillBuffer(userId, user.username));
    return result;
  }

  async handleLimitedDraw(userId) {
    let user = await this.userService.get(userId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);

    const cost = CONFIG.LIMITED.COST;
    if ((user.coins || 0) < cost) {
      return jsonResponse({ error: 'Not Enough Points', needed: cost, current: user.coins }, 403);
    }

    user.coins -= cost;

    const source = CONFIG.LIMITED.SOURCES[Math.floor(Math.random() * CONFIG.LIMITED.SOURCES.length)];
    const assetData = await this.fetchAndUpload(user.username, source);

    const result = await this.settleTransaction(userId, user, assetData, true);
    this.ctx.waitUntil(this.refillBuffer(userId, user.username));
    return result;
  }

  async handleShopBuy(userId, request) {
    const { targetRarity } = await request.json(); 
    const price = CONFIG.GAME.SHOP[targetRarity];
    if (!price) return jsonResponse({ error: 'Invalid Pack' }, 400);

    let user = await this.userService.get(userId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);
    if ((user.coins || 0) < price) return jsonResponse({ error: 'Not Enough Points', needed: price, current: user.coins }, 403);

    user.coins -= price;

    const source = CONFIG.SOURCES.find(s => s.rarity === targetRarity) || CONFIG.SOURCES[0];
    const assetData = await this.fetchAndUpload(user.username, source);

    const result = await this.settleTransaction(userId, user, assetData, true);
    this.ctx.waitUntil(this.refillBuffer(userId, user.username));
    return result;
  }

  async handleCraft(userId, request) {
    const { targetRarity } = await request.json();
    let user = await this.userService.get(userId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);

    const costMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const costRarity = costMap[targetRarity];
    if (!costRarity) return jsonResponse({ error: 'Invalid Rarity' }, 400);
    
    user.inventory = user.inventory || {};
    const owned = user.inventory[costRarity] || 0;
    if (owned < CONFIG.GAME.CRAFT_COST) return jsonResponse({ error: 'Not Enough Materials', current: owned }, 403);

    user.inventory[costRarity] -= CONFIG.GAME.CRAFT_COST;

    const source = CONFIG.SOURCES.find(s => s.rarity === targetRarity);
    const assetData = await this.fetchAndUpload(user.username, source);

    const result = await this.settleTransaction(userId, user, assetData, true);
    this.ctx.waitUntil(this.refillBuffer(userId, user.username));
    return result;
  }

  async handleDice(userId, request) {
    const { betAmount, prediction } = await request.json();
    const bet = parseInt(betAmount);
    if (isNaN(bet) || bet < CONFIG.GAME.DICE.MIN_BET || bet > CONFIG.GAME.DICE.MAX_BET) {
      return jsonResponse({ error: `Bet range: ${CONFIG.GAME.DICE.MIN_BET}-${CONFIG.GAME.DICE.MAX_BET}` }, 400);
    }
    
    let user = await this.userService.get(userId);
    if (!user) return jsonResponse({ error: 'User Not Found' }, 404);
    if ((user.coins || 0) < bet) return jsonResponse({ error: 'Not Enough Points' }, 403);

    user.coins -= bet;
    const roll = Math.floor(Math.random() * 6) + 1;
    const isSmall = roll <= 3;
    const isWin = (prediction === 'small' && isSmall) || (prediction === 'big' && !isSmall);
    
    let winAmount = 0;
    if (isWin) {
      winAmount = bet * CONFIG.GAME.DICE.PAYOUT;
      user.coins += winAmount;
      user.wins = (user.wins || 0) + 1;
    }
    
    await this.userService.save(userId, user);
    return jsonResponse({ success: true, roll, isWin, winAmount, newBalance: user.coins });
  }

  async refillBuffer(userId, username) {
    try {
        const key = this.getBufferKey(userId);
        const existing = await this.env.USER_RECORDS.get(key);
        if (existing) return; 

        const source = CONFIG.SOURCES[Math.floor(Math.random() * CONFIG.SOURCES.length)];
        const assetData = await this.fetchAndUpload(username, source); 

        if (assetData.success) {
            await this.env.USER_RECORDS.put(key, JSON.stringify(assetData), { expirationTtl: CONFIG.TTL.BUFFER });
        }
    } catch(e) { console.error('Refill Error:', e); }
  }

  async fetchAndUpload(username, source) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const imgRes = await fetch(source.url, { signal: controller.signal });
        clearTimeout(timeout);

        if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
            const timestamp = Date.now();
            const base64Name = btoa(encodeURIComponent(username)).replace(/[/+=]/g, '_');
            const randomStr = Math.random().toString(36).slice(2, 6);
            const filename = `images/${base64Name}___${timestamp}___${randomStr}.jpg`;
            await this.env.R2_BUCKET.put(filename, buffer, { httpMetadata: { contentType: contentType } });
            return { success: true, imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`, rarity: source.rarity, sourceName: source.name, timestamp: timestamp };
        }
    } catch (e) { console.error('Fetch Asset Error', e); }
    return { success: false, rarity: 'N' };
  }

  async settleTransaction(userId, user, assetData, skipPoints = false) {
    const timestamp = Date.now();
    let finalImageUrl = CONFIG.DEFAULT_IMG;
    const pointsEarned = assetData.success ? (CONFIG.GAME.POINTS[assetData.rarity] || 1) : 0;

    if (assetData.success) {
      finalImageUrl = assetData.imageUrl;
      user.drawCount = (user.drawCount || 0) + 1;
      if (!skipPoints) user.coins = (user.coins || 0) + pointsEarned;
      user.inventory = user.inventory || {};
      user.inventory[assetData.rarity] = (user.inventory[assetData.rarity] || 0) + 1;
      user.lastImageUrl = finalImageUrl;

      const updates = [
        this.userService.save(userId, user),
        updateLeaderboard(this.env, {
          username: user.nickname || user.username,
          imageUrl: finalImageUrl, sourceName: assetData.sourceName,
          timestamp: timestamp, timeText: new Date(timestamp).toLocaleString('zh-CN', { hour12: false }),
          success: true, rarity: assetData.rarity
        }),
        updateGalleryIndex(this.env, { url: finalImageUrl, username: user.username, ts: timestamp })
      ];
      this.ctx.waitUntil(Promise.all(updates));
    }

    return jsonResponse({
      imageUrl: finalImageUrl,
      timestamp: timestamp,
      success: assetData.success,
      rarity: assetData.rarity,
      points: skipPoints ? 0 : pointsEarned,
      userCoins: user.coins,
      inventory: user.inventory
    });
  }
}

async function handleHome() {
  return new Response(getHtmlPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function handleChangelog(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse(DEFAULT_CHANGELOG);
  let logs = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.CHANGELOG));
  return jsonResponse(logs || DEFAULT_CHANGELOG);
}

async function handleGetAnnouncement(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse({ enabled: false });
  const data = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.ANNOUNCEMENT));
  return jsonResponse(data || { enabled: false, title: "", content: "", id: 0 });
}

async function handleAdminSaveAnnouncement(request, env) {
  const { password, announcement } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
  const dataToSave = { ...announcement, id: Date.now() };
  await env.RECENT_REQUESTS.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify(dataToSave));
  return jsonResponse({ success: true });
}

async function handleShowcase(env) {
    if (!env.RECENT_REQUESTS) return jsonResponse([]);
    const list = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.LEADERBOARD)) || [];
    return jsonResponse(list.sort(() => 0.5 - Math.random()).slice(0, 6));
}

async function handleLibrary(request, env, url) {
  if (!env.RECENT_REQUESTS) return new Response('Service Unavailable', { status: 503 });
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 20;
  let galleryItems = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.GALLERY_INDEX));
  if (!galleryItems || galleryItems.length === 0) {
    galleryItems = await rebuildGalleryIndexFromR2(env, CONFIG.KEYS.GALLERY_INDEX);
  }
  const totalItems = galleryItems ? galleryItems.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const pageItems = galleryItems ? galleryItems.slice((currentPage - 1) * pageSize, currentPage * pageSize) : [];
  return new Response(getLibraryHtml(pageItems, { currentPage, totalPages, totalItems }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function handleAdminVerify(request, env) {
  const { password } = await request.json();
  return jsonResponse({ success: password === env.admin }, password === env.admin ? 200 : 403);
}

async function handleAdminSaveLog(request, env) {
  const { password, logs } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
  await env.RECENT_REQUESTS.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(logs));
  return jsonResponse({ success: true });
}

async function updateLeaderboard(env, newItem) {
  if (!env.RECENT_REQUESTS) return;
  const key = CONFIG.KEYS.LEADERBOARD;
  let list = await safeJsonParse(await env.RECENT_REQUESTS.get(key)) || [];
  list.unshift(newItem);
  if (list.length > 50) list = list.slice(0, 50);
  await env.RECENT_REQUESTS.put(key, JSON.stringify(list), { expirationTtl: CONFIG.TTL.LEADERBOARD });
}

async function updateGalleryIndex(env, newItem) {
  if (!env.RECENT_REQUESTS) return;
  const indexKey = CONFIG.KEYS.GALLERY_INDEX;
  let list = await safeJsonParse(await env.RECENT_REQUESTS.get(indexKey)) || [];
  list.unshift(newItem);
  if (list.length > 3000) list = list.slice(0, 3000); 
  await env.RECENT_REQUESTS.put(indexKey, JSON.stringify(list), { expirationTtl: CONFIG.TTL.GALLERY_CACHE });
}

async function rebuildGalleryIndexFromR2(env, indexKey) {
    if (!env.R2_BUCKET) return [];
    let allObjects = [];
    let truncated = true, cursor, limitCount = 0;
    try {
        while (truncated && limitCount < 4) {
            const list = await env.R2_BUCKET.list({ prefix: 'images/', cursor, limit: 500 });
            truncated = list.truncated; cursor = list.cursor;
            allObjects.push(...list.objects);
            limitCount++;
        }
    } catch(e) { return []; }
    const items = allObjects.map(obj => {
        const parts = obj.key.replace('images/', '').split('___');
        let username = 'Unknown', ts = obj.uploaded.getTime();
        if (parts.length >= 2) {
            try { username = decodeURIComponent(atob(parts[0].replace(/_/g, '/'))); } catch (e) {}
            const fileTs = parseInt(parts[1]); if (!isNaN(fileTs)) ts = fileTs;
        }
        return { url: `${CONFIG.R2_DOMAIN}/${obj.key}`, username, ts };
    }).sort((a, b) => b.ts - a.ts);
    await env.RECENT_REQUESTS.put(indexKey, JSON.stringify(items), { expirationTtl: CONFIG.TTL.GALLERY_CACHE });
    return items;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }

const NEUTRAL_CSS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --primary: #3B82F6; --primary-dark: #2563EB; --secondary: #10B981;
    --bg-color: #F8FAFC; --card-bg: rgba(255, 255, 255, 0.95);
    --text-main: #334155; --text-light: #94A3B8; --danger: #EF4444;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius: 16px; --font: 'M PLUS Rounded 1c', sans-serif;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    background-color: var(--bg-color);
    background-image: linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px);
    background-size: 30px 30px; color: var(--text-main); font-family: var(--font); margin: 0; min-height: 100vh; overflow-x: hidden;
  }
  .btn {
    background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 0 var(--primary-dark); transition: all 0.1s; font-size: 0.95rem; font-family: var(--font);
  }
  .btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--primary-dark); }
  .btn.secondary { background: white; color: var(--text-main); border: 2px solid #E2E8F0; box-shadow: 0 4px 0 #CBD5E1; }
  .btn.secondary:active { box-shadow: 0 0 0 #CBD5E1; }
  .btn.danger { background: var(--danger); box-shadow: 0 4px 0 #B91C1C; }
  .btn.danger:active { box-shadow: 0 0 0 #B91C1C; }
  .glass-card { background: var(--card-bg); border: 1px solid #E2E8F0; border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .modal { 
    position: fixed; inset: 0; 
    background: rgba(15, 23, 42, 0.4); 
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: none; justify-content: center; align-items: center; 
    z-index: 2000; opacity: 0; transition: 0.2s; 
  }
  .modal.show { display: flex; opacity: 1; }
  .modal-content { 
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 24px; border-radius: var(--radius); 
    width: 90%; max-width: 450px; text-align: center; 
    transform: scale(0.95); transition: 0.2s; 
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
    max-height: 90vh; overflow-y: auto; position: relative; 
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
  .modal.show .modal-content { transform: scale(1); }
  .placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-light); text-align: center; font-size: 0.9rem; }
  .placeholder i { font-size: 3rem; margin-bottom: 16px; display: block; color: #CBD5E1; }
  .modal-close-btn { position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; color: var(--text-light); cursor: pointer; padding: 5px; z-index: 10; }
  .modal-close-btn:hover { color: var(--danger); transform: rotate(90deg); transition: 0.2s; }
  .actions { padding: 16px 10px 10px 10px; display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1fr; }
  #drawBtn { grid-column: 1 / -1; height: 54px; font-size: 1.1rem; box-shadow: 0 6px 0 var(--primary-dark); }
  #drawBtn:active { transform: translateY(6px); box-shadow: 0 0 0 var(--primary-dark); }
  .actions .btn.secondary { padding: 8px 0; font-size: 1.2rem; }
  @media(min-width: 600px) {
    .actions { grid-template-columns: 2fr 1fr 1fr 1fr; }
    #drawBtn { grid-column: auto; height: auto; font-size: 0.95rem; }
    .actions .btn.secondary { font-size: 0.95rem; }
  }
  .rules-table { width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 10px; }
  .rules-table th { text-align: left; border-bottom: 2px solid #E2E8F0; padding: 6px; color: var(--primary); }
  .rules-table td { border-bottom: 1px solid #F1F5F9; padding: 6px; }
  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .shop-item { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
  .shop-item:hover { border-color: var(--primary); transform: translateY(-3px); }
  .shop-item i { font-size: 2rem; margin-bottom: 10px; color: var(--primary); }
  .shop-item.disabled { opacity: 0.6; filter: grayscale(1); cursor: not-allowed; border-color: #E2E8F0 !important; transform: none !important; }
  .price-tag { background: #FEF3C7; color: #D97706; padding: 4px 8px; border-radius: 6px; font-weight:bold; font-size:0.85rem; margin-top:8px; display:inline-block; }
  .shop-item.can-craft { border: 2px solid var(--secondary); background-color: #ECFDF5; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); animation: pulse 2s infinite; }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
  .shop-cost { font-size: 0.8rem; color: var(--text-light); margin-top: 5px; }
  .rarity-tag { position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 12px; border-radius: 8px; font-weight: 900; color: white; font-size: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); opacity: 0; transform: scale(0.8); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid rgba(255,255,255,0.8); }
  .rarity-tag.show { opacity: 1; transform: scale(1); }
  .r-n { background: #64748B; } .r-r { background: #3B82F6; } .r-sr { background: #8B5CF6; } .r-ssr { background: linear-gradient(135deg, #F59E0B, #D97706); }
  .r-ur { background: linear-gradient(45deg, #EF4444, #EC4899, #8B5CF6); background-size: 200% 200%; animation: rainbow 3s ease infinite; border-color: #FFF; }
  @keyframes rainbow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  .admin-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85rem; text-align: left; }
  .admin-table th { color: var(--text-light); font-weight: bold; padding: 8px; border-bottom: 2px solid #E2E8F0; }
  .admin-table td { padding: 8px; border-bottom: 1px solid #F1F5F9; }
  .admin-input { width: 100%; padding: 6px; border: 1px solid #E2E8F0; border-radius: 6px; font-family: var(--font); }
  .admin-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #F1F5F9; padding-bottom: 10px; }
  .admin-tab { padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; cursor: pointer; color: var(--text-light); transition: 0.2s; }
  .admin-tab.active { background: #E0F2FE; color: var(--primary); }
  .user-pill { background: white; padding: 6px 14px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .title-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.7rem; font-weight: bold; vertical-align: middle; margin-left: 6px; text-shadow: 0 1px 1px rgba(0,0,0,0.2); }
  .lang-btn { background: white; border: 1px solid #E2E8F0; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: bold; cursor: pointer; color: var(--text-light); transition: 0.2s; }
  .user-badge { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; }
  .user-row-meta { font-size: 0.75rem; color: #94A3B8; }
  .dice-stage { font-size: 5rem; color: var(--primary); margin: 20px 0; height: 80px; display: flex; align-items: center; justify-content: center; }
  .dice-result-anim { animation: shake 0.5s infinite; }
  @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(10deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(-10deg); } 100% { transform: rotate(0deg); } }
  .bet-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
  .bet-btn { padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1rem; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
  .bet-btn.small { background: #E0F2FE; color: #0284C7; border-color: #BAE6FD; }
  .bet-btn.small:hover { background: #BAE6FD; }
  .bet-btn.big { background: #FEE2E2; color: #DC2626; border-color: #FECACA; }
  .bet-btn.big:hover { background: #FECACA; }
  .banner-tabs {display: flex;background: rgba(255,255,255,0.5);border-radius: 12px;padding: 4px;margin-bottom: 12px;border: 1px solid #E2E8F0;}
  .banner-tab {flex: 1;text-align: center;padding: 8px;border-radius: 8px;font-size: 0.9rem;font-weight: 800;cursor: pointer;color: var(--text-light);transition: 0.2s;position: relative;overflow: hidden;}
  .banner-tab.active {background: white;color: var(--primary);box-shadow: 0 2px 4px rgba(0,0,0,0.05);color: var(--primary);}
  .banner-tab.active.limited {color: #EF4444;}
  .btn.limited-btn {background: linear-gradient(45deg, #EF4444, #F59E0B);box-shadow: 0 4px 0 #B91C1C;border: none;}
  .btn.limited-btn:active {box-shadow: 0 0 0 #B91C1C;}
  .pool-info-tag {font-size: 0.7rem;background: rgba(0,0,0,0.05);padding: 2px 6px;border-radius: 4px;margin-left: 4px;vertical-align: middle;}
  .auth-tabs { display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #E2E8F0; padding-bottom:10px; }
  .auth-tab { flex:1; padding:8px; cursor:pointer; font-weight:bold; color:var(--text-light); border-radius:8px; transition:0.2s; }
  .auth-tab.active { background:var(--bg-color); color:var(--primary); }
</style>
`;

const I18N_TEXT = {
  en: {
    ready: "READY TO DRAW", start: "START", showcase: "Showcase", loading: "Loading...",
    changelog: "Changelog", more: "Show More", less: "Show Less",
    id_check: "Authentication", reg_tip: "Sign up or Login to play.",
    confirm: "Submit", profile: "User Profile", name: "Nickname:", draws: "Total Draws:",
    logout: "Logout", close: "Close", guest: "Guest",
    retry: "RETRY", again: "AGAIN", name_req: "Missing fields",
    net_err: "Network Error", reg_ok: "Registered! Please Login.", success: "Gacha Success",
    fail: "Connection Failed", clear_confirm: "Are you sure you want to log out?",
    btn_lang: "En", back: "Back", page: "Page", admin_panel: "Admin Panel",
    admin_auth: "Admin Access", pass_tip: "Enter admin password", edit_log: "Visual Changelog Editor",
    save: "Save Changes", verify_fail: "Incorrect Password", save_ok: "Saved!", save_err: "Save Failed",
    add_row: "+ Add Row", del: "Del", date: "Date", ver: "Ver", content: "Content",
    users_title: "Registered Users", users_tab: "Users", log_tab: "Changelog",
    user_col: "Username", draws_col: "Draws", last_active_col: "Last Active", action_col: "Action",
    delete_confirm: "Delete this user?", name_taken: "Name taken",
    delete_ok: "User Deleted",
    craft_title: "Card Synthesis", craft_desc: "Burn 5 low-rarity cards.",
    shop_title: "Token Shop", shop_desc: "Spend points.",
    buy: "Buy", points_short: "pts", buy_ok: "Purchase Successful!", no_money: "Not enough points!",
    owned: "Owned", cost: "Cost", craft_ok: "Craft Success!",
    rules_title: "Point Rules", rules_desc: "Points can be used in the Shop.",
    rule_action: "Action", rule_points: "Points", points_label: "Coins:",
    dice_title: "Guess Size", dice_desc: "Small (1-3) or Big (4-6). Pays 1:1.",
    bet_ph: "Bet Amount (10-1000)", small: "SMALL (1-3)", big: "BIG (4-6)",
    win: "YOU WIN!", lose: "YOU LOSE", points_col: "Coins", edit_points: "Mod", edit_points_prompt: "Enter points to add/sub:",
    pool_std: "Standard", pool_ltd: "Limited", ltd_cost: "Cost:", start_ltd: "SUMMON",
    login_tab: "Login", reg_tab: "Register", username_ph: "Username (a-z, 0-9)", nick_ph: "Nickname (Display)", pass_ph: "Password",
    craft_confirm: "Consume 5 cards to craft 1 {target}?",
    buy_confirm: "Spend {price} points?",
    min_bet: "Minimum bet is 10",
    server_err_no_money: "Not enough points!",
    server_err_taken: "Username/Nickname already taken",
    server_err_user_missing: "User not found",
    server_err_pass: "Invalid Password",
    server_err_auth: "Auth Failed",
    img_load_err: "Image Load Error",
    ann_title_def: "Notification",
    ann_enabled: "Enabled",
    ann_disabled: "Disabled",
    ann_preview: "Preview",
    ann_publish: "Publish",
    ann_title: "Title",
    ann_status: "Status",
    low_pts: "Low Pts"
  },
  zh: {
    ready: "准备召唤", start: "召唤", showcase: "精选图库", loading: "加载中...",
    changelog: "更新履历", more: "展开更多", less: "收起列表",
    id_check: "身份验证", reg_tip: "请登录或注册以继续。",
    confirm: "提交", profile: "个人档案", name: "昵称：", draws: "召唤次数：",
    logout: "注销", close: "关闭", guest: "未登录",
    retry: "重试", again: "再召唤", name_req: "请填写完整信息",
    net_err: "网络错误", reg_ok: "注册成功，请登录", success: "召唤成功",
    fail: "连接中断", clear_confirm: "确定要注销吗？",
    btn_lang: "汉", back: "返回", page: "第", admin_panel: "管理面板",
    admin_auth: "管理员认证", pass_tip: "请输入管理员密码", edit_log: "可视化日志编辑器",
    save: "保存更改", verify_fail: "密码错误", save_ok: "保存成功！", save_err: "保存失败",
    add_row: "+ 新增一行", del: "删", date: "日期", ver: "版本", content: "内容",
    users_title: "注册用户列表", users_tab: "用户管理", log_tab: "更新日志",
    user_col: "账号/昵称", draws_col: "召唤数", last_active_col: "最近活跃", action_col: "操作",
    delete_confirm: "确定删除该用户吗？此操作不可逆。", name_taken: "昵称或账号已被占用",
    delete_ok: "用户已删除",
    craft_title: "卡片合成", craft_desc: "消耗5张低阶卡片，进行一次高阶召唤。",
    shop_title: "积分商店", shop_desc: "消耗积分购买指定等级的卡包。",
    buy: "购买", points_short: "分", buy_ok: "购买成功！", no_money: "积分不足！",
    owned: "持有", cost: "消耗", craft_ok: "合成召唤成功！",
    rules_title: "积分规则", rules_desc: "积分可用于在商店购买物品。",
    rule_action: "行为", rule_points: "获得积分", points_label: "当前积分：",
    dice_title: "猜大小", dice_desc: "小(1-3) 或 大(4-6)，赔率1:1。",
    bet_ph: "下注金额 (10-1000)", small: "押小 (1-3)", big: "押大 (4-6)",
    win: "你赢了！", lose: "你输了", points_col: "积分", edit_points: "改", edit_points_prompt: "输入要增加或减少的积分:",
    pool_std: "常驻池", pool_ltd: "限定池", ltd_cost: "消耗:", start_ltd: "召唤",
    login_tab: "登录", reg_tab: "注册", username_ph: "账号 (英文/数字)", nick_ph: "昵称 (显示名)", pass_ph: "密码",
    craft_confirm: "确定消耗5张低阶卡合成1张 {target} 吗？",
    buy_confirm: "确定花费 {price} 积分吗？",
    min_bet: "最小下注为 10",
    server_err_no_money: "积分不足！",
    server_err_taken: "用户名或昵称已被占用",
    server_err_user_missing: "用户不存在",
    server_err_pass: "密码错误",
    server_err_auth: "认证失败",
    img_load_err: "图片加载失败",
    ann_title_def: "公告",
    ann_enabled: "已启用",
    ann_disabled: "已禁用",
    ann_preview: "预览",
    ann_publish: "发布 / 保存",
    ann_title: "标题",
    ann_status: "状态",
    low_pts: "积分不足"
  }
};

function getHtmlPage() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Gacha System</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  ${NEUTRAL_CSS}
  <style>
    body { padding: 20px 20px 60px 20px; display: flex; flex-direction: column; align-items: center; }
    .header { width: 100%; max-width: 600px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .logo { font-size: 1.4rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; }
    .logo span { color: var(--primary); }
    .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
    .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
    .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
    .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
    .stage img.show { opacity: 1; }
    .panel-container { display: flex; flex-direction: column; gap: 24px; }
    .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 800; font-size: 1rem; padding: 0 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    .grid-item { aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #F1F5F9; cursor: pointer; border: 1px solid #E2E8F0; transition: 0.2s; }
    .grid-item:hover { border-color: var(--primary); transform: translateY(-2px); }
    .grid-item img { width: 100%; height: 100%; object-fit: cover; }
    .input-group input { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-family: var(--font); font-size: 1rem; text-align: center; color: var(--text-main); margin-bottom: 20px; outline: none; background: #F8FAFC; }
    .input-group input:focus { border-color: var(--primary); background: white; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 10px; z-index: 3000; animation: slideDown 0.3s; }
    @keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    .log-container { padding: 20px; text-align: left; }
    .log-header { font-size: 1rem; font-weight: 800; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--primary); }
    .log-item { padding-left: 16px; border-left: 2px solid #E2E8F0; margin-bottom: 15px; position: relative; }
    .log-item::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid white; }
    .log-meta { font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .log-ver { font-weight: bold; color: var(--text-main); background: #F1F5F9; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
    .log-ver.todo {background: #F3E8FF;color: #7E22CE;border-color: #D8B4FE;box-shadow: 0 0 5px rgba(168, 85, 247, 0.2);}
    .log-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: bold; color: white; text-shadow: 0 1px 1px rgba(0,0,0,0.2); white-space: nowrap; }
    .log-content { font-size: 0.9rem; line-height: 1.5; color: var(--text-main); white-space: pre-wrap; }
    .log-toggle { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0; color: var(--text-light); cursor: pointer; font-size: 0.85rem; }
    .log-list.collapsed .log-item:nth-child(n+4) { display: none; }
    .md-content { text-align: left; padding: 10px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; max-height: 60vh; overflow-y: auto; color: var(--text-main); line-height: 1.6; }
    .md-content h1, .md-content h2, .md-content h3 { margin-top: 1em; margin-bottom: 0.5em; color: var(--primary-dark); }
    .md-content h1 { font-size: 1.5em; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
    .md-content h2 { font-size: 1.3em; }
    .md-content p { margin-bottom: 1em; }
    .md-content ul, .md-content ol { padding-left: 20px; margin-bottom: 1em; }
    .md-content li { margin-bottom: 5px; }
    .md-content code { background: #E2E8F0; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #D97706; }
    .md-content blockquote { border-left: 4px solid var(--primary); margin: 0; padding-left: 10px; color: var(--text-light); background: #EFF6FF; padding: 8px; border-radius: 4px; }
    .md-content img { max-width: 100%; border-radius: 6px; }
    .admin-textarea { width: 100%; height: 200px; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: monospace; resize: vertical; margin-bottom: 10px; }
    .toggle-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #F1F5F9; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="logo"><i class="fas fa-cube"></i> Gacha<span>System</span></div>
    <div style="display:flex; gap:10px; align-items:center;">
       <div class="user-pill" onclick="App.openProfile()">
         <i class="fas fa-user-astronaut"></i> <span id="navNickname">Guest</span>
         <span id="navTitle"></span>
       </div>
       <div class="lang-btn" onclick="App.toggleLang()" id="langBtn">En</div>
    </div>
  </header>

  <div class="main-grid">
    <div class="gacha-card">
      <div class="banner-tabs">
        <div class="banner-tab active" id="tab-std" onclick="App.switchPool('std')">
            <span data-i18n="pool_std">Standard</span>
        </div>
        <div class="banner-tab" id="tab-ltd" onclick="App.switchPool('ltd')">
            <span data-i18n="pool_ltd">Limited</span>
            <span class="pool-info-tag" id="ltdCostDisplay">500pts</span>
        </div>
      </div>
      <div class="stage" id="stage">
        <div id="rarityTag" class="rarity-tag">SSR</div>
        <div class="placeholder" id="placeholder">
          <i class="fas fa-gamepad"></i>
          <div data-i18n="ready">READY TO DRAW</div>
        </div>
        <img id="resultImg" alt="Result">
      </div>
      <div class="actions">
        <button class="btn" onclick="App.draw()" id="drawBtn">
          <i class="fas fa-bolt"></i> <span data-i18n="start">START</span>
        </button>
        <button class="btn secondary" onclick="App.openCraft()" style="background:#FFF7ED; border-color:#FED7AA;">
          <i class="fas fa-flask"></i>
        </button>
        <button class="btn secondary" onclick="App.openShop()">
          <i class="fas fa-store"></i>
        </button>
        <button class="btn secondary" onclick="App.openDice()" style="background:#F0F9FF; border-color:#BAE6FD;">
          <i class="fas fa-dice"></i>
        </button>
        <a href="/library" class="btn secondary"><i class="fas fa-th-large"></i></a>
      </div>
    </div>

    <div class="panel-container">
      <div class="showcase-box">
        <div class="box-header">
          <span><i class="fas fa-star" style="color:#F59E0B"></i> <span data-i18n="showcase">Showcase</span></span>
          <i class="fas fa-rotate" style="cursor:pointer; font-size:0.9rem; color:#94A3B8" onclick="App.loadShowcase()"></i>
        </div>
        <div class="grid" id="showcaseGrid">
          <div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;" data-i18n="loading">Loading...</div>
        </div>
      </div>
      <div class="glass-card log-container">
        <div class="log-header"><i class="fas fa-code-branch"></i> <span data-i18n="changelog">Changelog</span></div>
        <div id="logList" class="log-list collapsed">
          <div style="text-align:center; color:#94A3B8;" data-i18n="loading">Loading...</div>
        </div>
        <div class="log-toggle" id="logToggle" onclick="App.toggleLog()" style="display:none">
          <span data-i18n="more">Show More</span> <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
  </div>

  <div id="authModal" class="modal">
    <div class="modal-content">
      <h3 style="margin-top:0; color:var(--text-main)" data-i18n="id_check">Authentication</h3>
      <div class="auth-tabs">
         <div class="auth-tab active" id="tab-login" onclick="App.switchAuth('login')" data-i18n="login_tab">Login</div>
         <div class="auth-tab" id="tab-register" onclick="App.switchAuth('register')" data-i18n="reg_tab">Register</div>
      </div>
      
      <div id="authForm">
        <div class="input-group">
            <input type="text" id="authUsername" placeholder="Username (a-z, 0-9)" data-i18n="username_ph">
        </div>
        <div class="input-group" id="nickGroup" style="display:none;">
            <input type="text" id="authNickname" placeholder="Nickname (Display Name)" data-i18n="nick_ph">
        </div>
        <div class="input-group">
            <input type="password" id="authPassword" placeholder="Password" data-i18n="pass_ph">
        </div>
      </div>
      
      <button class="btn" style="width:100%;" onclick="App.doAuth()" data-i18n="confirm">Confirm</button>
    </div>
  </div>

  <div id="profileModal" class="modal">
    <div class="modal-content">
      <h3 style="margin-top:0;" data-i18n="profile">User Profile</h3>
      <div style="background:#F8FAFC; padding:16px; border-radius:8px; margin-bottom:20px; font-size:0.9rem; text-align:left; border:1px solid #E2E8F0;">
        <div style="margin-bottom:8px;"><strong data-i18n="name">Nickname:</strong> <span id="profileNickname"></span></div>
        <div style="font-size:0.8rem; color:#94A3B8; word-break:break-all;"><strong>ID:</strong> <span id="profileUsername"></span></div>
        <div style="margin-top:8px;"><strong data-i18n="draws">Total Draws:</strong> <span id="profileCount" style="color:var(--primary); font-weight:bold;">0</span></div>
        <div style="margin-top:8px; display:flex; align-items:center; gap:5px;">
           <strong data-i18n="points_label">Points:</strong> 
           <span id="profileCoins" style="color:#F59E0B; font-weight:bold; font-size:1.1rem;">0</span>
           <i class="fas fa-question-circle" style="color:#CBD5E1; cursor:pointer;" onclick="App.openRules()"></i>
        </div>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn secondary" style="flex:1;" onclick="App.logout()" data-i18n="logout">Logout</button>
        <button class="btn" style="flex:1;" onclick="App.closeModals()" data-i18n="close">Close</button>
      </div>
      <div style="margin-top:20px; border-top:1px dashed #E2E8F0; padding-top:10px;">
         <div style="font-size:0.8rem; color:#94A3B8; cursor:pointer;" onclick="App.openAdmin()" data-i18n="admin_panel">Admin Panel</div>
      </div>
    </div>
  </div>

  <div id="craftModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3 data-i18n="craft_title">Synthesis</h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;" data-i18n="craft_desc">Burn 5 low-rarity cards.</p>
      <div class="shop-grid">
        <div class="shop-item" id="craft-item-R" onclick="App.doCraft('R')"><div style="font-weight:bold; color:#3B82F6">R</div><div class="shop-cost"><span data-i18n="cost">Cost</span>: 5 N</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;"><span data-i18n="owned">Owned</span> N: <span id="invN">0</span></div></div>
        <div class="shop-item" id="craft-item-SR" onclick="App.doCraft('SR')"><div style="font-weight:bold; color:#8B5CF6">SR</div><div class="shop-cost"><span data-i18n="cost">Cost</span>: 5 R</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;"><span data-i18n="owned">Owned</span> R: <span id="invR">0</span></div></div>
        <div class="shop-item" id="craft-item-SSR" onclick="App.doCraft('SSR')"><div style="font-weight:bold; color:#F59E0B">SSR</div><div class="shop-cost"><span data-i18n="cost">Cost</span>: 5 SR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;"><span data-i18n="owned">Owned</span> SR: <span id="invSR">0</span></div></div>
        <div class="shop-item" id="craft-item-UR" onclick="App.doCraft('UR')"><div style="font-weight:bold; color:#EF4444">UR</div><div class="shop-cost"><span data-i18n="cost">Cost</span>: 5 SSR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;"><span data-i18n="owned">Owned</span> SSR: <span id="invSSR">0</span></div></div>
      </div>
    </div>
  </div>

  <div id="shopModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <h3 style="margin:0;" data-i18n="shop_title">Token Shop</h3>
        <div style="font-size:0.9rem; font-weight:bold; color:#F59E0B;">
           <i class="fas fa-coins"></i> <span id="shopBalance">0</span>
        </div>
      </div>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;" data-i18n="shop_desc">Spend points.</p>
      <div class="shop-grid" id="shopContent"></div>
    </div>
  </div>

  <div id="diceModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3 data-i18n="dice_title">Guess Size</h3>
      <p style="color:var(--text-light); font-size:0.9rem;" data-i18n="dice_desc">Small (1-3) or Big (4-6)</p>
      <div class="dice-stage"><i class="fas fa-dice-d6" id="diceIcon"></i></div>
      <div class="input-group" style="margin-bottom:10px;"><input type="number" id="betInput" placeholder="Bet Amount (10-1000)" data-i18n="bet_ph"></div>
      <div class="bet-controls">
        <button class="bet-btn small" onclick="App.playDice('small')"><div data-i18n="small">SMALL (1-3)</div></button>
        <button class="bet-btn big" onclick="App.playDice('big')"><div data-i18n="big">BIG (4-6)</div></button>
      </div>
      <div id="diceMsg" style="margin-top:15px; font-weight:bold; height:20px; color:#334155;"></div>
    </div>
  </div>

  <div id="rulesModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeRulesToProfile()"><i class="fas fa-times"></i></button>
      <h3 data-i18n="rules_title">Point Rules</h3>
      <p style="font-size:0.9rem; color:#94A3B8; margin-bottom:15px;" data-i18n="rules_desc">Info</p>
      <div style="background:#F8FAFC; padding:10px; border-radius:12px; border:1px solid #E2E8F0;">
        <table class="rules-table">
          <thead><tr><th data-i18n="rule_action">Action</th><th data-i18n="rule_points">Points</th></tr></thead>
          <tbody>
            <tr><td>N</td><td style="font-weight:bold;">+5</td></tr>
            <tr><td>R</td><td style="font-weight:bold;">+10</td></tr>
            <tr><td>SR</td><td style="font-weight:bold;">+30</td></tr>
            <tr><td>SSR</td><td style="font-weight:bold;">+100</td></tr>
            <tr><td>UR</td><td style="font-weight:bold; color:#EF4444">+500</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="adminModal" class="modal">
    <div class="modal-content" style="max-width:650px;">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3 style="margin-top:0;" data-i18n="admin_panel">Admin Panel</h3>
      <div id="adminLogin">
        <div class="input-group"><input type="password" id="adminPass" placeholder="Admin Password..."></div>
        <button class="btn" style="width:100%;" onclick="App.verifyAdmin()" data-i18n="confirm">Confirm</button>
      </div>
      <div id="adminPanel" style="display:none; text-align:left;">
        <div class="admin-tabs">
            <div class="admin-tab active" onclick="App.switchAdminTab('log')" id="tab-log" data-i18n="log_tab">Changelog</div>
            <div class="admin-tab" onclick="App.switchAdminTab('users')" id="tab-users" data-i18n="users_tab">Users</div>
            <div class="admin-tab" onclick="App.switchAdminTab('ann')" id="tab-ann" data-i18n="ann_title_def">Announcement</div>
        </div>
        <div id="view-log">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold; font-size:0.9rem;" data-i18n="edit_log">Editor</span>
            <button class="btn secondary" style="padding:4px 8px; font-size:0.8rem;" onclick="App.addAdminRow()" data-i18n="add_row">+ Add Row</button>
            </div>
            <div style="max-height:300px; overflow-y:auto; margin-bottom:10px; border:1px solid #F1F5F9; border-radius:8px;">
            <table class="admin-table" id="adminTable"><thead><tr><th width="80" data-i18n="date">Date</th><th width="60" data-i18n="ver">Ver</th><th data-i18n="content">Content</th><th width="100">Tag</th><th width="40"></th></tr></thead><tbody id="adminTbody"></tbody></table>
            </div>
            <button class="btn" style="width:100%;" onclick="App.saveAdminLog()" data-i18n="save">Save Changes</button>
        </div>
        <div id="view-users" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:bold; font-size:0.9rem;" data-i18n="users_title">Registered Users</span>
                <button class="btn secondary" onclick="App.loadAdminUsers()" style="font-size:0.8rem;"><i class="fas fa-sync"></i></button>
            </div>
            <div style="max-height:350px; overflow-y:auto; border:1px solid #F1F5F9; border-radius:8px;">
                <table class="admin-table"><thead><tr><th data-i18n="user_col">User</th><th data-i18n="draws_col">Draws</th><th data-i18n="points_col">Coins</th><th data-i18n="action_col">Action</th></tr></thead><tbody id="userTbody"><tr><td colspan="4" style="text-align:center; padding:20px;" data-i18n="loading">Loading...</td></tr></tbody></table>
            </div>
        </div>
        <div id="view-ann" style="display:none;">
            <div style="margin-bottom: 15px;">
                <label style="font-weight:bold; font-size:0.9rem;" data-i18n="ann_title">Title</label>
                <input type="text" id="adminAnnTitle" class="admin-input" placeholder="Title">
            </div>
            <div class="toggle-wrapper">
                <span style="font-weight:bold; font-size:0.9rem;" data-i18n="ann_status">Status:</span>
                <select id="adminAnnEnable" class="admin-input" style="width:auto;">
                    <option value="true" data-i18n="ann_enabled">Enabled</option>
                    <option value="false" data-i18n="ann_disabled">Disabled</option>
                </select>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-weight:bold; font-size:0.9rem;" data-i18n="content">Content (Markdown)</label>
                <textarea id="adminAnnContent" class="admin-textarea" placeholder="## Hello World..."></textarea>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn" style="flex:1" onclick="App.saveAnnouncement()" data-i18n="ann_publish">Publish / Save</button>
                <button class="btn secondary" style="flex:1" onclick="App.previewAnnouncement()" data-i18n="ann_preview">Preview</button>
            </div>
        </div>
      </div>
    </div>
  </div>

  <div id="announcementModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align: center; margin-bottom: 15px;">
        <i class="fas fa-bullhorn" style="font-size: 2rem; color: var(--primary);"></i>
        <h3 id="annTitle" style="margin: 10px 0 0 0;">Announcement</h3>
      </div>
      <div id="annContent" class="md-content">
      </div>
      <div style="margin-top: 20px;">
        <button class="btn" style="width: 100%;" onclick="App.closeAnnouncement()">OK</button>
      </div>
    </div>
  </div>

  <div id="imgModal" class="modal" onclick="this.classList.remove('show')">
    <img id="bigImg" style="max-width:95%; max-height:90vh; border-radius:8px;">
  </div>

  <script>
    const TEXT = ${JSON.stringify(I18N_TEXT)};
    const App = {
      username: localStorage.getItem('moe_username'),
      lang: localStorage.getItem('moe_lang') || 'en',
      nickname: null, loading: false, adminPwd: null, logsData: [], currentAdminTab: 'log', inventory: {},
      currentPool: 'std',
      authMode: 'login', 
      
      async init() {
        this.applyLang();
        await this.fetchUserInfo();
        this.loadShowcase();
        this.loadChangelog();
        this.checkAnnouncement();
      },
      toggleLang() { this.lang = this.lang === 'en' ? 'zh' : 'en'; localStorage.setItem('moe_lang', this.lang); this.applyLang(); },
      switchPool(pool) {
        if(this.loading) return;
        this.currentPool = pool;
        const t = TEXT[this.lang];
        
        document.querySelectorAll('.banner-tab').forEach(el => el.classList.remove('active', 'limited'));
        document.getElementById('tab-' + pool).classList.add('active');
        
        const btn = document.getElementById('drawBtn');
        const costConfig = ${CONFIG.LIMITED.COST};

        if (pool === 'ltd') {
            document.getElementById('tab-ltd').classList.add('limited');
            btn.className = 'btn limited-btn';
            btn.innerHTML = \`<i class="fas fa-star"></i> \${t.start_ltd || 'SUMMON'} <small>(\${costConfig} pts)</small>\`;
        } else {
            btn.className = 'btn';
            btn.innerHTML = \`<i class="fas fa-bolt"></i> \${t.start || 'START'}\`;
        }
      },
      switchAuth(mode) {
        this.authMode = mode;
        document.getElementById('tab-login').classList.toggle('active', mode === 'login');
        document.getElementById('tab-register').classList.toggle('active', mode === 'register');
        document.getElementById('nickGroup').style.display = mode === 'register' ? 'block' : 'none';
      },
      applyLang() {
        const t = TEXT[this.lang];
        document.getElementById('langBtn').innerText = t.btn_lang;
        document.querySelectorAll('[data-i18n]').forEach(el => {
          const key = el.getAttribute('data-i18n');
          if(t[key]) { 
              if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = t[key]; 
              else if(el.tagName === 'OPTION') el.text = t[key];
              else el.innerText = t[key]; 
          }
        });
        if(!this.username) document.getElementById('navNickname').innerText = t.guest;
        if(document.getElementById('adminPanel').style.display === 'block') { this.renderAdminTable(); if(this.currentAdminTab === 'users') this.loadAdminUsers(); }
      },
      async fetchUserInfo() {
        if (!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) { 
              this.username = data.username; 
              this.nickname = data.nickname;
              this.updateUI(data); 
          } else { 
              localStorage.removeItem('moe_username');
              this.username = null;
              document.getElementById('authModal').classList.add('show'); 
          }
        } catch(e) {}
      },
      updateUI(user) {
        document.getElementById('navNickname').innerText = user.nickname || user.username;
        document.getElementById('profileNickname').innerText = user.nickname;
        document.getElementById('profileUsername').innerText = user.username;
        document.getElementById('profileCount').innerText = user.drawCount || 0;
        document.getElementById('profileCoins').innerText = user.coins || 0;
        const titleEl = document.getElementById('navTitle');
        if(user.title) { titleEl.innerHTML = user.title.name; titleEl.className = 'title-badge'; titleEl.style.backgroundColor = user.title.color; } else { titleEl.innerHTML = ''; }
        this.inventory = user.inventory || {};
        this.updateCraftStates();
      },
      updateCraftStates() {
         const inv = this.inventory;
         document.getElementById('invN').innerText = inv.N || 0; document.getElementById('craft-item-R').classList.toggle('can-craft', (inv.N || 0) >= 5);
         document.getElementById('invR').innerText = inv.R || 0; document.getElementById('craft-item-SR').classList.toggle('can-craft', (inv.R || 0) >= 5);
         document.getElementById('invSR').innerText = inv.SR || 0; document.getElementById('craft-item-SSR').classList.toggle('can-craft', (inv.SR || 0) >= 5);
         document.getElementById('invSSR').innerText = inv.SSR || 0; document.getElementById('craft-item-UR').classList.toggle('can-craft', (inv.SSR || 0) >= 5);
      },
      mapError(err) {
        const t = TEXT[this.lang];
        const map = {
            'Not Enough Points': 'server_err_no_money',
            'Username Taken': 'server_err_taken',
            'Nickname Taken': 'server_err_taken',
            'User Not Found': 'server_err_user_missing',
            'Invalid Password': 'server_err_pass',
            'Auth Failed': 'server_err_auth'
        };
        if(map[err] && t[map[err]]) return t[map[err]];
        return err;
      },
      async doAuth() {
        const u = document.getElementById('authUsername').value.trim();
        const p = document.getElementById('authPassword').value;
        const n = document.getElementById('authNickname').value.trim();
        const t = TEXT[this.lang];
        
        if (this.authMode === 'register') {
             if (!u || !p || !n) return this.toast(t.name_req, 'warn');
             try {
                const res = await fetch('/auth/register', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, nickname: n, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.toast(t.reg_ok, 'ok'); 
                    this.switchAuth('login');
                } else { 
                    this.toast(this.mapError(d.error), 'warn'); 
                }
             } catch(e) { this.toast(t.net_err, 'warn'); }
        } else {
             if (!u || !p) return this.toast(t.name_req, 'warn');
             try {
                const res = await fetch('/auth/login', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.username = d.user.username;
                    localStorage.setItem('moe_username', d.user.username);
                    this.updateUI(d.user);
                    document.getElementById('authModal').classList.remove('show');
                } else { 
                    this.toast(this.mapError(d.error || t.fail), 'warn'); 
                }
             } catch(e) { this.toast(t.net_err, 'warn'); }
        }
      },
      async checkAnnouncement() {
        try {
          const res = await fetch('/announcement');
          const data = await res.json();
          if (data.enabled) {
            const lastReadId = localStorage.getItem('moe_ann_read');
            if (lastReadId !== String(data.id)) {
              this.showAnnouncementModal(data);
              this.currentAnnId = data.id; 
            }
          }
        } catch(e) {}
      },
      showAnnouncementModal(data) {
        const t = TEXT[this.lang];
        document.getElementById('annTitle').innerText = data.title || t.ann_title_def;
        document.getElementById('annContent').innerHTML = marked.parse(data.content || '');
        document.getElementById('announcementModal').classList.add('show');
      },
      closeAnnouncement() {
        if (this.currentAnnId) {
            localStorage.setItem('moe_ann_read', String(this.currentAnnId));
        }
        document.getElementById('announcementModal').classList.remove('show');
      },
      previewAnnouncement() {
        const content = document.getElementById('adminAnnContent').value;
        const title = document.getElementById('adminAnnTitle').value;
        this.showAnnouncementModal({ title: title + " (Preview)", content: content });
      },
      async loadAdminAnnouncement() {
        try {
            const res = await fetch('/announcement');
            const data = await res.json();
            document.getElementById('adminAnnTitle').value = data.title || '';
            document.getElementById('adminAnnContent').value = data.content || '';
            document.getElementById('adminAnnEnable').value = data.enabled ? 'true' : 'false';
        } catch(e) { this.toast('Load Failed', 'warn'); }
      },
      async saveAnnouncement() {
        const title = document.getElementById('adminAnnTitle').value;
        const content = document.getElementById('adminAnnContent').value;
        const enabled = document.getElementById('adminAnnEnable').value === 'true';
        const t = TEXT[this.lang];
        if(!title || !content) return this.toast(t.name_req, 'warn');
        try {
            const res = await fetch('/admin/save-announcement', { 
                method: 'POST', 
                body: JSON.stringify({ password: this.adminPwd, announcement: { title, content, enabled } }) 
            });
            const d = await res.json();
            if(d.success) this.toast(t.save_ok, 'ok'); 
            else this.toast(this.mapError(d.error) || t.save_err, 'warn'); 
        } catch(e) { this.toast(t.net_err, 'warn'); }
      },
      async loadChangelog() {
        try {
          const res = await fetch('/changelog'); this.logsData = await res.json(); const list = document.getElementById('logList');
          if(this.logsData && this.logsData.length) {
            list.innerHTML = this.logsData.map(log => {
              const isTodo = log.ver.includes('To-Do');
              const tag = log.tag || 'optimization';
              const tagLabels = {
                'optimization': { text: '优化', color: '#3B82F6', icon: 'fas fa-bolt' },
                'feature': { text: '功能', color: '#10B981', icon: 'fas fa-star' },
                'bugfix': { text: '修复', color: '#EF4444', icon: 'fas fa-bug' },
                'todo': { text: '待办', color: '#8B5CF6', icon: 'fas fa-thumbtack' },
                'documentation': { text: '文档', color: '#94A3B8', icon: 'fas fa-book' },
                'refactor': { text: '重构', color: '#F59E0B', icon: 'fas fa-code-branch' }
              };
              const tagInfo = tagLabels[tag] || tagLabels.optimization;
              return \`<div class="log-item"><div class="log-meta"><span class="log-ver \${isTodo?'todo':''} ">\${isTodo?'<i class="fas fa-thumbtack"></i> ':''}\${log.ver}</span> <span>\${log.date}</span> <span class="log-tag" style="background:\${tagInfo.color}"><i class="\${tagInfo.icon}"></i> \${tagInfo.text}</span></div><div class="log-content">\${log.content}</div></div>\`;
            }).join('');
            if (this.logsData.length > 3) document.getElementById('logToggle').style.display = 'block';
          }
        } catch(e) {}
      },
      toggleLog() { const list = document.getElementById('logList'); const btn = document.getElementById('logToggle'); const t = TEXT[this.lang]; list.classList.toggle('collapsed'); btn.innerHTML = list.classList.contains('collapsed') ? (t.more + ' <i class="fas fa-chevron-down"></i>') : (t.less + ' <i class="fas fa-chevron-up"></i>'); },
      async draw() {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        const t = TEXT[this.lang];
        
        if (this.currentPool === 'ltd') {
             const currentCoins = parseInt(document.getElementById('profileCoins').innerText) || 0;
             const cost = ${CONFIG.LIMITED.COST};
             if (currentCoins < cost) return this.toast(t.no_money, 'warn');
        }

        this.loading = true;
        const btn = document.getElementById('drawBtn'); 
        const img = document.getElementById('resultImg'); 
        const tag = document.getElementById('rarityTag'); 
        
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
        img.classList.remove('show'); 
        tag.classList.remove('show');

        try {
          let url = '/draw';
          let method = 'GET';
          if (this.currentPool === 'ltd') {
              url = '/draw/limited';
              method = 'POST';
          }

          const res = await fetch(url, { method: method, headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          
          if(data.error) {
              if (data.error === 'Not Enough Points') throw new Error(t.server_err_no_money);
              if (data.error === 'USER_NOT_FOUND') {
                   document.getElementById('authModal').classList.add('show');
                   throw new Error(t.reg_tip);
              }
              throw this.mapError(data.error);
          }
          this.handleDrawResult(data, img, tag, btn, t);
        } catch(e) { 
          this.loading = false; 
          this.switchPool(this.currentPool);
          this.toast(e.message || e.toString(), 'warn'); 
        }
      },
      async doCraft(target) {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        const t = TEXT[this.lang];
        const costMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
        if ((this.inventory[costMap[target]] || 0) < 5) return this.toast('Need 5 ' + costMap[target], 'warn');
        
        if(!confirm(t.craft_confirm.replace('{target}', target))) return;
        
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag'); 
        btn.innerHTML = '<i class="fas fa-flask fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        try {
          const res = await fetch('/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity: target }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, t, true);
        } catch(e) { this.loading = false; btn.innerHTML = t.start; this.toast(e.message, 'warn'); this.fetchUserInfo(); }
      },
      handleDrawResult(data, img, tag, btn, t, isSpecial = false) {
          img.src = data.imageUrl;
          const onImageLoad = () => {
             img.classList.add('show'); 
             document.getElementById('placeholder').style.display = 'none'; 
             this.loading = false; 
             
             if (this.currentPool === 'ltd') {
                 const cost = ${CONFIG.LIMITED.COST};
                 btn.innerHTML = \`<i class="fas fa-star"></i> \${t.again || 'AGAIN'} <small>(\${cost} pts)</small>\`;
             } else {
                 btn.innerHTML = '<i class="fas fa-bolt"></i> ' + t.again;
             }

             if (data.rarity) { tag.innerText = data.rarity; tag.className = 'rarity-tag r-' + data.rarity.toLowerCase(); tag.classList.add('show'); }
             if(data.success) { 
                 this.toast(isSpecial || this.currentPool === 'ltd' ? (t.craft_ok || 'Success!') : t.success, 'ok'); 
                 if(data.inventory) this.inventory = data.inventory; 
                 if(data.userCoins !== undefined) document.getElementById('profileCoins').innerText = data.userCoins; 
                 this.updateCraftStates(); 
             } else { 
                 this.toast(t.fail, 'warn'); 
             }
             setTimeout(() => this.fetchUserInfo(), 500);
          };
          if (img.complete) onImageLoad(); else { 
              img.onload = onImageLoad; 
              img.onerror = () => { 
                  this.loading = false; 
                  this.switchPool(this.currentPool); 
                  this.toast(t.img_load_err, 'warn'); 
              }; 
          }
      },
      openCraft() { if(!this.username) return document.getElementById('authModal').classList.add('show'); this.updateCraftStates(); document.getElementById('craftModal').classList.add('show'); },
      openRules() { document.getElementById('profileModal').classList.remove('show'); document.getElementById('rulesModal').classList.add('show'); },
      closeRulesToProfile() { document.getElementById('rulesModal').classList.remove('show'); document.getElementById('profileModal').classList.add('show'); },
      openShop() {
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        const balance = parseInt(document.getElementById('profileCoins').innerText) || 0;
        if(document.getElementById('shopBalance')) document.getElementById('shopBalance').innerText = balance;
        const t = TEXT[this.lang];
        const packs = [{ id: 'R', color: '#3B82F6', price: 100 }, { id: 'SR', color: '#8B5CF6', price: 500 }, { id: 'SSR', color: '#F59E0B', price: 2000 }, { id: 'UR', color: '#EF4444', price: 8000 }];
        const container = document.getElementById('shopContent');
        if(container) {
            container.innerHTML = packs.map(p => {
                const can = balance >= p.price;
                return \`<div class="shop-item \${can?'':'disabled'}" \${can? \`onclick="App.buyPack('\${p.id}', \${p.price})"\` : ''}><div style="font-weight:900; font-size:1.5rem; color:\${p.color}">\${p.id}</div><div class="price-tag"><i class="fas fa-coins"></i> \${p.price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">\${can?t.buy:t.low_pts}</div></div>\`;
            }).join('');
        }
        document.getElementById('shopModal').classList.add('show');
      },
      async buyPack(rarity, price) {
        if(this.loading) return; const t = TEXT[this.lang];
        if(!confirm(t.buy_confirm.replace('{price}', price))) return;
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        btn.innerHTML = '<i class="fas fa-shopping-cart fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        try {
          const res = await fetch('/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity: rarity }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, t, true);
        } catch(e) { this.loading = false; btn.innerHTML = t.start; this.toast(e.message, 'warn'); }
      },
      openDice() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('diceModal').classList.add('show'); document.getElementById('diceIcon').className = 'fas fa-dice-d6'; document.getElementById('diceMsg').innerText = ''; },
      async playDice(prediction) {
        if(this.loading) return; const t = TEXT[this.lang]; const bet = parseInt(document.getElementById('betInput').value); if(!bet || bet < 10) return this.toast(t.min_bet, 'warn');
        this.loading = true; const icon = document.getElementById('diceIcon'); const msg = document.getElementById('diceMsg'); 
        icon.classList.add('dice-result-anim'); msg.innerText = t.loading;
        try {
          const res = await fetch('/game/dice', { method: 'POST', body: JSON.stringify({ betAmount: bet, prediction: prediction }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          setTimeout(() => {
             this.loading = false; icon.classList.remove('dice-result-anim');
             if(data.error) { msg.innerText = this.mapError(data.error); return; }
             const diceIcons = ['one', 'two', 'three', 'four', 'five', 'six']; icon.className = \`fas fa-dice-\${diceIcons[data.roll - 1]}\`;
             if(data.isWin) { msg.innerText = \`\${t.win} (+\${data.winAmount})\`; msg.style.color = '#10B981'; this.toast(t.win, 'ok'); } else { msg.innerText = t.lose; msg.style.color = '#EF4444'; }
             document.getElementById('profileCoins').innerText = data.newBalance;
          }, 600);
        } catch(e) { this.loading = false; icon.classList.remove('dice-result-anim'); this.toast(t.net_err, 'warn'); }
      },
      async loadShowcase() {
        const grid = document.getElementById('showcaseGrid'); const t = TEXT[this.lang];
        try { const res = await fetch('/showcase'); const data = await res.json(); if(data.length) { grid.innerHTML = data.map(item => \`<div class="grid-item" onclick="App.preview('\${item.imageUrl}')"><img src="\${item.imageUrl}" loading="lazy"></div>\`).join(''); } } catch(e) {}
      },
      openAdmin() { this.closeModals(); document.getElementById('adminModal').classList.add('show'); },
      async verifyAdmin() {
        const pwd = document.getElementById('adminPass').value; const t = TEXT[this.lang];
        try {
            const res = await fetch('/admin/verify', { method: 'POST', body: JSON.stringify({password: pwd}) }); const d = await res.json();
            if(d.success) { this.adminPwd = pwd; document.getElementById('adminLogin').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; this.switchAdminTab('log'); this.renderAdminTable(); } else { this.toast(t.verify_fail, 'warn'); }
        } catch(e) { this.toast(t.net_err, 'warn'); }
      },
      switchAdminTab(tab) { this.currentAdminTab = tab; document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active'); document.getElementById('view-log').style.display = tab === 'log' ? 'block' : 'none'; document.getElementById('view-users').style.display = tab === 'users' ? 'block' : 'none'; document.getElementById('view-ann').style.display = tab === 'ann' ? 'block' : 'none'; if(tab === 'users') this.loadAdminUsers(); if(tab === 'ann') this.loadAdminAnnouncement();},
      async loadAdminUsers() {
        const tbody = document.getElementById('userTbody'); const t = TEXT[this.lang]; tbody.innerHTML = \`<tr><td colspan="4" style="text-align:center;">\${t.loading}</td></tr>\`; 
        try { const res = await fetch('/admin/users', { method: 'POST', body: JSON.stringify({ password: this.adminPwd }) }); const data = await res.json(); if(data.success && data.users.length) { tbody.innerHTML = data.users.map(u => \`<tr><td><div style="font-weight:bold; color:var(--primary);">\${u.username}</div><div class="user-row-meta">\${u.nickname}</div></td><td><span class="user-badge">\${u.drawCount}</span></td><td><span class="user-badge" style="color:#F59E0B">\${u.coins}</span><button class="btn secondary" style="padding:2px 6px; font-size:0.7rem; margin-left:4px;" onclick="App.adminEditPoints('\${u.username}')">\${t.edit_points}</button></td><td><button class="btn danger" style="padding:4px 8px; font-size:0.7rem;" onclick="App.deleteUser('\${u.username}')">\${t.del}</button></td></tr>\`).join(''); } else { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Empty</td></tr>'; } } catch(e) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Err</td></tr>'; }
      },
      async adminEditPoints(userId) { const t = TEXT[this.lang]; const val = prompt(t.edit_points_prompt); if(!val) return; const amount = parseInt(val); if(isNaN(amount)) return; try { const res = await fetch('/admin/update-points', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: userId, amount: amount }) }); const d = await res.json(); if(d.success) { this.toast(t.save_ok, 'ok'); this.loadAdminUsers(); } else { this.toast(d.error, 'warn'); } } catch(e) { this.toast('Net Error', 'warn'); } },
      async deleteUser(id) { const t = TEXT[this.lang]; if(!confirm(t.delete_confirm)) return; try { const res = await fetch('/admin/delete-user', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: id }) }); const d = await res.json(); if(d.success) { this.toast(t.delete_ok, 'ok'); this.loadAdminUsers(); } else { this.toast('Error', 'warn'); } } catch(e) { this.toast(t.net_err, 'warn'); } },
      renderAdminTable() { const t = TEXT[this.lang]; document.getElementById('adminTbody').innerHTML = this.logsData.map((log, idx) => \`<tr><td><input class="admin-input" value="\${log.date}" onchange="App.updateLog(\${idx}, 'date', this.value)"></td><td><input class="admin-input" value="\${log.ver}" onchange="App.updateLog(\${idx}, 'ver', this.value)"></td><td><input class="admin-input" value="\${log.content}" onchange="App.updateLog(\${idx}, 'content', this.value)"></td><td><select class="admin-input" style="padding:4px 6px;" onchange="App.updateLog(\${idx}, 'tag', this.value)"><option value="optimization" \${log.tag === 'optimization' ? 'selected' : ''}>优化</option><option value="feature" \${log.tag === 'feature' ? 'selected' : ''}>功能</option><option value="bugfix" \${log.tag === 'bugfix' ? 'selected' : ''}>修复</option><option value="todo" \${log.tag === 'todo' ? 'selected' : ''}>待办</option><option value="documentation" \${log.tag === 'documentation' ? 'selected' : ''}>文档</option><option value="refactor" \${log.tag === 'refactor' ? 'selected' : ''}>重构</option></select></td><td><button class="btn danger" style="padding:4px 8px; font-size:0.7rem;" onclick="App.delLog(\${idx})">\${t.del}</button></td></tr>\`).join(''); },
      updateLog(idx, field, val) { this.logsData[idx][field] = val; }, addAdminRow() { this.logsData.unshift({date: new Date().toISOString().split('T')[0], ver:'v.X', content:'...', tag:'optimization'}); this.renderAdminTable(); }, delLog(idx) { this.logsData.splice(idx, 1); this.renderAdminTable(); },
      async saveAdminLog() { const t = TEXT[this.lang]; try { const res = await fetch('/admin/save-changelog', { method: 'POST', body: JSON.stringify({password: this.adminPwd, logs: this.logsData}) }); const d = await res.json(); if(d.success) { this.toast(t.save_ok, 'ok'); this.loadChangelog(); } else { this.toast(t.save_err, 'warn'); } } catch(e) { this.toast(t.save_err, 'warn'); } },
      openProfile() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('profileModal').classList.add('show'); },
      closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')); }, 
      logout() { if(confirm(TEXT[this.lang].clear_confirm)) { localStorage.removeItem('moe_username'); location.reload(); } },
      preview(src) { document.getElementById('bigImg').src=src; document.getElementById('imgModal').classList.add('show'); },
      toast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = \`<span>\${type==='ok'?'✅':'⚠️'}</span> \${msg}\`; document.body.appendChild(div); setTimeout(() => div.remove(), 2500); }
    };
    window.onload = () => {
        document.getElementById('ltdCostDisplay').innerText = '${CONFIG.LIMITED.COST} pts';
        App.init();
    };
  </script>
</body>
</html>
  `;
}

function getLibraryHtml(items, pager) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Gallery</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  <style>
    body { padding-top: 70px; }
    .nav { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #E2E8F0; z-index: 100; padding: 0 20px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; padding: 15px; max-width: 1000px; margin: 0 auto; }
    .item { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #F1F5F9; cursor: zoom-in; border: 1px solid #E2E8F0; transition: 0.2s; }
    .item:hover { transform: translateY(-3px); border-color: var(--primary); }
    .item img { width: 100%; height: 100%; object-fit: cover; }
    .item-user { position: absolute; bottom: 0; width: 100%; padding: 15px 10px 4px; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); color: white; font-size: 0.75rem; text-align: center; }
    .pager { display: flex; justify-content: center; gap: 15px; padding: 30px; }
    .page-btn { width: 40px; height: 40px; border-radius: 8px; background: white; display: flex; align-items: center; justify-content: center; color: var(--text-main); font-weight: bold; text-decoration: none; border: 1px solid #E2E8F0; transition: 0.2s; }
    .page-btn:hover { border-color: var(--primary); color: var(--primary); }
  </style>
</head>
<body>
  <nav class="nav">
    <div style="text-align:left;"><a href="/" class="btn secondary" style="padding: 8px 16px; font-size:0.9rem;"><i class="fas fa-arrow-left"></i> <span data-i18n="back">Back</span></a></div>
    <div style="text-align:center; font-weight:bold; color:var(--text-main)"><span data-i18n="page">Page</span> ${pager.currentPage} / ${pager.totalPages}</div>
    <div style="text-align:right;"><div class="lang-btn" onclick="toggleLang()" id="langBtn" style="display:inline-block;">En</div></div>
  </nav>
  <div class="grid">
    ${items.map(item => `<div class="item" onclick="show('${item.url}')"><img data-src="${item.url}" class="lazy"><div class="item-user">@${item.username}</div></div>`).join('')}
  </div>
  <div class="pager">
    ${pager.currentPage > 1 ? `<a href="?page=${pager.currentPage-1}" class="page-btn"><i class="fas fa-chevron-left"></i></a>` : ''}
    ${pager.currentPage < pager.totalPages ? `<a href="?page=${pager.currentPage+1}" class="page-btn"><i class="fas fa-chevron-right"></i></a>` : ''}
  </div>
  <div id="imgModal" class="modal" onclick="this.classList.remove('show')"><img id="bigImg" style="max-width:95%; max-height:90vh; border-radius:8px;"></div>
  <script>
    const TEXT = ${JSON.stringify(I18N_TEXT)}; let currentLang = localStorage.getItem('moe_lang') || 'en';
    function applyLang() { const t = TEXT[currentLang]; document.getElementById('langBtn').innerText = t.btn_lang; document.querySelectorAll('[data-i18n]').forEach(el => { const key = el.getAttribute('data-i18n'); if(t[key]) el.innerText = t[key]; }); }
    function toggleLang() { currentLang = currentLang === 'en' ? 'zh' : 'en'; localStorage.setItem('moe_lang', currentLang); applyLang(); }
    applyLang();
    const observer = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) { e.target.src = e.target.dataset.src; observer.unobserve(e.target); } }));
    document.querySelectorAll('.lazy').forEach(i => observer.observe(i));
    function show(u) { document.getElementById('bigImg').src=u; document.getElementById('imgModal').classList.add('show'); }
  </script>
</body>
</html>
  `;
}