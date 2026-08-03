/** 必须登录 */
export async function requireAuth(c, next) {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: '请先登录' }, 401);
  await next();
}

/**
 * 管理员鉴权：读 body.password 与 env.admin 比对。
 * 注意：消费 request body，后续 handler 必须用 c.req.raw.clone().json() 读取。
 */
export async function requireAdmin(c, next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  if (c.env.KV_CACHE) {
    const rlKey = `rl:admin:${ip}`;
    const rl = await c.env.KV_CACHE.get(rlKey);
    if (rl && parseInt(rl) >= 10) return c.json({ success: false, error: '操作过于频繁，请稍后重试' }, 429);
    await c.env.KV_CACHE.put(rlKey, String((parseInt(rl) || 0) + 1), { expirationTtl: 600 });
  }

  const body = await c.req.raw.clone().json().catch(() => null);
  if (!body || !body.password || body.password !== c.env.admin) {
    return c.json({ success: false, error: '认证失败' }, 403);
  }
  await next();
}
