/**
 * =========================================
 * Chouka 抽卡系统 - 主入口
 * 模块化架构
 * =========================================
 */

// 模块导入
import { BUSINESS_CONFIG, TECHNICAL_CONFIG, CONFIG, DEFAULT_CHANGELOG, HTTP_STATUS, RARITY_ORDER } from './src/config/index.js';
import { jsonResponse, safeJsonParse, requireAdmin } from './src/utils/response.js';
import { getBeijingTime, getBeijingDateStr, getBeijingISOString, utcToBeijing } from './src/utils/time.js';
import { validateUsername, validatePassword, validateNickname, validateRarity, validateBetAmount, validatePrediction } from './src/utils/validation.js';
import { UserService } from './src/services/user-service.js';
import { GachaService, uploadToGithub } from './src/services/gacha-service.js';
import { getIndexPage } from './src/templates/index-page.js';
import { getLibraryPage } from './src/templates/library-page.js';
import { getProfilePage } from './src/templates/profile-page.js';

// 工具函数
function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function calculateLevelFromTotalExp(totalExp) {
  const { BASE_EXP, EXP_MULTIPLIER, MAX_LEVEL } = CONFIG.LEVEL;
  let accumulatedExp = 0;
  let level = 1;

  for (let l = 2; l <= MAX_LEVEL; l++) {
    const requiredForNext = Math.floor(BASE_EXP * Math.pow(l, EXP_MULTIPLIER));
    if (totalExp < accumulatedExp + requiredForNext) {
      return {
        level: l - 1,
        currentExp: totalExp - accumulatedExp,
        isMax: false
      };
    }
    accumulatedExp += requiredForNext;
  }

  return {
    level: MAX_LEVEL,
    currentExp: totalExp - accumulatedExp,
    isMax: true
  };
}

