/** 必须登录 */
export async function requireAuth(c, next) {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: '请先登录' }, 401);
  await next();
}

/**
 * 常量时间字符串比较，避免通过响应耗时逐字节爆破口令。
 * 用异或累积差异，不提前返回；长度不同也走完整个循环，
 * 否则「长度」本身会成为侧信道。
 */
function timingSafeEqual(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const max = Math.max(sa.length, sb.length);
  let diff = sa.length ^ sb.length;
  for (let i = 0; i < max; i++) {
    diff |= (sa.charCodeAt(i) || 0) ^ (sb.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * 管理员鉴权：读 body.password 与 env.admin 比对。
 * 注意：消费 request body，已解析的 body 存入 context（c.set('adminBody')），
 * handler 必须用 c.get('adminBody') 读取（body 流已消费，无法二次 clone 读取）。
 */
export async function requireAdmin(c, next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const rlKey = `rl:admin:${ip}`;

  const body = await c.req.raw.clone().json().catch(() => null);
  const provided = body?.password;
  const expected = c.env.admin;

  // env.admin 未配置时一律拒绝（fail-closed），且不进入限流计数
  if (expected && provided && timingSafeEqual(provided, expected)) {
    c.set('adminBody', body);
    await next();
    return;
  }

  // 限流只统计失败尝试。此前成功请求也计数，管理员本人操作 10 次后
  // 会被自己锁住 10 分钟。
  if (c.env.KV_CACHE) {
    const attempts = (parseInt(await c.env.KV_CACHE.get(rlKey)) || 0) + 1;
    if (attempts > 10) {
      return c.json({ success: false, error: '操作过于频繁，请稍后重试', code: 'RATE_LIMITED' }, 429);
    }
    await c.env.KV_CACHE.put(rlKey, String(attempts), { expirationTtl: 600 });
  }

  return c.json({ success: false, error: '认证失败' }, 403);
}
