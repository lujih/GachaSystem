/** 统一限流：KV 计数，expirationTtl 自动过期 */
export function rateLimit(key, limit, windowSeconds) {
  return async (c, next) => {
    if (!c.env.KV_CACHE) return next();
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:${key}:${ip}`;
    const rl = await c.env.KV_CACHE.get(rlKey);
    if (rl && parseInt(rl) >= limit) {
      return c.json({ success: false, error: '操作过于频繁，请稍后重试' }, 429);
    }
    await c.env.KV_CACHE.put(rlKey, String((parseInt(rl) || 0) + 1), { expirationTtl: windowSeconds });
    await next();
  };
}
