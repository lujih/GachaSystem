import { UserService } from '../../src/services/user-service.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const currentUser = data?.currentUser;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  const userService = new UserService(env, context.ctx || null);

  try {
    if (path.endsWith('/user/info')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInfo(currentUser);
    }

    if (path.endsWith('/user/inventory')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInventory(currentUser);
    }

    if (path.endsWith('/user/check-in')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.checkIn(currentUser, request);
    }

    if (path.endsWith('/user/titles')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getTitles(currentUser);
    }

    if (path.endsWith('/user/equip-title')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.equipTitle(currentUser, request);
    }

    if (path.endsWith('/user/update-profile')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.updateProfile(currentUser, request);
    }

    if (path.endsWith('/user/claim-reward')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.claimReward(currentUser, request);
    }

    if (path.endsWith('/user/upload')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { GachaService } = await import('../../src/services/gacha-service.js');
      const gachaService = new GachaService(env, context.ctx || null, userService);
      return await gachaService.uploadImage(currentUser, request);
    }

    if (path.endsWith('/user/uploads')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { GachaService } = await import('../../src/services/gacha-service.js');
      const gachaService = new GachaService(env, context.ctx || null, userService);
      return await gachaService.getUserUploads(currentUser, request);
    }

    return jsonResponse({ error: '未知的用户操作' }, 404);
  } catch (e) {
    console.error('[user] Error:', e);
    return jsonResponse({ error: e.message || '用户服务错误' }, 500);
  }
}
