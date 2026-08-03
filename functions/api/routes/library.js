import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const libraryRoutes = new Hono()
  .get('/items', async (c) => {
    const services = c.get('services');
    const result = await services.gallery.listItems(c.req.query());
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
  .post('/like', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.likeCard(c.get('user').id, galleryId) });
  })
  .delete('/like', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unlikeCard(c.get('user').id, galleryId) });
  })
  .post('/bookmark', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.bookmarkCard(c.get('user').id, galleryId) });
  })
  .delete('/bookmark', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unbookmarkCard(c.get('user').id, galleryId) });
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
