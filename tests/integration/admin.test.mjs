// Admin + upload review integration test
const base = 'http://127.0.0.1:8787/api';
const ADMIN = 'test_password';

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
  // 1) admin/verify
  const r1 = await j('POST', '/admin/verify', { password: ADMIN });
  console.log('admin/verify:', r1.status, JSON.stringify(r1.body));

  // 2) admin/users
  const r2 = await j('POST', '/admin/users', { password: ADMIN, page: 1, limit: 1 });
  const target = r2.body.users?.[0];
  console.log('admin/users:', r2.status, 'first user:', target?.id, target?.username);

  // 3) admin/update-points
  const r3 = await j('POST', '/admin/update-points', { password: ADMIN, targetId: target?.id, amount: 1000 });
  console.log('admin/update-points:', r3.status, JSON.stringify(r3.body));

  // 4) admin/save-announcement
  const r4 = await j('POST', '/admin/save-announcement', {
    password: ADMIN,
    announcement: { title: 'itest-ann', content: 'itest-content', enabled: true },
  });
  console.log('admin/save-announcement:', r4.status, JSON.stringify(r4.body));

  // 5) public/announcement reflects it
  const r5 = await j('GET', '/announcement');
  console.log('public/announcement:', r5.status, JSON.stringify(r5.body).slice(0, 140));

  // 6) admin/save-changelog
  const r6 = await j('POST', '/admin/save-changelog', {
    password: ADMIN,
    logs: [{ date: '2026-08-04', ver: '0.2', content: 'itest final', tag: 'fix' }],
  });
  console.log('admin/save-changelog:', r6.status, JSON.stringify(r6.body));

  // 7) admin/review-upload (list pending, review first if any)
  const up = await j('POST', '/admin/uploads', { password: ADMIN, status: 'pending', page: 1 });
  console.log('admin/uploads:', up.status, 'count:', up.body.uploads?.length, 'total:', up.body.total);
  if (up.body.uploads?.length > 0) {
    const rv = await j('POST', '/admin/review-upload', {
      password: ADMIN,
      uploadId: up.body.uploads[0].id,
      action: 'approved',
      rarity: 'SR',
    });
    console.log('admin/review-upload:', rv.status, JSON.stringify(rv.body));
  } else {
    console.log('admin/review-upload: no pending uploads to review (skipped)');
  }

  // 8) wrong password -> 403
  const r8 = await j('POST', '/admin/verify', { password: 'wrong' });
  console.log('admin/verify (wrong pw):', r8.status, JSON.stringify(r8.body));

  // 9) admin rate-limit kicks in when 10/10min/IP is hit
  let last = 200;
  for (let i = 0; i < 14; i++) {
    const r = await j('POST', '/admin/verify', { password: ADMIN });
    last = r.status;
    if (last === 429) break;
  }
  console.log('admin rate-limit: last of 14 verify =', last, '(expect 429 once limit hit)');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