export default {
  async fetch(request, env, ctx) {
    // 解析请求
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = normalizePath(url.pathname);

    // CORS 预检
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 
          'Access-Control-Allow-Origin': '*', 
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
          'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-User-ID' 
        }
      });
    }

    // 获取当前用户
    let currentUser = null;
    const token = request.headers.get('X-Session-Token');
    if (token) {
      const userDataStr = await env.KV_CACHE.get(`session:${token}`);
      if (userDataStr) {
        try {
          currentUser = JSON.parse(userDataStr);
        } catch (e) {
          console.error('Session cache corrupted, invalidating:', token);
          await env.KV_CACHE.delete(`session:${token}`);
        }
      }
    }
    // 调试模式 - 仅在 DEBUG_MODE_ENABLED 为 true 时可用
    if (!currentUser && TECHNICAL_CONFIG.DEBUG_MODE_ENABLED) {
      const debugUserId = request.headers.get('X-User-ID');
      if (debugUserId) {
        console.warn('[DEBUG] Debug login bypass:', debugUserId);
        const user = await env.DB.prepare(
          'SELECT id, username, nickname, coins, level, exp, total_exp FROM users WHERE username = ?'
        ).bind(debugUserId).first();
        if (user) currentUser = user;
      }
    }

    // 初始化服务
    const userService = new UserService(env, ctx);
    const gachaService = new GachaService(env, ctx, userService);

    // 路由错误处理
    const handleRoute = async (handler) => {
      try {
        return await handler();
      } catch (err) {
        console.error('Route Error:', err);
        return jsonResponse({ error: '服务器内部错误' }, 500);
      }
    };

    // 路由表 (使用 Map 提升查找性能)
    const routes = new Map([
      ['GET /', () => handleRoute(() => handleHome(env))],
      ['GET /user/profile', () => handleRoute(() => handleProfile())],
      ['POST /auth/register', () => handleRoute(() => userService.register(request))],
      ['POST /auth/login', () => handleRoute(() => userService.login(request))],
      ['GET /user/info', () => handleRoute(() => userService.getInfo(currentUser))],
      ['GET /user/inventory', () => handleRoute(() => userService.getInventory(currentUser))],
      ['POST /user/update-profile', () => handleRoute(() => userService.updateProfile(currentUser, request))],
      ['POST /user/check-in', () => handleRoute(() => userService.checkIn(currentUser, request))],
      ['POST /user/claim-reward', () => handleRoute(() => userService.claimReward(currentUser, request))],
      ['GET /user/titles', () => handleRoute(() => userService.getTitles(currentUser))],
      ['POST /user/equip-title', () => handleRoute(() => userService.equipTitle(currentUser, request))],
      ['POST /user/upload', () => handleRoute(() => gachaService.uploadImage(currentUser, request))],
      ['GET /user/uploads', () => handleRoute(() => gachaService.getUserUploads(currentUser, request))],
      ['GET /limited/pools', () => handleRoute(() => gachaService.getLimitedPools(currentUser))],
      ['GET /draw', () => handleRoute(() => gachaService.draw(currentUser))],
      ['POST /draw/multi', () => handleRoute(() => gachaService.multiDraw(currentUser, request))],
      ['GET /draw/history', () => handleRoute(() => gachaService.getDrawHistory(currentUser, request))],
      ['POST /draw/limited', () => handleRoute(() => gachaService.drawLimited(currentUser, request))],
      ['POST /user/craft', () => handleRoute(() => gachaService.craft(currentUser, request))],
      ['POST /shop/buy', () => handleRoute(() => gachaService.shopBuy(currentUser, request))],
      ['POST /game/dice', () => handleRoute(() => gachaService.playDice(currentUser, request))],
      ['GET /showcase', () => handleRoute(() => handleShowcase(env))],
      ['GET /api/stats', () => handleRoute(() => handleStats(env))],
      ['GET /changelog', () => handleRoute(() => handleChangelog(env, request))],
      ['GET /announcement', () => handleRoute(() => handleGetAnnouncement(env))],
      ['GET /library', () => handleRoute(() => handleLibrary(request, env, url))],
      ['GET /api/library/items', () => handleRoute(() => handleLibraryApi(request, env))],
      ['GET /favicon.ico', () => new Response(null, { status: 204 })],
      ['POST /admin/users', () => handleRoute(() => handleAdminUsers(request, env))],
      ['POST /admin/verify', () => handleRoute(() => handleAdminVerify(request, env))],
      ['POST /admin/save-changelog', () => handleRoute(() => handleAdminSaveLog(request, env))],
      ['POST /admin/save-announcement', () => handleRoute(() => handleAdminSaveAnnouncement(request, env))],
      ['POST /admin/update-points', () => handleRoute(() => handleAdminUpdatePoints(request, env))],
      ['POST /admin/delete-user', () => handleRoute(() => handleAdminDeleteUser(request, env))],
      ['POST /admin/uploads', () => handleRoute(() => handleAdminUploads(request, env))],
      ['POST /admin/review-upload', () => handleRoute(() => handleAdminReviewUpload(request, env))],
    ]);

    const routeKey = `${method} ${pathname}`;
    const handler = routes.get(routeKey);

    if (handler) {
      return await handler();
    }

    if (pathname.startsWith('/auth') || pathname.startsWith('/user') || pathname.startsWith('/draw') || 
        pathname.startsWith('/shop') || pathname.startsWith('/game') || pathname.startsWith('/admin')) {
      return jsonResponse({ error: '未找到' }, 404);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// =========================================
// 路由处理器
// =========================================

async function handleHome(env) {
  const cacheKey = 'html:home';
  
  // 尝试从缓存读取
  const cachedHtml = await env.KV_CACHE.get(cacheKey);
  if (cachedHtml) {
    return new Response(cachedHtml, {
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        'X-Cache-Status': 'HIT'
      } 
    });
  }
  
  // 生成 HTML
  let siteStartTime = await env.KV_CACHE.get(CONFIG.KEYS.SITE_START_TIME);
  if (!siteStartTime) {
    siteStartTime = Date.now().toString();
    await env.KV_CACHE.put(CONFIG.KEYS.SITE_START_TIME, siteStartTime);
  }
  
  const html = getIndexPage(siteStartTime);
  
  // 缓存 HTML (5分钟)
  await env.KV_CACHE.put(cacheKey, html, { expirationTtl: 300 });
  
  return new Response(html, {
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'X-Cache-Status': 'MISS'
    } 
  });
}

