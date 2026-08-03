import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const userRoutes = new Hono()
  .get('/info', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getInfo(c.get('user')) });
  })
  .get('/profile-data', requireAuth, async (c) => {
    const services = c.get('services');
    const user = c.get('user');
    const [inventory, titles] = await Promise.all([
      services.user.getInventory(user),
      services.user.getTitles(user),
    ]);
    return c.json({ success: true, inventory, titles: titles.titles || [] });
  })
  .get('/inventory', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getInventory(c.get('user')) });
  })
  .post('/check-in', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.checkIn(c.get('user')) });
  })
  .get('/titles', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getTitles(c.get('user')) });
  })
  .post('/equip-title', requireAuth, async (c) => {
    const services = c.get('services');
    const { titleId } = await c.req.json();
    return c.json({ success: true, ...await services.user.equipTitle(c.get('user'), titleId) });
  })
  .post('/update-profile', requireAuth, async (c) => {
    const services = c.get('services');
    const { nickname } = await c.req.json();
    return c.json({ success: true, ...await services.user.updateProfile(c.get('user'), nickname) });
  })
  .post('/claim-reward', requireAuth, async (c) => {
    const services = c.get('services');
    const { targetLevel } = await c.req.json();
    return c.json({ success: true, ...await services.user.claimReward(c.get('user'), targetLevel) });
  })
  .post('/upload', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.upload.uploadImage(c.get('user'), c.req.raw) });
  })
  .get('/uploads', requireAuth, async (c) => {
    const services = c.get('services');
    const page = c.req.query('page');
    return c.json({ success: true, ...await services.upload.getUserUploads(c.get('user'), page) });
  });
