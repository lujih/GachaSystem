import { Hono } from 'hono';
import { rateLimit } from '../middleware/rate-limit.js';

export const authRoutes = new Hono()
  .post('/register', rateLimit('register', 5, 600), async (c) => {
    const services = c.get('services');
    const result = await services.auth.register(await c.req.json());
    return c.json({ success: true, ...result });
  })
  .post('/login', rateLimit('login', 10, 600), async (c) => {
    const services = c.get('services');
    const result = await services.auth.login(await c.req.json());
    return c.json({ success: true, ...result });
  })
  .post('/logout', async (c) => {
    const services = c.get('services');
    const result = await services.auth.logout(c.req.header('X-Session-Token'));
    return c.json({ success: true, ...result });
  });