async function handleProfile() {
  return new Response(getProfilePage(), { 
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    } 
  });
}

async function handleChangelog(env, request) {
  if (!env.RECENT_REQUESTS) return jsonResponse(DEFAULT_CHANGELOG);
  let logs = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.CHANGELOG));
  
  const isAdminRequest = request?.headers?.get('X-Admin-Mode') === 'true';
  const cacheHeaders = isAdminRequest ? {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  } : {
    'Cache-Control': `public, max-age=${CONFIG.TTL.PUBLIC_API}`,
    'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  };
  
  return jsonResponse(logs || DEFAULT_CHANGELOG, 200, cacheHeaders);
}

async function handleGetAnnouncement(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse({ enabled: false });
  const data = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.ANNOUNCEMENT));
  return jsonResponse(data || { enabled: false }, 200, {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  });
}

async function handleAdminSaveAnnouncement(request, env) {
  try {
    const { password, announcement, refreshId } = await request.json();
    if (!constantTimeEqual(password, env.admin)) return jsonResponse({ error: '认证失败' }, 403);
    
    const oldData = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.ANNOUNCEMENT));
    
    let newId = getBeijingTime().getTime();

    if (!refreshId && oldData && oldData.id) {
      const isTitleSame = oldData.title === announcement.title;
      const isContentSame = oldData.content === announcement.content;
      
      if (isTitleSame && isContentSame) {
        newId = oldData.id;
      }
    }

    const dataToSave = { ...announcement, id: newId, updatedAt: getBeijingISOString() };
    
    await env.RECENT_REQUESTS.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify(dataToSave), { 
      expirationTtl: 86400 * 365 
    });
    
    return jsonResponse({ success: true, updated: newId !== (oldData && oldData.id), id: newId });
  } catch (e) {
    console.error('Save announcement error:', e);
    return jsonResponse({ error: '保存失败: ' + e.message }, 500);
  }
}

async function handleShowcase(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse([]);
  const list = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.LEADERBOARD)) || [];
  const filtered = list.filter(item => !item.isLimited);
  const result = filtered.sort(() => 0.5 - Math.random()).slice(0, 6);
  
  return jsonResponse(result, 200, {
    'Cache-Control': `public, max-age=${CONFIG.TTL.PUBLIC_API}`,
    'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
  });
}

async function handleStats(env) {
  const cacheKey = CONFIG.KEYS.STATS_DAILY;
  
  // 尝试从缓存读取
  const cached = await env.KV_CACHE.get(cacheKey, { type: 'json' });
  if (cached) {
    return jsonResponse(cached, 200, { 
      'X-Cache-Status': 'HIT',
      'Cache-Control': 'public, max-age=60'
    });
  }
  
  try {
    // 并行查询统计数据
    const [
      userCountRes,
      todayCountRes,
      totalDrawsRes,
      galleryCountRes,
      todayDrawsRes
    ] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as total FROM users').first(),
      env.DB.prepare("SELECT COUNT(*) as total FROM users WHERE created_at >= date('now')").first(),
      env.DB.prepare('SELECT COALESCE(SUM(draw_count), 0) as total FROM users').first(),
      env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first(),
      env.DB.prepare("SELECT COUNT(*) as total FROM logs WHERE action = 'draw' AND created_at >= date('now')").first()
    ]);
    
    const stats = {
      totalUsers: userCountRes.total || 0,
      todayUsers: todayCountRes.total || 0,
      totalDraws: totalDrawsRes.total || 0,
      totalGallery: galleryCountRes.total || 0,
      todayDraws: todayDrawsRes.total || 0,
      updatedAt: getBeijingISOString()
    };
    
    // 缓存 5 分钟
    await env.KV_CACHE.put(cacheKey, JSON.stringify(stats), { expirationTtl: 300 });
    
    return jsonResponse(stats, 200, { 
      'X-Cache-Status': 'MISS',
      'Cache-Control': 'public, max-age=60'
    });
  } catch (e) {
    console.error('Stats Error:', e);
    return jsonResponse({ error: '统计获取失败' }, 500);
  }
}

