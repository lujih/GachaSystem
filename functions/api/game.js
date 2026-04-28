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
    if (request.method !== 'POST') {
      return jsonResponse({ error: '不支持的请求方法' }, 405);
    }

    // POST /api/game/dice
    if (path.endsWith('/game/dice') || path.endsWith('/dice')) {
      return await gachaService.playDice(currentUser, request);
    }

    // POST /api/user/craft
    if (path.endsWith('/craft')) {
      return await gachaService.craft(currentUser, request);
    }

    // POST /api/shop/buy
    if (path.endsWith('/shop/buy') || path.endsWith('/buy')) {
      return await gachaService.shopBuy(currentUser, request);
    }

    return jsonResponse({ error: '未知的游戏操作' }, 404);
  } catch (e) {
    console.error('[game] Error:', e);
    return jsonResponse({ error: e.message || '游戏服务错误' }, 500);
  }
}
