/**
 * Global middleware for all Pages Functions.
 * Parses session token, handles CORS, attaches currentUser to context.data.
 */

export async function onRequest(context) {
  const { request, env } = context;

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

  // Parse session token
  const token = request.headers.get('X-Session-Token');
  if (token) {
    try {
      const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
      context.data = { ...context.data, currentUser: sessionData };
    } catch (e) {
      // Token expired or invalid — continue without user
    }
  }

  return context.next();
}
