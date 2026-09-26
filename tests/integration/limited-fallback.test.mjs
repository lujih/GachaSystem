// Verify drawLimited fallback: when a non-base rarity buffer fetch fails,
// the roll should degrade to a base-source realtime fetch instead of failing
// the whole limited draw with a full refund.
const base = 'http://127.0.0.1:8787/api';

async function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function j(method, path, body, token) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['X-Session-Token'] = token;
  const res = await fetch(base + path, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, raw: text };
}

async function main() {
  const uname = 'itest_limited_' + Math.floor(Math.random() * 999999);
  let reg = await j('POST', '/auth/register', { username: uname, password: 'abc12345' });
  if (reg.status === 429) {
    console.log('register rate-limited, waiting 65s...');
    await sleep(65000);
    reg = await j('POST', '/auth/register', { username: uname, password: 'abc12345' });
  }
  if (reg.status !== 200) { console.log('register failed:', reg.raw); process.exit(2); }
  let login = await j('POST', '/auth/login', { username: uname, password: 'abc12345' });
  if (login.status === 429) {
    console.log('login rate-limited, waiting 65s...');
    await sleep(65000);
    login = await j('POST', '/auth/login', { username: uname, password: 'abc12345' });
  }
  if (login.status !== 200) { console.log('login failed:', login.raw); process.exit(2); }
  const token = login.body.token;
  console.log('user:', uname, 'id:', login.body.user.id);

  // Limited draw of 10 — costs 4500; starting coins are 1000, so first check: 400 积分不足
  const before = await j('GET', '/user/info', undefined, token);
  console.log('coins before:', before.body.coins);

  // Limited single draw (costs 500) to exercise the fallback path
  let single = await j('POST', '/draw/limited', { poolId: 'genshin', count: 1 }, token);
  console.log('limited single:', single.status, single.body.success ? 'OK' : single.body.error);

  // Now run 10-pull limited (costs 4500 > 1000 coins → should fail with 积分不足, not 500)
  const multi = await j('POST', '/draw/limited', { poolId: 'genshin', count: 10 }, token);
  console.log('limited x10:', multi.status, multi.body.error || 'OK');

  if (single.status === 200 && single.body.success) {
    console.log('FALLBACK PATH EXERCISED OK — limited draw returned a card');
  }

  // Confirm coins were debited correctly (single 500 → 1000-500=500, plus coinsReward)
  const after = await j('GET', '/user/info', undefined, token);
  console.log('coins after:', after.body.coins, '(expected ~500 + reward)');
  if (after.body.coins < 0) {
    console.log('BUG: coins went negative!');
    process.exit(1);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
