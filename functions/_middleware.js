function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

function injectNonceIntoHtml(html, nonce) {
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
  const { request } = context;
  const url = new URL(request.url);

  // CORS 预检由 Hono cors() 处理（/api/*）；非 API 路径预检直接放行
  if (request.method === 'OPTIONS') {
    return context.next();
  }

  const response = await context.next();
  const nonce = generateNonce();

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
