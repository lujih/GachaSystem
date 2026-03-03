/**
 * 抽卡服务类
 * 处理抽卡、合成、商店、骰子游戏等功能
 */

import { CONFIG, TECHNICAL_CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { getBeijingISOString } from '../utils/time.js';

// 辅助函数
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

// 更新排行榜
async function updateLeaderboard(env, newItem) {
  if (!env.RECENT_REQUESTS) return;
  const key = CONFIG.KEYS.LEADERBOARD;
  let list = [];
  try {
    const cached = await env.RECENT_REQUESTS.get(key);
    if (cached) list = JSON.parse(cached);
  } catch (e) {}
  list.unshift(newItem);
  if (list.length > 50) list = list.slice(0, 50);
  await env.RECENT_REQUESTS.put(key, JSON.stringify(list), { expirationTtl: CONFIG.TTL.LEADERBOARD });
}

// 更新图库索引
async function updateGalleryIndex(env, newItem) {
  try {
    const ts = typeof newItem.ts === 'string' ? Date.parse(newItem.ts) : newItem.ts;
    await env.DB.prepare(`
      INSERT INTO gallery (url, user_id, username, created_at) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(url) DO UPDATE SET 
        user_id = excluded.user_id,
        username = excluded.username,
        created_at = excluded.created_at
    `).bind(newItem.url, newItem.userId, newItem.username, ts).run();
  } catch (e) {
    console.error('Failed to update gallery D1:', e);
  }
}

async function uploadToGithub(env, path, content, extension, message) {
  try {
    const githubToken = env.GITHUB_TOKEN;
    const repoOwner = env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER;
    const repoName = env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO;

    if (!githubToken) {
      console.error('[GitHub Upload] Missing GITHUB_TOKEN');
      return { error: 'GitHub Token 未配置，请在 CF 后台环境变量中设置 GITHUB_TOKEN' };
    }

    let base64Content;
    try {
      base64Content = arrayBufferToBase64(content);
    } catch (e) {
      console.error('[GitHub Upload] Base64 encode error:', e);
      return { error: '图片编码处理失败，请更换其他图片' };
    }

    const apiUrl = `${TECHNICAL_CONFIG.GITHUB.API_BASE}/repos/${repoOwner}/${repoName}/contents/${path}`;

    const requestBody = {
      message: message,
      content: base64Content,
      branch: TECHNICAL_CONFIG.GITHUB.BRANCH
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[GitHub Upload] API Error:', response.status, response.statusText, errText);
      return { error: `GitHub API 错误: ${response.status}` };
    }

    const data = await response.json();
    const cdnUrl = `${TECHNICAL_CONFIG.GITHUB.CDN_BASE}/${repoOwner}/${repoName}/${TECHNICAL_CONFIG.GITHUB.BRANCH}/${path}`;
    console.log(`[GitHub Upload] Success: ${cdnUrl}`);
    return { success: true, url: cdnUrl };
  } catch (e) {
    console.error('[GitHub Upload] Network/Worker Error:', e);
    return { error: '上传失败，请稍后重试' };
  }
}

export class GachaService {
  constructor(env, ctx, userService) {
    this.env = env;
    this.ctx = ctx;
    this.userService = userService;
  }

  async safeRefillGlobalBuffer(rarity, sourceList, slotIndex) {
    await new Promise(r => setTimeout(r, Math.random() * 3000));

    try {
      const asset = await this.fetchAndUploadRandom(sourceList);
      if (asset.success) {
        const idx = slotIndex !== undefined ? slotIndex : Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
        const key = `${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${idx}`;
        await this.env.KV_CACHE.put(key, JSON.stringify(asset), { expirationTtl: CONFIG.TTL.STATIC_ASSET });
      }
    } catch (e) {
      console.error(`[Safe Refill Error] ${rarity}:`, e);
    }
  }

  async consumeGlobalBuffer(rarity, sourceList) {
    const slotIndex = Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
    const key = `${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${slotIndex}`;
    const cachedAsset = await this.env.KV_CACHE.get(key, { type: 'json' });

    if (cachedAsset && cachedAsset.success) {
      this.ctx.waitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, slotIndex));
      return cachedAsset;
    }

    const freshAsset = await this.fetchAndUploadRandom(sourceList);
    this.ctx.waitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, slotIndex));
    return freshAsset;
  }

  async fetchAndUploadRandom(sourceList) {
    const source = sourceList[Math.floor(Math.random() * sourceList.length)];
    return await this.fetchAndUpload(source);
  }

  async fetchAndUpload(source) {
    try {
      console.log('[fetchAndUpload] Fetching from:', source.url);
      let finalUrl = source.url;
      
      // 对URL进行编码处理（中文URL需要编码）
      let requestUrl = source.url;
      try {
        new URL(source.url);
      } catch (e) {
        // 如果URL解析失败，尝试编码
        requestUrl = encodeURI(source.url);
        console.log('[fetchAndUpload] URL encoded:', requestUrl);
      }
      
      const initRes = await fetch(requestUrl, { method: 'GET', redirect: 'follow' });
      const finalRequestUrl = initRes.url;
      const contentType = initRes.headers.get('content-type') || '';
      console.log('[fetchAndUpload] Final URL after redirect:', finalRequestUrl);
      console.log('[fetchAndUpload] Content-Type:', contentType);
      
      // 如果返回的是JSON，尝试解析获取图片URL
      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        try {
          const data = await initRes.json();
          console.log('[fetchAndUpload] JSON response:', JSON.stringify(data).slice(0, 300));
          
          // 尝试从JSON中提取图片URL - 支持多种常见字段名
          finalUrl = data.url || data.img || data.image || data.data || 
                     data.text || data.msg || data.result ||
                     (data.data && (data.data.url || data.data.img || data.data[0])) ||
                     (Array.isArray(data.data) && data.data[0]?.url) || source.url;
                     
          console.log('[fetchAndUpload] Extracted URL:', finalUrl);
        } catch (e) {
          console.log('[fetchAndUpload] JSON parse error:', e);
          finalUrl = initRes.url;
        }
      } else {
        finalUrl = initRes.url;
      }
      
      if (!finalUrl || finalUrl === 'null' || finalUrl === 'undefined') {
        console.error('[fetchAndUpload] Failed to extract image URL');
        return { success: false, rarity: 'N', imageUrl: null };
      }
      
      console.log('[fetchAndUpload] Using image URL:', finalUrl);

      const compressedUrl = `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&q=75&w=1200&il`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const imgRes = await fetch(compressedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (imgRes.ok) {
        const compressedBuffer = await imgRes.arrayBuffer();
        if (compressedBuffer.byteLength < 100) {
          throw new Error('Compressed image too small');
        }

        const hashStr = await calculateHash(compressedBuffer);
        const filename = `images/${source.rarity}_${hashStr}.webp`;

        await this.env.R2_BUCKET.put(filename, compressedBuffer, {
          httpMetadata: {
            contentType: 'image/webp',
            cacheControl: `public, max-age=${CONFIG.TTL.STATIC_ASSET}, immutable`
          }
        });

        return {
          success: true,
          imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`,
          rarity: source.rarity,
          sourceName: source.name
        };
      }
    } catch (e) {
      console.error('Fetch/Compress Error:', e);
    }
    return { success: false, rarity: 'N', imageUrl: null };
  }

  calculateLevelUpRaw(currentUser, expGained) {
    const originalTotalExp = currentUser.total_exp || 0;
    const newTotalExp = originalTotalExp + expGained;
    const originalLevel = this.userService.calculateLevelFromTotalExp(originalTotalExp).level;
    const newLevelInfo = this.userService.calculateLevelFromTotalExp(newTotalExp);

    if (newLevelInfo.level > originalLevel) {
      const levelsGained = newLevelInfo.level - originalLevel;
      const coinsReward = levelsGained * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL;
      return { hasLevelUp: true, newLevel: newLevelInfo.level, newExp: newLevelInfo.currentExp, coinsReward };
    }
    return { hasLevelUp: false, newExp: (currentUser.exp || 0) + expGained, coinsReward: 0 };
  }

  // 抽卡
  async draw(currentUser) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const cost = 0;
    if (currentUser.coins < cost) {
      return jsonResponse({ error: '积分不足' }, 400);
    }

    const rand = Math.random() * 100;
    let rarity;
    if (rand < 0.5) rarity = 'UR';
    else if (rand < 3) rarity = 'SSR';
    else if (rand < 15) rarity = 'SR';
    else if (rand < 45) rarity = 'R';
    else rarity = 'N';

    if (!CONFIG || !CONFIG.SOURCES) {
      console.error('[Draw] CONFIG or SOURCES is undefined');
      return jsonResponse({ error: '配置加载失败' }, 500);
    }

    const sourceList = CONFIG.SOURCES.filter(s => s.rarity === rarity);
    if (sourceList.length === 0) {
      return jsonResponse({ error: '配置错误' }, 500);
    }

    const asset = await this.consumeGlobalBuffer(rarity, sourceList);

    await this.env.DB.prepare(
      'UPDATE users SET coins = coins - ?, draw_count = draw_count + 1 WHERE id = ?'
    ).bind(cost, currentUser.id).run();

    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || 0;
    currentUser.coins -= cost;
    currentUser.draw_count = (currentUser.draw_count || 0) + 1;
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;

    // 更新数据库
    await this.env.DB.prepare(
      'UPDATE users SET total_exp = total_exp + ? WHERE id = ?'
    ).bind(expGain, currentUser.id).run();

    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
    if (levelUpInfo.hasLevelUp) {
      await this.env.DB.prepare('UPDATE users SET level = ?, exp = ?, total_exp = total_exp + ? WHERE id = ?')
        .bind(levelUpInfo.newLevel, levelUpInfo.newExp, expGain, currentUser.id).run();
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = levelUpInfo.newExp;
    }

    const existing = await this.env.DB.prepare(
      'SELECT 1 FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, rarity).first();

    if (existing) {
      await this.env.DB.prepare(
        'UPDATE inventory SET count = count + 1 WHERE user_id = ? AND rarity = ?'
      ).bind(currentUser.id, rarity).run();
    } else {
      await this.env.DB.prepare(
        'INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1)'
      ).bind(currentUser.id, rarity).run();
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));

    // 更新排行榜和图库（仅常驻池UR卡）
    if (asset.success) {
      // 所有卡加入图库
      const galleryItem = {
        url: asset.imageUrl,
        userId: currentUser.id,
        username: currentUser.username,
        ts: getBeijingISOString()
      };
      this.ctx.waitUntil(updateGalleryIndex(this.env, galleryItem));

      // 只有UR加入排行榜
      if (rarity === 'UR') {
        const leaderboardItem = {
          username: currentUser.username,
          rarity: rarity,
          imageUrl: asset.imageUrl,
          ts: Date.now()
        };
        this.ctx.waitUntil(updateLeaderboard(this.env, leaderboardItem));
      }
    }

    return jsonResponse({
      success: true,
      card: asset,
      expGained: expGain,
      userCoins: currentUser.coins,
      levelUp: levelUpInfo.hasLevelUp ? { newLevel: levelUpInfo.newLevel, reward: levelUpInfo.coinsReward } : null
    });
  }

  // 限定池抽卡
  async drawLimited(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const { poolId } = await request.json();
    console.log('[drawLimited] Received poolId:', poolId);
    const pool = poolId && CONFIG.LIMITED.POOLS[poolId] ? poolId : CONFIG.LIMITED.DEFAULT_POOL;
    console.log('[drawLimited] Using pool:', pool, 'sources:', CONFIG.LIMITED.POOLS[pool]?.sources?.length);
    const poolConfig = CONFIG.LIMITED.POOLS[pool];

    if (!poolConfig) return jsonResponse({ error: '卡池不存在' }, 400);

    const cost = CONFIG.LIMITED.COST;
    if (currentUser.coins < cost) {
      return jsonResponse({ error: '积分不足' }, 400);
    }

    const sources = poolConfig.sources;
    if (!sources || sources.length === 0) {
      return jsonResponse({ error: '卡池配置错误' }, 500);
    }

    // 限定池实时请求，不使用预抽卡缓存
    const asset = await this.fetchAndUploadRandom(sources);

    await this.env.DB.prepare(
      'UPDATE users SET coins = coins - ?, draw_count = draw_count + 1 WHERE id = ?'
    ).bind(cost, currentUser.id).run();

    currentUser.coins -= cost;
    currentUser.draw_count = (currentUser.draw_count || 0) + 1;

    const existing = await this.env.DB.prepare(
      'SELECT 1 FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, 'UR').first();

    if (existing) {
      await this.env.DB.prepare(
        'UPDATE inventory SET count = count + 1 WHERE user_id = ? AND rarity = ?'
      ).bind(currentUser.id, 'UR').run();
    } else {
      await this.env.DB.prepare(
        'INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1)'
      ).bind(currentUser.id, 'UR').run();
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));

    // 更新图库
    if (asset.success) {
      const galleryItem = {
        url: asset.imageUrl,
        userId: currentUser.id,
        username: currentUser.username,
        ts: getBeijingISOString()
      };
      this.ctx.waitUntil(updateGalleryIndex(this.env, galleryItem));
    }

    return jsonResponse({
      success: true,
      card: asset,
      pool: poolConfig.name,
      userCoins: currentUser.coins
    });
  }

  // 获取限定池列表
  async getLimitedPools(currentUser) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const pools = Object.entries(CONFIG.LIMITED.POOLS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      cost: CONFIG.LIMITED.COST,
      available: config.sources && config.sources.length > 0,
      count: config.sources ? config.sources.length : 0
    }));

    return jsonResponse({ success: true, pools, defaultPool: CONFIG.LIMITED.DEFAULT_POOL });
  }

  // 合成
  async craft(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const { targetRarity } = await request.json();
    const cost = CONFIG.GAME.CRAFT_COST;

    const rarityMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const sourceRarity = rarityMap[targetRarity];

    if (!sourceRarity) return jsonResponse({ error: '无效的合成目标' }, 400);

    const inventory = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, sourceRarity).first();

    if (!inventory || inventory.count < cost) {
      return jsonResponse({ error: `合成需要 ${cost} 张 ${sourceRarity} 卡` }, 400);
    }

    await this.env.DB.prepare(
      'UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?'
    ).bind(cost, currentUser.id, sourceRarity).run();

    const targetSources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    const asset = await this.consumeGlobalBuffer(targetRarity, targetSources);

    const existing = await this.env.DB.prepare(
      'SELECT 1 FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, targetRarity).first();

    if (existing) {
      await this.env.DB.prepare(
        'UPDATE inventory SET count = count + 1 WHERE user_id = ? AND rarity = ?'
      ).bind(currentUser.id, targetRarity).run();
    } else {
      await this.env.DB.prepare(
        'INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1)'
      ).bind(currentUser.id, targetRarity).run();
    }

    const expGain = CONFIG.LEVEL.EXP_GAIN.CRAFT;

    if (asset.success) {
      const galleryItem = {
        url: asset.imageUrl,
        userId: currentUser.id,
        username: currentUser.username,
        ts: getBeijingISOString()
      };
      this.ctx.waitUntil(updateGalleryIndex(this.env, galleryItem));
    }

    return jsonResponse({
      success: true,
      card: asset
    });
  }

  // 商店购买
  async shopBuy(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const { rarity } = await request.json();
    const price = CONFIG.GAME.SHOP[rarity];

    if (!price) return jsonResponse({ error: '商品不存在' }, 400);
    if (currentUser.coins < price) return jsonResponse({ error: '积分不足' }, 400);

    await this.env.DB.prepare(
      'UPDATE users SET coins = coins - ? WHERE id = ?'
    ).bind(price, currentUser.id).run();

    const sources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
    const asset = await this.consumeGlobalBuffer(rarity, sources);

    const existing = await this.env.DB.prepare(
      'SELECT 1 FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, rarity).first();

    if (existing) {
      await this.env.DB.prepare(
        'UPDATE inventory SET count = count + 1 WHERE user_id = ? AND rarity = ?'
      ).bind(currentUser.id, rarity).run();
    } else {
      await this.env.DB.prepare(
        'INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1)'
      ).bind(currentUser.id, rarity).run();
    }

    currentUser.coins -= price;

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));

    // 更新图库（商城购买不加入排行榜）
    if (asset.success) {
      const galleryItem = {
        url: asset.imageUrl,
        userId: currentUser.id,
        username: currentUser.username,
        ts: getBeijingISOString()
      };
      this.ctx.waitUntil(updateGalleryIndex(this.env, galleryItem));
    }

    return jsonResponse({
      success: true,
      card: asset,
      userCoins: currentUser.coins
    });
  }

  // 骰子游戏
  async playDice(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const body = await request.json();
    const bet = parseInt(body.bet || body.betAmount);
    const choice = body.choice || body.prediction;
    const minBet = CONFIG.GAME.DICE.MIN_BET;
    const maxBet = CONFIG.GAME.DICE.MAX_BET;
    const payout = CONFIG.GAME.DICE.PAYOUT;

    if (!bet || isNaN(bet) || bet < minBet || bet > maxBet) {
      return jsonResponse({ error: `下注金额需在 ${minBet} - ${maxBet} 之间` }, 400);
    }

    if (currentUser.coins < bet) return jsonResponse({ error: '积分不足' }, 400);

    if (choice !== 'small' && choice !== 'big') {
      return jsonResponse({ error: '请选择押大或押小' }, 400);
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    const isSmall = roll <= 3;
    const userChoiceIsSmall = choice === 'small';
    const isWin = isSmall === userChoiceIsSmall;

    if (isWin) {
      const winAmount = bet * payout;
      await this.env.DB.prepare(
        'UPDATE users SET coins = coins + ?, wins = wins + 1 WHERE id = ?'
      ).bind(winAmount - bet, currentUser.id).run();

      currentUser.coins = (currentUser.coins || 0) + winAmount - bet;
      currentUser.wins = (currentUser.wins || 0) + 1;
    } else {
      await this.env.DB.prepare(
        'UPDATE users SET coins = coins - ? WHERE id = ?'
      ).bind(bet, currentUser.id).run();

      currentUser.coins = (currentUser.coins || 0) - bet;
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));

    return jsonResponse({
      success: true, 
      roll, 
      isWin: isWin, 
      winAmount: isWin ? bet * payout : 0, 
      userCoins: currentUser.coins
    });
  }

  // 上传图片
  async uploadImage(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    try {
      const formData = await request.formData();
      const file = formData.get('image');
      const rarity = formData.get('rarity') || 'N';

      if (!file) return jsonResponse({ error: '未提供图片' }, 400);

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return jsonResponse({ error: '无效的文件类型' }, 400);
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return jsonResponse({ error: '文件过大，最大 5MB' }, 400);
      }

      const arrayBuffer = await file.arrayBuffer();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${currentUser.id}_${timestamp}_${random}.${ext}`;
      const path = `uploads/${filename}`;

      const result = await uploadToGithub(this.env, path, arrayBuffer, ext, `Upload by ${currentUser.username}`);

      if (result.error) {
        return jsonResponse({ error: result.error }, 500);
      }

      await this.env.DB.prepare(
        'INSERT INTO user_uploads (user_id, username, url, rarity, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(currentUser.id, currentUser.username, result.url, rarity, 'pending', getBeijingISOString()).run();

      return jsonResponse({ success: true, url: result.url, message: '上传成功，等待审核' });
    } catch (e) {
      console.error('Upload error:', e);
      return jsonResponse({ error: '上传失败' }, 500);
    }
  }

  // 获取用户上传
  async getUserUploads(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const total = await this.env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_uploads WHERE user_id = ?'
    ).bind(currentUser.id).first();

    const uploads = await this.env.DB.prepare(
      'SELECT * FROM user_uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(currentUser.id, limit, offset).all();

    return jsonResponse({
      success: true,
      uploads: uploads.results || [],
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit)
    });
  }

  // 获取随机用户上传（用于限定池）
  async getRandomUserUpload() {
    const upload = await this.env.DB.prepare(
      "SELECT * FROM user_uploads WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1"
    ).first();

    return upload;
  }

  // 随机图片API调用
  async fetchRandomImageAPI(apiUrl) {
    try {
      if (!apiUrl) {
        return { success: false, message: 'API URL not provided' };
      }
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json,image/webp,image/apng,image/*,*/*;q=0.8'
      };

      try {
        const headRes = await fetch(apiUrl, { 
            method: 'HEAD', 
            headers, 
            redirect: 'follow' 
        });
        
        if (headRes.ok) {
          const contentType = headRes.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            return {
              success: true,
              imageUrl: headRes.url,
              rarity: 'UR', 
              sourceName: 'API Redirect (HEAD)'
            };
          }
        }
      } catch (headError) {
        console.warn('[RandomImageAPI] HEAD failed, falling back to GET', headError);
      }

      const response = await fetch(apiUrl, { method: 'GET', headers, redirect: 'follow' });

      if (!response.ok) {
        return { success: false, message: `API returned ${response.status}` };
      }

      const contentType = response.headers.get('content-type') || '';
      const finalUrl = response.url;

      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          const imageUrl = data.url || data.img || data.image || data.text || data.data?.url || (Array.isArray(data) ? data[0].url : null);
          if (imageUrl) {
            return { success: true, imageUrl: imageUrl, rarity: 'UR', sourceName: 'API JSON' };
          }
        } catch(e) {}
      }
      
      return {
        success: true,
        imageUrl: finalUrl,
        rarity: 'UR',
        sourceName: 'API Redirect'
      };
      
    } catch (e) {
      console.error('[RandomImageAPI] Error:', e);
      return { success: false, message: '网络错误，请稍后重试' };
    }
  }
}
