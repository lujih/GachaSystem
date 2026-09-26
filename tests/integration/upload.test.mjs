// Upload endpoint integration test (run with: node tests/integration/upload.test.mjs)
const base = 'http://127.0.0.1:8787/api';

async function main() {
  const uname = 'itest_up_' + Math.floor(Math.random() * 999999);
  const regRes = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'abc12345' }),
  });
  console.log('register:', regRes.status, await regRes.text());

  const loginRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'abc12345' }),
  });
  const loginData = await loginRes.json();
  console.log('login:', loginRes.status, JSON.stringify(loginData).slice(0, 200));
  const token = loginData.token;

  // Build a minimal valid PNG (1x1, 67 bytes)
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
    Buffer.from(pngBytes, 'binary').toString('binary'),
    `--${boundary}--`,
  ];
  const body = parts.join(CRLF) + CRLF;
  const uploadRes = await fetch(base + '/user/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'X-Session-Token': token,
    },
    body: Buffer.from(body, 'binary'),
  });
  console.log('upload:', uploadRes.status, await uploadRes.text());

  const listRes = await fetch(base + '/user/uploads', {
    headers: { 'X-Session-Token': token },
  });
  console.log('uploads:', listRes.status, await listRes.text());
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
