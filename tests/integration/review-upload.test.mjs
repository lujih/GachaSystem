// End-to-end: upload -> admin review (needs a pending upload in the DB)
const base = 'http://127.0.0.1:8787/api';
const ADMIN = 'test_password';

async function j(method, path, body, token) {
  const headers = {};
  if (body !== undefined && typeof body === 'object') headers['Content-Type'] = 'application/json';
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
  // 1) Create a pending upload via a fresh user.
  // 不再在脚本内等待限流恢复：register 限流是 5 次/10 分钟/IP，等待 14×65s
  // 意味着终端会挂起最多 30 分钟。快速失败并给出可操作提示，由 run-all.mjs 统一中止。
  const uname = 'itest_review_' + Math.floor(Math.random() * 999999);
  const reg = await j('POST', '/auth/register', { username: uname, password: 'abc12345' });
  if (reg.status === 429) {
    console.error('注册被限流（5 次/10 分钟/IP）。请等待约 10 分钟后重试，或清空本地 KV：rm -rf .wrangler/state/v3/kv');
    process.exit(2);
  }
  if (reg.status === 409) {
    console.log('user already exists, logging in');
  } else if (reg.status !== 200) {
    console.log('register failed:', reg.raw); process.exit(2);
  }
  const login = await j('POST', '/auth/login', { username: uname, password: 'abc12345' });
  if (login.status === 429) {
    console.error('登录被限流（10 次/10 分钟/IP）。请等待约 10 分钟后重试，或清空本地 KV。');
    process.exit(2);
  }
  if (login.status !== 200) { console.log('login failed:', login.raw); process.exit(2); }
  const token = login.body.token;

  // 2) Upload a small valid PNG
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngBytes = Buffer.from(pngBase64, 'base64');
  const boundary = 'itestboundary';
  const CRLF = '\r\n';
  const parts = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="rarity"',
    '',
    'N',
    `--${boundary}`,
    'Content-Disposition: form-data; name="image"; filename="t.png"',
    'Content-Type: image/png',
    '',
    pngBytes.toString('binary'),
    `--${boundary}--`,
  ];
  const body = parts.join(CRLF);
  const upRes = await fetch(base + '/user/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'X-Session-Token': token,
    },
    body: Buffer.from(body, 'binary'),
  });
  const upData = await upRes.json();
  console.log('upload:', upRes.status, JSON.stringify(upData));
  if (upRes.status !== 200) { console.log('upload failed, aborting'); process.exit(2); }

  // 3) admin list pending uploads
  const up = await j('POST', '/admin/uploads', { password: ADMIN, status: 'pending', page: 1 });
  console.log('admin/uploads:', up.status, 'count:', up.body.uploads?.length, 'total:', up.body.total);
  const target = up.body.uploads?.[0];
  if (!target) { console.log('no pending upload found'); process.exit(2); }

  // 4) admin review as approved with rarity
  const rv = await j('POST', '/admin/review-upload', {
    password: ADMIN,
    uploadId: target.id,
    action: 'approved',
    rarity: 'SR',
  });
  console.log('admin/review-upload:', rv.status, JSON.stringify(rv.body));

  // 5) verify the upload is no longer pending
  const after = await j('POST', '/admin/uploads', { password: ADMIN, status: 'pending', page: 1 });
  const stillThere = (after.body.uploads || []).find(u => u.id === target.id);
  console.log('upload still pending after review:', stillThere ? 'YES (BUG)' : 'NO (OK)');
  const approved = await j('POST', '/admin/uploads', { password: ADMIN, status: 'approved', page: 1 });
  const inApproved = (approved.body.uploads || []).find(u => u.id === target.id);
  console.log('upload in approved list:', inApproved ? 'YES (OK)' : 'NO (BUG)');

  if (!inApproved || stillThere) process.exit(1);
  console.log('ALL PASS');
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
