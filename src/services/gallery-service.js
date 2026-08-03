/**
 * 图库服务：图库查询 / 点赞 / 书签 / 排行榜 / 图库索引写入
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const CACHE_1M = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' };
const CACHE_5M = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

export class GalleryService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  // ==================== 图库索引（后台异步） ====================

  async updateIndex({ url, userId, username, rarity, sourceName, ts }) {
    try {
      const tsMs = typeof ts === 'string' ? Date.parse(ts) : ts;
      await this.env.DB.prepare(
        'INSERT INTO gallery (url, user_id, username, rarity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(url) DO UPDATE SET user_id = excluded.user_id, username = excluded.username, rarity = excluded.rarity, source_name = excluded.source_name, created_at = excluded.created_at'
      ).bind(url, userId, username, rarity || 'N', sourceName || null, tsMs).run();
    } catch (e) { console.error('Gallery D1 error:', e); }
  }

  async updateLeaderboard({ username, rarity, imageUrl, ts }) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO leaderboard (username, rarity, image_url, created_at) VALUES (?, ?, ?, ?)'
      ).bind(username, rarity, imageUrl, ts).run();
      // 仅保留最近 50 条
      await this.env.DB.prepare(
        'DELETE FROM leaderboard WHERE id NOT IN (SELECT id FROM leaderboard ORDER BY created_at DESC LIMIT 50)'
      ).run();
    } catch (e) { console.error('Leaderboard D1 error:', e); }
  }

  // ==================== 图库查询（公开） ====================

  async listItems(params) {
    const { page = 1, limit = 20, rarity, userId, sort = 'newest', search, period } = params;
    const safePage = Math.max(parseInt(page) || 1, 1);
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const safeUserId = userId && !isNaN(parseInt(userId)) ? parseInt(userId) : null;
    const offset = (safePage - 1) * safeLimit;

    let q = 'SELECT g.id, g.url, g.user_id, g.username, g.rarity, g.source_name, g.created_at, (SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) as like_count FROM gallery g';
    let cq = 'SELECT COUNT(*) as total FROM gallery g';
    const p = [], cp = [], conds = [];

    if (rarity) { conds.push('g.rarity = ?'); p.push(rarity.toUpperCase()); cp.push(rarity.toUpperCase()); }
    if (safeUserId) { conds.push('g.user_id = ?'); p.push(safeUserId); cp.push(safeUserId); }
    if (search) { conds.push('g.username LIKE ?'); p.push(`%${search}%`); cp.push(`%${search}%`); }
    if (period && period !== 'all') {
      const PERIOD_MS = { today: 86400000, week: 604800000, month: 2592000000 };
      const ms = PERIOD_MS[period];
      if (ms) { conds.push('g.created_at > ?'); p.push(Date.now() - ms); cp.push(Date.now() - ms); }
    }
    if (conds.length) { q += ' WHERE ' + conds.join(' AND '); cq += ' WHERE ' + conds.join(' AND '); }

    const ORDER = {
      newest: 'g.created_at DESC',
      oldest: 'g.created_at ASC',
      rarity: "CASE g.rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 ELSE 5 END, g.created_at DESC",
      hot: '(SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) DESC, g.created_at DESC',
    };
    const orderBy = ORDER[sort] || ORDER.newest;

    const [items, count] = await Promise.all([
      this.env.DB.prepare(`${q} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...p, safeLimit, offset).all(),
      this.env.DB.prepare(cq).bind(...cp).first(),
    ]);

    return {
      items: items.results || [],
      total: count?.total || 0,
      page,
      totalPages: Math.ceil((count?.total || 0) / safeLimit),
      cacheHeaders: CACHE_1M,
    };
  }

  // ==================== 点赞 / 书签 ====================

  async likeCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare(
      'INSERT INTO card_likes (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
    ).bind(userId, galleryId, Date.now()).run();
    const count = await this.env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
    return { liked: true, likeCount: count?.c || 0 };
  }

  async unlikeCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare('DELETE FROM card_likes WHERE user_id = ? AND gallery_id = ?').bind(userId, galleryId).run();
    const count = await this.env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
    return { liked: false, likeCount: count?.c || 0 };
  }

  async bookmarkCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare(
      'INSERT INTO card_bookmarks (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
    ).bind(userId, galleryId, Date.now()).run();
    return { bookmarked: true };
  }

  async unbookmarkCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare('DELETE FROM card_bookmarks WHERE user_id = ? AND gallery_id = ?').bind(userId, galleryId).run();
    return { bookmarked: false };
  }

  async getMyInteractions(userId) {
    const [likes, bookmarks] = await Promise.all([
      this.env.DB.prepare('SELECT gallery_id FROM card_likes WHERE user_id = ?').bind(userId).all(),
      this.env.DB.prepare('SELECT gallery_id FROM card_bookmarks WHERE user_id = ?').bind(userId).all(),
    ]);
    return {
      likedIds: (likes.results || []).map(r => r.gallery_id),
      bookmarkedIds: (bookmarks.results || []).map(r => r.gallery_id),
    };
  }

  async getLikeCounts(ids) {
    const cleanIds = (ids || []).map(Number).filter(n => n > 0).slice(0, 50);
    if (cleanIds.length === 0) return { counts: {}, cacheHeaders: CACHE_1M };
    const placeholders = cleanIds.map(() => '?').join(',');
    const rows = await this.env.DB.prepare(
      `SELECT gallery_id, COUNT(*) as c FROM card_likes WHERE gallery_id IN (${placeholders}) GROUP BY gallery_id`
    ).bind(...cleanIds).all();
    const counts = {};
    (rows.results || []).forEach(r => { counts[r.gallery_id] = r.c; });
    return { counts, cacheHeaders: CACHE_1M };
  }
}