async function handleLibrary(request, env, url) {
  const cursor = url.searchParams.get('cursor') || null;
  const pageSize = 24;

  try {
    let query, params;
    
    if (cursor) {
      // 游标分页 (使用 id 作为游标)
      query = 'SELECT id, url, username, created_at as ts FROM gallery WHERE id < ? ORDER BY id DESC LIMIT ?';
      params = [parseInt(cursor), pageSize];
    } else {
      // 首页首次加载
      query = 'SELECT id, url, username, created_at as ts FROM gallery ORDER BY id DESC LIMIT ?';
      params = [pageSize];
    }
    
    const dataRes = await env.DB.prepare(query).bind(...params).all();
    const countRes = await env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first();

    const items = dataRes.results || [];
    const totalItems = countRes.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    // 计算下一页游标
    const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;

    return new Response(getLibraryPage(items, { 
      currentPage: 1, 
      totalPages, 
      totalItems,
      cursor: nextCursor
    }), { 
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60', 
        'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' 
      } 
    });

  } catch (e) {
    console.error('Library Error:', e);
    return new Response('Gallery 数据库错误', { status: 500 });
  }
}

async function handleLibraryApi(request, env) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') || null;
  const pageSize = parseInt(url.searchParams.get('pageSize') || '24');

  const cacheKey = cursor ? `lib:c:${cursor}:s:${pageSize}` : `lib:latest:s:${pageSize}`;
  const countKey = `lib:count`;
  
  try {
    // 1. 尝试从 KV 读取缓存
    const cachedData = await env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cachedData) {
      return jsonResponse(cachedData, 200, { 'X-Cache-Status': 'HIT' });
    }

    // 2. 获取总数
    let totalItems = await env.KV_CACHE.get(countKey, { type: 'json' });
    let shouldCacheCount = false;
    if (totalItems === null) {
       const countRes = await env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first();
       totalItems = countRes.total || 0;
       shouldCacheCount = true;
    }

    // 3. 游标分页查询
    let query, params;
    if (cursor) {
      query = 'SELECT id, url, username, created_at as ts FROM gallery WHERE id < ? ORDER BY id DESC LIMIT ?';
      params = [parseInt(cursor), pageSize];
    } else {
      query = 'SELECT id, url, username, created_at as ts FROM gallery ORDER BY id DESC LIMIT ?';
      params = [pageSize];
    }
    
    const dataRes = await env.DB.prepare(query).bind(...params).all();
    const items = dataRes.results || [];
    
    // 计算下一页游标
    const nextCursor = items.length === pageSize ? items[items.length - 1].id : null;
    const currentPage = 1; // 游标模式下简化

    const responseData = {
      items,
      pagination: {
        cursor: nextCursor,
        hasMore: nextCursor !== null,
        totalItems,
        pageSize,
        currentPage
      }
    };

    // 4. 写入缓存
    if (shouldCacheCount) {
      try {
        await env.KV_CACHE.put(countKey, JSON.stringify(totalItems), { expirationTtl: 300 });
      } catch (cacheErr) {
        console.error('Failed to cache count:', cacheErr);
      }
    }
    
    try {
      await env.KV_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: 60 });
    } catch (cacheErr) {
      console.error('Failed to cache response:', cacheErr);
    }

    return jsonResponse(responseData, 200, {
      'X-Cache-Status': 'MISS',
      'Cache-Control': 'public, max-age=60',
      'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    });

  } catch (e) {
    console.error('Library API Error:', e);
    return jsonResponse({ error: '数据库错误' }, 500);
  }
}

