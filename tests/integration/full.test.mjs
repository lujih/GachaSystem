// Full API route coverage test against local wrangler dev
const base = 'http://127.0.0.1:8787/api';
const results = [];

function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
}

async function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function j(method, path, body, token, contentType = 'application/json') {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = contentType;
  if (token) headers['X-Session-Token'] = token;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed, raw: text };
}

// Retry wrapper for auth endpoints that hit the 5/10min register + 10/10min login rate limit
async function jWithRetry(method, path, body, token) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await j(method, path, body, token);
    if (r.status !== 429) return r;
    console.log(`  [retry ${attempt + 1}] 429 on ${method} ${path} — waiting 65s`);
    await sleep(65000);
  }
  return j(method, path, body, token);
}

async function main() {
  // --- public ---
  let r = await j('GET', '/health');
  check('GET /health 200', r.status === 200 && r.body.status === 'ok', JSON.stringify(r.body));
  r = await j('GET', '/showcase');
  check('GET /showcase 200', r.status === 200 && r.body.success === true, 'cards=' + r.body.cards?.length);
  r = await j('GET', '/announcement');
  check('GET /announcement 200', r.status === 200 && r.body.success === true, JSON.stringify(r.body).slice(0, 120));
  r = await j('GET', '/changelog');
  check('GET /changelog 200', r.status === 200 && Array.isArray(r.body.logs));

  // --- auth ---
  const uname = 'itest_full_' + Math.floor(Math.random() * 999999);
  r = await jWithRetry('POST', '/auth/register', { username: uname, password: 'abc12345', nickname: 'full' });
  check('POST /auth/register 200', r.status === 200 && r.body.success === true, r.raw);
  r = await jWithRetry('POST', '/auth/login', { username: uname, password: 'abc12345' });
  check('POST /auth/login 200', r.status === 200 && r.body.token && r.body.user, 'user id=' + r.body.user?.id);
  const token = r.body.token;

  // bad login -> 401
  r = await j('POST', '/auth/login', { username: uname, password: 'wrong' });
  check('bad login -> 401', r.status === 401, JSON.stringify(r.body));

  // --- user ---
  r = await j('GET', '/user/info', undefined, token);
  check('GET /user/info 200', r.status === 200 && r.body.success === true && r.body.coins != null, 'coins=' + r.body.coins);
  r = await j('GET', '/user/profile-data', undefined, token);
  check('GET /user/profile-data 200', r.status === 200 && r.body.inventory && Array.isArray(r.body.titles), r.raw.slice(0, 160));
  r = await j('GET', '/user/inventory', undefined, token);
  check('GET /user/inventory 200', r.status === 200 && r.body.success === true, r.raw);
  r = await j('POST', '/user/update-profile', { nickname: 'full2' }, token);
  check('POST /user/update-profile 200', r.status === 200, r.raw);
  r = await j('GET', '/user/titles', undefined, token);
  check('GET /user/titles 200', r.status === 200 && Array.isArray(r.body.titles), r.raw);
  r = await j('POST', '/user/equip-title', {}, token);
  check('POST /user/equip-title {} 200', r.status === 200, r.raw);
  r = await j('POST', '/user/check-in', undefined, token);
  const ciOk = r.status === 200 || r.status === 400;
  check('POST /user/check-in (200 or 400)', ciOk, `status=${r.status} ${r.raw}`);

  // --- gacha / draw ---
  r = await j('GET', '/draw', undefined, token);
  check('GET /draw 200', r.status === 200 && r.body.success === true, r.raw.slice(0, 160));
  r = await j('POST', '/draw/multi', { count: 10 }, token);
  check('POST /draw/multi 200', r.status === 200 && r.body.success === true, 'cards=' + r.body.cards?.length);

  // draw-history rarity filter (bug fix: count query must also bind rarity)
  const noFilter = await j('GET', '/draw/draw-history?page=1', undefined, token);
  check('GET /draw/draw-history 200', noFilter.status === 200 && Array.isArray(noFilter.body.history),
    'rows=' + noFilter.body.history?.length + ' total=' + noFilter.body.pagination?.total);
  if (noFilter.body.history?.length > 0) {
    const target = noFilter.body.history[0].rarity.toLowerCase();
    const filtered = await j('GET', `/draw/draw-history?page=1&rarity=${target}`, undefined, token);
    const filterOk = filtered.status === 200
      && filtered.body.success === true
      && filtered.body.pagination
      && filtered.body.pagination.total >= 1;
    check(`GET /draw/draw-history?rarity=${target} 200 + filtered total>=1`, filterOk,
      JSON.stringify({ status: filtered.status, total: filtered.body.pagination?.total, rows: filtered.body.history?.length }));
  }

  r = await j('GET', '/limited/pools', undefined, token);
  check('GET /limited/pools 200', r.status === 200 && Array.isArray(r.body.pools) && r.body.defaultPool, 'pools=' + r.body.pools?.length);

  // --- game ---
  r = await j('POST', '/decompose', { rarity: 'N', count: 1 }, token);
  check('POST /decompose', r.status === 200 || r.status === 400, r.raw.slice(0, 140));
  r = await j('POST', '/game/dice', { betAmount: 10 }, token);
  check('POST /game/dice', r.status === 200 || r.status === 400, r.raw.slice(0, 140));
  r = await j('POST', '/shop/buy', { targetRarity: 'R' }, token);
  check('POST /shop/buy R', r.status === 200 || r.status === 400, r.raw.slice(0, 140));
  r = await j('POST', '/user/craft', { targetRarity: 'SR' }, token);
  check('POST /user/craft SR', r.status === 200 || r.status === 400, r.raw.slice(0, 140));

  // --- library ---
  r = await j('GET', '/library/items?page=1&limit=5', undefined, undefined);
  check('GET /library/items 200', r.status === 200 && Array.isArray(r.body.items), 'items=' + r.body.items?.length);
  const gid = r.body.items?.[0]?.id;
  if (gid) {
    r = await j('POST', '/library/like', { galleryId: gid }, token);
    check('POST /library/like 200', r.status === 200, r.raw);
    r = await j('DELETE', '/library/like', { galleryId: gid }, token);
    check('DELETE /library/like 200', r.status === 200, r.raw);
    r = await j('POST', '/library/bookmark', { galleryId: gid }, token);
    check('POST /library/bookmark 200', r.status === 200, r.raw);
    r = await j('DELETE', '/library/bookmark', { galleryId: gid }, token);
    check('DELETE /library/bookmark 200', r.status === 200, r.raw);
    r = await j('GET', '/library/my-likes', undefined, token);
    check('GET /library/my-likes 200', r.status === 200 && Array.isArray(r.body.likedIds), r.raw);
    r = await j('GET', '/library/my-bookmarks', undefined, token);
    check('GET /library/my-bookmarks 200', r.status === 200 && Array.isArray(r.body.bookmarkedIds), r.raw);
  } else {
    check('library items present', false, 'no gallery items to test likes');
  }
  r = await j('GET', '/library/my-interactions', undefined, token);
  check('GET /library/my-interactions 200', r.status === 200, r.raw);
  r = await j('GET', '/library/like-counts?ids=1,2,3', undefined, undefined);
  check('GET /library/like-counts 200', r.status === 200 && r.body.counts, r.raw);

  // --- auth protection checks ---
  r = await j('GET', '/user/info');
  check('no token -> 401', r.status === 401, r.raw);
  r = await j('GET', '/user/info', undefined, 'bogus-token');
  check('bad token -> 401', r.status === 401, r.raw);
  r = await j('POST', '/auth/logout', undefined, token);
  check('POST /auth/logout 200', r.status === 200, r.raw);
  r = await j('GET', '/user/info', undefined, token);
  check('after logout -> 401', r.status === 401, r.raw);

  // --- unknown endpoint ---
  r = await j('GET', '/api/does-not-exist', undefined, token);
  check('unknown -> 404', r.status === 404, r.raw);

  // --- summary ---
  const pass = results.filter(x => x.ok).length;
  const fail = results.length - pass;
  console.log(`\n===== API coverage: ${pass}/${results.length} passed, ${fail} failed =====`);
  for (const x of results) {
    if (!x.ok) console.log(`  FAIL ${x.name} -> ${x.detail}`);
  }
  if (fail === 0) console.log('ALL PASS');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
