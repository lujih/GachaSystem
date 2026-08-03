import { Hono } from 'hono';
import { requireAdmin } from '../middleware/auth.js';

export const adminRoutes = new Hono()
  .post('/verify', requireAdmin, async (c) => c.json({ success: true }))
  .post('/users', requireAdmin, async (c) => {
    const services = c.get('services');
    const { page, limit } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.listUsers(page, limit) });
  })
  .post('/update-points', requireAdmin, async (c) => {
    const services = c.get('services');
    const { targetId, amount } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.updatePoints(targetId, amount) });
  })
  .post('/delete-user', requireAdmin, async (c) => {
    const services = c.get('services');
    const { targetId } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.deleteUser(targetId) });
  })
  .post('/uploads', requireAdmin, async (c) => {
    const services = c.get('services');
    const { status, page, limit } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.listUploads(status, page, limit) });
  })
  .post('/review-upload', requireAdmin, async (c) => {
    const services = c.get('services');
    const { uploadId, action, rarity } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.reviewUpload(uploadId, action, rarity) });
  })
  .post('/save-changelog', requireAdmin, async (c) => {
    const services = c.get('services');
    const { logs } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.saveChangelog(logs) });
  })
  .post('/save-announcement', requireAdmin, async (c) => {
    const services = c.get('services');
    const { announcement } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.saveAnnouncement(announcement) });
  });