async function handleAdminVerify(request, env) {
  const { password } = await request.json();
  const isValid = constantTimeEqual(password, env.admin);
  return jsonResponse({ success: isValid }, isValid ? 200 : 403);
}

async function handleAdminUsers(request, env) {
  const { password, limit = 50, offset = 0 } = await request.json();
  if (!constantTimeEqual(password, env.admin)) return jsonResponse({ error: '认证失败' }, 403);
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().replace('T', ' ').split('.')[0];
    
    const [usersResult, countResult, todayCountResult] = await Promise.all([
      env.DB.prepare(
        'SELECT username, nickname, draw_count, coins, level, exp, total_exp, last_login_date, login_streak, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all(),
      env.DB.prepare('SELECT COUNT(*) as total FROM users').first(),
      env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE created_at >= ?').bind(todayStr).first()
    ]);
    
    const users = usersResult.results ? usersResult.results.map(user => {
      const levelInfo = calculateLevelFromTotalExp(user.total_exp || 0);
      return {
        username: user.username,
        nickname: user.nickname || user.username,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`,
        drawCount: user.draw_count || 0,
        coins: user.coins || 0,
        level: levelInfo.level,
        exp: levelInfo.currentExp,
        totalExp: user.total_exp || 0,
        lastLoginDate: user.last_login_date,
        loginStreak: user.login_streak || 0,
        createdAt: user.created_at
      };
    }) : [];
    
    return jsonResponse({ success: true, users, total: countResult.total, todayCount: todayCountResult.total, limit, offset });
  } catch (error) {
    console.error('Error fetching users:', error);
    return jsonResponse({ error: '数据库错误' }, 500);
  }
}

async function handleAdminSaveLog(request, env) {
  try {
    const { password, logs } = await request.json();
    if (!constantTimeEqual(password, env.admin)) return jsonResponse({ error: '认证失败' }, 403);
    if (!logs || !Array.isArray(logs)) return jsonResponse({ error: '无效的日志数据' }, 400);
    
    await env.RECENT_REQUESTS.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(logs), { 
      expirationTtl: 86400 * 365 // 保存1年
    });
    
    return jsonResponse({ success: true });
  } catch (e) {
    console.error('Save changelog error:', e);
    return jsonResponse({ error: '保存失败: ' + e.message }, 500);
  }
}

async function handleAdminUpdatePoints(request, env) {
  try {
    const { password, targetId, amount } = await request.json();
    
    if (!constantTimeEqual(password, env.admin)) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    if (!targetId || amount === undefined || isNaN(amount)) {
      return jsonResponse({ error: '参数无效' }, 400);
    }

    const user = await env.DB.prepare(
      'SELECT id, coins FROM users WHERE username = ?'
    ).bind(targetId).first();

    if (!user) {
      return jsonResponse({ error: '用户不存在' }, 404);
    }

    await env.DB.prepare(
      'UPDATE users SET coins = coins + ? WHERE id = ?'
    ).bind(parseInt(amount), user.id).run();

    try {
      await env.KV_CACHE.delete(`uinfo:${user.id}`);
    } catch (cacheErr) {
      console.error('Failed to invalidate user cache after admin update points:', cacheErr);
    }

    return jsonResponse({ success: true, message: 'Points updated' });

  } catch (e) {
    console.error('Update points error:', e);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

async function handleAdminDeleteUser(request, env) {
  try {
    const { password, targetId } = await request.json();

    if (!constantTimeEqual(password, env.admin)) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(targetId).first();

    if (!user) {
      return jsonResponse({ error: '用户不存在' }, 404);
    }

    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

    await env.KV_CACHE.delete(`uinfo:${user.id}`);

    return jsonResponse({ success: true, message: 'User and associated data deleted' });

  } catch (e) {
    console.error('Delete user error:', e);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

async function handleAdminUploads(request, env) {
  try {
    const { password, status = 'pending', limit = 50, offset = 0 } = await request.json();

    if (!constantTimeEqual(password, env.admin)) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    let sql = `
      SELECT 
        id, user_id, username, url, rarity, status, 
        created_at, reviewed_at 
      FROM user_uploads 
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const uploads = await env.DB.prepare(sql)
      .bind(status, limit, offset)
      .all();

    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM user_uploads WHERE status = ?'
    ).bind(status).first();

    return jsonResponse({
      success: true,
      uploads: uploads.results || [],
      total: countResult.total,
      limit,
      offset
    });

  } catch (e) {
    console.error('[Admin Uploads Error]:', e);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

async function handleAdminReviewUpload(request, env) {
  try {
    const { password, uploadId, action, rarity } = await request.json();

    if (!constantTimeEqual(password, env.admin)) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    if (!uploadId || !['approved', 'rejected'].includes(action)) {
      return jsonResponse({ error: '参数无效' }, 400);
    }

    // 获取上传记录信息
    const upload = await env.DB.prepare(
      'SELECT id, user_id, username, r2_key, github_path, url, rarity, status FROM user_uploads WHERE id = ?'
    ).bind(uploadId).first();

    if (!upload) {
      return jsonResponse({ error: '上传记录不存在' }, 404);
    }

    const reviewedAt = Date.now();

    if (action === 'approved') {
      const validRarity = rarity || 'N';
      
      // 从R2读取图片
      const r2Object = await env.R2_BUCKET.get(upload.r2_key);
      if (!r2Object) {
        return jsonResponse({ error: '图片文件不存在' }, 404);
      }
      
      const fileBuffer = await r2Object.arrayBuffer();
      const extension = upload.r2_key.split('.').pop() || 'jpg';
      
      // 生成GitHub路径（存到images文件夹）
      const githubPath = `images/${upload.id}_${reviewedAt}.${extension}`;
      
      // 上传到GitHub
      const githubResult = await uploadToGithub(
        env,
        githubPath,
        fileBuffer,
        extension,
        `Approved upload from user ${upload.username} (ID: ${upload.id})`
      );

      if (!githubResult || githubResult.error) {
        const errMsg = githubResult?.error || '上传到 GitHub 失败';
        console.error('[Review] GitHub upload failed:', errMsg);
        return jsonResponse({ error: `审核通过但GitHub上传失败: ${errMsg}` }, 500);
      }

      // 更新数据库：设置状态、稀有度、审核时间，并更新URL为GitHub CDN URL
      await env.DB.prepare(
        'UPDATE user_uploads SET status = ?, rarity = ?, reviewed_at = ?, github_path = ?, url = ? WHERE id = ?'
      ).bind('approved', validRarity, reviewedAt, githubPath, githubResult.url, uploadId).run();
      
      // 可选：从R2删除临时文件以节省空间
      try {
        await env.R2_BUCKET.delete(upload.r2_key);
        console.log(`[Review] Deleted R2 temp file: ${upload.r2_key}`);
      } catch (deleteErr) {
        console.warn(`[Review] Failed to delete R2 temp file: ${deleteErr.message}`);
      }
      
      return jsonResponse({ 
        success: true, 
        message: '上传已审核通过并发布到GitHub',
        rarity: validRarity,
        githubUrl: githubResult.url
      });
    } else {
      // 拒绝上传：只更新状态，不删除R2文件（可保留一段时间供复查）
      await env.DB.prepare(
        'UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?'
      ).bind('rejected', reviewedAt, uploadId).run();
      
      return jsonResponse({ 
        success: true, 
        message: '上传已拒绝'
      });
    }

  } catch (e) {
    console.error('[Admin Review Upload Error]:', e);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}