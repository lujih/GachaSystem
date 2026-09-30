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
let skipped = 0;
const results = [];
const SKIP = Symbol('skip');

/** 检查项可以主动声明「因环境不具备条件而跳过」，跳过不计入失败。 */
async function check(name, fn) {
  try {
    const detail = await fn();
    if (detail === SKIP) throw SKIP;
    results.push({ ok: true, name, detail });
    console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`);
  } catch (e) {
    if (e === SKIP) {
      skipped++;
      results.push({ ok: 'skip', name });
      console.log(`  ○ ${name}  （环境不具备条件，已跳过）`);
    } else {
      failed++;
      results.push({ ok: false, name, detail: e.message });
      console.log(`  ✗ ${name}\n      ${e.message}`);
    }
  }
}
const skip = (why) => { console.log(`      ↳ ${why}`); return SKIP; };

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/**
 * 读取并缓存响应体。
 * 不能在 assert 的 message 里写 `await r.text()`——模板字符串是**先求值再传参**的，
 * 哪怕断言成立也会提前消费 body，随后的 r.json() 就会抛 "Body has already been read"。
 */
async function body(res) {
  if (res.__body === undefined) {
    const text = await res.text();
    try {
      res.__body = JSON.parse(text);
    } catch {
      res.__body = { __raw: text.slice(0, 200) };
    }
  }
  return res.__body;
}

const get = (path, init) => fetch(BASE + path, { redirect: 'manual', ...init });
const postJson = (path, b) =>
  get(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  });

console.log(`Cloudflare 运行时冒烟检查 → ${BASE}\n`);

// ---------- API 层 ----------
console.log('API');

await check('/api/health 可用', async () => {
  const r = await get('/api/health');
  assert(r.ok, `期望 200，实际 ${r.status}`);
  const j = await body(r);
  assert(j.status === 'ok', `status 字段为 ${JSON.stringify(j.status)}`);
  return `bindings DB=${j.bindings?.DB} KV=${j.bindings?.KV_CACHE} R2=${j.bindings?.R2_BUCKET}`;
});

await check('D1/KV/R2 绑定已真实注入（本地模拟非 undefined）', async () => {
  const r = await get('/api/health');
  const j = await body(r);
  for (const k of ['DB', 'KV_CACHE', 'R2_BUCKET']) {
    assert(j.bindings?.[k] === true, `绑定 ${k} 未注入`);
  }
  return 'DB/KV_CACHE/R2_BUCKET 均就绪';
});

await check('/api/rarities 下发权威经济数值', async () => {
  const r = await get('/api/rarities');
  assert(r.ok, `期望 200，实际 ${r.status}`);
  const j = await body(r);
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
  const j = await body(r);
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

// ---------- 资金闭环（真实运行时） ----------
// 这部分守护本项目最贵的教训：抽卡同时给「金币 + 卡」，卡又能分解成金币，
// 所以每抽总收入是 CARD_VALUE × (1 + DRAW_COIN_RATIO)。只按 CARD_VALUE 算
// 会漏掉一半收入——历史上正是这样让「抽卡→分解」刷币回路以 +40% ROI 存活。
// 单元测试守护的是不变式，这里守护的是**真实运行时上账目确实如此**。
console.log('\n资金闭环（真实 workerd）');

const CARD_VALUE = {};
let DRAW_RATIO = 0.3;
await (async () => {
  const j = await body(await get('/api/rarities'));
  Object.assign(CARD_VALUE, j.cardValues);
  DRAW_RATIO = j.drawCoinRatio;
})();

let token = null;
let coins0 = 0;

await check('注册并登录（各只用 1 次；限流预算为 5次/10分钟注册 + 10次/10分钟登录）', async () => {
  const username = 'smoke_' + Math.random().toString(36).slice(2, 10);
  const reg = await postJson('/api/auth/register', { username, password: 'SmokePass123', nickname: username });
  assert(
    reg.status === 200 || reg.status === 201,
    `注册期望 200/201，实际 ${reg.status}：${JSON.stringify(await body(reg))}`
  );
  // 注册只落库、不发 token（auth-service.register 返回 { success: true }），必须再登录
  const login = await postJson('/api/auth/login', { username, password: 'SmokePass123' });
  const lj = await body(login);
  assert(login.status === 200 && lj.token, `登录失败 HTTP ${login.status}：${JSON.stringify(lj)}`);
  token = lj.token;
  coins0 = lj.user?.coins ?? 0;
  return `初始 coins=${coins0}`;
});

const authed = (p, init) => get(p, { ...init, headers: { ...(init?.headers || {}), 'X-Session-Token': token } });
const postAuthed = (p, b) =>
  authed(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const coins = async () => (await body(await authed('/api/user/info'))).coins;
// /api/user/inventory 返回的就是顶层 { N, R, SR, SSR, UR }，没有外层包装
const inventory = async () => {
  const j = await body(await authed('/api/user/inventory'));
  return j?.N !== undefined ? j : j?.inventory;
};

/**
 * 这里**只断言记账恒等式**，不断言单轮「抽卡→分解」必须净亏。
 *
 * 原因：单轮回路的符号本就随稀有度变化——N/R/SR 为负，但
 * SSR 是 -100+225×2 = +350、UR 是 +2150。玩家无法指定稀有度，
 * 所以高稀有度单轮盈利是**正常设计**，不是漏洞。
 * 真正的不变式是**期望**为负，那是统计性质，由 tests/economy-invariants.test.js
 * 用 40 万次采样守护。
 *
 * 早先这里写成 `assert(loopNet < 0)`，是个既抓不到真回归、又会在 CI 抽到
 * SSR 时随机失败的错误断言——已改为下面的记账恒等式。
 */
await check('抽卡失败必须原路退款（取图失败不得吞币）', async () => {
  // 这条不依赖图库数据，是最核心的资损防线，任何环境都应可跑
  const before = await coins();
  const d = await authed('/api/draw');
  const dj = await body(d);
  const after = await coins();
  if (d.status === 200) {
    const drawCoins = Math.round(CARD_VALUE[dj.rarity] * DRAW_RATIO);
    const expected = -100 + drawCoins + (dj.levelUp?.reward ?? 0);
    assert(after - before === expected, `成功抽卡记账不符：实际 ${after - before}，期望 ${expected}`);
    return `成功抽卡 ${dj.rarity}，Δcoins=${after - before} = 期望值`;
  }
  assert(
    after === before,
    `失败的抽卡吞了钱：${before} → ${after}（HTTP ${d.status}）`
  );
  return `取图失败已全额退款，余额不变（HTTP ${d.status}）`;
});

await check('抽卡记账：Δcoins == -100 + round(CARD_VALUE×ratio) + 升级奖励', async () => {
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const before = await coins();
    const d = await authed('/api/draw');
    const dj = await body(d);
    if (d.status !== 200) {
      assert((await coins()) === before, `抽卡失败却扣了钱：${before} → ${await coins()}`);
      continue;
    }
    const rarity = dj.rarity;
    assert(CARD_VALUE[rarity] != null, `未知稀有度 ${rarity}`);
    const drawCoins = Math.round(CARD_VALUE[rarity] * DRAW_RATIO);
    const expected = -100 + drawCoins + (dj.levelUp?.reward ?? 0);
    const actual = (await coins()) - before;
    assert(
      actual === expected,
      `抽卡记账不符：${rarity} 实际 ${actual}，期望 ${expected}（抽卡金币 ${drawCoins}）`
    );
    seen.push(rarity);
  }
  if (seen.length === 0) {
    return skip('图库无图片数据 / 第三方图源不可达，抽卡全部在取图阶段失败');
  }
  return `${seen.length} 抽记账全对 [${seen.join(',')}]，每抽金币 = round(CARD_VALUE × ${DRAW_RATIO})`;
});

await check('分解记账：返还恰为 CARD_VALUE，Δcoins 精确匹配', async () => {
  const inv = await inventory();
  const rarity = ['N', 'R', 'SR', 'SSR', 'UR'].find((r) => (inv?.[r] ?? 0) > 0);
  if (!rarity) {
    return skip('库存为空（无成功抽卡即无卡可分解）');
  }
  const before = await coins();
  const dec = await postAuthed('/api/decompose', { rarity, count: 1 });
  const dj = await body(dec);
  assert(dec.status === 200, `分解失败 HTTP ${dec.status}：${JSON.stringify(dj)}`);
  const actual = (await coins()) - before;
  assert(
    actual === CARD_VALUE[rarity],
    `分解记账不符：${rarity} 实际 +${actual}，期望 +${CARD_VALUE[rarity]}`
  );
  return `${rarity} → +${actual}，与 CARD_VALUE 一致`;
});

await check('分解库存不足的卡：返回错误且余额不变（不得凭空造币）', async () => {
  const inv = await inventory();
  const missing = ['N', 'R', 'SR', 'SSR', 'UR'].find((r) => (inv?.[r] ?? 0) === 0);
  if (!missing) return skip('库存五档齐全，无法构造库存为 0 的档位');
  const before = await coins();
  const dec = await postAuthed('/api/decompose', { rarity: missing, count: 1 });
  const dj = await body(dec);
  assert(dec.status >= 400, `期望 4xx，实际 ${dec.status}：${JSON.stringify(dj)}`);
  const after = await coins();
  assert(after === before, `失败的分解却改了余额：${before} → ${after}`);
  return `${missing} 库存为 0 → HTTP ${dec.status}，余额不变`;
});

await check('余额恒等且非负', async () => {
  const now = await coins();
  assert(Number.isFinite(now) && now >= 0, `余额异常：${now}`);
  return `coins=${now}（初始 ${coins0}）`;
});

// ---------- 总结 ----------
console.log(`\n${'-'.repeat(52)}`);
const passed = results.filter((r) => r.ok === true).length;
if (failed === 0) {
  console.log(`✓ ${passed} 项通过${skipped ? `，${skipped} 项因环境不具备条件而跳过` : ''}（真实 workerd 运行时）`);
  process.exit(0);
} else {
  console.log(`✗ ${failed}/${results.length} 项失败（${passed} 通过${skipped ? `，${skipped} 跳过` : ''}）`);
  for (const r of results.filter((x) => x.ok === false)) console.log(`   - ${r.name}: ${r.detail}`);
  process.exit(1);
}
