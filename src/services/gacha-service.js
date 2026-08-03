/**
 * 抽卡服务：编排 DrawEngine（概率）+ ImagePipeline（图片）+ D1（账务）
 * 并发安全：先原子扣币（UPDATE ... WHERE coins >= ?），再 batch 写奖励/库存/历史
 * 会话不再携带可变业务字段（删除了 updateSession 机制）
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { getBeijingISOString } from '../utils/time.js';
import { rollRarity, advancePity, planMultiDraw } from './draw-engine.js';

export class GachaService {
  constructor(env, ctx = null, deps = {}) {
    this.env = env;
    this.ctx = ctx;
    this.userService = deps.userService;
    this.imagePipeline = deps.imagePipeline;
    this.galleryService = deps.galleryService;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  // ==================== 保底（D1 权威 + KV 60s 缓存） ====================

  async getPity(userId) {
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(`pity:${userId}`, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }
    const row = await this.env.DB.prepare('SELECT ssr, ur FROM pity_counters WHERE user_id = ?').bind(userId).first();
    const pity = { ssr: row?.ssr || 0, ur: row?.ur || 0 };
    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(`pity:${userId}`, JSON.stringify(pity), { expirationTtl: 60 }));
    }
    return pity;
  }

  async getLimitedPity(userId) {
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(`pity:limited:${userId}`, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }
    const row = await this.env.DB.prepare('SELECT limited_ssr, limited_ur FROM pity_counters WHERE user_id = ?').bind(userId).first();
    const pity = { ssr: row?.limited_ssr || 0, ur: row?.limited_ur || 0 };
    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(`pity:limited:${userId}`, JSON.stringify(pity), { expirationTtl: 60 }));
    }
    return pity;
  }

  async invalidatePityCache(userId) {
    if (!this.env.KV_CACHE) return;
    await Promise.all([
      this.env.KV_CACHE.delete(`pity:${userId}`).catch(() => {}),
      this.env.KV_CACHE.delete(`pity:limited:${userId}`).catch(() => {}),
    ]);
  }

  // ==================== 原子扣币 ====================

  async deductCoins(userId, amount) {
    const res = await this.env.DB.prepare(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?'
    ).bind(amount, userId, amount).run();
    return res.meta.changes > 0;
  }

  // ==================== 单抽 ====================

  async draw(currentUser) {
    const cost = CONFIG.GAME.DRAW_COST || 0;
    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getPity(currentUser.id);
    const { rarity, isPity } = rollRarity(pity.ssr, pity.ur);
    const nextPity = advancePity(pity, rarity);

    const sources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
    if (sources.length === 0) throw AppError.serverError(`配置错误: 无法找到 ${rarity} 的图源`);
    const asset = await this.imagePipeline.consumeBuffer(rarity, sources);
    if (!asset || (!asset.success && !asset.imageUrl)) {
      throw AppError.serverError(`获取 ${rarity} 图片失败，请重试`);
    }

    const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;

    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const stmts = [
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + 1, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(coinsReward + (levelUp?.reward || 0), expGain, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1')
        .bind(currentUser.id, rarity),
      this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, asset.sourceName || '常驻池', Date.now()),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, ?, ?, 0, 0) ON CONFLICT(user_id) DO UPDATE SET ssr = excluded.ssr, ur = excluded.ur')
        .bind(currentUser.id, nextPity.ssr, nextPity.ur),
    ];
    await this.env.DB.batch(stmts);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: asset.sourceName, ts: Date.now() }));
      if (rarity === 'UR') {
        this.safeWaitUntil(this.galleryService.updateLeaderboard({ username: currentUser.username, rarity, imageUrl: asset.imageUrl, ts: Date.now() }));
      }
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      card: asset,
      rarity,
      expGained: expGain,
      coinsReward,
      isPity,
      pityInfo: { ssrPity: nextPity.ssr, urPity: nextPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  // ==================== 十连 ====================

  async multiDraw(currentUser, count) {
    const reqCount = Math.max(Math.min(parseInt(count) || 10, CONFIG.GAME.MULTI_DRAW_MAX || 10), 1);
    const isMulti = reqCount >= 10;
    const cost = isMulti
      ? (CONFIG.GAME.MULTI_DRAW_COST || CONFIG.GAME.DRAW_COST * 10)
      : (CONFIG.GAME.DRAW_COST || 0) * reqCount;

    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getPity(currentUser.id);
    const plan = planMultiDraw(reqCount, pity);
    const drawCost = Math.floor(cost / reqCount);

    // 预读 buffer（按稀有度分组一次）
    const bufferCache = {};
    for (const d of plan) {
      if (!bufferCache[d.rarity]) {
        const sourceList = CONFIG.SOURCES.filter(s => s.rarity === d.rarity);
        bufferCache[d.rarity] = { slots: await this.imagePipeline.preReadBufferSlots(d.rarity), sourceList };
      }
    }

    const cards = [];
    const stmts = [];
    let totalCoins = 0;
    let totalExp = 0;
    const failedSlots = [];

    for (const entry of plan) {
      const { index: i, rarity, isPity, ssrPity, urPity } = entry;
      try {
        const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
        const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
        const { slots, sourceList } = bufferCache[rarity];
        const asset = this.imagePipeline.consumeSlot(slots, sourceList);
        if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

        totalCoins += coinsReward - drawCost;
        totalExp += expGain;

        cards.push({
          rarity,
          asset: asset.success ? { url: asset.imageUrl, sourceName: asset.sourceName } : null,
          isPity,
          pityInfo: { ssrPity, urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
        });

        stmts.push(
          this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
          this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, asset.sourceName || '常驻池', Date.now() + i)
        );

        if (asset.success) {
          this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: asset.sourceName, ts: Date.now() + i }));
          if (rarity === 'UR') {
            this.safeWaitUntil(this.galleryService.updateLeaderboard({ username: currentUser.username, rarity, imageUrl: asset.imageUrl, ts: Date.now() + i }));
          }
        }
      } catch (e) {
        console.error(`[multiDraw] Draw ${i + 1} failed:`, e);
        failedSlots.push(i + 1);
      }
    }

    const lastPlan = plan[plan.length - 1];
    const totalExpNew = (currentUser.total_exp || 0) + totalExp;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExpNew);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    stmts.push(
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + ?, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(totalCoins + (levelUp?.reward || 0), cards.length, totalExp, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, ?, ?, 0, 0) ON CONFLICT(user_id) DO UPDATE SET ssr = excluded.ssr, ur = excluded.ur')
        .bind(currentUser.id, lastPlan.ssrPity, lastPlan.urPity),
    );
    await this.env.DB.batch(stmts);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      cards,
      count: cards.length,
      totalCost: cost,
      expGained: totalExp,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
      pityInfo: { ssrPity: lastPlan.ssrPity, urPity: lastPlan.urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      failedSlots: failedSlots.length > 0 ? failedSlots : undefined,
    };
  }

  // ==================== 限定池（独立保底） ====================

  async drawLimited(currentUser, poolId, reqCount) {
    const pool = poolId && CONFIG.LIMITED.POOLS[poolId] ? poolId : CONFIG.LIMITED.DEFAULT_POOL;
    const poolConfig = CONFIG.LIMITED.POOLS[pool];
    if (!poolConfig) throw AppError.validationError('卡池不存在');
    const sources = poolConfig.sources;
    if (!sources?.length) throw AppError.serverError('卡池配置错误');

    const count = Math.min(Math.max(parseInt(reqCount) || 1, 1), CONFIG.GAME.MULTI_DRAW_MAX || 10);
    const isMulti = count >= 10;
    const singleCost = poolConfig.cost || CONFIG.LIMITED.COST;
    const cost = isMulti ? (CONFIG.LIMITED.MULTI_COST || singleCost * 10) : singleCost * count;

    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getLimitedPity(currentUser.id);
    const tempPity = { ssr: pity.ssr, ur: pity.ur };
    const baseRarity = poolConfig.rarity || 'UR';

    const cards = [];
    const stmts = [];
    let totalExp = 0;
    const drawnUrls = new Set();

    for (let i = 0; i < count; i++) {
      const { rarity, isPity } = rollRarity(tempPity.ssr, tempPity.ur);
      tempPity.ssr++;
      tempPity.ur++;
      if (rarity === 'SSR' || rarity === 'UR') tempPity.ssr = 0;
      if (rarity === 'UR') tempPity.ur = 0;

      let asset;
      if (rarity === baseRarity) {
        asset = await this.imagePipeline.fetchAndUploadWithFallback(sources[Math.floor(Math.random() * sources.length)]);
      } else {
        const fallbackSources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
        asset = await this.imagePipeline.consumeBuffer(rarity, fallbackSources.length > 0 ? fallbackSources : sources);
      }
      if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

      // 同批去重
      let finalAsset = asset;
      if (asset.success && drawnUrls.has(asset.imageUrl)) {
        try {
          const retrySrc = rarity === baseRarity ? sources : CONFIG.SOURCES.filter(s => s.rarity === rarity);
          const retry = await this.imagePipeline.fetchAndUploadWithFallback(retrySrc[Math.floor(Math.random() * retrySrc.length)]);
          if (retry.success && !drawnUrls.has(retry.imageUrl)) finalAsset = retry;
        } catch {}
      }
      if (finalAsset.success) drawnUrls.add(finalAsset.imageUrl);

      const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
      totalExp += expGain;

      cards.push({
        rarity,
        asset: finalAsset.success ? { url: finalAsset.imageUrl, sourceName: finalAsset.sourceName } : null,
        isPity,
        pityInfo: { ssrPity: tempPity.ssr, urPity: tempPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      });

      stmts.push(
        this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
        this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, finalAsset.sourceName || poolConfig.name || '限定池', Date.now() + i)
      );

      if (finalAsset.success) {
        this.safeWaitUntil(this.galleryService.updateIndex({ url: finalAsset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: finalAsset.sourceName, ts: Date.now() + i }));
      }
    }

    const totalExpNew = (currentUser.total_exp || 0) + totalExp;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExpNew);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;
    const levelUpCoins = levelUp?.reward || 0;

    // 注意：cost 已在 deductCoins 原子扣减，batch 只补回奖励/升级金币，不得重复扣减
    stmts.push(
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + ?, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(levelUpCoins, count, totalExp, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, 0, 0, ?, ?) ON CONFLICT(user_id) DO UPDATE SET limited_ssr = excluded.limited_ssr, limited_ur = excluded.limited_ur')
        .bind(currentUser.id, tempPity.ssr, tempPity.ur),
    );
    await this.env.DB.batch(stmts);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      cards,
      count: cards.length,
      pool: poolConfig.name || pool,
      expGained: totalExp,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
      pityInfo: { ssrPity: tempPity.ssr, urPity: tempPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
    };
  }

  async getLimitedPools() {
    const pools = [];
    for (const [id, config] of Object.entries(CONFIG.LIMITED.POOLS)) {
      let count = '可用';
      if (id === 'github_repo' && config.sources && config.sources[0]) {
        try {
          const res = await fetch(config.sources[0].url, { method: 'GET' });
          const data = await res.json();
          count = data.total || '可用';
        } catch (e) { console.error('[getLimitedPools] Failed to fetch count:', e); }
      }
      pools.push({
        id,
        name: config.name,
        description: config.description,
        cost: CONFIG.LIMITED.COST,
        available: config.sources && config.sources.length > 0,
        count,
      });
    }
    return { pools, defaultPool: CONFIG.LIMITED.DEFAULT_POOL };
  }

  // ==================== 抽卡历史 ====================

  async getDrawHistory(currentUser, params) {
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const rarityFilter = params.rarity;

    let query = 'SELECT * FROM draw_history WHERE user_id = ?';
    const qp = [currentUser.id];
    if (rarityFilter) { query += ' AND rarity = ?'; qp.push(rarityFilter.toUpperCase()); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    qp.push(limit, (page - 1) * limit);

    const countQuery = 'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?';
    const countParams = [currentUser.id];
    if (rarityFilter) countParams.push(rarityFilter.toUpperCase());

    const [results, countResult] = await Promise.all([
      this.env.DB.prepare(query).bind(...qp).all(),
      this.env.DB.prepare(countQuery).bind(...countParams).first(),
    ]);

    return {
      history: results.results || [],
      pagination: { page, limit, total: countResult?.total || 0, totalPages: Math.ceil((countResult?.total || 0) / limit) },
    };
  }

  // ==================== 合成 / 商店 / 分解 / 骰子 ====================

  async craft(currentUser, targetRarity) {
    const rarityMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const sourceRarity = rarityMap[targetRarity];
    if (!sourceRarity) throw AppError.validationError('无效的合成目标');

    const cost = CONFIG.GAME.CRAFT_COST;
    const inv = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, sourceRarity).first();
    if (!inv || inv.count < cost) {
      throw AppError.validationError(`合成需要 ${cost} 张 ${sourceRarity} 卡`);
    }

    const targetSources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    if (targetSources.length === 0) throw AppError.serverError(`找不到 ${targetRarity} 图源`);
    const asset = await this.imagePipeline.consumeBuffer(targetRarity, targetSources);

    const expGain = CONFIG.LEVEL.EXP_GAIN.CRAFT || 50;
    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const stmts = [
      this.env.DB.prepare('UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?').bind(cost, currentUser.id, sourceRarity),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity),
      this.env.DB.prepare('UPDATE users SET total_exp = total_exp + ?, level = ?, exp = ?, coins = coins + ? WHERE id = ?')
        .bind(expGain, levelInfo.level, levelInfo.currentExp, levelUp?.reward || 0, currentUser.id),
    ];
    await this.env.DB.batch(stmts);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: Date.now() }));
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      card: asset,
      consumed: `${cost} 张 ${sourceRarity}`,
      expGained: expGain,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  async shopBuy(currentUser, targetRarity) {
    const shopConfig = CONFIG.GAME.SHOP;
    if (!shopConfig) throw AppError.validationError('商店不存在');
    const price = shopConfig[targetRarity];
    if (!price) throw AppError.validationError('商品不存在');

    if (!(await this.deductCoins(currentUser.id, price))) {
      throw AppError.validationError('积分不足');
    }

    const expGain = CONFIG.LEVEL.EXP_GAIN.SHOP_BUY || 20;
    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const asset = await this.imagePipeline.consumeBuffer(targetRarity, CONFIG.SOURCES.filter(s => s.rarity === targetRarity));

    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE users SET total_exp = total_exp + ?, level = ?, exp = ?, coins = coins + ? WHERE id = ?')
        .bind(expGain, levelInfo.level, levelInfo.currentExp, levelUp?.reward || 0, currentUser.id),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity),
    ]);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: Date.now() }));
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      message: `成功购买 ${targetRarity} 卡片`,
      card: asset,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  async decompose(currentUser, rarity, rawCount) {
    const decomposeConfig = CONFIG.GAME.DECOMPOSE;
    if (!rarity || !decomposeConfig[rarity]) throw AppError.validationError('无效的稀有度');
    const count = Math.min(Math.max(parseInt(rawCount) || 1, 1), 100);
    const coinsPerCard = decomposeConfig[rarity];

    const inv = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, rarity).first();
    if (!inv || inv.count < count) {
      throw AppError.validationError(`${rarity} 卡片不足（拥有 ${inv?.count || 0} 张）`);
    }

    const totalCoins = coinsPerCard * count;
    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?').bind(count, currentUser.id, rarity),
      this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(totalCoins, currentUser.id),
    ]);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      decomposed: count,
      rarity,
      coinsPerCard,
      totalCoins,
    };
  }

  async playDice(currentUser, betAmount) {
    const diceConfig = CONFIG.GAME.DICE;
    const bet = Math.min(Math.max(parseInt(betAmount) || 1, diceConfig.MIN_BET || 1), diceConfig.MAX_BET || 5);
    if (bet < (diceConfig.MIN_BET || 1)) throw AppError.validationError(`投注不能小于 ${diceConfig.MIN_BET}`);
    if (bet > (diceConfig.MAX_BET || 1000)) throw AppError.validationError(`投注不能大于 ${diceConfig.MAX_BET}`);

    if (!(await this.deductCoins(currentUser.id, bet))) {
      throw AppError.validationError('积分不足');
    }

    // 冷却（KV 计数）
    if (this.env.KV_CACHE) {
      const rl = await this.env.KV_CACHE.get(`rl:dice:${currentUser.id}`);
      const now = Date.now();
      if (rl && now < parseInt(rl)) throw AppError.validationError('骰子冷却中，请稍候再试');
      await this.env.KV_CACHE.put(`rl:dice:${currentUser.id}`, String(now + (diceConfig.COOLDOWN_MS || 3000)), { expirationTtl: Math.ceil((diceConfig.COOLDOWN_MS || 3000) / 1000) });
    }

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const sum = roll1 + roll2;
    const payout = diceConfig.PAYOUT || 2;
    let reward = 0;
    if (sum >= 10) reward = Math.floor(bet * payout * 0.5);
    if (roll1 === roll2) reward = Math.max(reward, Math.floor(bet * payout));
    if (sum === 7) reward = Math.max(reward, Math.floor(bet * payout * 2));
    const netChange = reward - bet;

    await this.env.DB.prepare('UPDATE users SET coins = coins + ?, wins = wins + ? WHERE id = ?')
      .bind(netChange, reward > 0 ? 1 : 0, currentUser.id).run();
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      roll1, roll2, sum, reward, cost: bet,
      message: `🎲 ${roll1} + ${roll2} = ${sum}, ${reward > bet ? '恭喜中奖！' : '下次好运！'}`,
    };
  }
}
