const PUBLIC_PATHS = new Set([
  '/api/announcement',
  '/api/changelog',
  '/api/showcase',
  '/api/library/items',
  '/api/library/like-counts',
]);

function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

function injectNonceIntoHtml(html, nonce) {
  // 为所有 <script> 标签注入 nonce（跳过已有 nonce 的标签）
  return html.replace(/<script\b(?!(?:[^>]*\bnonce\s*=))/gi, `<script nonce="${nonce}"`);
}

function buildCspWithNonce(nonce) {
  return `default-src 'self'; img-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'; connect-src 'self' https:; frame-src 'none'; object-src 'none'`;
}

function applySecurityHeaders(headers, nonce) {
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', buildCspWithNonce(nonce));
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Session-Token, X-Admin-Mode',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Skip session lookup for public API paths — resolve session for all other requests
  const pathname = url.pathname;
  const isPublicApi = PUBLIC_PATHS.has(pathname);

  if (!isPublicApi) {
    const token = request.headers.get('X-Session-Token');
    if (token) {
      try {
        const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
        context.data = { ...context.data, currentUser: sessionData, _sessionToken: token };
      } catch (e) {
        // Token expired or invalid — continue without user
      }
    }
  }

  const response = await context.next();
  const nonce = generateNonce();

  // 对 HTML 响应注入 script nonce 并重写 CSP
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const text = await response.text();
    const modified = injectNonceIntoHtml(text, nonce);
    const newResponse = new Response(modified, response);
    applySecurityHeaders(newResponse.headers, nonce);
    return newResponse;
  }

  applySecurityHeaders(response.headers, nonce);
  return response;
}
