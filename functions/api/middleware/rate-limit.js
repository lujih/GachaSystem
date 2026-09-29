/**
 * 限流：KV 计数，expirationTtl 自动过期
 *
 * 已知取舍：KV 无原子自增，read-then-write 存在 TOCTOU，
 * 并发请求可能小幅突破阈值；对刷量防护而言可接受（见 AGENTS.md 已知限制）。
 */

/** 限流作用域：按用户（资金端点）或按 IP（未登录 / 高成本端点） */
function scopeOf(c, byUser) {
  if (byUser) {
    const user = c.get('user');
    // 未登录时回退到 IP，避免漏掉未鉴权的探测流量
    if (user) return `u${user.id}`;
  }
  return `ip:${c.req.header('CF-Connecting-IP') || 'unknown'}`;
}

function makeLimiter(key, limit, windowSeconds, byUser) {
  return async (c, next) => {
    if (!c.env.KV_CACHE) return next();
    const rlKey = `rl:${key}:${scopeOf(c, byUser)}`;
    const current = parseInt(await c.env.KV_CACHE.get(rlKey)) || 0;
    if (current >= limit) {
      return c.json({ success: false, error: '操作过于频繁，请稍后重试', code: 'RATE_LIMITED' }, 429);
    }
    await c.env.KV_CACHE.put(rlKey, String(current + 1), { expirationTtl: windowSeconds });
    await next();
  };
}

/** 按 IP 限流：注册 / 登录 / 上传等未登录或高成本端点 */
export function rateLimit(key, limit, windowSeconds) {
  return makeLimiter(key, limit, windowSeconds, false);
}

/**
 * 按会话用户限流：抽卡 / 商店 / 分解 / 合成等资金端点。
 * 这些端点都挂在 requireAuth 之后，用用户 id 做作用域比 IP 可靠
 * （NAT 共用出口 IP 时 IP 限流会让正常玩家互相影响，攻击者换 IP 也即可绕过）。
 */
export function rateLimitByUser(key, limit, windowSeconds) {
  return makeLimiter(key, limit, windowSeconds, true);
}
