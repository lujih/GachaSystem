import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const gachaRoutes = new Hono()
  .get('/draw', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.draw(c.get('user')) });
  })
  .post('/draw/multi', requireAuth, async (c) => {
    const services = c.get('services');
    const { count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.multiDraw(c.get('user'), count) });
  })
  .post('/draw/limited', requireAuth, async (c) => {
    const services = c.get('services');
    const { poolId, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.drawLimited(c.get('user'), poolId, count) });
  })
  .get('/draw/draw-history', requireAuth, async (c) => {
    const services = c.get('services');
    const result = await services.gacha.getDrawHistory(c.get('user'), c.req.query());
    return c.json({ success: true, ...result });
  })
  .get('/limited/pools', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.getLimitedPools() });
  })
  .post('/decompose', requireAuth, async (c) => {
    const services = c.get('services');
    const { rarity, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.decompose(c.get('user'), rarity, count) });
  })
  .post('/game/dice', requireAuth, async (c) => {
    const services = c.get('services');
    const { betAmount } = await c.req.json() || {};
    return c.json({ success: true, ...await services.gacha.playDice(c.get('user'), betAmount) });
  })
  .post('/shop/buy', requireAuth, async (c) => {
    const services = c.get('services');
    const { targetRarity } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.shopBuy(c.get('user'), targetRarity) });
  });
