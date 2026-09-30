/**
 * 全局中间件：为所有响应加安全头，并为 HTML 渲染提供 CSP nonce。
 *
 * ⚠️ 不要用正则给 <script> 补 nonce。
 * 早期实现是 `html.replace(/<script\b.../gi, '<script nonce="..."')`，
 * 这是 OWASP 明确点名的反模式：一旦攻击者能把内容注入 SSR 输出（存储型 XSS、
 * 用户昵称/公告等未转义字段），他注入的 <script> 同样会被自动"补上"合法 nonce，
 * 等于给 XSS 开了正门——而这正是 CSP 唯一要防的场景。
 *
 * 现在改为在渲染层注入：nonce 先于 context.next() 生成，经 context.data 传给
 * Remix root loader，由 <Scripts nonce> / <ScrollRestoration nonce> 渲染到 HTML 里，
 * 每个 <script> 都由我们自己的代码显式带上 nonce。正则补丁已删除。
 */

/** 生成 CSP nonce。用 base64 字母表，16 字节 ≈ 95 bit 熵，无取模偏置。 */
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function buildCspWithNonce(nonce) {
  // script-src 里保留 'self'（兼容不支持 strict-dynamic 的浏览器），
  // 'unsafe-inline' 已移除——只要存在 nonce，CSP 规范就会忽略它，留着只会误导。
  return [
    "default-src 'self'",
    "img-src 'self' https: data:",
    "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "connect-src 'self' https:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function applySecurityHeaders(headers, nonce) {
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (nonce) headers.set('Content-Security-Policy', buildCspWithNonce(nonce));
}

export async function onRequest(context) {
  const { request } = context;

  // CORS 预检由 Hono cors() 处理（/api/*）；非 API 路径预检直接放行
  if (request.method === 'OPTIONS') {
    return context.next();
  }

  // nonce 必须在渲染之前生成，HTML 与响应头用的是同一个值
  const nonce = generateNonce();
  context.data = { ...(context.data || {}), nonce };

  const response = await context.next();
  applySecurityHeaders(response.headers, nonce);
  return response;
}
