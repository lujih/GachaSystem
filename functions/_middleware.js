/**
 * Global middleware for all Pages Functions.
 * Parses session token, handles CORS, attaches currentUser to context.data.
 */

const PUBLIC_PATHS = new Set([
  '/api/announcement',
  '/api/changelog',
  '/api/showcase',
  '/api/library/items',
  '/api/limited/pools',
]);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Session-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Skip session lookup for public API paths and non-API static asset requests
  const pathname = url.pathname;
  const isPublicApi = PUBLIC_PATHS.has(pathname);
  const isStaticAsset = !pathname.startsWith('/api') && !pathname.startsWith('/auth') && request.method === 'GET';

  if (!isPublicApi && !isStaticAsset) {
    const token = request.headers.get('X-Session-Token');
    if (token) {
      try {
        const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
        context.data = { ...context.data, currentUser: sessionData };
      } catch (e) {
        // Token expired or invalid — continue without user
      }
    }
  }

  return context.next();
}
