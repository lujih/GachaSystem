import { UserService } from '../../src/services/user-service.js';
import { GachaService } from '../../src/services/gacha-service.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const currentUser = data?.currentUser;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

  const userService = new UserService(env, context.ctx || null);
  const gachaService = new GachaService(env, context.ctx || null, userService);

  try {
    // GET /api/draw — standard draw
    if (path.endsWith('/draw') && request.method === 'GET') {
      return await gachaService.draw(currentUser);
    }

    // GET /api/user/draw-history — draw history
    if (path.includes('/draw-history') && request.method === 'GET') {
      return await gachaService.getDrawHistory(currentUser, request);
    }

    // POST /api/draw/multi — multi draw
    if (path.includes('/multi') && request.method === 'POST') {
      return await gachaService.multiDraw(currentUser, request);
    }

    // POST /api/draw/limited — limited pool draw
    if (path.includes('/limited') && request.method === 'POST') {
      return await gachaService.drawLimited(currentUser, request);
    }

    // GET /api/limited/pools — list limited pools
    if (path.includes('/limited/pools') && request.method === 'GET') {
      return await gachaService.getLimitedPools(currentUser);
    }

    return jsonResponse({ error: '未知的抽卡操作' }, 404);
  } catch (e) {
    console.error('[draw] Error:', e);
    return jsonResponse({ error: e.message || '抽卡服务错误' }, 500);
  }
}
