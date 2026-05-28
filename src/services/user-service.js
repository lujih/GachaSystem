/**
 * 用户服务类
 * 处理用户认证、等级、签到等功能
 */

import { CONFIG } from '../config/index.js';
import { getBeijingTime, getBeijingISOString, getBeijingDateStr, toDateStr, utcToBeijing } from '../utils/time.js';
import { jsonResponse } from '../utils/response.js';

export class UserService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  async safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') {
      this.ctx.waitUntil(promise);
    } else {
      await promise;
    }
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordBuffer = encoder.encode(password);
    
    const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    }, key, 256);
    
    const saltBase64 = btoa(String.fromCharCode(...salt));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return `${saltBase64}:${hashBase64}`;
  }

  async verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    
    // 兼容旧版明文密码
    if (!storedHash.includes(':')) {
      if (password === storedHash) {
        return 'migrated';
      }
      return false;
    }
    
    const [saltBase64, hashBase64] = storedHash.split(':');
    if (!saltBase64 || !hashBase64) return false;
    
    const encoder = new TextEncoder();
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const passwordBuffer = encoder.encode(password);
    
    const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    }, key, 256);
    
    const computedHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return computedHash === hashBase64;
  }

  calculateLevelFromTotalExp(totalExp) {
    const { BASE_EXP, EXP_MULTIPLIER, MAX_LEVEL } = CONFIG.LEVEL;
    let accumulatedExp = 0;
    let level = 1;

    for (let l = 2; l <= MAX_LEVEL; l++) {
      const requiredForNext = Math.floor(BASE_EXP * Math.pow(l, EXP_MULTIPLIER));
      if (totalExp < accumulatedExp + requiredForNext) {
        return {
          level: l - 1,
          currentExp: totalExp - accumulatedExp,
          isMax: false
        };
      }
      accumulatedExp += requiredForNext;
    }

    return {
      level: MAX_LEVEL,
      currentExp: totalExp - accumulatedExp,
      isMax: true
    };
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

  async invalidateUserCache(userId, ...additionalKeys) {
    const keys = [`uinfo:${userId}`, `uinv:${userId}`, ...additionalKeys];
    await Promise.all(keys.map(key => this.env.KV_CACHE.delete(key).catch(() => {})));
  }

  async register(request) {
    const { username, nickname, password } = await request.json();
    if (!username || !password) return jsonResponse({ error: '缺少必要字段' }, 400);

    try {
      const hashedPassword = await this.hashPassword(password);
      
      await this.env.DB.prepare(
        'INSERT INTO users (username, nickname, password, coins, level, exp, total_exp, login_streak, last_login_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        username,
        nickname || username,
        hashedPassword,
        1000,
        1,
        0,
        0,
        0,
        null,
        Date.now()
      ).run();
      
      return jsonResponse({ success: true });
    } catch (e) {
      console.error(e);
      return jsonResponse({ error: '用户名已被占用' }, 409);
    }
  }

  async checkIn(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

    const user = await this.env.DB.prepare(
      'SELECT id, login_streak, last_login_date FROM users WHERE id = ?'
    ).bind(currentUser.id).first();

    if (!user) return jsonResponse({ error: '用户不存在' }, 404);

    const now = new Date();
    const todayStr = getBeijingDateStr(now);
    const lastDateStr = toDateStr(user.last_login_date);

    if (lastDateStr === todayStr) {
      return jsonResponse({ error: '今日已签到' }, 400);
    }

    let streak = user.login_streak || 0;
    // 计算昨天的北京日期
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getBeijingDateStr(yesterday);

    if (lastDateStr === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }

    const streakBonusArr = CONFIG.LEVEL.CHECK_IN.STREAK_BONUS;
    const bonusIndex = Math.min(streak - 1, streakBonusArr.length - 1);
    const streakBonus = streakBonusArr[bonusIndex] || 0;

    const coinsReward = CONFIG.LEVEL.CHECK_IN.BASE_COINS + streakBonus;
    const expReward = CONFIG.LEVEL.EXP_GAIN.CHECK_IN;

    const beijingISOString = getBeijingISOString(now);

    const result = await this.env.DB.prepare(`
      UPDATE users
      SET coins = coins + ?,
          total_exp = total_exp + ?,
          last_login_date = ?,
          login_streak = ?
      WHERE id = ? AND (last_login_date IS NULL OR substr(last_login_date, 1, 10) != ?)
    `).bind(coinsReward, expReward, beijingISOString, streak, currentUser.id, todayStr).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ error: '今日已签到' }, 400);
    }

    currentUser.total_exp = (currentUser.total_exp || 0) + expReward;
    currentUser.coins = (currentUser.coins || 0) + coinsReward;

    const newLevelInfo = this.calculateLevelFromTotalExp(currentUser.total_exp);
    if (newLevelInfo.level > currentUser.level) {
      await this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?')
        .bind(newLevelInfo.level, newLevelInfo.currentExp, currentUser.id).run();
      currentUser.level = newLevelInfo.level;
      currentUser.exp = newLevelInfo.currentExp;
    } else {
      await this.env.DB.prepare('UPDATE users SET exp = exp + ? WHERE id = ?')
        .bind(expReward, currentUser.id).run();
      currentUser.exp = (currentUser.exp || 0) + expReward;
    }

    await this.invalidateUserCache(currentUser.id);

    return jsonResponse({
      success: true,
      userCoins: currentUser.coins,
      checkIn: {
        coins: coinsReward,
        exp: expReward,
        streak: streak,
        streakBonus: streakBonus
      }
    });
  }

  async claimReward(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
    
    const { targetLevel } = await request.json();
    const level = parseInt(targetLevel);
    
    if (isNaN(level) || !CONFIG.LEVEL.REWARDS.MILESTONES[level]) {
      return jsonResponse({ error: '无效的奖励等级' }, 400);
    }

    const user = await this.env.DB.prepare('SELECT level FROM users WHERE id = ?').bind(currentUser.id).first();
    if (user.level < level) {
      return jsonResponse({ error: '未达到等级要求' }, 403);
    }

    const claimed = await this.env.DB.prepare(
      'SELECT id FROM level_rewards WHERE user_id = ? AND level = ?'
    ).bind(currentUser.id, level).first();

    if (claimed) {
      return jsonResponse({ error: '奖励已领取' }, 409);
    }

    const rewardConfig = CONFIG.LEVEL.REWARDS.MILESTONES[level];
    const coinsToAdd = rewardConfig.coins || 0;
    const batch = [];

    if (coinsToAdd > 0) {
      batch.push(
        this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?')
          .bind(coinsToAdd, currentUser.id)
      );
    }

    if (rewardConfig.title) {
      batch.push(
        this.env.DB.prepare(
          'INSERT OR IGNORE INTO user_titles (user_id, title_id, unlocked_at) VALUES (?, ?, ?)'
        ).bind(currentUser.id, rewardConfig.title, Date.now())
      );
    }

    batch.push(
      this.env.DB.prepare(
        'INSERT INTO level_rewards (user_id, level, reward_type, reward_data, claimed_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(currentUser.id, level, 'milestone', JSON.stringify(rewardConfig), Date.now())
    );

    await this.env.DB.batch(batch);
     
    currentUser.coins = (currentUser.coins || 0) + coinsToAdd;
    await this.invalidateUserCache(currentUser.id);
     
    return jsonResponse({ success: true, userCoins: currentUser.coins, reward: rewardConfig });
  }

  async login(request) {
    const { username, password } = await request.json();
    
    const user = await this.env.DB.prepare(
      'SELECT id, username, nickname, password, coins, level, exp, total_exp FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) return jsonResponse({ error: '凭证无效' }, 403);

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return jsonResponse({ error: '凭证无效' }, 403);
    }

    if (isPasswordValid === 'migrated') {
      const newHash = await this.hashPassword(password);
      await this.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHash, user.id).run();
    }

    const totalExp = user.total_exp || 0;
    const { level: calculatedLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);

    const token = crypto.randomUUID();

    const sessionData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`,
      coins: user.coins || 0,
      level: calculatedLevel,
      exp: currentExp,
      total_exp: user.total_exp
    };

    const now = new Date();
    const beijingNow = getBeijingTime(now);
    const tomorrowBeijing = new Date(beijingNow);
    tomorrowBeijing.setDate(tomorrowBeijing.getDate() + 1);
    tomorrowBeijing.setUTCHours(16, 0, 0, 0);

    const secondsUntilMidnight = Math.floor((tomorrowBeijing - beijingNow) / 1000);
    const ttl = secondsUntilMidnight + CONFIG.TTL.SESSION;

    await this.env.KV_CACHE.put(`session:${token}`, JSON.stringify(sessionData), { expirationTtl: ttl });

    return jsonResponse({
      success: true,
      token,
      user: sessionData
    });
  }

  async getInfo(currentUser) {
    if (!currentUser) return jsonResponse({ error: '未授权' }, 401);

    const cacheKey = `uinfo:${currentUser.id}`;
    const cachedData = await this.env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cachedData) {
      return jsonResponse(cachedData, 200, { 'X-Cache-Status': 'HIT' });
    }

    const sql = `
      SELECT 
        u.username, u.nickname, u.coins, u.draw_count, u.wins, 
        u.level, u.exp, u.total_exp, u.last_login_date, u.login_streak,
        (
          SELECT title_id 
          FROM user_titles 
          WHERE user_id = u.id AND is_equipped = 1
        ) as active_title
      FROM users u
      WHERE u.id = ?
    `;

    const userRes = await this.env.DB.prepare(sql).bind(currentUser.id).first();
    if (!userRes) return jsonResponse({ error: '用户不存在' }, 404);

    const totalExp = userRes.total_exp || 0;
    const { level: calculatedLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);
    const currentLevel = calculatedLevel;
    const requiredExpForNextLevel = this.calculateRequiredExp(currentLevel);
    const levelProgress = this.calculateLevelProgress(currentExp, currentLevel);
    
    let currentTitle = null;
    if (userRes.active_title) {
      currentTitle = { name: userRes.active_title };
    }

    // 并行读取奖励记录和保底计数器
    const rewardsQuery = this.env.DB.prepare(
      'SELECT level FROM level_rewards WHERE user_id = ?'
    ).bind(currentUser.id).all();
    const pityReads = this.env.KV_CACHE
      ? Promise.all([
          this.env.KV_CACHE.get(`pity:ssr:${currentUser.id}`),
          this.env.KV_CACHE.get(`pity:ur:${currentUser.id}`)
        ]).catch(() => [null, null])
      : Promise.resolve([null, null]);

    const [claimedRewardsResult, [ssrRaw, urRaw]] = await Promise.all([rewardsQuery, pityReads]);
    const claimedRewards = claimedRewardsResult.results ? claimedRewardsResult.results.map(r => r.level) : [];
    const ssrPity = parseInt(ssrRaw || '0', 10);
    const urPity = parseInt(urRaw || '0', 10);

    const responseData = {
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
      title: currentTitle,
      claimedRewards,
      loginStreak: userRes.login_streak || 0,
      lastLoginDate: userRes.last_login_date,
      ssrPity,
      urPity,
      ssrPityAt: CONFIG.PITY.SSR.at,
      urPityAt: CONFIG.PITY.UR.at,
    };

    this.safeWaitUntil(
      this.env.KV_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: CONFIG.TTL.USER_INFO })
    );

    return jsonResponse(responseData, 200, { 'X-Cache-Status': 'MISS' });
  }

  async getInventory(currentUser) {
    if (!currentUser) return jsonResponse({ error: '未授权' }, 401);
    
    const cacheKey = `uinv:${currentUser.id}`;
    const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cached) return jsonResponse(cached, 200, { 'X-Cache-Status': 'HIT' });

    const results = await this.env.DB.prepare(
      'SELECT rarity, count FROM inventory WHERE user_id = ?'
    ).bind(currentUser.id).all();
    
    const inventory = {};
    ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => inventory[r] = 0);
    
    if (results.results) {
      results.results.forEach(row => {
        inventory[row.rarity] = row.count;
      });
    }

    this.safeWaitUntil(
      this.env.KV_CACHE.put(cacheKey, JSON.stringify(inventory), { expirationTtl: 60 })
    );
    
    return jsonResponse(inventory, 200, { 'X-Cache-Status': 'MISS' });
  }

  async getTitles(currentUser) {
    if (!currentUser) return jsonResponse({ error: '未授权' }, 401);
    
    const titles = await this.env.DB.prepare(
      'SELECT title_id, is_equipped, unlocked_at FROM user_titles WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).bind(currentUser.id).all();
    
    return jsonResponse({ 
      success: true, 
      titles: titles.results || [] 
    });
  }

  async equipTitle(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '未授权' }, 401);
    const { titleId } = await request.json();
    
    if (!titleId) {
      await this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id).run();
      await this.invalidateUserCache(currentUser.id);
      return jsonResponse({ success: true, message: '称号已卸下' });
    }

    const hasTitle = await this.env.DB.prepare(
      'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?'
    ).bind(currentUser.id, titleId).first();

    if (!hasTitle) return jsonResponse({ error: '未拥有该称号' }, 403);

    const batch = [
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id),
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 1 WHERE user_id = ? AND title_id = ?').bind(currentUser.id, titleId)
    ];
    
    await this.env.DB.batch(batch);
     
    await this.invalidateUserCache(currentUser.id);
     
    return jsonResponse({ success: true, message: '称号已佩戴', title: { name: titleId } });
  }

  async updateProfile(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: '未授权' }, 401);
    const { nickname } = await request.json();
    
    if (!nickname || nickname.length > 20) {
      return jsonResponse({ error: '无效的昵称' }, 400);
    }

    try {
      await this.env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?')
        .bind(nickname, currentUser.id).run();
      
      await this.invalidateUserCache(currentUser.id);
      
      return jsonResponse({ success: true, nickname });
    } catch(e) {
      console.error('Update profile error:', e);
      return jsonResponse({ error: '更新失败' }, 500);
    }
  }  
}
