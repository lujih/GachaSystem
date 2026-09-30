/**
 * 在真实 Cloudflare 运行时（workerd / wrangler pages dev）上跑的冒烟检查。
 *
 * 为什么需要它：项目的运行时是 Workers 的 V8 isolate + nodejs_compat polyfill，
 * **不是 Node**。CI 里 `npm test` 全是 Node 下的单元测试，对 Workers 运行时
 * 零证明力——CSP nonce 是否真的出现在 SSR HTML 里、Pages Functions 是否真的
 * 启动、绑定是否真的注入，只有真跑一次 workerd 才知道。
 *
 * 这些正是本项目历史上真实出过问题、且单测抓不到的点。
 *
 * 用法：先 `npm run build && npx wrangler pages dev ./build/client --port 8787`，
 * 再 `node .github/scripts/smoke.mjs`（可用 SMOKE_BASE 覆盖地址）。
 */

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:8787';
const ADMIN = process.env.SMOKE_ADMIN_PASSWORD || '';

let failed = 0;
const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ ok: true, name, detail });
    console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`);
  } catch (e) {
    failed++;
    results.push({ ok: false, name, detail: e.message });
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const get = (path, init) => fetch(BASE + path, { redirect: 'manual', ...init });
const postJson = (path, body) =>
  get(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

console.log(`Cloudflare 运行时冒烟检查 → ${BASE}\n`);

// ---------- API 层 ----------
console.log('API');

await check('/api/health 可用', async () => {
  const r = await get('/api/health');
  assert(r.ok, `期望 200，实际 ${r.status}`);
  const j = await r.json();
  assert(j.status === 'ok', `status 字段为 ${JSON.stringify(j.status)}`);
  return `bindings DB=${j.bindings?.DB} KV=${j.bindings?.KV_CACHE} R2=${j.bindings?.R2_BUCKET}`;
});

await check('D1/KV/R2 绑定已真实注入（本地模拟非 undefined）', async () => {
  const r = await get('/api/health');
  const j = await r.json();
  for (const k of ['DB', 'KV_CACHE', 'R2_BUCKET']) {
    assert(j.bindings?.[k] === true, `绑定 ${k} 未注入`);
  }
  return 'DB/KV_CACHE/R2_BUCKET 均就绪';
});

await check('/api/rarities 下发权威经济数值', async () => {
  const r = await get('/api/rarities');
  assert(r.ok, `期望 200，实际 ${r.status}`);
  const j = await r.json();
  assert(j.success, 'success 不为 true');
  const order = ['N', 'R', 'SR', 'SSR', 'UR'];
  assert(j.cardValues && order.every((k) => typeof j.cardValues[k] === 'number'), 'cardValues 缺失稀有度键');
  for (let i = 1; i < order.length; i++) {
    const a = j.cardValues[order[i - 1]], b = j.cardValues[order[i]];
    assert(b > a, `价值倒挂：${order[i]}=${b} 未大于 ${order[i - 1]}=${a}`);
  }
  const ev = Object.values(j.cardValues).length;
  return `${order.map((k) => `${k}:${j.cardValues[k]}`).join(' ')} ratio=${j.drawCoinRatio} (${ev} 项)`;
});

await check('未鉴权访问资金端点返回 401（不泄露）', async () => {
  const r = await get('/api/draw');
  assert(r.status === 401, `期望 401，实际 ${r.status}`);
  const j = await r.json();
  assert(j.success === false, '未返回 success:false');
  return j.code || j.error;
});

// ---------- 管理员鉴权 ----------
console.log('\n管理员鉴权');

await check('错误口令返回 403', async () => {
  const r = await postJson('/api/admin/users', { password: 'definitely-wrong' });
  assert(r.status === 403, `期望 403，实际 ${r.status}`);
  return 'fail-closed';
});

if (!ADMIN) {
  console.log('\n  (跳过「成功不计入限流」：未提供 SMOKE_ADMIN_PASSWORD)');
} else {
  await check('正确口令连续 12 次均成功（成功请求不计入限流）', async () => {
    let ok = 0;
    for (let i = 0; i < 12; i++) {
      const r = await postJson('/api/admin/users', { password: ADMIN, page: 1 });
      if (r.status === 200) ok++;
      else if (r.status === 429) throw new Error(`第 ${i + 1} 次被限流——成功请求被计入了限流计数`);
    }
    assert(ok === 12, `仅 ${ok}/12 成功`);
    return '12/12，未被自己锁住';
  });
}

// ---------- SSR + CSP ----------
console.log('\nSSR 与 CSP');

for (const path of ['/', '/login', '/library']) {
  await check(`${path} 渲染且所有 <script> 带合法 nonce`, async () => {
    const r = await get(path);
    assert(r.status === 200, `期望 200，实际 ${r.status}`);
    const csp = r.headers.get('content-security-policy');
    assert(csp, '缺少 Content-Security-Policy 头');

    const m = csp.match(/'nonce-([^']+)'/);
    assert(m, 'CSP 中没有 nonce');
    const nonce = m[1];

    const html = await r.text();
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((x) => x[1]);
    assert(scripts.length > 0, '页面没有任何 <script>，无法验证');

    // 关键回归：中间件不得再用正则给所有 script 补 nonce
    // （OWASP 反模式——会让注入的 XSS 也拿到合法 nonce）
    const missing = scripts.filter((attrs) => !attrs.includes(`nonce="${nonce}"`));
    assert(
      missing.length === 0,
      `${missing.length}/${scripts.length} 个 <script> 缺少或不匹配 nonce` +
        (missing.length ? `\n      第一个：<script${missing[0]}>` : '')
    );
    return `${scripts.length} 个 script，nonce 一致`;
  });
}

await check('安全头齐备且 CSP 未放开 unsafe-inline 脚本', async () => {
  const r = await get('/');
  assert(r.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options 非 DENY');
  assert(r.headers.get('x-content-type-options') === 'nosniff', '缺 nosniff');
  const csp = r.headers.get('content-security-policy');
  const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) || '';
  assert(!scriptSrc.includes("'unsafe-inline'"), 'script-src 仍含 unsafe-inline');
  assert(scriptSrc.includes("'strict-dynamic'"), 'script-src 缺 strict-dynamic');
  return 'XFO/nosniff/strict-dynamic';
});

await check('CORS 预检可达（Hono cors 中间件）', async () => {
  const r = await get('/api/health', { method: 'OPTIONS' });
  assert(r.status < 400 || r.status === 204, `期望 2xx/204，实际 ${r.status}`);
  return `HTTP ${r.status}`;
});

// ---------- 总结 ----------
console.log(`\n${'-'.repeat(52)}`);
if (failed === 0) {
  console.log(`✓ 全部 ${results.length} 项冒烟检查通过（真实 workerd 运行时）`);
  process.exit(0);
} else {
  console.log(`✗ ${failed}/${results.length} 项失败`);
  for (const r of results.filter((x) => !x.ok)) console.log(`   - ${r.name}: ${r.detail}`);
  process.exit(1);
}
