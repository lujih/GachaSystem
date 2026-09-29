import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rate-limit.js';

/**
 * 资金与出网端点此前完全无限流，可被脚本打爆 D1 写入配额并刷高 Worker 费用。
 * 阈值按「正常玩家可持续高频操作」设定：单抽 30/分钟、十连 20/分钟、
 * 骰子 20/分钟（另有 3 秒冷却兜底）、限定池列表 30/分钟（每次都会出网 fetch 图源）。
 *
 * ⚠️ 必须用 ... 展开：Hono 的 .get(path, ...handlers) 不会展开数组形式的参数，
 * 传数组会让 compose 拿到非函数并抛 "handler is not a function"（整个端点 500）。
 */
const withLimit = (key, limit, window) => [requireAuth, rateLimitByUser(key, limit, window)];

export const gachaRoutes = new Hono()
  .get('/draw', ...withLimit('draw', 30, 60), async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.draw(c.get('user')) });
  })
  .post('/draw/multi', ...withLimit('drawmulti', 20, 60), async (c) => {
    const services = c.get('services');
    const { count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.multiDraw(c.get('user'), count) });
  })
  .post('/draw/limited', ...withLimit('drawlimited', 20, 60), async (c) => {
    const services = c.get('services');
    const { poolId, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.drawLimited(c.get('user'), poolId, count) });
  })
  .get('/draw/draw-history', ...withLimit('history', 60, 60), async (c) => {
    const services = c.get('services');
    const result = await services.gacha.getDrawHistory(c.get('user'), c.req.query());
    return c.json({ success: true, ...result });
  })
  .get('/limited/pools', ...withLimit('pools', 30, 60), async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.getLimitedPools() });
  })
  .post('/decompose', ...withLimit('decompose', 20, 60), async (c) => {
    const services = c.get('services');
    const { rarity, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.decompose(c.get('user'), rarity, count) });
  })
  .post('/game/dice', ...withLimit('dice', 20, 60), async (c) => {
    const services = c.get('services');
    const { betAmount } = await c.req.json() || {};
    return c.json({ success: true, ...await services.gacha.playDice(c.get('user'), betAmount) });
  })
  .post('/shop/buy', ...withLimit('shop', 20, 60), async (c) => {
    const services = c.get('services');
    const { targetRarity } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.shopBuy(c.get('user'), targetRarity) });
  })
  .post('/user/craft', ...withLimit('craft', 20, 60), async (c) => {
    const services = c.get('services');
    const { targetRarity } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.craft(c.get('user'), targetRarity) });
  });
