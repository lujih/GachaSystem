import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const cards = await env.DB.prepare(`
      SELECT g.*, u.username
      FROM gallery g
      LEFT JOIN users u ON g.user_id = u.id
      ORDER BY g.created_at DESC
      LIMIT 6
    `).all();

    return jsonResponse({ cards: cards.results || [] });
  } catch (e) {
    console.error('[showcase] Error:', e);
    return jsonResponse({ cards: [] });
  }
}
