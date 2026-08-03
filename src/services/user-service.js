/**
 * 用户服务：信息 / 背包 / 签到 / 称号 / 资料 / 等级奖励
 * 数据全部以 D1 为权威，KV 仅读缓存（uinfo/uinv，60~120s，可丢）
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { validateNickname } from '../utils/validation.js';
import { getBeijingDateStr } from '../utils/time.js';

export class UserService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  async invalidateUserCache(userId, ...additionalKeys) {
    const keys = [`uinfo:${userId}`, `uinv:${userId}`, ...additionalKeys];
    await Promise.all(keys.map(key => this.env.KV_CACHE.delete(key).catch(() => {})));
  }

  // ==================== 等级计算（纯逻辑） ====================

  calculateLevelFromTotalExp(totalExp) {
    const { BASE_EXP, EXP_MULTIPLIER, MAX_LEVEL } = CONFIG.LEVEL;
    let accumulatedExp = 0;
    let level = 1;
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const requiredForNext = Math.floor(BASE_EXP * Math.pow(l, EXP_MULTIPLIER));
      if (totalExp < accumulatedExp + requiredForNext) {
        return { level: l - 1, currentExp: totalExp - accumulatedExp, isMax: false };
      }
      accumulatedExp += requiredForNext;
    }
    return { level: MAX_LEVEL, currentExp: totalExp - accumulatedExp, isMax: true };
  }

  calculateRequiredExp(level) {
    if (level >= CONFIG.LEVEL.MAX_LEVEL) return 0;
    const { BASE_EXP, EXP_MULTIPLIER } = CONFIG.LEVEL;
    return Math.floor(BASE_EXP * Math.pow(level + 1, EXP_MULTIPLIER));
  }

  calculateLevelProgress(exp, level) {
    if (level >= CONFIG.LEVEL.MAX_LEVEL) return 100;
    const expNeeded = this.calculateRequiredExp(level);
    if (expNeeded <= 0) return 100;
    return Math.max(0, Math.min(100, Math.floor((exp / expNeeded) * 100)));
  }

  // ==================== 信息 ====================

  async getInfo(currentUser) {
    const cacheKey = `uinfo:${currentUser.id}`;
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }

    const userRes = await this.env.DB.prepare(
      `SELECT u.id, u.username, u.nickname, u.coins, u.draw_count, u.wins,
              u.level, u.exp, u.total_exp, u.last_login_at, u.login_streak,
              (SELECT title_id FROM user_titles WHERE user_id = u.id AND is_equipped = 1) as active_title
       FROM users u WHERE u.id = ?`
    ).bind(currentUser.id).first();
    if (!userRes) throw AppError.notFoundError('用户');

    const totalExp = userRes.total_exp || 0;
    const { level: currentLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);
    const requiredExpForNextLevel = this.calculateRequiredExp(currentLevel);
    const levelProgress = this.calculateLevelProgress(currentExp, currentLevel);

    const [rewardsResult, pityRow] = await Promise.all([
      this.env.DB.prepare('SELECT level FROM level_rewards WHERE user_id = ?').bind(currentUser.id).all(),
      this.env.DB.prepare('SELECT ssr, ur FROM pity_counters WHERE user_id = ?').bind(currentUser.id).first(),
    ]);

    const responseData = {
      id: userRes.id,
      username: userRes.username,
      nickname: userRes.nickname,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${userRes.username}`,
      coins: userRes.coins,
      drawCount: userRes.draw_count,
      wins: userRes.wins,
      level: currentLevel,
      exp: currentExp,
      level_progress: levelProgress,
      required_exp_next: requiredExpForNextLevel,
      title: userRes.active_title ? { name: userRes.active_title } : null,
      claimedRewards: rewardsResult.results ? rewardsResult.results.map(r => r.level) : [],
      loginStreak: userRes.login_streak || 0,
      lastLoginAt: userRes.last_login_at,
      ssrPity: pityRow?.ssr || 0,
      urPity: pityRow?.ur || 0,
      ssrPityAt: CONFIG.PITY.SSR.at,
      urPityAt: CONFIG.PITY.UR.at,
    };

    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: CONFIG.TTL.USER_INFO }));
    }
    return responseData;
  }

  // ==================== 背包 ====================

  async getInventory(currentUser) {
    const cacheKey = `uinv:${currentUser.id}`;
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }

    const results = await this.env.DB.prepare(
      'SELECT rarity, count FROM inventory WHERE user_id = ?'
    ).bind(currentUser.id).all();

    const inventory = {};
    ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => inventory[r] = 0);
    (results.results || []).forEach(row => { inventory[row.rarity] = row.count; });

    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(cacheKey, JSON.stringify(inventory), { expirationTtl: 60 }));
    }
    return inventory;
  }

  // ==================== 签到（原子防重） ====================

  async checkIn(currentUser) {
    const user = await this.env.DB.prepare(
      'SELECT id, login_streak, last_login_at FROM users WHERE id = ?'
    ).bind(currentUser.id).first();
    if (!user) throw AppError.notFoundError('用户');

    const now = Date.now();
    const todayStr = getBeijingDateStr(new Date());
    const todayStartMs = new Date(`${todayStr}T00:00:00+08:00`).getTime();
    const yesterdayStartMs = todayStartMs - 86400000;

    // 连续签到判定（基于北京日）
    let streak;
    const lastAt = user.last_login_at || 0;
    if (lastAt >= yesterdayStartMs && lastAt < todayStartMs) {
      streak = (user.login_streak || 0) + 1;
    } else {
      streak = 1;
    }

    const streakBonusArr = CONFIG.LEVEL.CHECK_IN.STREAK_BONUS;
    const bonusIndex = Math.min(streak - 1, streakBonusArr.length - 1);
    const streakBonus = streakBonusArr[bonusIndex] || 0;
    const coinsReward = CONFIG.LEVEL.CHECK_IN.BASE_COINS + streakBonus;
    const expReward = CONFIG.LEVEL.EXP_GAIN.CHECK_IN;

    // 原子更新：当天已签到则 changes=0
    const result = await this.env.DB.prepare(
      'UPDATE users SET coins = coins + ?, total_exp = total_exp + ?, last_login_at = ?, login_streak = ? WHERE id = ? AND (last_login_at IS NULL OR last_login_at < ?)'
    ).bind(coinsReward, expReward, now, streak, currentUser.id, todayStartMs).run();
    if (result.meta.changes === 0) throw AppError.validationError('今日已签到');

    const row = await this.env.DB.prepare(
      'SELECT coins, total_exp, level, exp FROM users WHERE id = ?'
    ).bind(currentUser.id).first();
    const totalExp = row.total_exp || 0;
    const levelInfo = this.calculateLevelFromTotalExp(totalExp);
    let leveledUp = false;
    if (levelInfo.level > row.level) {
      await this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?')
        .bind(levelInfo.level, levelInfo.currentExp, currentUser.id).run();
      leveledUp = true;
    }

    await this.invalidateUserCache(currentUser.id);

    return {
      userCoins: row.coins,
      checkIn: { coins: coinsReward, exp: expReward, streak, streakBonus },
      leveledUp,
      newLevel: leveledUp ? levelInfo.level : row.level,
    };
  }

  // ==================== 称号 ====================

  async getTitles(currentUser) {
    const titles = await this.env.DB.prepare(
      'SELECT title_id, is_equipped, unlocked_at FROM user_titles WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).bind(currentUser.id).all();
    return { titles: titles.results || [] };
  }

  async equipTitle(currentUser, titleId) {
    if (!titleId) {
      await this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id).run();
      await this.invalidateUserCache(currentUser.id);
      return { success: true, message: '称号已卸下' };
    }

    const hasTitle = await this.env.DB.prepare(
      'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?'
    ).bind(currentUser.id, titleId).first();
    if (!hasTitle) throw AppError.permissionError('未拥有该称号');

    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id),
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 1 WHERE user_id = ? AND title_id = ?').bind(currentUser.id, titleId),
    ]);
    await this.invalidateUserCache(currentUser.id);
    return { success: true, message: '称号已佩戴', title: { name: titleId } };
  }

  // ==================== 资料 ====================

  async updateProfile(currentUser, nickname) {
    const nickError = validateNickname(nickname);
    if (nickError) throw AppError.validationError(nickError);
    await this.env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, currentUser.id).run();
    await this.invalidateUserCache(currentUser.id);
    return { success: true, nickname };
  }

  // ==================== 等级奖励 ====================

  async claimReward(currentUser, targetLevel) {
    const level = parseInt(targetLevel);
    if (isNaN(level) || !CONFIG.LEVEL.REWARDS.MILESTONES[level]) {
      throw AppError.validationError('无效的奖励等级');
    }

    const user = await this.env.DB.prepare('SELECT level FROM users WHERE id = ?').bind(currentUser.id).first();
    if (user.level < level) throw AppError.permissionError('未达到等级要求');

    const claimed = await this.env.DB.prepare(
      'SELECT id FROM level_rewards WHERE user_id = ? AND level = ?'
    ).bind(currentUser.id, level).first();
    if (claimed) throw AppError.conflictError('奖励已领取');

    const rewardConfig = CONFIG.LEVEL.REWARDS.MILESTONES[level];
    const coinsToAdd = rewardConfig.coins || 0;
    const batch = [];
    if (coinsToAdd > 0) {
      batch.push(this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(coinsToAdd, currentUser.id));
    }
    if (rewardConfig.title) {
      batch.push(this.env.DB.prepare(
        'INSERT OR IGNORE INTO user_titles (user_id, title_id, unlocked_at) VALUES (?, ?, ?)'
      ).bind(currentUser.id, rewardConfig.title, Date.now()));
    }
    batch.push(this.env.DB.prepare(
      'INSERT INTO level_rewards (user_id, level, reward_type, reward_data, claimed_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(currentUser.id, level, 'milestone', JSON.stringify(rewardConfig), Date.now()));

    await this.env.DB.batch(batch);
    await this.invalidateUserCache(currentUser.id);
    return { success: true, reward: rewardConfig };
  }
}
