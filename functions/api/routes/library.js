import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rate-limit.js';

// 点赞/书签是高频 D1 写入且完全公开可达，阈值放宽到 60/分钟/用户
const writeLimit = rateLimitByUser('libwrite', 60, 60);

export const libraryRoutes = new Hono()
  .get('/items', async (c) => {
    const services = c.get('services');
    // 本端点公开且无鉴权，c.req.query() 不能原样透传给 listItems：
    // listItems 支持 bookmarkedBy，直接透传会让任何人枚举任意用户的完整书签。
    // 用户维度筛选一律走 /my-items（requireAuth，身份只取自会话）。
    const { page, limit, rarity, sort, search, period } = c.req.query();
    const result = await services.gallery.listItems({ page, limit, rarity, sort, search, period });
    if (result.cacheHeaders) {
      for (const [k, v] of Object.entries(result.cacheHeaders)) c.header(k, v);
    }
    delete result.cacheHeaders;
    return c.json({ success: true, ...result });
  })
  .get('/like-counts', async (c) => {
    const services = c.get('services');
    const ids = (c.req.query('ids') || '').split(',').map(Number);
    const result = await services.gallery.getLikeCounts(ids);
    if (result.cacheHeaders) {
      for (const [k, v] of Object.entries(result.cacheHeaders)) c.header(k, v);
    }
    delete result.cacheHeaders;
    return c.json({ success: true, ...result });
  })
  .post('/like', requireAuth, writeLimit, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.likeCard(c.get('user').id, galleryId) });
  })
  .delete('/like', requireAuth, writeLimit, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unlikeCard(c.get('user').id, galleryId) });
  })
  .post('/bookmark', requireAuth, writeLimit, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.bookmarkCard(c.get('user').id, galleryId) });
  })
  .delete('/bookmark', requireAuth, writeLimit, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unbookmarkCard(c.get('user').id, galleryId) });
  })
  .get('/my-items', requireAuth, async (c) => {
    const services = c.get('services');
    const mode = c.req.query('mode') === 'bookmarks' ? 'bookmarks' : 'mine';
    // 身份只取自会话，忽略任何 userId 查询参数（防越权）
    const result = await services.gallery.listMyItems(c.get('user').id, mode, c.req.query());
    for (const [k, v] of Object.entries(result.cacheHeaders)) c.header(k, v);
    delete result.cacheHeaders;
    return c.json({ success: true, ...result });
  })
  .get('/my-interactions', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gallery.getMyInteractions(c.get('user').id) });
  })
  .get('/my-likes', requireAuth, async (c) => {
    const services = c.get('services');
    const r = await services.gallery.getMyInteractions(c.get('user').id);
    return c.json({ success: true, likedIds: r.likedIds });
  })
  .get('/my-bookmarks', requireAuth, async (c) => {
    const services = c.get('services');
    const r = await services.gallery.getMyInteractions(c.get('user').id);
    return c.json({ success: true, bookmarkedIds: r.bookmarkedIds });
  });
