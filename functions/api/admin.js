import { CONFIG, DEFAULT_CHANGELOG } from '../../src/config/index.js';
import { jsonResponse, safeJsonParse, requireAdmin } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  try {
    // Admin auth — check the return value
    const auth = await requireAdmin(request, env);
    if (!auth.authorized) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    if (request.method === 'POST') {
      const body = await request.clone().json();

      // Verify
      if (path.endsWith('/admin/verify')) {
        return jsonResponse({ success: true });
      }

      // Users list
      if (path.endsWith('/admin/users')) {
        const { limit = 100, offset = 0 } = body;
        const users = await env.DB.prepare(
          'SELECT id, username, nickname, coins, level, exp, total_exp, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();
        return jsonResponse({ users: users.results || [] });
      }

      // Update points
      if (path.endsWith('/admin/update-points')) {
        const { targetId, amount } = body;
        if (!targetId || !amount) return jsonResponse({ error: '参数不完整' }, 400);
        await env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(amount, targetId).run();
        return jsonResponse({ success: true });
      }

      // Delete user
      if (path.endsWith('/admin/delete-user')) {
        const { targetId } = body;
        if (!targetId) return jsonResponse({ error: '用户ID不能为空' }, 400);
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
        return jsonResponse({ success: true });
      }

      // Uploads list
      if (path.endsWith('/admin/uploads')) {
        const { status = 'pending', page = 1, limit = 20 } = body;
        const offset = (page - 1) * limit;
        const [items, count] = await Promise.all([
          env.DB.prepare('SELECT * FROM user_uploads WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(status, limit, offset).all(),
          env.DB.prepare('SELECT COUNT(*) as total FROM user_uploads WHERE status = ?').bind(status).first(),
        ]);
        return jsonResponse({ uploads: items.results || [], total: count?.total || 0, page });
      }

      // Review upload
      if (path.endsWith('/admin/review-upload')) {
        const { uploadId, action, rarity } = body;
        if (!uploadId) return jsonResponse({ error: '上传ID不能为空' }, 400);
        if (!['approved', 'rejected'].includes(action)) return jsonResponse({ error: '无效的操作' }, 400);
        await env.DB.prepare('UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?').bind(action, Date.now(), uploadId).run();
        if (action === 'approved' && rarity) {
          await env.DB.prepare('UPDATE user_uploads SET rarity = ? WHERE id = ?').bind(rarity, uploadId).run();
        }
        return jsonResponse({ success: true });
      }

      // Save changelog
      if (path.endsWith('/admin/save-changelog')) {
        const { logs } = body;
        if (!Array.isArray(logs)) return jsonResponse({ error: '无效的日志格式' }, 400);
        const trimmed = logs.slice(0, 50);
        await env.KV_CACHE.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(trimmed));
        return jsonResponse({ message: '更新日志已保存' });
      }

      // Save announcement
      if (path.endsWith('/admin/save-announcement')) {
        const { announcement } = body;
        if (!announcement) return jsonResponse({ error: '公告内容不能为空' }, 400);
        await env.KV_CACHE.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify({ ...announcement, updatedAt: new Date().toISOString() }));
        return jsonResponse({ message: '公告已保存' });
      }
    }

    return jsonResponse({ error: '未知的管理操作' }, 404);
  } catch (e) {
    console.error('[admin] Error:', e);
    return jsonResponse({ error: e.message || '管理服务错误' }, 500);
  }
}
