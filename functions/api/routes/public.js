import { Hono } from 'hono';

const CACHE_1M = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' };
const CACHE_5M = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

export const publicRoutes = new Hono()
  .get('/health', (c) => c.json({
    status: 'ok',
    bindings: {
      DB: !!c.env.DB,
      KV_CACHE: !!c.env.KV_CACHE,
      R2_BUCKET: !!c.env.R2_BUCKET,
    },
  }))
  .get('/showcase', async (c) => {
    try {
      const cards = await c.env.DB.prepare(
        'SELECT g.*, u.username, g.rarity FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
      ).all();
      c.header('Cache-Control', CACHE_1M['Cache-Control']);
      return c.json({ success: true, cards: cards.results || [] });
    } catch (e) {
      c.header('Cache-Control', CACHE_1M['Cache-Control']);
      return c.json({ success: true, cards: [] });
    }
  })
  .get('/announcement', async (c) => {
    const row = await c.env.DB.prepare(
      'SELECT title, content, enabled, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 1'
    ).first();
    c.header('Cache-Control', CACHE_5M['Cache-Control']);
    return c.json({ success: true, announcement: row || null });
  })
  .get('/changelog', async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT date, ver, content, tag FROM changelogs ORDER BY created_at DESC LIMIT 50'
    ).all();
    c.header('Cache-Control', CACHE_5M['Cache-Control']);
    return c.json({ success: true, logs: rows.results || [] });
  });
