/**
 * 安全中间件回归测试：CSP nonce 注入方式 与 管理员鉴权
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { requireAdmin, requireAuth } from '../functions/api/middleware/auth.js';
import { onRequest } from '../functions/_middleware.js';

function makeKv() {
  const store = new Map();
  return {
    store,
    get: async (k) => store.get(k) ?? null,
    put: async (k, v) => { store.set(k, v); },
    delete: async (k) => { store.delete(k); },
  };
}

/** 构造一个最小可用的 Hono Context */
function makeCtx({ body = null, env = {}, headers = {} } = {}) {
  const KV_CACHE = makeKv();
  const captured = {};
  const c = {
    env: { KV_CACHE, ...env },
    // json() 的返回值就是路由/中间件实际 return 的东西，测试直接读它
    response: undefined,
    req: {
      header: (k) => headers[k] ?? headers[k.toLowerCase()] ?? null,
      raw: new Request('https://x.test/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === null ? '{}' : JSON.stringify(body),
      }),
    },
    get: (k) => captured[k],
    set: (k, v) => { captured[k] = v; },
    json: (b, s) => { c.response = { body: b, status: s }; return c.response; },
  };
  return { c, KV_CACHE, captured };
}

describe('requireAdmin', () => {
  it('正确口令放行并写入 adminBody', async () => {
    const { c, captured } = makeCtx({ body: { password: 's3cret', page: 1 }, env: { admin: 's3cret' } });
    let called = false;
    await requireAdmin(c, async () => { called = true; });
    expect(called).toBe(true);
    expect(captured.adminBody.page).toBe(1);
  });

  it('错误口令拒绝 403 且不进入 handler', async () => {
    const { c } = makeCtx({ body: { password: 'wrong' }, env: { admin: 's3cret' } });
    let called = false;
    await requireAdmin(c, async () => { called = true; });
    expect(called).toBe(false);
    expect(c.response.status).toBe(403);
  });

  it('env.admin 未配置时 fail-closed（拒绝而非放行）', async () => {
    const { c } = makeCtx({ body: { password: 'anything' }, env: {} });
    let called = false;
    await requireAdmin(c, async () => { called = true; });
    expect(called).toBe(false);
    expect(c.response.status).toBe(403);
  });

  it('成功请求不计入限流（管理员不会把自己锁住）', async () => {
    const { c, KV_CACHE } = makeCtx({ body: { password: 's3cret' }, env: { admin: 's3cret' } });
    for (let i = 0; i < 25; i++) {
      await requireAdmin(c, async () => {});
    }
    // 此前成功请求也计数，第 11 次就会被 429 锁住
    expect(KV_CACHE.store.size).toBe(0);
  });

  it('连续 10 次失败后才开始限流', async () => {
    const { c, KV_CACHE } = makeCtx({ body: { password: 'wrong' }, env: { admin: 's3cret' } });
    for (let i = 1; i <= 10; i++) {
      await requireAdmin(c, async () => {});
      expect(c.response?.status).toBe(403);
    }
    expect(KV_CACHE.store.get('rl:admin:unknown')).toBe('10');
    // 第 11 次
    const next = makeCtx({ body: { password: 'wrong' }, env: { admin: 's3cret' } });
    next.KV_CACHE.store.set('rl:admin:unknown', '10');
    await requireAdmin(next.c, async () => {});
    expect(next.c.response.status).toBe(429);
    expect(next.c.response.body.code).toBe('RATE_LIMITED');
  });

  it('口令长度不同也不会被提前短路（常量时间语义）', async () => {
    const { c } = makeCtx({ body: { password: 'a' }, env: { admin: 'muchlongerpassword' } });
    await requireAdmin(c, async () => {});
    expect(c.response.status).toBe(403);
  });
});

describe('requireAuth', () => {
  let ctx;
  beforeEach(() => {
    const made = makeCtx();
    made.c.get = (k) => (k === 'user' ? made.captured.user : undefined);
    ctx = made;
  });

  it('有 user 放行', async () => {
    ctx.captured.user = { id: 1 };
    let called = false;
    await requireAuth(ctx.c, async () => { called = true; });
    expect(called).toBe(true);
  });

  it('无 user 返回 401', async () => {
    let called = false;
    await requireAuth(ctx.c, async () => { called = true; });
    expect(called).toBe(false);
    expect(ctx.c.response.status).toBe(401);
  });
});

describe('_middleware CSP nonce', () => {
  const htmlResponse = (body) =>
    new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  const run = (next, method = 'GET') => {
    const context = { request: { method }, data: {}, next };
    return onRequest(context).then((res) => ({ context, res }));
  };

  it('把 nonce 放进 context.data，供 root loader 渲染到 <Scripts>', async () => {
    const { context } = await run(async () => htmlResponse('<html><body>hi</body></html>'));
    expect(typeof context.data.nonce).toBe('string');
    expect(context.data.nonce.length).toBeGreaterThanOrEqual(16);
  });

  it('响应头中的 nonce 与 context.data.nonce 完全一致', async () => {
    const { context, res } = await run(async () => htmlResponse('<html></html>'));
    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toContain(`'nonce-${context.data.nonce}'`);
    expect(csp).toContain("'strict-dynamic'");
  });

  it('script-src 不含 unsafe-inline（存在 nonce 时按 CSP 规范本就被忽略，留着只会误导）', async () => {
    const { res } = await run(async () => htmlResponse('<html></html>'));
    const scriptSrc = res.headers
      .get('Content-Security-Policy')
      .split(';')
      .find((d) => d.trim().startsWith('script-src'));
    expect(scriptSrc).not.toContain('unsafe-inline');
  });

  it('每次请求生成不同的 nonce', async () => {
    const a = (await run(async () => htmlResponse('<html></html>'))).context;
    const b = (await run(async () => htmlResponse('<html></html>'))).context;
    expect(a.data.nonce).not.toBe(b.data.nonce);
  });

  it('关键回归：不再改写 HTML，响应体与 context.next() 输出一致', async () => {
    // 旧实现用正则给所有 <script> 补 nonce（OWASP 点名的反模式）：
    // 攻击者一旦能把内容注入 SSR 输出，他注入的 <script> 同样会被自动补上
    // 合法 nonce，等于给 XSS 开正门。旧实现还必须把流读成字符串再重建 Response。
    const original = '<html><body><script>evil()</script></body></html>';
    const { res } = await run(async () => htmlResponse(original));
    expect(await res.text()).toBe(original);
  });

  it('安全头仍然齐备', async () => {
    const { res } = await run(async () => htmlResponse('<html></html>'));
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('same-origin');
  });

  it('OPTIONS 预检直接放行', async () => {
    let called = false;
    await onRequest({ request: { method: 'OPTIONS' }, data: {}, next: async () => { called = true; return new Response(null, { status: 204 }); } });
    expect(called).toBe(true);
  });
});
