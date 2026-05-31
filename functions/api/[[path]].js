import { UserService } from '../../src/services/user-service.js';
import { GachaService } from '../../src/services/gacha-service.js';
import { CONFIG, DEFAULT_CHANGELOG } from '../../src/config/index.js';
import { jsonResponse, safeJsonParse, requireAdmin } from '../../src/utils/response.js';

function getCurrentUser(context) {
  return context.data?.currentUser || null;
}

async function onRequest(context) {
  const { request, env } = context;
  const currentUser = getCurrentUser(context);
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const method = request.method;

  const userService = new UserService(env, context.ctx || null);
  const gachaService = new GachaService(env, context.ctx || null, userService);

  // Health check — no auth required
  if (path === '/health' && method === 'GET') {
    return jsonResponse({
      status: 'ok',
      bindings: {
        DB: !!env.DB,
        KV_CACHE: !!env.KV_CACHE,
        RECENT_REQUESTS: !!env.RECENT_REQUESTS,
        R2_BUCKET: !!env.R2_BUCKET,
      },
      env: {
        admin: !!env.admin,
        GITHUB_TOKEN: !!env.GITHUB_TOKEN,
        R2_DOMAIN: !!env.R2_DOMAIN,
      },
    });
  }

  try {
    // ─── Auth ───
    if (path === '/auth/register' && method === 'POST') {
      return await userService.register(request);
    }
    if (path === '/auth/login' && method === 'POST') {
      return await userService.login(request);
    }

    // ─── User (requires auth) ───
    if (path === '/user/info' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInfo(currentUser);
    }
    if (path === '/user/inventory' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInventory(currentUser);
    }
    if (path === '/user/check-in' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.checkIn(currentUser, request);
    }
    if (path === '/user/titles' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getTitles(currentUser);
    }
    if (path === '/user/equip-title' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.equipTitle(currentUser, request);
    }
    if (path === '/user/update-profile' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.updateProfile(currentUser, request);
    }
    if (path === '/user/claim-reward' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.claimReward(currentUser, request);
    }
    if (path === '/user/upload' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.uploadImage(currentUser, request);
    }
    if (path === '/user/uploads' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.getUserUploads(currentUser, request);
    }
    if (path === '/user/craft' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.craft(currentUser, request);
    }

    // ─── Draw ───
    if (path === '/draw' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.draw(currentUser);
    }
    if (path === '/draw/multi' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.multiDraw(currentUser, request);
    }
    if (path === '/draw/limited' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.drawLimited(currentUser, request);
    }
    if (path === '/draw/draw-history' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.getDrawHistory(currentUser, request);
    }
    if (path === '/limited/pools' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.getLimitedPools(currentUser);
    }

    // ─── Game ───
    if (path === '/game/dice' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.playDice(currentUser, request);
    }
    if (path === '/shop/buy' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await gachaService.shopBuy(currentUser, request);
    }

    // ─── Public (edge-cached) ───
    const CACHE_1M = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' };
    const CACHE_5M = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

    if (path === '/showcase' && method === 'GET') {
      try {
        const cards = await env.DB.prepare(
          'SELECT g.*, u.username, g.rarity FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
        ).all();
        return jsonResponse({ cards: cards.results || [] }, 200, CACHE_1M);
      } catch (e) {
        return jsonResponse({ cards: [] }, 200, CACHE_1M);
      }
    }
    if (path === '/announcement' && method === 'GET') {
      const ann = await env.KV_CACHE.get(CONFIG.KEYS.ANNOUNCEMENT, { type: 'json' });
      return jsonResponse(ann || { title: '', content: '', enabled: false }, 200, CACHE_5M);
    }
    if (path === '/changelog' && method === 'GET') {
      const cl = await env.KV_CACHE.get(CONFIG.KEYS.CHANGELOG);
      return jsonResponse(cl ? safeJsonParse(cl) : DEFAULT_CHANGELOG, 200, CACHE_5M);
    }
    if (path === '/library/items' && method === 'GET') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
      const rarity = url.searchParams.get('rarity');
      const userId = url.searchParams.get('userId');
      const sort = url.searchParams.get('sort') || 'newest';
      const search = url.searchParams.get('search')?.trim();
      const period = url.searchParams.get('period');
      const offset = (page - 1) * limit;
      let q = 'SELECT g.id, g.url, g.user_id, g.username, g.rarity, g.source_name, g.created_at, (SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) as like_count FROM gallery g';
      let cq = 'SELECT COUNT(*) as total FROM gallery g';
      const p = [], cp = [];
      const conds = [];
      if (rarity) { conds.push('g.rarity = ?'); p.push(rarity.toUpperCase()); cp.push(rarity.toUpperCase()); }
      if (userId) { conds.push('g.user_id = ?'); p.push(parseInt(userId)); cp.push(parseInt(userId)); }
      if (search) { conds.push('g.username LIKE ?'); p.push(`%${search}%`); cp.push(`%${search}%`); }
      if (period && period !== 'all') {
        const now = Date.now();
        const PERIOD_MS = { today: 86400000, week: 604800000, month: 2592000000 };
        const ms = PERIOD_MS[period];
        if (ms) { conds.push('g.created_at > ?'); p.push(now - ms); cp.push(now - ms); }
      }
      if (conds.length) { q += ' WHERE ' + conds.join(' AND '); cq += ' WHERE ' + conds.join(' AND '); }
      const ORDER = { newest: 'g.created_at DESC', oldest: 'g.created_at ASC', rarity: "CASE g.rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 ELSE 5 END, g.created_at DESC", hot: '(SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) DESC, g.created_at DESC' };
      const orderBy = ORDER[sort] || ORDER.newest;
      const [items, count] = await Promise.all([
        env.DB.prepare(`${q} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...p, limit, offset).all(),
        env.DB.prepare(cq).bind(...cp).first(),
      ]);
      return jsonResponse({ items: items.results || [], total: count?.total || 0, page, totalPages: Math.ceil((count?.total || 0) / limit) }, 200, CACHE_1M);
    }

    // ─── 图鉴点赞 ───
    if (path === '/library/like' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { galleryId } = await request.json();
      if (!galleryId) return jsonResponse({ error: '缺少 galleryId' }, 400);
      try {
        await env.DB.prepare('INSERT INTO card_likes (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(currentUser.id, galleryId, Date.now()).run();
        const count = await env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
        return jsonResponse({ success: true, liked: true, likeCount: count?.c || 0 });
      } catch (e) { return jsonResponse({ error: '操作失败' }, 500); }
    }
    if (path === '/library/like' && method === 'DELETE') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { galleryId } = await request.json();
      if (!galleryId) return jsonResponse({ error: '缺少 galleryId' }, 400);
      await env.DB.prepare('DELETE FROM card_likes WHERE user_id = ? AND gallery_id = ?').bind(currentUser.id, galleryId).run();
      const count = await env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
      return jsonResponse({ success: true, liked: false, likeCount: count?.c || 0 });
    }

    // ─── 我的点赞列表 ───
    if (path === '/library/my-likes' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const likes = await env.DB.prepare('SELECT gallery_id FROM card_likes WHERE user_id = ?').bind(currentUser.id).all();
      return jsonResponse({ likedIds: (likes.results || []).map(r => r.gallery_id) });
    }

    // ─── 点赞数查询（带边缘缓存） ───
    if (path === '/library/like-counts' && method === 'GET') {
      const idsParam = url.searchParams.get('ids');
      if (!idsParam) return jsonResponse({ counts: {} }, 200, CACHE_1M);
      const ids = idsParam.split(',').map(Number).filter(n => n > 0).slice(0, 50);
      if (ids.length === 0) return jsonResponse({ counts: {} }, 200, CACHE_1M);
      const placeholders = ids.map(() => '?').join(',');
      const rows = await env.DB.prepare(`SELECT gallery_id, COUNT(*) as c FROM card_likes WHERE gallery_id IN (${placeholders}) GROUP BY gallery_id`).bind(...ids).all();
      const counts = {};
      (rows.results || []).forEach(r => { counts[r.gallery_id] = r.c; });
      return jsonResponse({ counts }, 200, CACHE_1M);
    }

    // ─── 图鉴书签 ───
    if (path === '/library/bookmark' && method === 'POST') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { galleryId } = await request.json();
      if (!galleryId) return jsonResponse({ error: '缺少 galleryId' }, 400);
      try {
        await env.DB.prepare('INSERT INTO card_bookmarks (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').bind(currentUser.id, galleryId, Date.now()).run();
        return jsonResponse({ success: true, bookmarked: true });
      } catch (e) { return jsonResponse({ error: '操作失败' }, 500); }
    }
    if (path === '/library/bookmark' && method === 'DELETE') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { galleryId } = await request.json();
      if (!galleryId) return jsonResponse({ error: '缺少 galleryId' }, 400);
      await env.DB.prepare('DELETE FROM card_bookmarks WHERE user_id = ? AND gallery_id = ?').bind(currentUser.id, galleryId).run();
      return jsonResponse({ success: true, bookmarked: false });
    }

    // ─── 我的书签列表 ───
    if (path === '/library/my-bookmarks' && method === 'GET') {
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const bookmarks = await env.DB.prepare('SELECT gallery_id FROM card_bookmarks WHERE user_id = ?').bind(currentUser.id).all();
      return jsonResponse({ bookmarkedIds: (bookmarks.results || []).map(r => r.gallery_id) });
    }

    // ─── Admin ───
    if (path.startsWith('/admin/')) {
      const auth = await requireAdmin(request, env);
      if (!auth.authorized) return jsonResponse({ error: '认证失败' }, 403);

      if (path === '/admin/verify' && method === 'POST') return jsonResponse({ success: true });

      if (path === '/admin/users' && method === 'POST') {
        const { limit = 100, offset = 0 } = await request.clone().json();
        const users = await env.DB.prepare(
          'SELECT id, username, nickname, coins, level, exp, total_exp, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();
        return jsonResponse({ users: users.results || [] });
      }
      if (path === '/admin/update-points' && method === 'POST') {
        const { targetId, amount } = await request.clone().json();
        if (!targetId || !amount) return jsonResponse({ error: '参数不完整' }, 400);
        await env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(amount, targetId).run();
        return jsonResponse({ success: true });
      }
      if (path === '/admin/delete-user' && method === 'POST') {
        const { targetId } = await request.clone().json();
        if (!targetId) return jsonResponse({ error: '用户ID不能为空' }, 400);
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
        return jsonResponse({ success: true });
      }
      if (path === '/admin/uploads' && method === 'POST') {
        const { status = 'pending', page = 1, limit = 20 } = await request.clone().json();
        const offset = (page - 1) * limit;
        const [items, count] = await Promise.all([
          env.DB.prepare('SELECT * FROM user_uploads WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(status, limit, offset).all(),
          env.DB.prepare('SELECT COUNT(*) as total FROM user_uploads WHERE status = ?').bind(status).first(),
        ]);
        return jsonResponse({ uploads: items.results || [], total: count?.total || 0, page });
      }
      if (path === '/admin/review-upload' && method === 'POST') {
        const { uploadId, action, rarity } = await request.clone().json();
        if (!uploadId) return jsonResponse({ error: '上传ID不能为空' }, 400);
        if (!['approved', 'rejected'].includes(action)) return jsonResponse({ error: '无效的操作' }, 400);
        await env.DB.prepare('UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?').bind(action, Date.now(), uploadId).run();
        if (action === 'approved' && rarity) await env.DB.prepare('UPDATE user_uploads SET rarity = ? WHERE id = ?').bind(rarity, uploadId).run();
        return jsonResponse({ success: true });
      }
      if (path === '/admin/save-changelog' && method === 'POST') {
        const { logs } = await request.clone().json();
        if (!Array.isArray(logs)) return jsonResponse({ error: '无效的日志格式' }, 400);
        await env.KV_CACHE.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(logs.slice(0, 50)));
        return jsonResponse({ message: '更新日志已保存' });
      }
      if (path === '/admin/save-announcement' && method === 'POST') {
        const { announcement } = await request.clone().json();
        if (!announcement) return jsonResponse({ error: '公告内容不能为空' }, 400);
        await env.KV_CACHE.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify({ ...announcement, updatedAt: new Date().toISOString() }));
        return jsonResponse({ message: '公告已保存' });
      }
    }

    return jsonResponse({ error: '未知的API端点' }, 404);
  } catch (e) {
    console.error('[api] Error:', e);
    return jsonResponse({
      error: e.message || 'API服务错误',
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined,
    }, 500);
  }
}

export { onRequest };
