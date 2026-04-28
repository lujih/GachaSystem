import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  let query = 'SELECT id, url, user_id, username, created_at FROM gallery';
  let countQuery = 'SELECT COUNT(*) as total FROM gallery';
  const params = [];
  const countParams = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    countQuery += ' WHERE rarity = ?';
    params.push(rarity.toUpperCase());
    countParams.push(rarity.toUpperCase());
  }

  try {
    const [itemsResult, countResult] = await Promise.all([
      env.DB.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
      env.DB.prepare(countQuery).bind(...countParams).first(),
    ]);

    return jsonResponse({
      items: itemsResult.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  } catch (e) {
    console.error('[library] Error:', e);
    return jsonResponse({ error: '获取图库失败' }, 500);
  }
}
