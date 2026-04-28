import { UserService } from '../../src/services/user-service.js';
import { jsonResponse } from '../../src/utils/response.js';
import { validateAndThrow, validateUsername, validatePassword, validateNickname } from '../../src/utils/validation.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, 405);
  }

  const userService = new UserService(env, context.ctx || null);

  try {
    if (path.endsWith('/auth/register') || path.endsWith('/register')) {
      const body = await request.clone().json();
      validateAndThrow(body, [
        { field: 'username', validator: validateUsername },
        { field: 'password', validator: validatePassword },
        { field: 'nickname', validator: validateNickname },
      ]);
      return await userService.register(request);
    }

    if (path.endsWith('/auth/login') || path.endsWith('/login')) {
      const body = await request.clone().json();
      validateAndThrow(body, [
        { field: 'username', validator: validateUsername },
        { field: 'password', validator: validatePassword },
      ]);
      return await userService.login(request);
    }

    return jsonResponse({ error: '未知的认证操作' }, 404);
  } catch (e) {
    console.error('[auth] Error:', e);
    return jsonResponse({ error: e.message || '认证服务错误' }, 500);
  }
}
