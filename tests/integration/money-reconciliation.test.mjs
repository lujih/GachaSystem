// 抽卡资金对账（回归测试）
//
// 逐笔核对 余额变化 vs 期望值，覆盖三条资损路径：
//  1. 成功抽卡：净变化 = CARD_VALUE[rarity] - DRAW_COST
//  2. 取图失败：净变化必须为 0（deductCoins 后必须 refundCoins，否则资金黑洞）
//  3. 全程累计必须与逐笔期望一致
//
// 数值须与 src/config/business.js 保持一致，改动配置后请同步。
// ⚠️ 受 register/login 限流（5 次/10 分钟/IP）约束，每轮只注册 1 个用户。
//
// 用法：node tests/integration/money-reconciliation.test.mjs
const BASE = 'http://127.0.0.1:8787/api';
const CARD_VALUE = { N: 7, R: 20, SR: 65, SSR: 262, UR: 1309 };
const DRAW_COST = 100;
const ROUNDS = 10;

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
  const uname = 'recon_' + Math.floor(Math.random() * 1e9);
  const reg = await j('POST', '/auth/register', { username: uname, password: 'Passw0rd!x', nickname: uname });
  if (!reg.body?.success) throw new Error('注册失败（可能触发限流，等待 10 分钟）: ' + JSON.stringify(reg.body));

  const login = await j('POST', '/auth/login', { username: uname, password: 'Passw0rd!x' });
  const token = login.body?.token;
  if (!token) throw new Error('登录失败: ' + JSON.stringify(login.body));

  let expected = (await j('GET', '/user/info', undefined, token)).body.coins;
  const start = expected;
  let okCount = 0, failCount = 0, refundGap = 0;
  const mismatches = [];

  console.log(`起始余额 ${start}\n`);
  console.log('#  结果               稀有度   期望余额   实际余额   判定');
  for (let i = 1; i <= ROUNDS; i++) {
    const d = await j('GET', '/draw', undefined, token);
    const actual = (await j('GET', '/user/info', undefined, token)).body.coins;

    if (d.status === 200 && d.body?.success) {
      const r = d.body.card?.rarity;
      expected -= DRAW_COST - (CARD_VALUE[r] ?? CARD_VALUE.N);
      okCount++;
      const pass = actual === expected;
      if (!pass) mismatches.push(`第${i}次成功抽卡 余额不符: 期望 ${expected} 实际 ${actual}`);
      console.log(`${String(i).padEnd(2)} 成功               ${String(r).padEnd(8)} ${String(expected).padEnd(10)} ${String(actual).padEnd(10)} ${pass ? 'OK' : 'MISMATCH'}`);
    } else {
      failCount++;
      const gap = expected - actual;
      if (gap > 0) { refundGap += gap; mismatches.push(`第${i}次取图失败未全额退款，缺口 ${gap}`); }
      console.log(`${String(i).padEnd(2)} 失败(应退款)       ${'-'.padEnd(8)} ${String(expected).padEnd(10)} ${String(actual).padEnd(10)} ${gap > 0 ? `退款缺失 ${gap} ← 资损` : '退款OK'}`);
    }
  }

  console.log(`\n成功 ${okCount} / 失败 ${failCount}；累计退款缺口 = ${refundGap} 金币`);
  if (mismatches.length) {
    console.error('\n✗ 资金对账失败:');
    mismatches.forEach(m => console.error('  - ' + m));
    process.exit(1);
  }
  console.log('✓ 每笔账目精确匹配，失败抽卡全额退款，无资金黑洞');
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
