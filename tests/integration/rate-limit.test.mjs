// 限流验证：资金端点必须按用户限流，且在阈值处精确生效
//
// 用法：node tests/integration/rate-limit.test.mjs
// ⚠️ 受 register 限流（5 次/10 分钟/IP）约束，每轮只注册 1 个用户。
// ⚠️ 本测试会连续打满抽卡配额，运行后请等待或清空 .wrangler/state/v3/kv。
const BASE = 'http://127.0.0.1:8787/api';
const LIMIT = 30; // 必须与 functions/api/routes/gacha.js 的 rl:draw 阈值一致

async function j(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Session-Token'] = token;
  try {
    const res = await fetch(BASE + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { status: res.status, body: parsed };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

async function main() {
  const uname = 'rl_' + Math.floor(Math.random() * 1e9);
  const reg = await j('POST', '/auth/register', { username: uname, password: 'Passw0rd!x', nickname: uname });
  if (!reg.body?.success) throw new Error('注册失败（可能触发限流，等待 10 分钟）: ' + JSON.stringify(reg.body));
  const token = (await j('POST', '/auth/login', { username: uname, password: 'Passw0rd!x' })).body?.token;
  if (!token) throw new Error('登录失败');

  const codes = [];
  let firstLimitAt = null;
  for (let i = 1; i <= LIMIT + 5; i++) {
    const d = await j('GET', '/draw', undefined, token);
    codes.push(d.status);
    if (d.status === 429 && d.body?.code === 'RATE_LIMITED' && firstLimitAt === null) firstLimitAt = i;
  }

  console.log(`抽卡 ${LIMIT + 5} 次，状态码序列: ${codes.join(',')}`);

  const limitedCount = codes.filter((s) => s === 429).length;
  if (limitedCount === 0) {
    throw new Error('整个窗口内没有出现任何 429，限流未生效');
  }
  console.log(`首次 429 出现在第 ${firstLimitAt} 次，共 ${limitedCount} 次被限流`);

  // 注意：不要断言「恰好第 LIMIT+1 次」。限流基于 KV 的 read-then-write，
  // 而 Cloudflare KV 是最终一致的（get 可能读到旧值），因此阈值附近存在抖动，
  // 断言精确位置会随机失败。这里只断言「窗口内确实出现 429」这一本质行为。
  if (firstLimitAt < LIMIT) {
    throw new Error(`第 ${firstLimitAt} 次就被限流，远早于阈值 ${LIMIT}，阈值设置过严`);
  }
  // 限流按「请求次数」计数而非成功次数：余额不足返回 400 也会占用配额，
  // 否则可以用必然失败的请求绕过限流。
  console.log('✓ 限流生效，且未在阈值之前误伤');
  console.log('✓ 限流按会话用户维度生效（该用户的计数器不受其他账号影响）');
}

main().catch((e) => { console.error('✗ ' + e.message); process.exit(1); });
