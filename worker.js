/**
 * =========================================
 * Chouka 抽卡系统 - 主入口
 * 模块化架构
 * =========================================
 */

// 模块导入
import { BUSINESS_CONFIG, TECHNICAL_CONFIG, CONFIG, DEFAULT_CHANGELOG } from './src/config/index.js';
import { jsonResponse, safeJsonParse, requireAdmin } from './src/utils/response.js';
import { getBeijingTime, getBeijingDateStr, getBeijingISOString, utcToBeijing } from './src/utils/time.js';
import { UserService } from './src/services/user-service.js';
import { GachaService } from './src/services/gacha-service.js';

// 工具函数
function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
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
      if (userDataStr) currentUser = JSON.parse(userDataStr);
    }
    // 调试模式
    if (!currentUser) {
      const debugUserId = request.headers.get('X-User-ID');
      if (debugUserId) {
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

    // 路由表
    const routes = {
      'GET /': () => handleRoute(() => handleHome()),
      'GET /user/profile': () => handleRoute(() => handleProfile()),
      'POST /auth/register': () => handleRoute(() => userService.register(request)),
      'POST /auth/login': () => handleRoute(() => userService.login(request)),
      'GET /user/info': () => handleRoute(() => userService.getInfo(currentUser)),
      'GET /user/inventory': () => handleRoute(() => userService.getInventory(currentUser)),
      'POST /user/update-profile': () => handleRoute(() => userService.updateProfile(currentUser, request)),
      'POST /user/check-in': () => handleRoute(() => userService.checkIn(currentUser, request)),
      'POST /user/claim-reward': () => handleRoute(() => userService.claimReward(currentUser, request)),
      'GET /user/titles': () => handleRoute(() => userService.getTitles(currentUser)),
      'POST /user/equip-title': () => handleRoute(() => userService.equipTitle(currentUser, request)),
      'POST /user/upload': () => handleRoute(() => gachaService.uploadImage(currentUser, request)),
      'GET /user/uploads': () => handleRoute(() => gachaService.getUserUploads(currentUser, request)),
      'GET /limited/pools': () => handleRoute(() => gachaService.getLimitedPools(currentUser)),
      'GET /draw': () => handleRoute(() => gachaService.draw(currentUser)),
      'POST /draw/limited': () => handleRoute(() => gachaService.drawLimited(currentUser, request)),
      'POST /user/craft': () => handleRoute(() => gachaService.craft(currentUser, request)),
      'POST /shop/buy': () => handleRoute(() => gachaService.shopBuy(currentUser, request)),
      'POST /game/dice': () => handleRoute(() => gachaService.playDice(currentUser, request)),
      'GET /showcase': () => handleRoute(() => handleShowcase(env)),
      'GET /changelog': () => handleRoute(() => handleChangelog(env, request)),
      'GET /announcement': () => handleRoute(() => handleGetAnnouncement(env)),
      'GET /library': () => handleRoute(() => handleLibrary(request, env, url)),
      'GET /api/library/items': () => handleRoute(() => handleLibraryApi(request, env)),
      'GET /favicon.ico': () => new Response(null, { status: 204 }),
      'POST /admin/users': () => handleRoute(() => handleAdminUsers(request, env)),
      'POST /admin/verify': () => handleRoute(() => handleAdminVerify(request, env)),
      'POST /admin/save-changelog': () => handleRoute(() => handleAdminSaveLog(request, env)),
      'POST /admin/save-announcement': () => handleRoute(() => handleAdminSaveAnnouncement(request, env)),
      'POST /admin/update-points': () => handleRoute(() => handleAdminUpdatePoints(request, env)),
      'POST /admin/delete-user': () => handleRoute(() => handleAdminDeleteUser(request, env)),
      'POST /admin/uploads': () => handleRoute(() => handleAdminUploads(request, env)),
      'POST /admin/review-upload': () => handleRoute(() => handleAdminReviewUpload(request, env)),
    };

    const routeKey = `${method} ${pathname}`;
    const handler = routes[routeKey];

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

async function handleHome() {
  return new Response(getHtmlPage(), { 
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
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
    if (password !== env.admin) return jsonResponse({ error: '认证失败' }, 403);
    
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

async function handleLibrary(request, env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 24;
  const offset = (page - 1) * pageSize;

  try {
    const [dataRes, countRes] = await Promise.all([
      env.DB.prepare(
        'SELECT url, username, created_at as ts FROM gallery ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(pageSize, offset).all(),
      env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first()
    ]);

    const items = dataRes.results || [];
    const totalItems = countRes.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));

    return new Response(getLibraryHtml(items, { currentPage, totalPages, totalItems }), { 
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
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '24');
  const offset = (page - 1) * pageSize;

  // 1. 尝试从 KV 读取缓存
  const cacheKey = `lib:p:${page}:s:${pageSize}`;
  const countKey = `lib:count`;
  
  try {
    const cachedData = await env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cachedData) {
      return jsonResponse(cachedData, 200, { 'X-Cache-Status': 'HIT' });
    }

    // 2. 优化 Count 查询：尝试从 KV 获取总数，如果没有再查库 (缓存 5 分钟)
    let totalItems = await env.KV_CACHE.get(countKey, { type: 'json' });
    let shouldCacheCount = false;
    if (totalItems === null) {
       const countRes = await env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first();
       totalItems = countRes.total || 0;
       shouldCacheCount = true;
    }

    // 3. 查库获取数据
    const dataRes = await env.DB.prepare(
      'SELECT url, username, created_at as ts FROM gallery ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(pageSize, offset).all();

    const items = dataRes.results || [];
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const responseData = {
      items,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        pageSize,
        hasMore: currentPage < totalPages
      }
    };

    // 4. 写入缓存（同步等待以确保成功）
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
  return jsonResponse({ success: password === env.admin }, password === env.admin ? 200 : 403);
}

async function handleAdminUsers(request, env) {
  const { password, limit = 50, offset = 0 } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: '认证失败' }, 403);
  
  try {
    const userService = new UserService(env, {});
    
    const [usersResult, countResult] = await Promise.all([
      env.DB.prepare(
        'SELECT username, nickname, draw_count, coins, level, exp, total_exp, last_login_date, login_streak, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(limit, offset).all(),
      env.DB.prepare('SELECT COUNT(*) as total FROM users').first()
    ]);
    
    const users = usersResult.results ? usersResult.results.map(user => {
      const levelInfo = userService.calculateLevelFromTotalExp(user.total_exp || 0);
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
    
    return jsonResponse({ success: true, users, total: countResult.total, limit, offset });
  } catch (error) {
    console.error('Error fetching users:', error);
    return jsonResponse({ error: '数据库错误' }, 500);
  }
}

async function handleAdminSaveLog(request, env) {
  try {
    const { password, logs } = await request.json();
    if (password !== env.admin) return jsonResponse({ error: '认证失败' }, 403);
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
    
    if (password !== env.admin) {
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

    if (password !== env.admin) {
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

    if (password !== env.admin) {
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

    if (password !== env.admin) {
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
      
      // 上传到GitHub
      const githubUrl = await uploadToGithub(
        env,
        upload.github_path,
        fileBuffer,
        extension,
        `Approved upload from user ${upload.username} (ID: ${upload.id})`
      );

      if (!githubUrl || (typeof githubUrl === 'object' && githubUrl.error)) {
        const errMsg = githubUrl?.error || '上传到 GitHub 失败';
        console.error('[Review] GitHub upload failed:', errMsg);
        return jsonResponse({ error: `审核通过但GitHub上传失败: ${errMsg}` }, 500);
      }

      // 更新数据库：设置状态、稀有度、审核时间，并更新URL为GitHub CDN URL
      await env.DB.prepare(
        'UPDATE user_uploads SET status = ?, rarity = ?, reviewed_at = ?, url = ? WHERE id = ?'
      ).bind('approved', validRarity, reviewedAt, githubUrl, uploadId).run();
      
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
        githubUrl: githubUrl
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

// =========================================
// HTML 组件
// =========================================

const Html = {
  cardStat(rarity, count) {
    const labels = { N: 'N', R: 'R', SR: 'SR', SSR: 'SSR', UR: 'UR' };
    return `<div class="card-stat card-stat-${rarity.toLowerCase()}"><div class="card-stat-label card-stat-label-${rarity.toLowerCase()}">${labels[rarity]}</div><div class="card-stat-val" id="invCount${rarity}">${count || 0}</div></div>`;
  },
  rarityTag(rarity) {
    return `<span class="rarity-tag r-${rarity.toLowerCase()} show">${rarity}</span>`;
  },
  shopItem(id, color, price, canBuy) {
    return `<div class="shop-item ${canBuy ? '' : 'disabled'}" ${canBuy ? `onclick="App.buyPack('${id}', ${price})"` : ''}><div style="font-weight:900; font-size:1.5rem; color:${color}">${id}</div><div class="price-tag"><i class="fas fa-coins"></i> ${price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">${canBuy ? '购买' : '积分不足'}</div></div>`;
  },
  gridItem(url, onclick) {
    return `<div class="grid-item" onclick="${onclick}"><img src="${url}" loading="lazy"></div>`;
  },
  invCount(rarity) {
    return `invCount${rarity}`;
  }
};

const NEUTRAL_CSS = `
<style>
  :root {
    --primary: #3B82F6; --primary-dark: #2563EB; --secondary: #10B981;
    --bg-color: #F8FAFC; --card-bg: rgba(255, 255, 255, 0.95);
    --text-main: #334155; --text-light: #94A3B8; --danger: #EF4444;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius: 16px; 
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    --r-n: #64748B; --r-r: #3B82F6; --r-sr: #8B5CF6; --r-ssr: #F59E0B; --r-ur: #EF4444;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    background-color: var(--bg-color);
    background-image: linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px);
    background-size: 30px 30px; color: var(--text-main); font-family: var(--font); margin: 0; min-height: 100vh; overflow-x: hidden;
  }
  .btn {
    background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 0 var(--primary-dark); transition: all 0.15s ease; font-size: 0.95rem; font-family: var(--font);
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 0 var(--primary-dark); }
  .btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--primary-dark); }
  .btn.secondary { background: white; color: var(--text-main); border: 2px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .btn.secondary:hover { background: #F8FAFC; border-color: var(--primary); color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59,130,246,0.15); }
  .btn.secondary:active { transform: translateY(2px); box-shadow: 0 0 0 #E2E8F0; }
  .btn.danger { background: var(--danger); box-shadow: 0 4px 0 #B91C1C; }
  .btn.danger:hover { background: #DC2626; }
  .btn.danger:active { transform: translateY(4px); box-shadow: 0 0 0 #B91C1C; }
  .glass-card { background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.55); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .modal { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 2000; opacity: 0; transition: 0.2s; }
  .modal.show { display: flex; opacity: 1; }
  .modal-content { background: rgba(255, 255, 255, 0.78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); padding: 24px; border-radius: var(--radius); width: 90%; max-width: 450px; text-align: center; transform: scale(0.95); transition: 0.2s; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1); max-height: 90vh; overflow-y: auto; position: relative; border: 1px solid rgba(255, 255, 255, 0.5); }
  .modal.show .modal-content { transform: scale(1); }
  .placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-light); text-align: center; font-size: 0.9rem; }
  .placeholder i { font-size: 3rem; margin-bottom: 16px; display: block; color: #CBD5E1; }
  .loading-spinner { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; align-items: center; color: var(--primary); text-align: center; font-size: 0.9rem; background: rgba(255,255,255,0.95); border-radius: var(--radius); z-index: 5; }
  .loading-spinner.show { display: flex; }
  .loading-spinner i { font-size: 3rem; margin-bottom: 16px; display: block; animation: spin 1s linear infinite; }
  .loading-spinner .loading-text { font-weight: 600; color: var(--text-main); }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .modal-close-btn { position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; color: var(--text-light); cursor: pointer; padding: 5px; z-index: 10; }
  .modal-close-btn:hover { color: var(--danger); transform: rotate(90deg); transition: 0.2s; }
  .actions { padding: 16px 10px 10px; display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1fr; }
  #drawBtn { grid-column: 1 / -1; height: 54px; font-size: 1.1rem; box-shadow: 0 6px 0 var(--primary-dark); }
  #drawBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 var(--primary-dark); }
  #drawBtn:active { transform: translateY(6px); box-shadow: 0 0 0 var(--primary-dark); }
  .actions .btn.secondary { padding: 8px 0; font-size: 1.2rem; transition: all 0.2s ease; }
  @media(min-width: 600px) { .actions { grid-template-columns: 2fr 1fr 1fr 1fr; } #drawBtn { grid-column: auto; height: auto; font-size: 0.95rem; } .actions .btn.secondary { font-size: 0.95rem; } }
  .rules-table { width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 10px; }
  .rules-table th { text-align: left; border-bottom: 2px solid #E2E8F0; padding: 6px; color: var(--primary); }
  .rules-table td { border-bottom: 1px solid #F1F5F9; padding: 6px; }
  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .shop-item { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 140px; }
  .shop-item:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
  .shop-item i { font-size: 2rem; margin-bottom: 10px; color: var(--primary); }
  .shop-item.disabled { opacity: 0.6; filter: grayscale(1); cursor: not-allowed; border-color: #E2E8F0 !important; transform: none !important; box-shadow: none !important; }
  .price-tag { background: linear-gradient(135deg, #FEF3C7, #FDE68A); color: #D97706; padding: 6px 10px; border-radius: 8px; font-weight: bold; font-size: 0.9rem; margin-top: 10px; display: inline-block; box-shadow: 0 2px 4px rgba(217,119,6,0.2); border: 1px solid #FBBF24; }
  .shop-item.can-craft { border: 2px solid var(--secondary); background-color: #ECFDF5; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); animation: pulse 2s infinite; }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
  .shop-cost { font-size: 0.8rem; color: var(--text-light); margin-top: 5px; }
  .rarity-tag { position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 12px; border-radius: 8px; font-weight: 900; color: white; font-size: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); opacity: 0; transform: scale(0.8); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid rgba(255,255,255,0.8); }
  .rarity-tag.show { opacity: 1; transform: scale(1); }
  .r-n { background: var(--r-n); } .r-r { background: var(--r-r); } .r-sr { background: var(--r-sr); } .r-ssr { background: linear-gradient(135deg, var(--r-ssr), #D97706); }
  .r-ur { background: linear-gradient(45deg, var(--r-ur), #EC4899, #8B5CF6); background-size: 200% 200%; animation: rainbow 3s ease infinite; border-color: #FFF; }
  @keyframes rainbow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  .admin-modal-content { background: linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98)); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 0; border-radius: 16px; width: 90%; max-width: 720px; max-height: 90vh; overflow: hidden; position: relative; border: 1px solid rgba(148, 163, 184, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05); transform: scale(0.95); transition: transform 0.2s ease; }
  .admin-modal.show .admin-modal-content { transform: scale(1); }
  .admin-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.15); background: rgba(0,0,0,0.2); }
  .admin-modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #F8FAFC; display: flex; align-items: center; gap: 10px; }
  .admin-modal-header h3 i { color: #F59E0B; }
  .admin-modal-close { background: rgba(148, 163, 184, 0.1); border: none; width: 36px; height: 36px; border-radius: 10px; color: #94A3B8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .admin-modal-close:hover { background: rgba(239, 68, 68, 0.2); color: #EF4444; transform: rotate(90deg); }
  .admin-modal-body { padding: 20px 24px; max-height: calc(90vh - 140px); overflow-y: auto; }
  .admin-tabs { display: flex; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 12px; margin-bottom: 20px; }
  .admin-tab { padding: 10px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; color: #94A3B8; transition: all 0.2s; border: none; background: transparent; display: flex; align-items: center; gap: 8px; }
  .admin-tab:hover { color: #E2E8F0; background: rgba(255,255,255,0.05); }
  .admin-tab.active { background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F172A; font-weight: 600; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3); }
  .admin-tab-badge { background: rgba(239, 68, 68, 0.9); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
  .admin-input { width: 100%; padding: 10px 14px; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; font-size: 0.9rem; background: rgba(0,0,0,0.3); color: #F8FAFC; transition: all 0.2s; }
  .admin-input:focus { outline: none; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  .admin-input::placeholder { color: #64748B; }
  .admin-textarea { width: 100%; padding: 12px 14px; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; font-size: 0.9rem; background: rgba(0,0,0,0.3); color: #F8FAFC; min-height: 120px; resize: vertical; font-family: inherit; transition: all 0.2s; }
  .admin-textarea:focus { outline: none; border-color: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
  .admin-textarea::placeholder { color: #64748B; }
  .admin-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 12px 0; font-size: 0.85rem; }
  .admin-table th { color: #94A3B8; font-weight: 600; padding: 12px; text-align: left; border-bottom: 1px solid rgba(148, 163, 184, 0.15); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .admin-table td { padding: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.08); color: #E2E8F0; }
  .admin-table tr:hover td { background: rgba(255,255,255,0.02); }
  .admin-table input { background: rgba(0,0,0,0.3); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 6px; padding: 6px 10px; color: #F8FAFC; font-size: 0.85rem; }
  .admin-table input:focus { outline: none; border-color: #F59E0B; }
  .admin-section-title { font-size: 0.9rem; font-weight: 600; color: #E2E8F0; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .admin-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .admin-card:hover { border-color: rgba(245, 158, 11, 0.3); }
  .form-label { display: block; font-size: 0.85rem; font-weight: 500; color: #94A3B8; margin-bottom: 8px; }
  .form-row { margin-bottom: 16px; }
  .switch { position: relative; display: inline-block; width: 48px; height: 26px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .switch .slider { position: absolute; cursor: pointer; inset: 0; background: rgba(148, 163, 184, 0.2); border-radius: 26px; transition: 0.3s; }
  .switch .slider:before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: #94A3B8; border-radius: 50%; transition: 0.3s; }
  .switch input:checked + .slider { background: #F59E0B; }
  .switch input:checked + .slider:before { transform: translateX(22px); background: #0F172A; }
  .form-hint { font-size: 0.75rem; color: #64748B; margin-top: 6px; }
  .switch-wrapper { display: flex; flex-direction: column; gap: 8px; }
  @media (max-width: 480px) {
    .switch-wrapper { width: 100%; }
  }
  .admin-btn { padding: 10px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .admin-btn.primary { background: linear-gradient(135deg, #F59E0B, #D97706); color: #0F172A; }
  .admin-btn.primary:hover { background: linear-gradient(135deg, #FBBF24, #F59E0B); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3); }
  .admin-btn.secondary { background: rgba(148, 163, 184, 0.15); color: #E2E8F0; }
  .admin-btn.secondary:hover { background: rgba(148, 163, 184, 0.25); }
  .admin-btn.danger { background: rgba(239, 68, 68, 0.15); color: #EF4444; }
  .admin-btn.danger:hover { background: rgba(239, 68, 68, 0.25); }
  .admin-btn.small { padding: 6px 12px; font-size: 0.75rem; }
  .quick-add-form { background: rgba(0,0,0,0.2); border-radius: 12px; padding: 16px; border: 1px solid rgba(245, 158, 11, 0.2); }
  .quick-add-row { display: flex; gap: 10px; align-items: center; }
  .quick-add-row input::placeholder { color: #64748B; }
  @media (max-width: 600px) { .quick-add-row { flex-wrap: wrap; } .quick-add-row input { width: 100%; flex: none; } }
  .quick-publish-form { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 16px; border: 1px solid rgba(16, 185, 129, 0.25); margin-bottom: 16px; }
  .quick-publish-row { display: flex; gap: 10px; align-items: flex-start; }
  .quick-publish-row input::placeholder { color: #64748B; }
  .quick-publish-row textarea::placeholder { color: #64748B; }
  @media (max-width: 600px) { .quick-publish-row { flex-wrap: wrap; } .quick-publish-row input, .quick-publish-row textarea { width: 100%; flex: none; } }
  .admin-scroll { max-height: 400px; overflow-y: auto; border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; background: rgba(0,0,0,0.15); }
  .admin-scroll::-webkit-scrollbar { width: 6px; }
  .admin-scroll::-webkit-scrollbar-track { background: transparent; }
  .admin-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
  .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
  .uploads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 16px; }
  @media (max-width: 480px) {
    .uploads-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px; }
  }
  .user-pill { background: white; padding: 6px 14px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .title-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.7rem; font-weight: bold; vertical-align: middle; margin-left: 6px; text-shadow: 0 1px 1px rgba(0,0,0,0.2); }
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
  .banner-tabs {display: flex;background: rgba(255,255,255,0.5);border-radius: 12px;padding: 4px;margin-bottom: 12px;border: 1px solid #E2E8F0; position: relative;}
  .banner-tab {flex: 1;text-align: center;padding: 8px;border-radius: 8px;font-size: 0.9rem;font-weight: 800;cursor: pointer;color: var(--text-light);transition: 0.2s;position: relative;overflow: hidden;}
  .banner-tab.active {background: white;color: var(--primary);box-shadow: 0 2px 4px rgba(0,0,0,0.05);}
  .banner-tab.active.limited {color: #EF4444;}
  .btn.limited-btn {background: linear-gradient(45deg, #EF4444, #F59E0B);box-shadow: 0 4px 0 #B91C1C;border:none;}
  .btn.limited-btn:active {box-shadow: 0 0 0 #B91C1C;}
  .pool-info-tag {font-size: 0.7rem;background: rgba(0,0,0,0.05);padding: 2px 6px;border-radius: 4px;margin-left: 4px;vertical-align: middle;}
  .pool-item {padding:12px;border-radius:10px;cursor:pointer;transition:all 0.2s;background:white;border:2px solid #FECACA;display:flex;flex-direction:column;gap:4px;}
  .pool-item:hover {transform:translateY(-1px);box-shadow:0 2px 8px rgba(239,68,68,0.1);}
  .pool-item.active {background:linear-gradient(135deg,#EF4444,#F59E0B);border-color:transparent;color:white;}
  .pool-item.unavailable {opacity:0.6;background:#F3F4F6;border-color:#E5E7EB;}
  .pool-item.unavailable:hover {transform:none;box-shadow:none;}
  .pool-item-header {display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:0.95rem;}
  .pool-status {font-size:0.8rem;opacity:0.9;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:6px;}
  .pool-item.active .pool-status {background:rgba(255,255,255,0.25);}
  .pool-desc {font-size:0.8rem;opacity:0.8;line-height:1.3;}
  .auth-tabs { display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #E2E8F0; padding-bottom:10px; }
  .auth-tab { flex:1; padding:8px; cursor:pointer; font-weight:bold; color:var(--text-light); border-radius:8px; transition:0.2s; }
  .auth-tab.active { background:var(--bg-color); color:var(--primary); }
  .refresh-spin { animation: spin-once 0.8s ease-in-out; color: var(--primary) !important; }
  @keyframes spin-once { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .switch { position: relative; display: inline-block; width: 48px; height: 24px; vertical-align: middle; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
  input:checked + .slider { background-color: var(--secondary); }
  input:checked + .slider:before { transform: translateX(24px); }
  .title-list { display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 300px; overflow-y: auto; margin-top: 10px; }
  .title-item { padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
  .title-item:hover { background: #F8FAFC; border-color: var(--primary); }
  .title-item.active { background: #EFF6FF; border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
  .title-item.active i { color: var(--primary); }
  .title-text { font-weight: bold; color: var(--text-main); }
  .no-title-msg { text-align: center; color: #94A3B8; padding: 20px; font-size: 0.9rem; } 
  .form-row { margin-bottom: 15px; }
  .form-label { display: block; font-weight: bold; font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px; }
  .form-hint { font-size: 0.75rem; color: var(--text-light); margin-top: 4px; }
  .skeleton { background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 37%, #E2E8F0 63%); background-size: 400% 100%; animation: skeleton-loading 1.4s ease infinite; border-radius: 8px; }
  @keyframes skeleton-loading { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
  .anim-shake { animation: shake-x 0.4s ease-in-out; }
  .anim-pop { animation: pop-scale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  @keyframes shake-x { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  @keyframes pop-scale { 0% { transform: scale(0.95); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  @media (max-width: 480px) {
    .modal-content { width: 95%; padding: 16px; max-width: none; }
    .shop-grid { grid-template-columns: 1fr; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; padding: 10px; }
    .actions { grid-template-columns: 1fr 1fr; gap: 8px; }
    #drawBtn { grid-column: 1 / -1; }
    .main-grid { grid-template-columns: 1fr; gap: 16px; }
    .header { flex-direction: row; gap: 12px; align-items: center; padding: 0 5px; max-width: 100%; }
    .logo-container { text-align: left; }
    .logo { font-size: 1.3rem; }
    .logo-subtitle { font-size: 0.75rem; margin-top: 2px; }
    .header-right { justify-content: flex-end; }
    .user-pill { font-size: 0.8rem; padding: 6px 12px 6px 8px; gap: 8px; margin: 0; flex-shrink: 0; flex-wrap: nowrap; white-space: nowrap; }
    .user-avatar { width: 28px; height: 28px; font-size: 0.8rem; flex-shrink: 0; }
    .user-info { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .user-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
    .user-level-badge { font-size: 0.6rem; padding: 1px 4px; }
    .user-chevron { display: none; }
  }
  @media (max-width: 768px) { 
    .modal-content { max-width: 90%; } 
    .shop-grid { grid-template-columns: 1fr 1fr; } 
    .grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    .admin-modal-content { max-width: 95%; max-height: 95vh; }
    .admin-modal-header { padding: 16px; }
    .admin-modal-header h3 { font-size: 1rem; }
    .admin-modal-body { padding: 16px; }
    .admin-tabs { flex-wrap: wrap; gap: 4px; padding: 4px; }
    .admin-tab { flex: 1 1 calc(50% - 4px); justify-content: center; padding: 10px 8px; font-size: 0.8rem; }
    .admin-tab i { display: none; }
    .admin-section-title { flex-direction: column; align-items: flex-start; gap: 10px; }
    .admin-scroll { max-height: 300px; }
    .admin-table { font-size: 0.75rem; }
    .admin-table th, .admin-table td { padding: 8px 4px; }
    .admin-table input { padding: 4px 6px; font-size: 0.75rem; }
    .form-row { flex-direction: column; gap: 16px !important; }
    #view-ann .form-row { gap: 12px; }
  }
  @media (max-width: 480px) {
    .admin-modal-content { border-radius: 12px; }
    .admin-tab { font-size: 0.75rem; padding: 8px 6px; }
    .admin-btn { width: 100%; justify-content: center; }
    .admin-btn.primary { order: -1; }
    #view-ann .form-row > div { width: 100%; }
    .switch { width: 100%; height: 36px; }
    .switch .slider { border-radius: 36px; }
    .switch .slider:before { width: 28px; height: 28px; }
    .switch input:checked + .slider:before { transform: translateX(28px); }
  }
  .upload-drop-zone { border: 2px dashed #C4B5FD; border-radius: 16px; padding: 30px 20px; text-align: center; background: #FAF5FF; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; }
  .upload-drop-zone:hover, .upload-drop-zone.drag-over { background: #F3E8FF; border-color: #7C3AED; transform: scale(1.01); }
  .upload-icon { font-size: 3rem; color: #A78BFA; margin-bottom: 12px; transition: 0.3s; }
  .upload-drop-zone:hover .upload-icon { color: #7C3AED; transform: translateY(-5px); }
  .upload-preview-container { margin-top: 15px; position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: none; border: 1px solid #E9D5FF; }
  .upload-preview-img { width: 100%; max-height: 250px; object-fit: contain; background: #000; display: block; }
  .upload-remove-btn { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
  .upload-remove-btn:hover { background: #EF4444; }
  .form-select-wrapper { position: relative; margin-bottom: 20px; }
  .form-select { width: 100%; padding: 12px 15px; border: 2px solid #E2E8F0; border-radius: 12px; background: white; font-size: 1rem; color: var(--text-main); appearance: none; cursor: pointer; font-family: var(--font); outline: none; transition: 0.2s; }
  .form-select:focus { border-color: #A78BFA; box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.2); }
  .select-arrow { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: var(--text-light); pointer-events: none; }
  .modal-img { max-width: 90vw; max-height: 90vh; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); object-fit: contain; animation: imgZoomIn 0.2s ease; }
  @keyframes imgZoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .modal-close-img { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
  .modal-close-img:hover { background: rgba(239,68,68,0.9); }
  .stat-card { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 15px; text-align: center; }
  .stat-val { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
  .stat-label { font-size: 0.8rem; color: var(--text-light); }
  .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 800; font-size: 1rem; padding: 0 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
.grid-item { border-radius: 8px; overflow: hidden; cursor: pointer; border: 1px solid #E2E8F0; transition: 0.2s; }
.grid-item:hover { border-color: var(--primary); transform: translateY(-2px); }
.grid-item img { width: 100%; height: auto; display: block; background: #F1F5F9; }
  .input-group input { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-family: var(--font); font-size: 1rem; text-align: center; color: var(--text-main); margin-bottom: 20px; outline: none; background: #F8FAFC; }
  .input-group input:focus { border-color: var(--primary); background: white; }
  .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.9); color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 10px; z-index: 3000; animation: slideDown 0.3s; border: 1px solid rgba(255,255,255,0.1); }
  @keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  .log-container { padding: 20px; text-align: left; }
  .log-header { font-size: 1rem; font-weight: 800; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--primary); }
  .log-item { padding-left: 16px; border-left: 2px solid #E2E8F0; margin-bottom: 15px; position: relative; }
  .log-item::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid white; }
  .log-meta { font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .log-ver { font-weight: bold; color: var(--text-main); background: #F1F5F9; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
  .log-ver.todo { background: #F3E8FF; color: #7E22CE; border-color: #D8B4FE; box-shadow: 0 0 5px rgba(168, 85, 247, 0.2); }
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
  .showcase-box { background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.55); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); }
  .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
  .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
  .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
  .stage img.show { opacity: 1; }
  .panel-container { display: flex; flex-direction: column; gap: 24px; }
  .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 10px; }
  .logo-container { display: flex; flex-direction: column; }
  .logo { font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; line-height: 1.2; }
  .logo span { color: var(--primary); }
  .logo-subtitle { font-size: 0.85rem; color: var(--text-light); margin-top: 4px; font-weight: 500; }
  .header-right { display: flex; align-items: center; }
  .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; object-fit: cover; }
  .user-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .user-name { font-weight: 700; color: var(--text-main); }
  
  .user-chevron { font-size: 0.8rem; color: #94A3B8; margin-left: 4px; }
  .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
  .back-nav { margin-bottom: 20px; }
  .profile-header { text-align: center; margin-bottom: 30px; }
  .avatar-large { width: 100px; height: 100px; margin: 0 auto 15px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; box-shadow: 0 8px 20px rgba(59,130,246,0.3); object-fit: cover; }
  .exp-bar-container { background: white; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 20px; }
  .exp-bar { height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
  .exp-bar-fill { height: 100%; background: linear-gradient(90deg, #3B82F6, #8B5CF6); width: 0%; transition: width 0.5s ease; }
  .cards-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .card-stat { padding: 8px; border-radius: 8px; text-align: center; }
  .card-stat-n { background: #F1F5F9; }
  .card-stat-r { background: #DBEAFE; }
  .card-stat-sr { background: #EDE9FE; }
  .card-stat-ssr { background: #FEF3C7; }
  .card-stat-ur { background: #FEE2E2; }
  .card-stat-label { font-size: 0.7rem; }
  .card-stat-label-n { color: #64748B; }
  .card-stat-label-r { color: #1E40AF; }
  .card-stat-label-sr { color: #5B21B6; }
  .card-stat-label-ssr { color: #92400E; }
  .card-stat-label-ur { color: #991B1B; }
  .card-stat-val { font-weight: bold; }
  .total-cards { text-align: center; margin-top: 10px; font-size: 0.8rem; color: #94A3B8; }
</style>
`;

// =========================================
// 首页模板
// =========================================

function getHtmlPage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>抽卡系统</title>
  <!-- 替换为国内 BootCDN 源 -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.bootcdn.net/ajax/libs/marked/12.0.1/marked.min.js"></script>
  ${NEUTRAL_CSS}
  <style>
    body { padding: 20px 20px 60px 20px; display: flex; flex-direction: column; align-items: center; }
    .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 10px; }
    .logo-container { display: flex; flex-direction: column; }
    .logo { font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; line-height: 1.2; }
    .logo span { color: var(--primary); }
    .logo-subtitle { font-size: 0.85rem; color: var(--text-light); margin-top: 4px; font-weight: 500; }
    .header-right { display: flex; align-items: center; }
    .user-pill {
      background: white;
      padding: 8px 16px 8px 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      font-size: 0.9rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .user-pill:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
      transform: translateY(-1px);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .user-name {
      font-weight: 700;
      color: var(--text-main);
    }
    .user-chevron { font-size: 0.8rem; color: #94A3B8; margin-left: 4px; }
    .user-level-badge { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; }
    .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
    .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
    .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
    .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
    .stage img.show { opacity: 1; }
    .panel-container { display: flex; flex-direction: column; gap: 24px; }
    .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 800; font-size: 1rem; padding: 0 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    /* 精选图库特定样式 - 确保6张图片整齐排列 */
    #showcaseGrid {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
    }
.grid-item { border-radius: 8px; overflow: hidden; background: #F1F5F9; cursor: pointer; border: 1px solid #E2E8F0; transition: 0.2s; aspect-ratio: 1; }
    .grid-item:hover { border-color: var(--primary); transform: translateY(-2px); }
    .grid-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .input-group input { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-family: var(--font); font-size: 1rem; text-align: center; color: var(--text-main); margin-bottom: 20px; outline: none; background: #F8FAFC; }
    .input-group input:focus { border-color: var(--primary); background: white; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 10px; z-index: 3000; animation: slideDown 0.3s; backdrop-filter: blur(10px); background: rgba(30, 41, 59, 0.88); border: 1px solid rgba(255,255,255,0.12); }
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
    <!-- 修改处：添加 onclick 事件和 cursor 样式 -->
    <div class="logo-container" onclick="App.openAdmin()" style="cursor: pointer;" title="点击进入管理面板">
      <div class="logo"><i class="fas fa-cube"></i> Gacha<span>System</span></div>
      <div class="logo-subtitle">抽卡收集系统</div>
    </div>
    <div class="header-right">
<div class="user-pill" onclick="window.location.href='/user/profile'">
          <img class="user-avatar" id="navAvatar" src="https://api.dicebear.com/7.x/adventurer/svg?seed=default" />
          <div class="user-info">
           <span class="user-name" id="navNickname">游客</span>
<div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span class="user-level-badge" id="navLevel">Lv.1</span>
            </div>
         </div>
         <i class="fas fa-chevron-right user-chevron"></i>
       </div>
    </div>
  </header>

  <div class="main-grid">
    <div class="gacha-card">
      <div class="banner-tabs">
        <div class="banner-tab active" id="tab-std" onclick="App.switchPool('std')">
            <span>常驻池</span>
        </div>
        <div class="banner-tab" id="tab-ltd" onclick="App.togglePoolDropdown()">
            <span>限定池 <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px; transition:transform 0.2s;" id="poolDropdownArrow"></i></span>
            <span class="pool-info-tag" id="ltdCostDisplay">500pts</span>
        </div>
        <!-- 限定池下拉弹窗 -->
        <div id="poolDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:linear-gradient(135deg, #FEF2F2, #FFF5F5); border:2px solid #FECACA; border-radius:12px; margin-top:8px; padding:8px; box-shadow:0 10px 25px rgba(239,68,68,0.15); z-index:100; max-height:250px; overflow-y:auto;">
          <div id="poolDropdownList" style="display:flex; flex-direction:column; gap:6px;">
            <!-- 动态填充 -->
          </div>
        </div>
      </div>
      <div class="stage" id="stage">
        <div id="rarityTag" class="rarity-tag">SSR</div>
        <div class="placeholder" id="placeholder">
          <i class="fas fa-gamepad"></i>
          <div>准备召唤</div>
        </div>
        <div class="loading-spinner" id="loadingSpinner">
          <i class="fas fa-circle-notch"></i>
          <div class="loading-text">召唤中...</div>
        </div>
        <img id="resultImg" alt="Result">
      </div>
      <div class="actions">
        <button class="btn" onclick="App.draw()" id="drawBtn">
          <i class="fas fa-bolt"></i> <span>召唤</span>
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
        <button class="btn secondary" onclick="App.checkIn()" style="background:#ECFDF5; border-color:#6EE7B7; color:#059669;">
          <i class="fas fa-calendar-check"></i>
        </button>
        <button class="btn secondary" onclick="App.openUpload()" style="background:#F3E8FF; border-color:#C4B5FD; color:#7C3AED;">
          <i class="fas fa-cloud-upload-alt"></i>
        </button>
        <a href="/library" class="btn secondary"><i class="fas fa-th-large"></i></a>
      </div>
    </div>

    <div class="panel-container">
      <div class="showcase-box">
        <div class="box-header">
          <span><i class="fas fa-star" style="color:#F59E0B"></i> 精选图库</span>
          <i class="fas fa-rotate" id="refreshBtn" style="cursor:pointer; font-size:0.9rem; color:#94A3B8" onclick="App.loadShowcase()"></i>
        </div>
        <div class="grid" id="showcaseGrid">
          <div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">加载中...</div>
        </div>
      </div>
      <div class="glass-card log-container">
        <div class="log-header"><i class="fas fa-code-branch"></i> 更新履历</div>
        <div id="logList" class="log-list collapsed">
          <div style="text-align:center; color:#94A3B8;">加载中...</div>
        </div>
        <div class="log-toggle" id="logToggle" onclick="App.toggleLog()" style="display:none">
          <span>展开更多</span> <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
  </div>

  <div id="authModal" class="modal">
    <div class="modal-content">
      <h3 style="margin-top:0; color:var(--text-main)">身份验证</h3>
      <div class="auth-tabs">
         <div class="auth-tab active" id="tab-login" onclick="App.switchAuth('login')">登录</div>
         <div class="auth-tab" id="tab-register" onclick="App.switchAuth('register')">注册</div>
      </div>
      
      <div id="authForm">
        <div class="input-group">
            <input type="text" id="authUsername" placeholder="账号 (英文/数字)">
        </div>
        <div class="input-group" id="nickGroup" style="display:none;">
            <input type="text" id="authNickname" placeholder="昵称 (显示名)">
        </div>
        <div class="input-group">
            <input type="password" id="authPassword" placeholder="密码">
        </div>
      </div>
      
      <button class="btn" style="width:100%;" onclick="App.doAuth()">确认提交</button>
    </div>
  </div>

  <div id="craftModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>卡片合成</h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;">消耗5张低阶卡片，进行一次高阶召唤。</p>
      <div class="shop-grid">
        <div class="shop-item" id="craft-item-R" onclick="App.doCraft('R')"><div style="font-weight:bold; color:#3B82F6">R</div><div class="shop-cost">消耗: 5 N</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 N: <span id="invN">0</span></div></div>
        <div class="shop-item" id="craft-item-SR" onclick="App.doCraft('SR')"><div style="font-weight:bold; color:#8B5CF6">SR</div><div class="shop-cost">消耗: 5 R</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 R: <span id="invR">0</span></div></div>
        <div class="shop-item" id="craft-item-SSR" onclick="App.doCraft('SSR')"><div style="font-weight:bold; color:#F59E0B">SSR</div><div class="shop-cost">消耗: 5 SR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SR: <span id="invSR">0</span></div></div>
        <div class="shop-item" id="craft-item-UR" onclick="App.doCraft('UR')"><div style="font-weight:bold; color:#EF4444">UR</div><div class="shop-cost">消耗: 5 SSR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SSR: <span id="invSSR">0</span></div></div>
      </div>
    </div>
  </div>

  <div id="shopModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align:center; margin-bottom:15px;">
        <h3 style="margin:0 0 10px 0;">积分商店</h3>
        <div style="font-size:1.1rem; font-weight:bold; color:#F59E0B; background:#FEF3C7; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 3px 6px rgba(245,158,11,0.3);">
           <i class="fas fa-coins"></i> <span id="shopBalance">0</span>
        </div>
      </div>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px; text-align:center;">消耗积分购买指定等级的卡包。</p>
      <div class="shop-grid" id="shopContent"></div>
    </div>
  </div>

  <div id="diceModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>猜大小</h3>
      <p style="color:var(--text-light); font-size:0.9rem;">小(1-3) 或 大(4-6)，赔率1:1。</p>
      <div class="dice-stage"><i class="fas fa-dice-d6" id="diceIcon"></i></div>
      <div class="input-group" style="margin-bottom:10px;"><input type="number" id="betInput" placeholder="下注金额 (10-1000)"></div>
      <div class="bet-controls">
        <button class="bet-btn small" onclick="App.playDice('small')"><div>押小 (1-3)</div></button>
        <button class="bet-btn big" onclick="App.playDice('big')"><div>押大 (4-6)</div></button>
      </div>
      <div id="diceMsg" style="margin-top:15px; font-weight:bold; height:20px; color:#334155;"></div>
    </div>
  </div>

  <div id="uploadModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      
      <h3 style="margin-top:0; color:var(--text-main);">
        <i class="fas fa-cloud-upload-alt" style="color:#7C3AED; margin-right:8px;"></i>上传图片
      </h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;">
        分享你的收藏到图鉴池（需审核）
      </p>

      <!-- 拖拽上传区 -->
      <div class="upload-drop-zone" id="uploadDropZone">
        <i class="fas fa-images upload-icon"></i>
        <div style="color:var(--text-main); font-weight:600; margin-bottom:4px;">点击或拖拽图片到此处</div>
        <div style="font-size:0.8rem; color:#9CA3AF;">支持 JPG, PNG, GIF, WebP (Max 5MB)</div>
        <input type="file" id="uploadInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;">
      </div>

      <!-- 图片预览区 -->
      <div class="upload-preview-container" id="uploadPreview">
        <div class="upload-remove-btn" onclick="App.clearUpload()" title="移除图片">
          <i class="fas fa-times"></i>
        </div>
        <img id="uploadPreviewImg" class="upload-preview-img">
      </div>

      <div style="margin-top: 20px;">
        <label style="display:block; margin-bottom:8px; color:var(--text-main); font-weight:600; font-size:0.9rem;">
          期望稀有度
        </label>
        <div class="form-select-wrapper">
          <select id="uploadRarity" class="form-select">
            <option value="N">N (普通)</option>
            <option value="R">R (稀有)</option>
            <option value="SR">SR (超稀有)</option>
            <option value="SSR">SSR (特级超稀有)</option>
            <option value="UR">UR (极度稀有)</option>
          </select>
          <i class="fas fa-chevron-down select-arrow"></i>
        </div>
      </div>

      <button class="btn" style="width:100%; background:linear-gradient(135deg, #8B5CF6, #6D28D9); box-shadow:0 4px 0 #5B21B6;" onclick="App.doUpload()" id="uploadBtn">
        <i class="fas fa-paper-plane"></i> 提交审核
      </button>
      
      <div id="uploadMsg" style="margin-top:15px; font-weight:bold; height:20px; font-size:0.9rem; transition:0.3s;"></div>
    </div>
  </div>

  <div id="rulesModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeRulesToProfile()"><i class="fas fa-times"></i></button>
      <h3>积分规则</h3>
      <p style="font-size:0.9rem; color:#94A3B8; margin-bottom:15px;">积分可用于在商店购买物品。</p>
      <div style="background:#F8FAFC; padding:10px; border-radius:12px; border:1px solid #E2E8F0;">
        <table class="rules-table">
          <thead><tr><th>行为</th><th>获得积分</th></tr></thead>
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

  <div id="adminModal" class="modal admin-modal">
    <div class="modal-content admin-modal-content" style="max-width:720px;">
      <div class="admin-modal-header">
        <h3><i class="fas fa-cog"></i>管理面板</h3>
        <button class="admin-modal-close" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      </div>
      <div class="admin-modal-body">
        <div id="adminLogin">
          <div class="input-group"><input type="password" id="adminPass" class="admin-input" placeholder="请输入管理员密码..."></div>
          <button class="admin-btn primary" style="width:100%; margin-top:12px;" onclick="App.verifyAdmin()">确认</button>
        </div>
        <div id="adminPanel" style="display:none; text-align:left;">
          <div class="admin-tabs">
            <button class="admin-tab active" onclick="App.switchAdminTab('log')" id="tab-log"><i class="fas fa-list-alt"></i>更新日志</button>
            <button class="admin-tab" onclick="App.switchAdminTab('users')" id="tab-users"><i class="fas fa-users"></i>用户管理</button>
            <button class="admin-tab" onclick="App.switchAdminTab('uploads')" id="tab-uploads"><i class="fas fa-upload"></i>上传审核<span class="admin-tab-badge" id="uploadsCountBadge" style="display:none;">0</span></button>
            <button class="admin-tab" onclick="App.switchAdminTab('ann')" id="tab-ann"><i class="fas fa-bullhorn"></i>系统公告</button>
          </div>
          <div id="view-log">
            <div class="admin-section-title">
              <span><i class="fas fa-edit" style="color:#F59E0B;margin-right:8px;"></i>快速添加</span>
            </div>
            <div class="quick-add-form">
              <div class="quick-add-row">
                <input type="text" id="quickLogContent" class="admin-input" placeholder="输入更新内容..." style="flex:1;">
                <select id="quickLogTag" class="admin-input" style="width:100px;">
                  <option value="optimization">优化</option>
                  <option value="feature">功能</option>
                  <option value="bugfix">修复</option>
                  <option value="refactor">重构</option>
                  <option value="todo">待办</option>
                </select>
                <button class="admin-btn primary small" onclick="App.quickAddLog()">+ 添加</button>
              </div>
            </div>
            <div class="admin-section-title" style="margin-top:20px;">
              <span><i class="fas fa-list" style="color:#F59E0B;margin-right:8px;"></i>完整列表</span>
              <button class="admin-btn secondary small" onclick="App.addAdminRow()">+ 新增一行</button>
            </div>
            <div class="admin-scroll">
              <table class="admin-table" id="adminTable"><thead><tr><th width="100">日期</th><th>内容</th><th width="100">标签</th><th width="50"></th></tr></thead><tbody id="adminTbody"></tbody></table>
            </div>
            <button class="admin-btn primary" style="width:100%; margin-top:16px;" onclick="App.saveAdminLog()">保存更改</button>
          </div>
          <div id="view-users" style="display:none;">
            <div class="admin-section-title">
              <span><i class="fas fa-user-friends" style="color:#F59E0B;margin-right:8px;"></i>注册用户列表</span>
              <button class="admin-btn secondary small" onclick="App.loadAdminUsers()"><i class="fas fa-sync"></i>刷新</button>
            </div>
            <div class="admin-scroll">
              <table class="admin-table"><thead><tr><th width="50">头像</th><th>账号/昵称</th><th>召唤数</th><th>积分</th><th>注册时间</th><th>最后登录</th><th>操作</th></tr></thead><tbody id="userTbody"><tr><td colspan="7" style="text-align:center; padding:40px; color:#64748B;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>加载中...</td></tr></tbody></table>
            </div>
          </div>
          <div id="view-uploads" style="display:none;">
            <div class="admin-section-title">
              <span><i class="fas fa-cloud-upload-alt" style="color:#F59E0B;margin-right:8px;"></i>待审核上传</span>
              <div style="display:flex; gap:8px; align-items:center;">
                <select id="uploadStatusFilter" onchange="App.loadAdminUploads()" class="admin-input" style="width:auto; padding:6px 12px;">
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                </select>
                <button class="admin-btn secondary small" onclick="App.loadAdminUploads()"><i class="fas fa-sync"></i></button>
              </div>
            </div>
            <div id="uploadsContainer" class="admin-scroll" style="min-height:200px;">
              <div style="text-align:center; padding:60px; color:#64748B;">
                <i class="fas fa-images" style="font-size:2.5rem; margin-bottom:16px; display:block; opacity:0.5;"></i>
                加载中...
              </div>
            </div>
          </div>
          <div id="view-ann" style="display:none;">
            <div class="admin-section-title">
              <span><i class="fas fa-bullhorn" style="color:#F59E0B;margin-right:8px;"></i>快速发布</span>
            </div>
            <div class="quick-publish-form">
              <div class="quick-publish-row">
                <input type="text" id="quickAnnTitle" class="admin-input" placeholder="公告标题..." style="flex:1;">
                <button class="admin-btn primary small" onclick="App.quickPublishAnnouncement()">立即发布</button>
              </div>
              <div class="quick-publish-row" style="margin-top:10px;">
                <textarea id="quickAnnContent" class="admin-textarea" placeholder="简要公告内容（可选）..." style="flex:1;min-height:60px;resize:none;"></textarea>
              </div>
            </div>
            
            <div class="form-row" style="margin-top:20px;">
              <label class="form-label">启用状态</label>
              <label class="switch">
                <input type="checkbox" id="adminAnnEnable" checked>
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="form-row">
              <label class="form-label">强制弹窗</label>
              <label class="switch">
                <input type="checkbox" id="adminAnnRefresh">
                <span class="slider"></span>
              </label>
              <div class="form-hint">开启后，所有用户将再次看到此公告</div>
            </div>

            <div class="form-row">
              <label class="form-label">完整内容 (Markdown)</label>
              <textarea id="adminAnnContent" class="admin-textarea" placeholder="## 标题&#10;- 内容列表&#10;- 支持 **加粗**"></textarea>
            </div>

            <div style="display:flex; gap:12px;">
              <button class="admin-btn primary" style="flex:2" onclick="App.saveAnnouncement()">
                <i class="fas fa-save"></i> 保存完整公告
              </button>
              <button class="admin-btn secondary" style="flex:1" onclick="App.previewAnnouncement()">
                <i class="fas fa-eye"></i> 预览
              </button>
            </div>
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
        <h3 id="annTitle" style="margin: 10px 0 0 0;">公告</h3>
      </div>
      <div id="annContent" class="md-content">
      </div>
      <div style="margin-top: 20px;">
        <button class="btn" style="width: 100%;" onclick="App.closeAnnouncement()">我知道了</button>
      </div>
    </div>
  </div>

  <div id="imgModal" class="modal" onclick="if(event.target === this) this.classList.remove('show')">
    <button class="modal-close-img" onclick="document.getElementById('imgModal').classList.remove('show')"><i class="fas fa-times"></i></button>
    <img id="bigImg" class="modal-img" alt="预览">
  </div>

  <script>
    const App = {
      username: localStorage.getItem('moe_username'),
      nickname: null, loading: false, adminPwd: null, logsData: [], currentAdminTab: 'log', inventory: {},
      currentPool: 'std',
      currentLimitedPool: '${CONFIG.LIMITED.DEFAULT_POOL}',
      limitedPools: [],
      authMode: 'login', 
      coins: 0,
      
      vibrate(type) {
        if (!navigator.vibrate) return;
        const patterns = {
          tap: 10,               // 普通点击
          success: [10, 30, 10], // 成功/抽到卡
          failure: [30, 50, 30], // 失败/报错
          heavy: 50              // 重要操作
        };
        try { navigator.vibrate(patterns[type] || 10); } catch(e){}
      },
      animate(elId, type) {
        const el = document.getElementById(elId);
        if(!el) return;
        const cls = type === 'error' ? 'anim-shake' : 'anim-pop';
        el.classList.remove('anim-shake', 'anim-pop');
        void el.offsetWidth; // 触发重绘
        el.classList.add(cls);
        // 动画结束后移除类，以便下次触发
        setTimeout(() => el.classList.remove(cls), 400);
      },
      async init() {
        this.initTheme();
        await this.fetchUserInfo();
        this.fetchInventory(); 
        this.loadShowcase();
        this.loadChangelog();
        this.checkAnnouncement();
        // 预加载限定池数据，避免首次点击卡顿
        if (this.username) {
          this.loadLimitedPools();
        }
      },
      // [优化] 限定池相关状态缓存
      _poolsCache: null,
      _poolsLoading: false,
      _poolsLastFetch: 0,
      
switchPool(pool) {
        if(this.loading) return;
        this.currentPool = pool;
        const isLtd = pool === 'ltd';
        
        // 1. 更新标签页样式
        document.querySelectorAll('.banner-tab').forEach(el => el.classList.remove('active', 'limited'));
        const activeTab = document.getElementById('tab-' + pool);
        activeTab.classList.add('active');
        if (isLtd) activeTab.classList.add('limited');
        
        // 2. 隐藏限定池选择器（不触发列表刷新）
        const poolDropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        if (poolDropdown) {
          poolDropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
        
        // 3. 更新按钮样式与图标
        const btn = document.getElementById('drawBtn');
        const icon = isLtd ? 'fa-star' : 'fa-bolt';
        btn.className = isLtd ? 'btn limited-btn' : 'btn';
        btn.innerHTML = \`<i class="fas \${icon}"></i> 召唤\`;
      },
      
      togglePoolDropdown() {
        const dropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        const isVisible = dropdown.style.display === 'block';
        
        if (!isVisible) {
          // 只有在已经是限定池模式时才展开下拉
          if (this.currentPool === 'ltd') {
            dropdown.style.display = 'block';
            if (arrow) arrow.style.transform = 'rotate(180deg)';
            this.loadLimitedPools(false, true);
          } else {
            // 切换到限定池模式但不展开下拉
            this.switchPool('ltd');
          }
        } else {
          // 收起下拉
          dropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          if (this._closeDropdownHandler) {
            document.removeEventListener('click', this._closeDropdownHandler);
            this._closeDropdownHandler = null;
          }
        }
      },
      
      expandPoolDropdown() {
        const dropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        if (dropdown.style.display !== 'block') {
          dropdown.style.display = 'block';
          if (arrow) arrow.style.transform = 'rotate(180deg)';
          // 点击外部关闭
          this._closeDropdownHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target.id !== 'tab-ltd') {
              dropdown.style.display = 'none';
              if (arrow) arrow.style.transform = 'rotate(0deg)';
              document.removeEventListener('click', this._closeDropdownHandler);
              this._closeDropdownHandler = null;
            }
          };
          requestAnimationFrame(() => {
            document.addEventListener('click', this._closeDropdownHandler);
          });
        }
      },
      
      async loadLimitedPools(forceRefresh = false, expandDropdown = false) {
        if (!this.username || this._poolsLoading) return;
        
        // 检查缓存（5分钟内有效）
        const now = Date.now();
        const cacheValid = this._poolsCache && (now - this._poolsLastFetch < 300000);
        
        if (!forceRefresh && cacheValid && this.limitedPools) {
          // 使用缓存，只更新UI
          this._renderPoolList();
          // 需要展开时展开
          if (expandDropdown) {
            this.expandPoolDropdown();
          }
          return;
        }
        
        this._poolsLoading = true;
        
        try {
          const res = await fetch('/limited/pools', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          
          if (data.success && data.pools) {
            this._poolsCache = data.pools;
            this._poolsLastFetch = now;
            this.limitedPools = data.pools;
            
            // [修复] 只在首次加载或当前选择无效时才设置默认池
            // 避免覆盖用户已做的选择
            const currentPoolValid = this.currentLimitedPool && 
                                     data.pools.find(p => p.id === this.currentLimitedPool);
            if (!currentPoolValid) {
              console.log('[LoadPools] Setting default pool:', data.defaultPool, 
                          'previous:', this.currentLimitedPool);
              this.currentLimitedPool = data.defaultPool;
            } else {
              console.log('[LoadPools] Keeping current pool:', this.currentLimitedPool);
            }
            
            // 使用 requestAnimationFrame 渲染，避免阻塞
            requestAnimationFrame(() => {
              this._renderPoolList();
              // 加载完成后展开下拉
              if (expandDropdown) {
                this.expandPoolDropdown();
              }
            });
          }
        } catch (e) { 
          console.error('Load pools failed', e);
          // 缓存失败时如果有旧缓存，继续使用
          if (this._poolsCache) {
            requestAnimationFrame(() => this._renderPoolList());
          }
        } finally {
          this._poolsLoading = false;
        }
      },
      
      // [优化] 渲染池列表（使用CSS类优化性能）
      _renderPoolList() {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl || !this.limitedPools) return;
        
        const currentPool = this.currentLimitedPool;
        const pools = this.limitedPools;
        
        // 构建HTML字符串（一次性插入）
        const html = pools.map(p => {
          const isActive = p.id === currentPool;
          const isAvailable = p.available;
          const statusText = p.available ? (p.count ? p.count + '张' : '可用') : '暂无图片';
          
          return \`
            <div class="pool-item \${isActive ? 'active' : ''} \${isAvailable ? '' : 'unavailable'}" 
                 onclick="App.selectPool('\${p.id}')"
                 data-pool-id="\${p.id}">
              <div class="pool-item-header">
                <span class="pool-name">\${p.name}</span>
                <span class="pool-status">\${statusText}</span>
              </div>
              <div class="pool-desc">\${p.description || ''}</div>
            </div>
          \`;
        }).join('');
        
        listEl.innerHTML = html;
      },
      
      // [优化] 选择池（不重新加载列表，只更新样式）
      selectPool(poolId) {
        console.log('[selectPool] Called with poolId:', poolId);
        if (this.currentLimitedPool === poolId) {
          // 如果点击的是已选中的池，直接关闭下拉
          document.getElementById('poolDropdown').style.display = 'none';
          const arrow = document.getElementById('poolDropdownArrow');
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          return;
        }
        
        // [修复] 更新当前选中的池
        this.currentLimitedPool = poolId;
        console.log('[selectPool] Set currentLimitedPool to:', this.currentLimitedPool);
        
        // [修复] 同时更新缓存中的选择，防止loadLimitedPools重置
        if (this._poolsCache) {
          this._poolsLastFetch = Date.now();
        }
        
        console.log('[PoolSelect] Selected pool:', poolId, 'currentLimitedPool:', this.currentLimitedPool);
        
        // 关闭下拉菜单
        document.getElementById('poolDropdown').style.display = 'none';
        const arrow = document.getElementById('poolDropdownArrow');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        
        // 显示提示
        const pool = this.limitedPools?.find(p => p.id === poolId);
        if (pool) {
          this.toast(\`已切换至: \${pool.name}\`, 'ok');
        }
        
        // [优化] 只更新UI样式，不重新请求数据
        requestAnimationFrame(() => this._updatePoolSelection(poolId));
      },
      
      // [优化] 更新池选中状态（仅修改CSS类）
      _updatePoolSelection(selectedId) {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl) return;
        
        const items = listEl.querySelectorAll('.pool-item');
        items.forEach(item => {
          const poolId = item.dataset.poolId;
          if (poolId === selectedId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      },
      switchAuth(mode) {
        this.authMode = mode;
        document.getElementById('tab-login').classList.toggle('active', mode === 'login');
        document.getElementById('tab-register').classList.toggle('active', mode === 'register');
        document.getElementById('nickGroup').style.display = mode === 'register' ? 'block' : 'none';
      },
      async fetchUserInfo() {
        if (!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) { 
              this.username = data.username; 
              this.nickname = data.nickname;
              // 强制转成数字，避免出现 undefined / NaN
              this.coins = Number.isFinite(Number(data.coins)) ? Number(data.coins) : 0;
              this.updateUI(data); 
          } else { 
              localStorage.removeItem('moe_username');
              this.username = null;
              document.getElementById('authModal').classList.add('show'); 
          }
        } catch(e) {}
      },
      async fetchInventory() {
          if (!this.username) return;
          try {
              const res = await fetch('/user/inventory', { headers: { 'X-User-ID': this.username } });
              const data = await res.json();
              if (data) {
                  this.inventory = data; // 更新内存中的库存
                  this.updateProfileStats(); // 如果个人资料页开着，更新数字
                  this.updateCraftStates();  // 如果合成页开着，更新按钮状态
              }
          } catch(e) { console.error('Inv load failed', e); }
      },
      updateUI(user) {
        // --- 1. 更新顶部导航栏 (Header) ---
        // 必须做非空检查，防止报错中断代码执行
const navNick = document.getElementById('navNickname');
        if (navNick) navNick.innerText = user.nickname || user.username;

        const navAvatar = document.getElementById('navAvatar');
        if (navAvatar && user.avatar) navAvatar.src = user.avatar;

        const navLevel = document.getElementById('navLevel');
        if (navLevel) navLevel.innerText = 'Lv.' + (user.level || 1);

        // --- 2. 更新本地状态 (仅基础数据) ---
        // 注意：库存数据(this.inventory)不再此处更新，改为由 fetchInventory 独立处理
        this.coins = Number.isFinite(Number(user.coins)) ? Number(user.coins) : 0;

        // --- 3. 更新个人资料页的基础信息 (如果DOM存在) ---
        // 即使个人页模态框未打开，这些元素也可能存在于 DOM 中，安全起见都尝试更新
        const elProfileCoins = document.getElementById('profileCoins');
        if (elProfileCoins) elProfileCoins.innerText = this.coins;

        const elProfileLevel = document.getElementById('profileLevel');
        if (elProfileLevel) elProfileLevel.innerText = user.level || 1;

        const elProfileCount = document.getElementById('profileCount');
        if (elProfileCount) elProfileCount.innerText = user.drawCount || 0;
        
        const elProfileNick = document.getElementById('profileNickname');
        if (elProfileNick) elProfileNick.innerText = user.nickname || user.username;
        
        const elProfileUser = document.getElementById('profileUsername');
        if (elProfileUser) elProfileUser.innerText = user.username;

        // --- 4. 更新经验条 ---
        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;

        const elExp = document.getElementById('profileExp');
        if (elExp) elExp.innerText = exp;
        
        const elExpNext = document.getElementById('profileExpNext');
        if (elExpNext) elExpNext.innerText = next;
        
        const elProgText = document.getElementById('profileLevelProgress');
        if (elProgText) elProgText.innerText = progress + '%';
        
        const elProgBar = document.getElementById('profileExpBar');
        if (elProgBar) elProgBar.style.width = progress + '%';

        // --- 5. 更新个人页称号显示 ---
        const titleEl = document.getElementById('currentTitleDisplay');
        if (titleEl) {
            if (user.title && user.title.name) {
                titleEl.innerHTML = \`<span class="title-badge" style="background:linear-gradient(135deg, #3B82F6, #8B5CF6); font-size:1rem; padding:4px 10px;">\${user.title.name}</span>\`;
            } else {
                titleEl.innerHTML = \'<span style="color:#CBD5E1; font-weight:normal;">暂无称号</span>\';
            }
        }
      },
      updateProfileStats() {
        const inv = this.inventory;
        const setText = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };
        setText('invCountN', inv.N || 0);
        setText('invCountR', inv.R || 0);
        setText('invCountSR', inv.SR || 0);
        setText('invCountSSR', inv.SSR || 0);
        setText('invCountUR', inv.UR || 0);
        
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        setText('totalCards', totalCards);
        
        const profileCountEl = document.getElementById('profileCount');
        const drawCount = profileCountEl ? (parseInt(profileCountEl.innerText) || 0) : 0;
        const level = Math.floor(drawCount / 50) + 1;
        setText('profileLevel', level);
      },
      showMoreStats() {
        const inv = this.inventory;
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        const drawCount = parseInt(document.getElementById('profileCount').innerText) || 0;
        const coins = parseInt(document.getElementById('profileCoins').innerText) || 0;
        
        const successRate = drawCount > 0 ? '~' + Math.round((totalCards / drawCount) * 100) + '%' : 'N/A';
        const avgCoins = drawCount > 0 ? Math.round(coins / drawCount) : 'N/A';
        
        const statsHtml = '<div style="text-align:left; font-size:0.9rem;">' +
          '<div style="margin-bottom:10px;"><strong>卡片总数:</strong> ' + totalCards + '</div>' +
          '<div style="margin-bottom:10px;"><strong>卡片分布:</strong></div>' +
          '<div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:5px; margin-bottom:15px;">' +
            '<div style="text-align:center; padding:5px; background:#F1F5F9; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#64748B;">N</div>' +
              '<div style="font-weight:bold;">' + (inv.N || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#DBEAFE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#1E40AF;">R</div>' +
              '<div style="font-weight:bold;">' + (inv.R || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#EDE9FE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#5B21B6;">SR</div>' +
              '<div style="font-weight:bold;">' + (inv.SR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEF3C7; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#92400E;">SSR</div>' +
              '<div style="font-weight:bold;">' + (inv.SSR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEE2E2; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#991B1B;">UR</div>' +
              '<div style="font-weight:bold;">' + (inv.UR || 0) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:10px;"><strong>召唤成功率:</strong> ' + successRate + '</div>' +
          '<div style="margin-bottom:10px;"><strong>平均每次召唤获币:</strong> ' + avgCoins + '</div>' +
        '</div>';
        
        this.showStatsModal('详细统计', statsHtml);
      },
      showStatsModal(title, content) {
        const existingModal = document.getElementById('statsModal');
        if (existingModal) {
          const newModal = existingModal.cloneNode(false);
          existingModal.parentNode.replaceChild(newModal, existingModal);
          existingModal.remove();
        }
        
        const modalHtml = '<div class="modal show" id="statsModal" data-dynamic="true">' +
          '<div class="modal-content" style="max-width:500px;">' +
            '<button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>' +
            '<h3 style="margin-top:0;">' + title + '</h3>' +
            content +
            '<div style="margin-top:20px; text-align:center;">' +
              '<button class="btn" onclick="App.closeModals()" style="padding:8px 20px;">关闭</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('statsModal');
        if (modal) {
          const backdropClickHandler = function(e) {
            if (e.target === this) {
              App.closeModals();
            }
          };
          modal.addEventListener('click', backdropClickHandler);
          modal._backdropClickHandler = backdropClickHandler;
        }
      },
      editProfile() {
        const currentNickname = document.getElementById('profileNickname').innerText;
        const newNickname = prompt('输入新昵称 (最多20个字符):', currentNickname);
        if (newNickname && newNickname !== currentNickname && newNickname.length <= 20) {
          this.toast('更新个人资料中...', 'info');
          document.getElementById('profileNickname').innerText = newNickname;
          document.getElementById('navNickname').innerText = newNickname;
          this.toast('个人资料已更新！', 'ok');
        } else if (newNickname && newNickname.length > 20) {
          this.toast('昵称太长 (最多20个字符)', 'warn');
        }
      },
      shareProfile() {
        const nickname = document.getElementById('profileNickname').innerText;
        const drawCount = document.getElementById('profileCount').innerText;
        const coins = document.getElementById('profileCoins').innerText;
        const shareText = nickname + ' 的抽卡档案！召唤次数: ' + drawCount + ', 积分: ' + coins + '。快来玩吧：' + window.location.origin;
        
        if (navigator.share) {
          navigator.share({ title: nickname + " 的抽卡档案", text: shareText, url: window.location.origin }).catch(err => {
            this.copyToClipboard(shareText);
          });
        } else {
          this.copyToClipboard(shareText);
        }
      },
      copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          this.toast('链接已复制到剪贴板！', 'ok');
        }).catch(err => {
          this.toast('复制失败', 'warn');
        });
      },
      async checkIn() {
        if(this.loading) return;
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        
        this.loading = true;
        try {
            const res = await fetch('/user/check-in', { 
                method: 'POST', 
                headers: { 'X-User-ID': this.username } 
            });
            const data = await res.json();
            
            if(data.success) {
                const bonus = data.checkIn.streakBonus > 0 ? \` (连签奖励 +\${data.checkIn.streakBonus})\` : '';
                this.toast(\`签到成功！金币 +\${data.checkIn.coins}\${bonus}\`, 'ok');
                this.fetchUserInfo(); // 刷新金币显示
            } else {
                this.toast(data.error === '今日已签到' ? '今天已经签到过了' : data.error, 'warn');
            }
        } catch(e) {
            this.toast('网络请求失败', 'warn');
        } finally {
            this.loading = false;
        }
      },
      toggleTheme() {
        const currentTheme = localStorage.getItem('moe_theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('moe_theme', newTheme);
        this.applyTheme(newTheme);
        this.toast('已切换至' + (newTheme === 'dark' ? '深色' : '浅色') + '模式', 'ok');
      },
      applyTheme(theme) {
        if (theme === 'dark') {
          document.documentElement.style.setProperty('--bg-color', '#0F172A');
          document.documentElement.style.setProperty('--card-bg', 'rgba(30, 41, 59, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#F1F5F9');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        } else {
          document.documentElement.style.setProperty('--bg-color', '#F8FAFC');
          document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#334155');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        }
      },
      initTheme() {
        const savedTheme = localStorage.getItem('moe_theme') || 'light';
        this.applyTheme(savedTheme);
      },
      updateCraftStates() {
         const inv = this.inventory;
         document.getElementById('invN').innerText = inv.N || 0; document.getElementById('craft-item-R').classList.toggle('can-craft', (inv.N || 0) >= 5);
         document.getElementById('invR').innerText = inv.R || 0; document.getElementById('craft-item-SR').classList.toggle('can-craft', (inv.R || 0) >= 5);
         document.getElementById('invSR').innerText = inv.SR || 0; document.getElementById('craft-item-SSR').classList.toggle('can-craft', (inv.SR || 0) >= 5);
         document.getElementById('invSSR').innerText = inv.SSR || 0; document.getElementById('craft-item-UR').classList.toggle('can-craft', (inv.SSR || 0) >= 5);
      },
      mapError(err) {
        const map = {
          '积分不足': '积分不足！',
          'Username Taken': '用户名或昵称已被占用',
          'Nickname Taken': '用户名或昵称已被占用',
          '用户不存在': '用户不存在',
          'Invalid Password': '密码错误',
          '认证失败': '认证失败',
          'Missing fields': '请填写完整信息',
          '凭证无效': '账号或密码错误',
          'Invalid level': '无效的等级',
          'Level not reached yet': '尚未达到该等级',
          '奖励已领取': '奖励已领取',
          'No special reward for this level': '该等级没有特殊奖励'
        };
        return map[err] || err;
      },
      async doAuth() {
        const u = document.getElementById('authUsername').value.trim();
        const p = document.getElementById('authPassword').value;
        const n = document.getElementById('authNickname').value.trim();
        
        if (this.authMode === 'register') {
             if (!u || !p || !n) return this.toast('请填写完整信息', 'warn');
             try {
                const res = await fetch('/auth/register', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, nickname: n, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.toast('注册成功，请登录', 'ok'); 
                    this.switchAuth('login');
                } else { 
                    this.toast(this.mapError(d.error), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
        } else {
             if (!u || !p) return this.toast('请输入账号和密码', 'warn');
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
                    this.toast(this.mapError(d.error || '连接失败'), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
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
        document.getElementById('annTitle').innerText = data.title || '公告';
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
        this.showAnnouncementModal({ title: title + " (预览)", content: content });
      },
      async loadAdminAnnouncement() {
        try {
            const res = await fetch('/announcement');
            const data = await res.json();
            document.getElementById('adminAnnTitle').value = data.title || '';
            document.getElementById('adminAnnContent').value = data.content || '';
            // 快速发布字段
            document.getElementById('quickAnnTitle').value = data.title || '';
            document.getElementById('quickAnnContent').value = data.content || '';
            // 修改为 checkbox 赋值
            document.getElementById('adminAnnEnable').checked = data.enabled || false;
            // 默认"强制弹窗"为关闭，防止误触
            document.getElementById('adminAnnRefresh').checked = false;
        } catch(e) { this.toast('加载失败', 'warn'); }
      },
      async quickPublishAnnouncement() {
        const title = document.getElementById('quickAnnTitle').value.trim();
        const content = document.getElementById('quickAnnContent').value.trim();
        
        if (!title) return this.toast('请输入公告标题', 'warn');
        
        try {
            const res = await fetch('/admin/save-announcement', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    password: this.adminPwd, 
                    announcement: { 
                        title: title, 
                        content: content || title,
                        enabled: true 
                    },
                    refreshId: true
                }) 
            });
            const d = await res.json();
            if (d.success) {
                this.toast('发布成功！用户将看到弹窗', 'ok');
                document.getElementById('quickAnnTitle').value = '';
                document.getElementById('quickAnnContent').value = '';
                document.getElementById('adminAnnTitle').value = title;
                document.getElementById('adminAnnContent').value = content || title;
                this.loadAdminAnnouncement();
            } else {
                this.toast(this.mapError(d.error) || '发布失败', 'warn');
            }
        } catch(e) { 
            this.toast('网络错误', 'warn'); 
        }
      },
      async saveAnnouncement() {
        const title = document.getElementById('adminAnnTitle').value;
        const content = document.getElementById('adminAnnContent').value;
        // 获取 checkbox 状态
        const enabled = document.getElementById('adminAnnEnable').checked;
        const refreshId = document.getElementById('adminAnnRefresh').checked; // 获取是否刷新ID
        
        if(!title || !content) return this.toast('请填写标题和内容', 'warn');
        
        try {
            const res = await fetch('/admin/save-announcement', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    password: this.adminPwd, 
                    announcement: { title, content, enabled },
                    refreshId: refreshId // 传给后端
                }) 
            });
            const d = await res.json();
            if(d.success) {
                this.toast('保存成功！' + (refreshId ? ' (已推送弹窗)' : ''), 'ok'); 
                // 保存成功后自动关闭强制推送开关，防止下次误触
                document.getElementById('adminAnnRefresh').checked = false;
            }
            else this.toast(this.mapError(d.error) || '保存失败', 'warn'); 
        } catch(e) { this.toast('网络错误', 'warn'); }
      },
      async loadChangelog() {
        try {
          const res = await fetch('/changelog', { headers: { 'X-Admin-Mode': 'true' } });
          this.logsData = await res.json(); 
          const list = document.getElementById('logList');
          const tagLabels = {
            'optimization': { text: '优化', color: '#3B82F6', icon: 'fas fa-bolt' },
            'feature': { text: '功能', color: '#10B981', icon: 'fas fa-star' },
            'bugfix': { text: '修复', color: '#EF4444', icon: 'fas fa-bug' },
            'todo': { text: '待办', color: '#8B5CF6', icon: 'fas fa-thumbtack' },
            'documentation': { text: '文档', color: '#94A3B8', icon: 'fas fa-book' },
            'refactor': { text: '重构', color: '#F59E0B', icon: 'fas fa-code-branch' }
          };
          if(this.logsData && this.logsData.length) {
            list.innerHTML = this.logsData.map(log => {
              const tag = log.tag || 'optimization';
              const tagInfo = tagLabels[tag] || tagLabels.optimization;
              return \`<div class="log-item"><div class="log-meta"><span>\${log.date}</span> <span class="log-tag" style="background:\${tagInfo.color}"><i class="\${tagInfo.icon}"></i> \${tagInfo.text}</span></div><div class="log-content">\${log.content}</div></div>\`;
            }).join('');
            if (this.logsData.length > 3) document.getElementById('logToggle').style.display = 'block';
          }
        } catch(e) {}
      },
      toggleLog() { const list = document.getElementById('logList'); const btn = document.getElementById('logToggle'); list.classList.toggle('collapsed'); btn.innerHTML = list.classList.contains('collapsed') ? ('展开更多 <i class="fas fa-chevron-down"></i>') : ('收起列表 <i class="fas fa-chevron-up"></i>'); },
      async draw() {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        
        if (this.currentPool === 'ltd') {
             // [修复] 使用 this.coins 而不是查找不存在的 DOM 元素
             const currentCoins = this.coins;
             const cost = ${CONFIG.LIMITED.COST};
             if (currentCoins < cost) return this.toast('积分不足！', 'warn');
        }

        this.loading = true;
        const btn = document.getElementById('drawBtn');
        const img = document.getElementById('resultImg');
        const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        img.classList.remove('show');
        tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');

        try {
          let url = '/draw';
          let method = 'GET';
          let body = null;
          console.log('[DrawDebug] currentPool:', this.currentPool, 'currentLimitedPool:', this.currentLimitedPool);
          if (this.currentPool === 'ltd') {
              url = '/draw/limited';
              method = 'POST';
              // [修复] 确保使用当前选中的池，如果没有则使用后端返回的默认池
              const poolId = this.currentLimitedPool;
              console.log('[DrawDebug] Preparing limited draw, currentLimitedPool:', this.currentLimitedPool);
              if (!poolId) {
                console.warn('[DrawDebug] Warning: currentLimitedPool is empty!');
              }
              body = JSON.stringify({ poolId: poolId });
              console.log('[DrawDebug] Request body:', body);
          }

          const fetchOptions = { method: method, headers: { 'X-User-ID': this.username, 'Content-Type': 'application/json' } };
          if (body) fetchOptions.body = body;
          const res = await fetch(url, fetchOptions);
          const data = await res.json();
          
          if(data.error) {
              if (data.error === 'USER_NOT_FOUND') {
                   document.getElementById('authModal').classList.add('show');
                   throw new Error('请登录或注册');
              }
              throw this.mapError(data.error);
          }
          this.handleDrawResult(data, img, tag, btn);
         } catch(e) {
           this.loading = false;
           document.getElementById('loadingSpinner').classList.remove('show');
           this.switchPool(this.currentPool);
           this.toast(e.message || e.toString(), 'warn');
         }
      },
      async doCraft(target) {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        const costMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
        if ((this.inventory[costMap[target]] || 0) < 5) return this.toast('需要 5 张 ' + costMap[target], 'warn');
        
        if(!confirm('确定消耗5张低阶卡合成1张 ' + target + ' 吗？')) return;
        
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-flask fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity: target }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
           if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); this.fetchUserInfo(); }
      },
      handleDrawResult(data, img, tag, btn, isSpecial = false) {
           img.src = data.card ? data.card.imageUrl : data.imageUrl;
           
           const onImageLoad = () => {
               if (!img || !document.body.contains(img)) return;
               img.classList.add('show');
               const placeholder = document.getElementById('placeholder');
               const spinner = document.getElementById('loadingSpinner');
               const btn = document.getElementById('drawBtn');
               const tag = document.getElementById('rarityTag');
               if (placeholder) placeholder.style.display = 'none';
               if (spinner) spinner.classList.remove('show');
               this.loading = false;
              
              const icon = this.currentPool === 'ltd' ? 'fa-star' : 'fa-bolt';
              if (btn) btn.innerHTML = \`<i class="fas \${icon}"></i> 再召唤\`;

              const rarity = data.card?.rarity || data.rarity;
              if (rarity && tag) { 
                  tag.innerText = rarity; 
                  tag.className = 'rarity-tag r-' + rarity.toLowerCase(); 
                  tag.classList.add('show'); 
              }
             
             if(data.success) { 
                 // 1. 成功反馈
                 this.vibrate('success');
                 this.animate('drawBtn', 'success'); 
                 this.toast(isSpecial || this.currentPool === 'ltd' ? '召唤成功！' : '召唤成功', 'ok'); 

                 // 2. [关键优化] 直接使用后端返回的数据更新 UI，不再发起 fetch
                 let newCoins = data.userCoins !== undefined ? data.userCoins : data.newBalance;
                 // 容错：后端字段缺失或类型异常时，避免把 undefined 写进 this.coins
                 newCoins = Number.isFinite(Number(newCoins)) ? Number(newCoins) : null;
                 if (newCoins !== undefined) {
                    this.coins = newCoins === null ? this.coins : newCoins;
                    const pCoins = document.getElementById('profileCoins');
                    if (pCoins) pCoins.innerText = this.coins;
                 }
                 
                 // 3. 处理升级信息
                 if (data.levelUp) {
                     const { newLevel, reward } = data.levelUp;
                     this.toast(\`恭喜升级到 Lv.\${newLevel}！获得 \${reward} 金币\`, 'ok');
                     const pLevel = document.getElementById('profileLevel');
                     if(pLevel) pLevel.innerText = newLevel;
                     const navLevel = document.getElementById('navLevel');
                     if(navLevel) navLevel.innerText = 'Lv.' + newLevel;
                 }

                 // 4. [关键优化] 本地更新库存，不刷新
                 // 普通抽卡/限定抽卡
                 if (data.rarity && !isSpecial) {
                     if (this.inventory) {
                         this.inventory[data.rarity] = (this.inventory[data.rarity] || 0) + 1;
                         // 只有当用户真的打开了个人资料页或者合成页时，才去更新具体的 DOM
                         if (document.getElementById('profileModal').classList.contains('show')) {
                             this.updateProfileStats();
                         }
                         if (document.getElementById('craftModal').classList.contains('show')) {
                             this.updateCraftStates();
                         }
                     }
                 }
                 // 合成操作 (后端返回了 craftResult 最好，如果没有则全量刷新)
                 else if (isSpecial && data.craftResult) {
                       if (this.inventory) {
                           this.inventory[data.craftResult.consumed] = Math.max(0, (this.inventory[data.craftResult.consumed] || 0) - 5);
                           this.inventory[data.craftResult.gained] = (this.inventory[data.craftResult.gained] || 0) + 1;
                           this.updateCraftStates();
                           
                           // 3秒后后台同步，确保数据一致性
                           setTimeout(() => this.fetchInventory(), 3000);
                       }
                 }
                 // 兜底：如果是复杂操作且没有详细数据，稍微延迟后刷新一次
                 else if (isSpecial) {
                     setTimeout(() => this.fetchInventory(), 500);
                 }

             } else { 
                 this.vibrate('failure');
                 this.toast('连接失败', 'warn'); 
             }
          };
          
          if (img.complete) onImageLoad(); else { 
              img.onload = onImageLoad; 
              img.onerror = () => { 
                  this.loading = false; 
                  this.vibrate('failure');
                  this.animate('drawBtn', 'error');
                  this.switchPool(this.currentPool); 
                  this.toast('图片加载失败', 'warn'); 
              }; 
          }
      },
      openCraft() { if(!this.username) return document.getElementById('authModal').classList.add('show'); this.updateCraftStates(); document.getElementById('craftModal').classList.add('show'); },
      openRules() { document.getElementById('profileModal').classList.remove('show'); document.getElementById('rulesModal').classList.add('show'); },
      closeRulesToProfile() { document.getElementById('rulesModal').classList.remove('show'); document.getElementById('profileModal').classList.add('show'); },
      openShop() {
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        // 兜底：如果 coins 尚未正确初始化，视为 0，避免界面显示为 "undefined"
        const balance = Number.isFinite(Number(this.coins)) ? Number(this.coins) : 0;
        if(document.getElementById('shopBalance')) document.getElementById('shopBalance').innerText = balance;
        const packs = [{ id: 'R', color: '#3B82F6', price: 100 }, { id: 'SR', color: '#8B5CF6', price: 500 }, { id: 'SSR', color: '#F59E0B', price: 2000 }, { id: 'UR', color: '#EF4444', price: 8000 }];
        const container = document.getElementById('shopContent');
        if(container) {
            container.innerHTML = packs.map(p => {
                const can = balance >= p.price;
                return \`<div class="shop-item \${can?'':'disabled'}" \${can? \`onclick="App.buyPack('\${p.id}', \${p.price})"\` : ''}><div style="font-weight:900; font-size:1.5rem; color:\${p.color}">\${p.id}</div><div class="price-tag"><i class="fas fa-coins"></i> \${p.price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">\${can?'购买':'积分不足'}</div></div>\`;
            }).join('');
        }
        document.getElementById('shopModal').classList.add('show');
      },
      async buyPack(rarity, price) {
        if(this.loading) return;
        if(!confirm('确定花费 ' + price + ' 积分吗？')) return;
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-shopping-cart fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity: rarity }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); }
      },
      openDice() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('diceModal').classList.add('show'); document.getElementById('diceIcon').className = 'fas fa-dice-d6'; document.getElementById('diceMsg').innerText = ''; },
      openUpload() { 
        if(!this.username) return document.getElementById('authModal').classList.add('show'); 
        
        const modal = document.getElementById('uploadModal');
        modal.classList.add('show'); 
        
        // 重置状态
        this.clearUpload();
        
        // 绑定拖拽事件 (只需要绑定一次，避免重复绑定)
        if (!this._uploadEventsBound) {
            const dropZone = document.getElementById('uploadDropZone');
            const input = document.getElementById('uploadInput');
            
            // 点击触发文件选择
            dropZone.onclick = (e) => {
                // 防止点击预览区的删除按钮冒泡触发
                if(e.target.closest('.upload-remove-btn')) return;
                input.click();
            };
            
            // 文件选择变化
            input.onchange = (e) => {
                if(e.target.files && e.target.files[0]) {
                    this.handleFileSelect(e.target.files[0]);
                }
            };
            
            // 拖拽进入
            dropZone.ondragover = (e) => { 
                e.preventDefault(); 
                dropZone.classList.add('drag-over');
            };
            
            // 拖拽离开
            dropZone.ondragleave = () => { 
                dropZone.classList.remove('drag-over'); 
            };
            
            // 放置文件
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if(e.dataTransfer.files && e.dataTransfer.files[0]) {
                    // 将拖拽的文件赋值给 input，方便后续统一处理
                    input.files = e.dataTransfer.files;
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            };
            
            this._uploadEventsBound = true;
        }
      },
      // 处理文件选择并预览
      handleFileSelect(file) {
          const msg = document.getElementById('uploadMsg');
          const preview = document.getElementById('uploadPreview');
          const previewImg = document.getElementById('uploadPreviewImg');
          const dropZone = document.getElementById('uploadDropZone');

          // 基础校验
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if(!allowedTypes.includes(file.type)) {
              this.showUploadMsg('不支持的文件类型 (仅限 JPG, PNG, GIF, WebP)', 'error');
              return;
          }
          if(file.size > 5 * 1024 * 1024) {
              this.showUploadMsg('文件过大，最大支持 5MB', 'error');
              return;
          }

          // 读取预览
          const reader = new FileReader();
          reader.onload = (e) => {
              previewImg.src = e.target.result;
              preview.style.display = 'block'; // 显示预览图
              dropZone.style.display = 'none'; // 隐藏上传框
              this.showUploadMsg('', 'normal'); // 清空错误
          };
          reader.readAsDataURL(file);
      },

      // 清除当前选择的文件
      clearUpload() {
          document.getElementById('uploadInput').value = '';
          document.getElementById('uploadPreview').style.display = 'none';
          document.getElementById('uploadDropZone').style.display = 'block';
          document.getElementById('uploadPreviewImg').src = '';
          this.showUploadMsg('', 'normal');
      },
      previewUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('uploadPreviewImg').src = e.target.result;
          document.getElementById('uploadPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      },
      showUploadMsg(text, type) {
          const el = document.getElementById('uploadMsg');
          el.innerText = text;
          if (type === 'error') {
              el.style.color = '#EF4444';
              this.animate('uploadModal', 'error'); // 震动反馈
          } else if (type === 'success') {
              el.style.color = '#10B981';
          } else {
              el.style.color = '#334155';
          }
      },

      async doUpload() {
        if(this.loading) return;
        
        const input = document.getElementById('uploadInput');
        const rarity = document.getElementById('uploadRarity').value;
        const btn = document.getElementById('uploadBtn');
        
        if(!input.files || !input.files[0]) {
          this.showUploadMsg('请先选择一张图片', 'error');
          return;
        }
        
        const file = input.files[0];
        
        // 开始上传
        this.loading = true;
        this.showUploadMsg('正在上传到云端...', 'normal');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('rarity', rarity);
          
          const res = await fetch('/user/upload', {
            method: 'POST',
            body: formData,
            headers: { 'X-User-ID': this.username }
          });
          
          const data = await res.json();
          
          if(data.error) {
            this.showUploadMsg(this.mapError(data.error), 'error');
            this.vibrate('failure');
          } else {
            this.showUploadMsg('上传成功！已进入审核队列', 'success');
            this.vibrate('success');
            // 成功动画
            const previewImg = document.getElementById('uploadPreviewImg');
            previewImg.style.transform = "scale(0.5)";
            previewImg.style.opacity = "0";
            previewImg.style.transition = "all 0.5s ease";

            setTimeout(() => {
                this.closeModals();
                this.toast('图片上传成功', 'ok');
            }, 1000);
          }
        } catch(e) {
          console.error(e);
          this.showUploadMsg('网络连接失败', 'error');
        } finally {
          this.loading = false;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交审核';
        }
      },
      async playDice(prediction) {
        if(this.loading) return; 
        const bet = parseInt(document.getElementById('betInput').value); 
        if(!bet || bet < 10) {
            // [优化] 输入错误反馈
            this.vibrate('failure');
            this.animate('betInput', 'error');
            return this.toast('最小下注为 10', 'warn');
        }

        this.loading = true; 
        this.vibrate('tap'); // 点击反馈

        const icon = document.getElementById('diceIcon'); 
        const msg = document.getElementById('diceMsg'); 
        
        icon.classList.add('dice-result-anim'); 
        msg.innerText = '骰子转动中...';
        
        try {
          const res = await fetch('/game/dice', { method: 'POST', body: JSON.stringify({ betAmount: bet, prediction: prediction }), headers: { 'X-User-ID': this.username, 'Content-Type': 'application/json' } });
          const data = await res.json();
          setTimeout(() => {
             this.loading = false; 
             icon.classList.remove('dice-result-anim');
             
             if(data.error) { 
                 this.vibrate('failure');
                 msg.innerText = this.mapError(data.error); 
                 return; 
             }
             
             const diceIcons = ['one', 'two', 'three', 'four', 'five', 'six']; 
             icon.className = \`fas fa-dice-\${diceIcons[data.roll - 1]}\`;
             
             // [优化] 胜负反馈动画与震动
             if(data.isWin) { 
                 this.vibrate('success');
                 this.animate('diceIcon', 'success'); // 图标弹跳
                 msg.innerText = \`你赢了！ (+\${data.winAmount})\`; 
                 msg.style.color = '#10B981'; 
                 this.toast('运气爆棚！', 'ok'); 
             } else { 
                 this.vibrate('failure');
                 this.animate('diceIcon', 'error'); // 图标抖动
                 msg.innerText = '你输了'; 
                 msg.style.color = '#EF4444'; 
             }
             
             this.coins = data.newBalance;
             const pCoins = document.getElementById('profileCoins');
             if(pCoins) pCoins.innerText = data.newBalance;
          }, 600);
        } catch(e) { 
            this.loading = false; 
            icon.classList.remove('dice-result-anim'); 
            this.vibrate('failure');
            this.toast('网络错误', 'warn'); 
        }
      },
      async loadShowcase() {
        const grid = document.getElementById('showcaseGrid'); 
        const btn = document.getElementById('refreshBtn');
        
        // [交互] 点击刷新时的反馈
        if(btn) {
            this.vibrate('tap');
            btn.classList.remove('refresh-spin');
            void btn.offsetWidth;
            btn.classList.add('refresh-spin');
        }

        // [优化] 渲染骨架屏：生成6个占位方块，不再显示简单的"加载中"
        // 保持高度与实际图片一致 (aspect-ratio: 1)
        const skeletonHtml = Array(6).fill(0).map(() => 
            \`<div class="grid-item skeleton" style="aspect-ratio:1; border:none;"></div>\`
        ).join('');
        grid.innerHTML = skeletonHtml;

        try { 
            const res = await fetch('/showcase?t=' + Date.now()); 
            const data = await res.json(); 
            if(data.length) { 
                // 图片加载后渐显效果已在原有CSS (.grid-item img) 中定义
                grid.innerHTML = data.map(item => 
                    \`<div class="grid-item anim-pop" onclick="App.preview('\${item.imageUrl}')"><img src="\${item.imageUrl}" loading="lazy"></div>\`
                ).join(''); 
            } else {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">暂无数据</div>';
            }
        } catch(e) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#EF4444;">加载失败</div>';
        }
        if(btn) setTimeout(() => btn.classList.remove('refresh-spin'), 800);
      },
      openAdmin() { this.closeModals(); document.getElementById('adminModal').classList.add('show'); },
      async verifyAdmin() {
        const pwd = document.getElementById('adminPass').value;
        try {
            const res = await fetch('/admin/verify', { method: 'POST', body: JSON.stringify({password: pwd}) }); const d = await res.json();
            if(d.success) { this.adminPwd = pwd; document.getElementById('adminLogin').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; this.switchAdminTab('log'); this.renderAdminTable(); } else { this.toast('密码错误', 'warn'); }
        } catch(e) { this.toast('网络错误', 'warn'); }
      },
      switchAdminTab(tab) { this.currentAdminTab = tab; document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active'); document.getElementById('view-log').style.display = tab === 'log' ? 'block' : 'none'; document.getElementById('view-users').style.display = tab === 'users' ? 'block' : 'none'; document.getElementById('view-uploads').style.display = tab === 'uploads' ? 'block' : 'none'; document.getElementById('view-ann').style.display = tab === 'ann' ? 'block' : 'none'; if(tab === 'users') this.loadAdminUsers(); if(tab === 'uploads') this.loadAdminUploads(); if(tab === 'ann') this.loadAdminAnnouncement();},
      async loadAdminUsers() {
        const tbody = document.getElementById('userTbody'); 
        
        // [优化] 表格骨架屏：生成5行，每行显示灰色条状
        const skeletonRow = \`
            <tr>
                <td><div class="skeleton" style="height:32px; width:32px; border-radius:50%;"></div></td>
                <td><div class="skeleton" style="height:20px; width:80%; margin-bottom:4px;"></div><div class="skeleton" style="height:12px; width:50%;"></div></td>
                <td><div class="skeleton" style="height:20px; width:40%;"></div></td>
                <td><div class="skeleton" style="height:20px; width:60%;"></div></td>
                <td><div class="skeleton" style="height:16px; width:80%;"></div></td>
                <td><div class="skeleton" style="height:16px; width:80%;"></div></td>
                <td><div class="skeleton" style="height:24px; width:40px;"></div></td>
            </tr>
        \`;
        tbody.innerHTML = Array(5).fill(skeletonRow).join('');

        try { 
            const res = await fetch('/admin/users', { method: 'POST', body: JSON.stringify({ password: this.adminPwd }) }); 
            const data = await res.json(); 
            if(data.success && data.users.length) { 
              tbody.innerHTML = data.users.map(u => {
                    const formatDate = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : '-';
                    return \`<tr><td><img src="\${u.avatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; background:#334155;" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 36 36\\'><circle cx=\\'18\\' cy=\\'18\\' r=\\'18\\' fill=\\'%23475569\\'/></svg>'" /></td><td><div style="font-weight:600; color:#F59E0B;">\${u.username}</div><div style="font-size:0.75rem; color:#64748B; margin-top:2px;">\${u.nickname}</div></td><td><span class="user-badge" style="background:rgba(99,102,241,0.15); color:#818CF8;">\${u.drawCount}</span></td><td><span style="color:#F59E0B; font-weight:600;">\${u.coins}</span><button class="admin-btn secondary small" style="margin-left:6px; padding:4px 8px;" onclick="App.adminEditPoints('\${u.username}')">改</button></td><td style="font-size:0.75rem; color:#64748B;">\${formatDate(u.createdAt)}</td><td style="font-size:0.75rem; color:#64748B;">\${formatDate(u.lastLoginDate)}</td><td><button class="admin-btn danger small" style="padding:6px 10px;" onclick="App.deleteUser('\${u.username}')"><i class="fas fa-trash-alt"></i></button></td></tr>\`;
                }).join('');
          } else { 
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#64748B;"><i class="fas fa-users" style="font-size:2rem; margin-bottom:12px; display:block; opacity:0.5;"></i>暂无用户</td></tr>'; 
            }
        } catch(e) { 
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#EF4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:12px; display:block;"></i>加载失败</td></tr>';
        }
      },
      async adminEditPoints(userId) { const val = prompt('输入要增加或减少的积分:'); if(!val) return; const amount = parseInt(val); if(isNaN(amount)) return; try { const res = await fetch('/admin/update-points', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: userId, amount: amount }) }); const d = await res.json(); if(d.success) { this.toast('保存成功！', 'ok'); this.loadAdminUsers(); } else { this.toast(d.error, 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async deleteUser(id) { if(!confirm('确定删除该用户吗？此操作不可逆。')) return; try { const res = await fetch('/admin/delete-user', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: id }) }); const d = await res.json(); if(d.success) { this.toast('用户已删除', 'ok'); this.loadAdminUsers(); } else { this.toast('Error', 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async loadAdminUploads() {
        const container = document.getElementById('uploadsContainer');
        const status = document.getElementById('uploadStatusFilter').value;
        container.innerHTML = '<div style="text-align:center; padding:60px; color:#64748B;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:16px; display:block;"></i>加载中...</div>';
        try {
          const res = await fetch('/admin/uploads', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, status })
          });
          const d = await res.json();
          if(d.success) {
            const badge = document.getElementById('uploadsCountBadge');
            if (d.total > 0) {
              badge.textContent = d.total;
              badge.style.display = 'inline-block';
            } else {
              badge.style.display = 'none';
            }
            if(!d.uploads || d.uploads.length === 0) {
              container.innerHTML = '<div style="text-align:center; padding:60px; color:#64748B;"><i class="fas fa-inbox" style="font-size:2.5rem; margin-bottom:16px; display:block; opacity:0.5;"></i>暂无' + (status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已拒绝') + '的上传</div>';
              return;
            }
            let html = '<div class="uploads-grid">';
            d.uploads.forEach(u => {
              const dateStr = new Date(u.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
              const rarityClass = 'r-' + (u.rarity || 'N').toLowerCase();
              const rarityName = u.rarity || 'N';
              html += \`
                <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(148,163,184,0.15); border-radius:12px; overflow:hidden; transition:all 0.2s;">
                  <div style="position:relative; aspect-ratio:1; background:#1E293B; cursor:pointer;" onclick="App.showImage('\${u.url}')">
                    <img src="\${u.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    <span class="rarity-tag \${rarityClass} show" style="position:absolute; top:8px; left:8px; font-size:0.75rem; padding:2px 8px;">\${rarityName}</span>
                  </div>
                  <div style="padding:12px;">
                    <div style="font-size:0.85rem; font-weight:600; color:#E2E8F0; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${u.username}</div>
                    <div style="font-size:0.7rem; color:#64748B; margin-bottom:10px;">\${dateStr}</div>
                    \${status === 'pending' ? \`
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                      <select id="rarity-\${u.id}" style="padding:6px 8px; border:1px solid rgba(148,163,184,0.2); border-radius:6px; font-size:0.75rem; background:rgba(0,0,0,0.3); color:#E2E8F0;">
                        <option value="N">N</option>
                        <option value="R">R</option>
                        <option value="SR">SR</option>
                        <option value="SSR">SSR</option>
                        <option value="UR" selected>UR</option>
                      </select>
                      <button class="admin-btn primary small" style="padding:6px 10px;" onclick="App.reviewUpload(\${u.id}, 'approved')">通过</button>
                      <button class="admin-btn secondary small" style="padding:6px 10px; grid-column:1/-1;" onclick="App.reviewUpload(\${u.id}, 'rejected')">拒绝</button>
                    </div>
                    \` : \`<div style="font-size:0.75rem; color:#64748B; text-align:center; padding:8px 0;">已\${status === 'approved' ? '通过' : '拒绝'}</div>\`}
                  </div>
                </div>
              \`;
            });
            html += '</div>';
            container.innerHTML = html;
          } else {
            container.innerHTML = '<div style="text-align:center; padding:60px; color:#EF4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:16px; display:block;"></i>加载失败: ' + (d.error || 'Unknown') + '</div>';
          }
        } catch(e) {
          container.innerHTML = '<div style="text-align:center; padding:60px; color:#EF4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:16px; display:block;"></i>网络错误</div>';
        }
      },
      async reviewUpload(uploadId, action) {
        const rarity = action === 'approved' ? document.getElementById('rarity-' + uploadId).value : null;
        try {
          const res = await fetch('/admin/review-upload', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, uploadId, action, rarity })
          });
          const d = await res.json();
          if(d.success) {
            this.toast(action === 'approved' ? '已通过审核' : '已拒绝', 'ok');
            this.loadAdminUploads();
          } else {
            this.toast(d.error || '操作失败', 'warn');
          }
        } catch(e) {
          this.toast('网络错误', 'warn');
        }
      },
      renderAdminTable() { document.getElementById('adminTbody').innerHTML = this.logsData.map((log, idx) => \`<tr><td><input class="admin-input" value="\${log.date}" onchange="App.updateLog(\${idx}, 'date', this.value)"></td><td><input class="admin-input" value="\${log.content}" onchange="App.updateLog(\${idx}, 'content', this.value)"></td><td><select class="admin-input" style="padding:6px 8px;" onchange="App.updateLog(\${idx}, 'tag', this.value)"><option value="optimization" \${log.tag === 'optimization' ? 'selected' : ''}>优化</option><option value="feature" \${log.tag === 'feature' ? 'selected' : ''}>功能</option><option value="bugfix" \${log.tag === 'bugfix' ? 'selected' : ''}>修复</option><option value="todo" \${log.tag === 'todo' ? 'selected' : ''}>待办</option><option value="documentation" \${log.tag === 'documentation' ? 'selected' : ''}>文档</option><option value="refactor" \${log.tag === 'refactor' ? 'selected' : ''}>重构</option></select></td><td><button class="admin-btn danger small" style="padding:6px 10px;" onclick="App.delLog(\${idx})"><i class="fas fa-trash-alt"></i></button></td></tr>\`).join(''); },
      updateLog(idx, field, val) { this.logsData[idx][field] = val; },
      quickAddLog() {
        const content = document.getElementById('quickLogContent').value.trim();
        const tag = document.getElementById('quickLogTag').value;
        if (!content) return this.toast('请输入更新内容', 'warn');
        const today = new Date().toISOString().split('T')[0];
        
        this.logsData.unshift({ date: today, content, tag });
        this.renderAdminTable();
        document.getElementById('quickLogContent').value = '';
        this.toast('已添加到列表，请保存', 'ok');
      },
      addAdminRow() { this.logsData.unshift({date: new Date().toISOString().split('T')[0], content:'...', tag:'optimization'}); this.renderAdminTable(); }, delLog(idx) { this.logsData.splice(idx, 1); this.renderAdminTable(); },
      async saveAdminLog() { 
        try { 
          const res = await fetch('/admin/save-changelog', { 
            method: 'POST', 
            body: JSON.stringify({password: this.adminPwd, logs: this.logsData})
          }); 
          const d = await res.json();
          if(d.success) { 
            this.toast('保存成功！首页将在一分钟内自动更新。', 'ok');
            this.logsData = [...this.logsData];
            this.renderAdminTable();
            this.loadChangelog();
          } else { 
            this.toast(d.error || '保存失败', 'warn'); 
          } 
        } catch(e) { 
          this.toast('网络错误', 'warn'); 
        } 
      },
      openProfile() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('profileModal').classList.add('show'); },
      closeModals() {
        document.querySelectorAll('.modal').forEach(m => {
          m.classList.remove('show');
          if (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true') {
            if (m._backdropClickHandler) {
              m.removeEventListener('click', m._backdropClickHandler);
              delete m._backdropClickHandler;
            }
            setTimeout(() => {
              if (m.parentNode && (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true')) {
                m.remove();
              }
            }, 300);
          }
        });
        setTimeout(() => {
          const statsModal = document.getElementById('statsModal');
          if (statsModal && statsModal.parentNode) {
            statsModal.remove();
          }
        }, 350);
      },
      logout() { if(confirm('确定要注销吗？')) { localStorage.removeItem('moe_username'); location.reload(); } },
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

// =========================================
// 图库页模板
// =========================================

function getLibraryHtml(items, pager) {
  const LIBRARY_CSS = `
  <style>
    body { padding-top: 70px; height: 100vh; overflow: hidden; }
    .nav { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 100; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .virtual-scroll-container { position: relative; width: 100%; height: calc(100vh - 70px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .virtual-scroll-content { position: relative; width: 100%; }
    .masonry-container { max-width: 1400px; margin: 0 auto; padding: 20px; column-count: 2; column-gap: 16px; }
    @media (min-width: 640px) { .masonry-container { column-count: 3; } }
    @media (min-width: 1024px) { .masonry-container { column-count: 4; } }
    @media (min-width: 1280px) { .masonry-container { column-count: 5; } }
    .item { break-inside: avoid; margin-bottom: 16px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: zoom-in; position: relative; opacity: 0; animation: fadeIn 0.4s ease forwards; }
    @keyframes fadeIn { to { opacity: 1; } }
    .item:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); border-color: var(--primary); z-index: 2; }
    .img-wrapper { width: 100%; min-height: 120px; background: linear-gradient(110deg, #f0f0f0 8%, #e8e8e8 18%, #f0f0f0 33%); background-size: 200% 100%; animation: shimmer 1.5s infinite linear; position: relative; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .img-wrapper.loaded { background: transparent; animation: none; min-height: 0; }
    .item img { width: 100%; height: auto; display: block; opacity: 0; transition: opacity 0.3s ease; }
    .item img.loaded { opacity: 1; }
    .item-user { padding: 10px 12px; background: white; font-size: 0.85rem; color: var(--text-main); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; }
    .user-tag { font-weight: bold; color: #64748B; display: flex; align-items: center; gap: 6px; }
    #backToTop { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); opacity: 0; pointer-events: none; transition: 0.3s; z-index: 90; border: none; }
    #backToTop.show { opacity: 1; pointer-events: auto; }
    #backToTop:active { transform: scale(0.95); }
    .empty-state { text-align: center; padding: 100px 20px; color: #94A3B8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; }
    .empty-state i { font-size: 4rem; margin-bottom: 20px; color: #E2E8F0; }
.modal-img { max-width: 90vw; max-height: 85vh; width: auto; height: auto; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: imgZoomIn 0.2s ease; display: block; }
    @keyframes imgZoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .modal-close-img { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
    .modal-close-img:hover { background: rgba(239,68,68,0.9); }
  </style>
  `;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>图库 - 无限滚动</title>
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  ${LIBRARY_CSS}
</head>
<body>
  <nav class="nav">
    <div>
      <a href="/" class="btn secondary" style="padding: 8px 16px; font-size:0.9rem; border-radius:10px;">
        <i class="fas fa-arrow-left"></i> <span style="display:none; display:inline-block @media(min-width:400px);">返回</span>
      </a>
    </div>
    <div style="font-weight:bold; color:var(--text-main);">图库</div>
    <div style="width: 60px;"></div>
  </nav>

  <div class="virtual-scroll-container" id="scrollContainer">
    <div class="virtual-scroll-content" id="scrollContent">
      <div class="masonry-container" id="masonryContainer">
        ${items.length === 0 ? `
          <div class="empty-state">
            <i class="fas fa-images"></i>
            <h3>暂无图片</h3>
            <p>快去首页抽取卡片吧！</p>
          </div>
        ` : ''}
        
        <!-- 修复点：onclick="VirtualScroll.show(...)" -->
        ${items.map((item, index) => `
          <div class="item" data-index="${index}" onclick="VirtualScroll.show('${item.url}')" style="opacity:1">
            <div class="img-wrapper">
               <img src="${item.url}" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.src='https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif'; this.onerror=null;" alt="Image by ${item.username}">
            </div>
            <div class="item-user">
              <div class="user-tag"><i class="fas fa-user-circle"></i> ${item.username}</div>
              <div style="font-size:0.7rem; color:#CBD5E1;">${new Date(item.ts).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>
            </div>
          </div>
        `).join('')}
        

      </div>
    </div>
  </div>

  <button id="backToTop" onclick="document.getElementById('scrollContainer').scrollTo({top: 0, behavior: 'smooth'})">
    <i class="fas fa-arrow-up"></i>
  </button>

  <div id="imgModal" class="modal" onclick="if(event.target === this) this.classList.remove('show')">
    <button class="modal-close-img" onclick="document.getElementById('imgModal').classList.remove('show')"><i class="fas fa-times"></i></button>
    <img id="bigImg" class="modal-img" alt="预览" onload="this.classList.add('loaded')">
  </div>

  <script>
    const VirtualScroll = {
      currentPage: ${pager.currentPage},
      totalPages: ${pager.totalPages},
      totalItems: ${pager.totalItems},
      allItems: ${JSON.stringify(items)},
      
      pageSize: 24,
      isLoading: false,
      lastRenderedIndex: -1, 

      init() {
        this.setupImageLazyLoad(); 
        this.lastRenderedIndex = this.allItems.length - 1; 
        this.setupBackToTop();
        
        if (this.currentPage < this.totalPages) {
          this.setupInfiniteScroll();
        }
      },
      
      renderNewItems() {
        const masonryContainer = document.getElementById('masonryContainer');
        
        for (let i = this.lastRenderedIndex + 1; i < this.allItems.length; i++) {
            const item = this.allItems[i];
            if (!item) continue;

            const itemElement = this.createItemElement(item, i);
            masonryContainer.appendChild(itemElement);
        }
        this.lastRenderedIndex = this.allItems.length - 1;
      },
      
      createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'item';
        div.style.animationDelay = \`\${Math.min(index * 0.03, 0.5)}s\`;
        div.dataset.index = index;
        div.onclick = () => this.show(item.url);
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'img-wrapper';
        
        const img = document.createElement('img');
        img.src = item.url; 
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = 'Image by ' + (item.username || 'Unknown');
        img.onload = () => { img.classList.add('loaded'); imgWrapper.classList.add('loaded'); };
        img.onerror = () => { 
          img.src = 'https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif';
          img.onerror = null;
        };
        imgWrapper.appendChild(img);
        
        const itemUser = document.createElement('div');
        itemUser.className = 'item-user';
        
        const userTag = document.createElement('div');
        userTag.className = 'user-tag';
        userTag.innerHTML = '<i class="fas fa-user-circle"></i> ' + (item.username || 'Unknown');
        
        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = '0.7rem';
        dateDiv.style.color = '#CBD5E1';
        dateDiv.textContent = item.ts ? new Date(item.ts).toLocaleDateString() : '';
        
        itemUser.appendChild(userTag);
        itemUser.appendChild(dateDiv);
        
        div.appendChild(imgWrapper);
        div.appendChild(itemUser);
        
        return div;
      },
      
      setupInfiniteScroll() {
        const scrollContainer = document.getElementById('scrollContainer');
        
        // 使用滚动事件监听代替 IntersectionObserver
        const handleScroll = () => {
          if (this.isLoading || this.currentPage >= this.totalPages) return;
          
          const scrollTop = scrollContainer.scrollTop;
          const scrollHeight = scrollContainer.scrollHeight;
          const clientHeight = scrollContainer.clientHeight;
          
          // 距离底部 300px 时触发加载
          if (scrollTop + clientHeight >= scrollHeight - 300) {
            this.loadMore();
          }
        };
        
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        this.scrollHandler = handleScroll;
      },
      
      async loadMore() {
        if (this.isLoading || this.currentPage >= this.totalPages) return;
        this.isLoading = true;
        
        const nextPage = this.currentPage + 1;
        
        try {
          const response = await fetch(\`/api/library/items?page=\${nextPage}&pageSize=\${this.pageSize}\`);
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          const data = await response.json();
          
          // 更新总页数（后端可能重新计算）
          if (data.pagination) {
            this.totalPages = data.pagination.totalPages;
            this.totalItems = data.pagination.totalItems;
          }
          
          if (data.items && data.items.length > 0) {
            // 防止重复添加（根据 URL 去重）
            const existingUrls = new Set(this.allItems.map(item => item.url));
            const newItems = data.items.filter(item => !existingUrls.has(item.url));
            
            if (newItems.length > 0) {
              this.allItems = this.allItems.concat(newItems);
              this.currentPage = data.pagination ? data.pagination.currentPage : nextPage;
              this.renderNewItems();
            } else if (this.currentPage < this.totalPages) {
              // 如果没有新数据但还有下一页，尝试继续加载
              this.currentPage = nextPage;
              if (this.currentPage < this.totalPages) {
                setTimeout(() => this.loadMore(), 100);
              }
            }
          } else {
             this.currentPage = this.totalPages; 
          }
        } catch (error) {
          console.error('加载更多失败:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      setupBackToTop() {
        const btn = document.getElementById('backToTop');
        const container = document.getElementById('scrollContainer');
        container.onscroll = () => {
             if (container.scrollTop > 300) btn.classList.add('show');
             else btn.classList.remove('show');
        };
      },
      
      setupImageLazyLoad() {
        // 图片已经使用 loading="lazy"，这里可以添加额外的懒加载逻辑
        // 例如，观察图片进入视口时加载高清版本
      },
      
      show(url) {
        const modal = document.getElementById('imgModal');
        const img = document.getElementById('bigImg');
        img.classList.remove('loaded');
        img.style.opacity = '0';
        img.onload = () => { img.style.opacity = '1'; };
        img.src = url;
        modal.classList.add('show');
      }
    };
    
    document.addEventListener("DOMContentLoaded", () => {
      VirtualScroll.init();
    });
  </script>
</body>
</html>
  `;
}

// =========================================
// 个人资料页模板
// =========================================

function getProfilePage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>个人档案 - Chouka</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Russo+One&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary: #7C3AED;
      --primary-dark: #5B21B6;
      --primary-light: #A78BFA;
      --secondary: #06B6D4;
      --cta: #F43F5E;
      --bg-dark: #0F0F23;
      --bg-card: #1A1A2E;
      --bg-card-hover: #252542;
      --text-main: #E2E8F0;
      --text-muted: #94A3B8;
      --text-dark: #1E293B;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --r-n: #64748B;
      --r-r: #3B82F6;
      --r-sr: #8B5CF6;
      --r-ssr: #F59E0B;
      --r-ur: #EC4899;
      --radius: 16px;
      --font-display: 'Russo One', sans-serif;
      --font-body: 'Chakra Petch', sans-serif;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
    body {
      background: var(--bg-dark);
      background-image: 
        radial-gradient(ellipse at 20% 0%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(6, 182, 212, 0.1) 0%, transparent 50%),
        linear-gradient(180deg, #0F0F23 0%, #16213E 100%);
      min-height: 100vh;
      color: var(--text-main);
      font-family: var(--font-body);
      margin: 0;
      overflow-x: hidden;
    }
    .container { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }
    
    /* Header */
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .back-btn {
      width: 44px; height: 44px; border-radius: 12px; border: none;
      background: rgba(255,255,255,0.08); color: var(--text-main);
      font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .back-btn:hover { background: rgba(255,255,255,0.15); transform: translateX(-2px); }
    .page-title { font-family: var(--font-display); font-size: 1.5rem; margin: 0; letter-spacing: 1px; }
    .logout-header-btn {
      width: 44px; height: 44px; border-radius: 12px; border: none;
      background: rgba(239, 68, 68, 0.15); color: var(--danger);
      font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .logout-header-btn:hover { background: rgba(239, 68, 68, 0.25); transform: translateX(2px); }
    
    /* Profile Card */
    .profile-card {
      background: linear-gradient(145deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.95));
      border-radius: var(--radius);
      padding: 28px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(124, 58, 237, 0.3);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .profile-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, var(--primary), var(--secondary), var(--primary));
    }
    .avatar-wrapper {
      position: relative; width: 100px; height: 100px; margin: 0 auto 16px;
    }
    .avatar {
      width: 100px; height: 100px; border-radius: 50%;
      border: 3px solid var(--primary);
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
      object-fit: cover;
    }
    .level-badge {
      position: absolute; bottom: -4px; right: -4px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; font-family: var(--font-display); font-size: 0.85rem;
      padding: 4px 10px; border-radius: 20px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.5);
      border: 2px solid var(--bg-card);
    }
    .nickname-row { position: relative; display: flex; justify-content: center; align-items: center; margin: 0 0 4px 0; }
    .nickname { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 0.5px; }
    .edit-nickname-btn {
      position: relative; margin-left: 8px;
      width: 32px; height: 32px; border-radius: 50%; border: none;
      background: rgba(124, 58, 237, 0.15); color: var(--primary-light);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; transition: all 0.2s ease;
    }
    .edit-nickname-btn:hover {
      background: rgba(124, 58, 237, 0.3); transform: scale(1.1);
    }
    .username { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 8px; }
    
    /* Title Badge */
    .title-display { margin-top: 8px; }
    .title-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(139, 92, 246, 0.3));
      border: 1px solid var(--primary-light);
      color: var(--primary-light); padding: 6px 14px; border-radius: 20px;
      font-size: 0.85rem; font-weight: 600;
      transition: all 0.2s ease;
    }
    .title-badge:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(139, 92, 246, 0.4));
      border-color: var(--primary);
      transform: translateY(-1px);
    }
    
    /* Stats Row */
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
    .stat-box {
      background: rgba(255,255,255,0.04);
      border-radius: 12px; padding: 16px 12px;
      border: 1px solid rgba(255,255,255,0.06);
      transition: all 0.2s ease;
    }
    .stat-box:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
    .stat-icon { font-size: 1.3rem; margin-bottom: 6px; }
    .stat-icon.coins { color: var(--warning); }
    .stat-icon.draws { color: var(--secondary); }
    .stat-value { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 2px; }
    .stat-value.coins { color: var(--warning); }
    .stat-label { color: var(--text-muted); font-size: 0.8rem; }
    
    /* Exp Bar */
    .exp-section { margin-top: 20px; }
    .exp-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; }
    .exp-text { color: var(--text-muted); }
    .exp-percent { color: var(--primary-light); font-weight: 600; }
    .exp-bar {
      height: 10px; background: rgba(255,255,255,0.1);
      border-radius: 5px; overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
    }
    .exp-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      border-radius: 5px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px var(--primary);
    }
    
    /* Inventory Section */
    .section-card {
      background: linear-gradient(145deg, rgba(26, 26, 46, 0.9), rgba(22, 33, 62, 0.95));
      border-radius: var(--radius); margin-top: 20px;
      padding: 20px; border: 1px solid rgba(255,255,255,0.06);
    }
    .section-title {
      font-family: var(--font-display); font-size: 1rem;
      margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;
      letter-spacing: 0.5px;
    }
    .inventory-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .inv-item {
      background: rgba(255,255,255,0.04);
      border-radius: 10px; padding: 12px 6px;
      text-align: center; border: 1px solid transparent;
      transition: all 0.2s ease; cursor: pointer;
    }
    .inv-item:hover { transform: translateY(-3px); }
    .inv-item.N { border-color: rgba(100,116,139,0.3); }
    .inv-item.N:hover { background: rgba(100,116,139,0.15); box-shadow: 0 4px 12px rgba(100,116,139,0.2); }
    .inv-item.R { border-color: rgba(59,130,246,0.3); }
    .inv-item.R:hover { background: rgba(59,130,246,0.15); box-shadow: 0 4px 12px rgba(59,130,246,0.2); }
    .inv-item.SR { border-color: rgba(139,92,246,0.3); }
    .inv-item.SR:hover { background: rgba(139,92,246,0.15); box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
    .inv-item.SSR { border-color: rgba(245,158,11,0.3); }
    .inv-item.SSR:hover { background: rgba(245,158,11,0.15); box-shadow: 0 4px 12px rgba(245,158,11,0.2); }
    .inv-item.UR { border-color: rgba(236,72,153,0.3); }
    .inv-item.UR:hover { background: rgba(236,72,153,0.15); box-shadow: 0 4px 12px rgba(236,72,153,0.2); }
    .inv-rarity { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
    .inv-rarity.N { color: var(--r-n); }
    .inv-rarity.R { color: var(--r-r); }
    .inv-rarity.SR { color: var(--r-sr); }
    .inv-rarity.SSR { color: var(--r-ssr); }
    .inv-rarity.UR { 
      background: linear-gradient(90deg, #EC4899, #F59E0B, #8B5CF6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    .inv-count { font-size: 0.8rem; color: var(--text-muted); }
    .total-inv { text-align: center; margin-top: 12px; font-size: 0.85rem; color: var(--text-muted); }
    
    /* Action Buttons */
    .action-grid { display: flex; justify-content: center; margin-top: 20px; }
    .btn {
      padding: 14px 20px; border-radius: 12px; font-weight: 600;
      font-family: var(--font-body); font-size: 0.95rem;
      cursor: pointer; border: none; transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn:active { transform: scale(0.97); }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
    }
    .btn-primary:hover { box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5); transform: translateY(-2px); }
    .btn-secondary {
      background: rgba(255,255,255,0.08); color: var(--text-main);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.12); }
    
    /* Modal */
    .modal {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center;
      z-index: 2000; opacity: 0; transition: opacity 0.25s ease;
    }
    .modal.show { display: flex; opacity: 1; }
    .modal-content {
      background: linear-gradient(145deg, #1A1A2E, #16213E);
      border-radius: var(--radius); width: 90%; max-width: 400px;
      padding: 24px; position: relative;
      border: 1px solid rgba(124, 58, 237, 0.3);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      transform: scale(0.9); transition: transform 0.25s ease;
    }
  .modal.show .modal-content, .modal.show .admin-modal-content { transform: scale(1); }
    .modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; color: var(--text-muted);
      font-size: 1.2rem; cursor: pointer; padding: 4px; transition: color 0.2s;
    }
    .modal-close:hover { color: var(--danger); }
    .modal-title { font-family: var(--font-display); font-size: 1.2rem; margin: 0 0 20px 0; }
    
    /* About Panel - Inline */
    .about-panel {
      background: linear-gradient(145deg, rgba(26, 26, 46, 0.8), rgba(22, 33, 62, 0.9));
      border-radius: var(--radius);
      border: 1px solid rgba(124, 58, 237, 0.2);
      margin-top: 24px;
      overflow: hidden;
    }
    .about-header {
      background: linear-gradient(90deg, rgba(124, 58, 237, 0.2), rgba(6, 182, 212, 0.1));
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: var(--primary-light);
      border-bottom: 1px solid rgba(124, 58, 237, 0.15);
    }
    .about-header i { font-size: 1rem; }
    .about-content { padding: 16px; }
    .about-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .about-version {
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 400;
    }
    .about-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .about-tech {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .tech-tag {
      background: rgba(124, 58, 237, 0.15);
      color: var(--primary-light);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .about-features {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .feature-item {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feature-item i { color: var(--success); font-size: 0.75rem; }
    .about-footer {
      padding: 12px 16px;
      font-size: 0.7rem;
      color: var(--text-muted);
      opacity: 0.6;
      text-align: center;
      border-top: 1px solid rgba(124, 58, 237, 0.1);
    }
    
    /* Title List */
    .title-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .title-item {
      padding: 12px 16px; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; transition: all 0.2s ease;
    }
    .title-item:hover { background: rgba(124, 58, 237, 0.15); border-color: var(--primary); }
    .title-item.active { background: rgba(124, 58, 237, 0.2); border-color: var(--primary); }
    .title-item-name { font-weight: 600; }
    .title-item .check { color: var(--success); display: none; }
    .title-item.active .check { display: block; }
    .no-title { text-align: center; color: var(--text-muted); padding: 20px; }
    
    /* Reward List */
    .reward-list { max-height: 350px; overflow-y: auto; }
    .reward-item {
      padding: 14px; border-radius: 10px; margin-bottom: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      display: flex; justify-content: space-between; align-items: center;
    }
    .reward-item.reached { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.08); }
    .reward-level { font-family: var(--font-display); font-size: 1rem; }
    .reward-item.reached .reward-level { color: var(--success); }
    .reward-item:not(.reached) .reward-level { color: var(--text-muted); }
    .reward-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
    .reward-btn {
      padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem;
      cursor: pointer; border: none; transition: all 0.2s;
    }
    .reward-btn.claim { background: var(--success); color: white; }
    .reward-btn.claim:hover { background: #059669; }
    .reward-btn.disabled { background: rgba(255,255,255,0.1); color: var(--text-muted); cursor: not-allowed; }
    
    /* Toast */
    .toast {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px);
      background: rgba(30, 41, 59, 0.95); color: white;
      padding: 12px 24px; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-size: 0.9rem; z-index: 3000;
      opacity: 0; transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--danger); }
    
    /* Loading skeleton */
    .skeleton { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <button class="back-btn" onclick="window.location.href='/'" aria-label="返回首页">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1 class="page-title">个人档案</h1>
      <button class="logout-header-btn" onclick="App.logout()" aria-label="退出登录">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>

    <div class="profile-card">
      <div class="avatar-wrapper">
        <img class="avatar" id="profileAvatar" src="https://api.dicebear.com/7.x/adventurer/svg?seed=default" alt="用户头像">
        <span class="level-badge" id="profileLevelBadge">Lv.1</span>
      </div>
      <div class="nickname-row">
        <h2 class="nickname" id="profileNickname">加载中...</h2>
        <button class="edit-nickname-btn" onclick="App.editProfile()" aria-label="修改昵称">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="username">@<span id="profileUsername">...</span></div>
      <div class="title-display">
        <span class="title-badge" id="currentTitleBadge" style="display:none;cursor:pointer;" onclick="App.openTitleModal()">
          <i class="fas fa-crown"></i> <span id="titleName"></span>
        </span>
        <span class="title-badge" id="noTitleBadge" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:var(--text-muted);cursor:pointer;" onclick="App.openTitleModal()">
          <i class="fas fa-crown"></i> 暂无称号
        </span>
      </div>

      <div class="stats-row">
        <div class="stat-box" onclick="App.openRewardModal()" style="cursor:pointer;">
          <div class="stat-icon coins"><i class="fas fa-coins"></i></div>
          <div class="stat-value coins" id="profileCoins">-</div>
          <div class="stat-label">当前积分</div>
        </div>
        <div class="stat-box" onclick="App.openRewardModal()" style="cursor:pointer;">
          <div class="stat-icon" style="color:var(--warning);"><i class="fas fa-gift"></i></div>
          <div class="stat-value" style="color:var(--warning);">等级奖励</div>
          <div class="stat-label">查看奖励</div>
        </div>
      </div>

      <div class="exp-section">
        <div class="exp-header">
          <span class="exp-text">经验值: <span id="profileExp">0</span> / <span id="profileExpNext">100</span></span>
          <span class="exp-percent" id="profileExpPercent">0%</span>
        </div>
        <div class="exp-bar">
          <div class="exp-fill" id="profileExpFill" style="width:0%"></div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <h3 class="section-title"><i class="fas fa-layer-group"></i> 卡片收集统计</h3>
      <div class="inventory-grid">
        <div class="inv-item N"><div class="inv-rarity N">N</div><div class="inv-count" id="invCountN">0</div></div>
        <div class="inv-item R"><div class="inv-rarity R">R</div><div class="inv-count" id="invCountR">0</div></div>
        <div class="inv-item SR"><div class="inv-rarity SR">SR</div><div class="inv-count" id="invCountSR">0</div></div>
        <div class="inv-item SSR"><div class="inv-rarity SSR">SSR</div><div class="inv-count" id="invCountSSR">0</div></div>
        <div class="inv-item UR"><div class="inv-rarity UR">UR</div><div class="inv-count" id="invCountUR">0</div></div>
      </div>
      <div class="total-inv">召唤总数: <strong id="profileTotalCards">0</strong></div>
    </div>

    <!-- 关于面板 - 内联展示 -->
    <div class="about-panel">
      <div class="about-header">
        <i class="fas fa-cube"></i>
        <span>关于系统</span>
      </div>
      <div class="about-content">
        <div class="about-title">Gacha System <span class="about-version">v1.0.0</span></div>
        <div class="about-desc">基于 Serverless 构建的抽卡收集系统</div>
        <div class="about-tech">
          <span class="tech-tag"><i class="fas fa-cloud"></i> Cloudflare</span>
          <span class="tech-tag"><i class="fas fa-database"></i> D1</span>
          <span class="tech-tag"><i class="fas fa-hdd"></i> R2</span>
        </div>
        <div class="about-features">
          <div class="feature-item"><i class="fas fa-check-circle"></i> 物理Hash去重图库</div>
          <div class="feature-item"><i class="fas fa-check-circle"></i> 全局级卡池缓冲队列</div>
          <div class="feature-item"><i class="fas fa-check-circle"></i> 多级称号与成就系统</div>
        </div>
      </div>
      <div class="about-footer">
        &copy; 2024 Gacha System
      </div>
    </div>

  </div>

  <!-- 称号管理弹窗 -->
  <div id="titleModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="titleModalTitle">
    <div class="modal-content">
      <button class="modal-close" onclick="App.closeTitleModal()" aria-label="关闭"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="titleModalTitle"><i class="fas fa-crown"></i> 称号管理</h3>
      <div class="title-list" id="titleList"></div>
      <button class="btn btn-secondary" style="width:100%;margin-top:16px;" onclick="App.equipTitle(null)">卸下当前称号</button>
    </div>
  </div>

  <!-- 等级奖励弹窗 -->
  <div id="rewardModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="rewardModalTitle">
    <div class="modal-content">
      <button class="modal-close" onclick="App.closeRewardModal()" aria-label="关闭"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="rewardModalTitle"><i class="fas fa-gift"></i> 等级奖励</h3>
      <div class="reward-list" id="rewardList"></div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const MILESTONES = {
      5: { coins: 500, title: '新手收藏家' },
      10: { coins: 1000, title: '初级收藏家' },
      20: { coins: 2000, title: '高级收藏家' },
      30: { coins: 3000, title: '资深收藏家' },
      50: { coins: 5000, title: '传说人物' },
      100: { coins: 10000, title: '卡片之神' }
    };
    
    const App = {
      username: localStorage.getItem('moe_username'),
      
      async init() {
        if (!this.username) {
          window.location.href = '/';
          return;
        }
        await Promise.all([this.fetchUserInfo(), this.fetchInventory()]);
      },

      async fetchUserInfo() {
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) {
            this.updateUI(data);
          } else {
            this.logout();
          }
        } catch(e) { 
          console.error(e);
          this.showToast('加载失败', 'error');
        }
      },

      async fetchInventory() {
        try {
          const res = await fetch('/user/inventory', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data) this.updateInventoryUI(data);
        } catch(e) { console.error('Failed to load inventory', e); }
      },

      updateUI(user) {
        document.getElementById('profileNickname').textContent = user.nickname || user.username;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileCoins').textContent = (user.coins || 0).toLocaleString();
        document.getElementById('profileLevelBadge').textContent = 'Lv.' + (user.level || 1);

        const avatar = document.getElementById('profileAvatar');
        if (avatar && user.avatar) avatar.src = user.avatar;

        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;
        
        document.getElementById('profileExp').textContent = exp.toLocaleString();
        document.getElementById('profileExpNext').textContent = next.toLocaleString();
        document.getElementById('profileExpPercent').textContent = progress + '%';
        document.getElementById('profileExpFill').style.width = progress + '%';

        const titleBadge = document.getElementById('currentTitleBadge');
        const noTitleBadge = document.getElementById('noTitleBadge');
        if (user.title && user.title.name) {
          document.getElementById('titleName').textContent = user.title.name;
          titleBadge.style.display = 'inline-flex';
          noTitleBadge.style.display = 'none';
        } else {
          titleBadge.style.display = 'none';
          noTitleBadge.style.display = 'inline-flex';
        }
      },

      updateInventoryUI(inv) {
        ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => {
          const el = document.getElementById('invCount' + r);
          if(el) el.textContent = (inv[r] || 0).toLocaleString();
        });
        const total = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        const el = document.getElementById('profileTotalCards');
        if(el) el.textContent = total.toLocaleString();
      },

      openTitleModal() {
        const modal = document.getElementById('titleModal');
        const list = document.getElementById('titleList');
        list.innerHTML = '<div class="no-title">加载中...</div>';
        modal.classList.add('show');

        fetch('/user/titles', { headers: { 'X-User-ID': this.username } })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.titles.length > 0) {
              list.innerHTML = data.titles.map(t => \`
                <div class="title-item \${t.is_equipped ? 'active' : ''}" onclick="App.equipTitle('\${t.title_id}')" role="button" tabindex="0">
                  <span class="title-item-name">\${t.title_id}</span>
                  <i class="fas fa-check-circle check"></i>
                </div>
              \`).join('');
            } else {
              list.innerHTML = '<div class="no-title">你还没有获得任何称号<br>请努力升级或完成成就！</div>';
            }
          })
          .catch(() => { list.innerHTML = '<div class="no-title">加载失败</div>'; });
      },

      closeTitleModal() {
        document.getElementById('titleModal').classList.remove('show');
      },

      openRewardModal() {
        const modal = document.getElementById('rewardModal');
        const list = document.getElementById('rewardList');
        const currentLevel = parseInt(document.getElementById('profileLevelBadge').textContent.replace('Lv.','')) || 1;
        
        let html = '';
        for (const [lvl, reward] of Object.entries(MILESTONES)) {
          const level = parseInt(lvl);
          const isReached = currentLevel >= level;
          let desc = \`金币 \${reward.coins}\`;
          if (reward.title) desc += \` + 称号 [\${reward.title}]\`;
          
          html += \`
            <div class="reward-item \${isReached ? 'reached' : ''}">
              <div>
                <div class="reward-level">Lv.\${level}</div>
                <div class="reward-desc">\${desc}</div>
              </div>
              \${isReached 
                ? \`<button class="reward-btn claim" onclick="App.claimReward(\${level})">领取</button>\` 
                : '<span class="reward-btn disabled">未达标</span>'
              }
            </div>\`;
        }
        list.innerHTML = html;
        modal.classList.add('show');
      },

      closeRewardModal() {
        document.getElementById('rewardModal').classList.remove('show');
      },

      async claimReward(level) {
        if(!confirm(\`确定领取 Lv.\${level} 的奖励吗？\`)) return;
        try {
          const res = await fetch('/user/claim-reward', {
            method: 'POST',
            headers: { 'X-User-ID': this.username },
            body: JSON.stringify({ targetLevel: level })
          });
          const data = await res.json();
          if(data.success) {
            this.showToast('领取成功！', 'success');
            document.getElementById('rewardModal').classList.remove('show');
            this.fetchUserInfo();
          } else {
            const msg = data.error === '奖励已领取' ? '该奖励已经领取过了' : data.error;
            this.showToast(msg, 'error');
          }
        } catch(e) { this.showToast('网络错误', 'error'); }
      },

      async equipTitle(titleId) {
        try {
          const res = await fetch('/user/equip-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-ID': this.username },
            body: JSON.stringify({ titleId })
          });
          const data = await res.json();
          if (data.success) {
            this.closeTitleModal();
            this.showToast(data.message, 'success');
            this.fetchUserInfo();
          } else {
            this.showToast(data.error || '操作失败', 'error');
          }
        } catch(e) { this.showToast('网络错误', 'error'); }
      },

      async editProfile() {
        const current = document.getElementById('profileNickname').textContent;
        const newNick = prompt('输入新昵称 (最多20字符):', current);
        if (newNick && newNick !== current) {
          if(newNick.length > 20) { this.showToast('昵称过长', 'error'); return; }
          try {
            const res = await fetch('/user/update-profile', {
              method: 'POST',
              headers: { 'X-User-ID': this.username },
              body: JSON.stringify({ nickname: newNick })
            });
            const data = await res.json();
            if(data.success) {
              document.getElementById('profileNickname').textContent = data.nickname;
              this.showToast('修改成功', 'success');
            } else { this.showToast(data.error || '修改失败', 'error'); }
          } catch(e) { this.showToast('网络错误', 'error'); }
        }
      },

      logout() {
        if(confirm('确定要退出登录吗？')) {
          localStorage.removeItem('moe_username');
          window.location.href = '/';
        }
      },

      showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = 'toast ' + type + ' show';
        setTimeout(() => { toast.classList.remove('show'); }, 2500);
      }
    };

    window.onload = () => App.init();
  </script>
</body>
</html>
  `;
}