/**
 * =========================================
 * 1. 分层配置区域 (LAYERED CONFIG)
 * =========================================
 */

/**
 * 业务配置层 - 游戏逻辑相关配置
 */
const BUSINESS_CONFIG = {
  // 图源配置
  SOURCES: [
    { name: 'Random Anime', url: 'https://api.anosu.top/img', rarity: 'N' },
    { name: 'Kemonomimi', url: 'https://api.anosu.top/img?sort=furry', rarity: 'R' },
    { name: 'Pixiv Best', url: 'https://api.anosu.top/img?sort=pixiv', rarity: 'SR' },
    { name: 'Stockings', url: 'https://api.anosu.top/img?sort=setu', rarity: 'SSR' },
    { name: 'Absolute Territory', url: 'https://moe.jitsu.top/api?sort=r18', rarity: 'UR' }
  ],
  
  // 限定池配置
  LIMITED: {
    COST: 500,
    // 支持多个图池，可以通过 ID 切换
    POOLS: {
      'genshin': {
        name: '原神限定',
        description: '原神角色精选',
        sources: [
          { name: 'Genshin Impact', url: 'https://v2.xxapi.cn/api/ys?return=302', rarity: 'UR' }
        ],
        type: 'api'
      },
      'github_repo': {
        name: 'GitHub图库',
        description: '从GitHub仓库随机获取图片',
        sources: [
          { name: 'GitHub Random', url: 'https://github_images.cszxorx.dpdns.org/', rarity: 'UR' }
        ],
        type: 'api'
      }
    },
    DEFAULT_POOL: 'github_repo'
  },
  
  // 游戏数值配置
  GAME: {
    POINTS: { 'N': 5, 'R': 10, 'SR': 30, 'SSR': 100, 'UR': 500 },
    CRAFT_COST: 5,
    SHOP: { 'R': 100, 'SR': 500, 'SSR': 2000, 'UR': 8000 },
    DICE: { MIN_BET: 10, MAX_BET: 1000, PAYOUT: 2 }
  },
  
  // 等级系统配置
  LEVEL: {
    // 经验获取配置
    EXP_GAIN: {
      DRAW: { 'N': 5, 'R': 10, 'SR': 30, 'SSR': 100, 'UR': 500 },
      CRAFT: 50,
      SHOP_BUY: 20,
      DICE_WIN: 30,
      CHECK_IN: 50,
    },
    // 等级升级所需经验公式：基础值 × (等级^1.5)
    BASE_EXP: 100,
    EXP_MULTIPLIER: 1.5,
    MAX_LEVEL: 100,
    // 签到系统配置
    CHECK_IN: {
      BASE_COINS: 100,
      STREAK_BONUS: [0, 20, 50, 100, 150, 200, 300]
    },
    // 等级奖励配置
    REWARDS: {
      COINS_PER_LEVEL: 50,
      MILESTONES: {
        5: { coins: 500, title: '新手收藏家' },
        10: { coins: 1000, title: '初级收藏家' },
        20: { coins: 2000, title: '高级收藏家' },
        30: { coins: 3000, title: '资深收藏家' },
        50: { coins: 5000, title: '传说人物' },
        100: { coins: 10000, title: '卡片之神' }
      }
    },
  },
};

/**
 * 技术配置层 - 系统实现相关配置
 */
const TECHNICAL_CONFIG = {
  // 存储键名配置
  KEYS: {
    CHANGELOG: 'system:changelog',
    ANNOUNCEMENT: 'system:announcement',
    LEADERBOARD: 'system:leaderboard',
    BUFFER_PREFIX: 'sys:buffer:'
  },

  // 缓存时间配置（秒）
  TTL: {
    SESSION: 86400 * 7,           // 会话缓存 7天
    BUFFER: 86400,                // 缓冲池缓存 1天
    CACHE: 60 * 5,                // 通用缓存 5分钟
    LEADERBOARD: 86400 * 30,      // 排行榜缓存 30天
    USER_INFO: 60,                // 用户信息缓存 60秒
    PUBLIC_API: 300,              // 公共接口缓存 5分钟
    STATIC_ASSET: 31536000,       // 静态资源缓存 1年
    BUFFER_SLOTS: 10              // 缓冲池槽位数量
  },

  // 基础设施配置
  INFRASTRUCTURE: {
    R2_DOMAIN: "https://cft1.cszxorx.dpdns.org",
    DEFAULT_IMG: "https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif"
  },

  // GitHub 图床配置
  GITHUB: {
    API_BASE: 'https://api.github.com',
    RAW_BASE: 'https://raw.githubusercontent.com',
    CDN_BASE: 'https://cdn.jsdelivr.net/gh',  // jsDelivr CDN
    OWNER: 'lujih',           // 仓库所有者
    REPO: 'chouka-images',    // 仓库名
    BRANCH: 'main',           // 分支名
    PATH_PREFIX: 'images'     // 图片存储路径前缀
  }
};

/**
 * 统一配置对象 - 向后兼容的 CONFIG 对象
 * 通过合并业务配置和技术配置提供统一接口
 */
const CONFIG = {
  // 业务配置（直接引用）
  ...BUSINESS_CONFIG,
  
  // 技术配置（扁平化合并）
  ...TECHNICAL_CONFIG,
  
  // 向后兼容的扁平化属性
  KEYS: TECHNICAL_CONFIG.KEYS,
  TTL: TECHNICAL_CONFIG.TTL,
  IMAGE_COMPRESSION: TECHNICAL_CONFIG.IMAGE_COMPRESSION,
  R2_DOMAIN: TECHNICAL_CONFIG.INFRASTRUCTURE.R2_DOMAIN,
  DEFAULT_IMG: TECHNICAL_CONFIG.INFRASTRUCTURE.DEFAULT_IMG
};

const DEFAULT_CHANGELOG = [
  { 
    date: new Date().toISOString().split('T')[0], 
    ver: 'v1.0.0', 
    content: '暂无变更日志。', 
    tag: 'info' 
  }
];

// 路由路径规范化，消除末尾斜杠差异（例如 `/user/profile` 与 `/user/profile/` 视为同一路由）
function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = normalizePath(url.pathname);

    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: { 
            'Access-Control-Allow-Origin': '*', 
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 
            'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token, X-User-ID' 
        }
      });
    }

    const token = request.headers.get('X-Session-Token');
    let currentUser = null;
    if (token) {
      const userDataStr = await env.KV_CACHE.get(`session:${token}`);
      if (userDataStr) {
        currentUser = JSON.parse(userDataStr);
        // [修复] 向后兼容：旧 session 可能没有 coins 字段，从数据库查询
        if (currentUser && currentUser.coins === undefined && currentUser.id) {
          const userData = await env.DB.prepare('SELECT coins FROM users WHERE id = ?').bind(currentUser.id).first();
          if (userData) {
            currentUser.coins = userData.coins || 0;
          }
        }
      }
    }
    
    if (!currentUser && request.headers.get('X-User-ID')) {
         const uidName = request.headers.get('X-User-ID');
         const user = await env.DB.prepare('SELECT id, username, nickname, coins, level, exp, total_exp FROM users WHERE username = ?').bind(uidName).first();
         if(user) currentUser = user;
    }

    const userService = new UserService(env, ctx);
    const gachaService = new GachaService(env, ctx, userService);

    // 统一维护的路由表：Key = `${METHOD} ${PATH}`（PATH 为规范化后的路径）
    const routes = {
      'GET /': () => handleHome(),

      'GET /user/profile': () => handleProfile(),

      'POST /auth/register': () => userService.register(request),
      'POST /auth/login': () => userService.login(request),
      'GET /user/info': () => userService.getInfo(currentUser),
      'GET /user/inventory': () => userService.getInventory(currentUser),
      'POST /user/update-profile': () => userService.updateProfile(currentUser, request),
      'POST /user/check-in': () => userService.checkIn(currentUser, request),
      'POST /user/claim-reward': () => userService.claimReward(currentUser, request),
      'GET /user/titles': () => userService.getTitles(currentUser),
      'POST /user/equip-title': () => userService.equipTitle(currentUser, request),
      'POST /user/upload': () => gachaService.uploadImage(currentUser, request),
      'GET /user/uploads': () => gachaService.getUserUploads(currentUser, request),
      'GET /limited/pools': () => gachaService.getLimitedPools(currentUser),
      
      'GET /draw': () => gachaService.draw(currentUser),
      'POST /draw/limited': () => gachaService.drawLimited(currentUser),
      'POST /user/craft': () => gachaService.craft(currentUser, request),
      'POST /shop/buy': () => gachaService.shopBuy(currentUser, request),
      'POST /game/dice': () => gachaService.playDice(currentUser, request),
      
      'GET /showcase': () => handleShowcase(env),
      'GET /changelog': () => handleChangelog(env),
      'GET /announcement': () => handleGetAnnouncement(env),

      'GET /library': () => handleLibrary(request, env, url),
      'GET /api/library/items': () => handleLibraryApi(request, env),
      'GET /favicon.ico': () => new Response(null, { status: 204 }),

      'POST /admin/users': () => handleAdminUsers(request, env),
      'POST /admin/verify': () => handleAdminVerify(request, env),
      'POST /admin/save-changelog': () => handleAdminSaveLog(request, env),
      'POST /admin/save-announcement': () => handleAdminSaveAnnouncement(request, env),
      'POST /admin/update-points': () => handleAdminUpdatePoints(request, env),
      'POST /admin/delete-user': () => handleAdminDeleteUser(request, env),
      'POST /admin/uploads': () => handleAdminUploads(request, env),
      'POST /admin/review-upload': () => handleAdminReviewUpload(request, env),
    };

    const routeKey = `${method} ${pathname}`;
    const handler = routes[routeKey];

    if (handler) {
      try {
        return await handler();
      } catch (err) {
        return jsonResponse({ error: err.message || 'Internal Error' }, 500);
      }
    }

    // 简单区分 API 与页面的 404 返回格式
    if (pathname.startsWith('/auth') || pathname.startsWith('/user') || pathname.startsWith('/draw') || pathname.startsWith('/shop') || pathname.startsWith('/game') || pathname.startsWith('/admin')) {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    return new Response('Not Found', { status: 404 });
  }
};

/**
 * =========================================
 * 2. 服务层 (Service Layer)
 * =========================================
 */
class UserService {
  constructor(env, ctx) {
    this.env = env;
    this.ctx = ctx;
    // [优化] 初始化累积经验表 (单例模式，避免重复计算)
    if (!globalThis.XP_TABLE) {
      this.initXpTable();
    }
  }

  /**
   * [安全] 使用 PBKDF2 哈希密码
   * @param {string} password - 明文密码
   * @returns {Promise<string>} - 格式: salt:hash (base64)
   */
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordBuffer = encoder.encode(password);
    
    // 使用 PBKDF2 进行 100000 次迭代
    const key = await crypto.subtle.importKey(
      'raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    // 将 salt 和 hash 组合并转为 base64
    const saltBase64 = btoa(String.fromCharCode(...salt));
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return `${saltBase64}:${hashBase64}`;
  }

  /**
   * [安全] 验证密码
   * @param {string} password - 明文密码
   * @param {string} storedHash - 存储的哈希值 (格式: salt:hash) 或明文密码（向后兼容）
   * @returns {Promise<boolean>} - 是否匹配
   */
  async verifyPassword(password, storedHash) {
    // [向后兼容] 如果存储的不是哈希格式（旧数据），直接比较明文
    if (!storedHash || !storedHash.includes(':')) {
      return password === storedHash;
    }
    
    const [saltBase64, hashBase64] = storedHash.split(':');
    if (!saltBase64 || !hashBase64) return false;
    
    const encoder = new TextEncoder();
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const passwordBuffer = encoder.encode(password);
    
    const key = await crypto.subtle.importKey(
      'raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']
    );
    
    const hash = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const computedHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
    return computedHash === hashBase64;
  }
  /**
   * [新增] 初始化累积经验表
   * 数学原理：Level L 的总经验阈值 = sum( Cost(i) ) for i from 2 to L
   */
  initXpTable() {
    const table = [0, 0]; // 0级占位, 1级所需总经验为0
    let cumulative = 0;
    const { BASE_EXP, EXP_MULTIPLIER, MAX_LEVEL } = CONFIG.LEVEL;

    // 从 2 级开始计算（因为从 1 升到 2 需要经验）
    for (let l = 2; l <= MAX_LEVEL + 1; l++) {
      // 原公式：所需经验 = 基础 * (目标等级^1.5)
      // 注意：这里需要严格对齐原有的 calculateRequiredExp 逻辑
      const cost = Math.floor(BASE_EXP * Math.pow(l, EXP_MULTIPLIER));
      cumulative += cost;
      table[l] = cumulative;
    }
    
    // 冻结对象，作为全局常量使用
    globalThis.XP_TABLE = table;
  }

  // [优化] 根据总经验计算等级和当前剩余经验
  // 算法：二分查找或直接遍历索引 (O(1) ~ O(log N))
  calculateLevelFromTotalExp(totalExp) {
    const table = globalThis.XP_TABLE;
    const maxIdx = table.length - 1;

    // 1. 超过最高级处理
    if (totalExp >= table[maxIdx - 1]) { // 注意边界
        // 实际上 MAX_LEVEL 是 100，我们计算到了 101 的阈值
        // 如果总经验超过了到达 100 级的阈值
        const maxLevel = CONFIG.LEVEL.MAX_LEVEL;
        const expForMax = table[maxLevel];
        
        // 如果总经验甚至超过了 maxLevel，我们只返回 maxLevel
        return {
            level: maxLevel,
            currentExp: totalExp - expForMax, // 溢出的经验
            isMax: true
        };
    }

    // 2. 查找等级
    // 由于数组是有序的，且长度很小(100)，直接倒序查找或二分查找均极快
    // 这里使用倒序查找，找到第一个 阈值 <= totalExp 的等级
    let level = 1;
    for (let i = maxIdx; i >= 1; i--) {
        if (totalExp >= table[i]) {
            level = i;
            break;
        }
    }

    // 3. 计算当前等级内的剩余经验
    // 剩余经验 = 总经验 - 到达当前等级所需的累积经验
    const currentExp = totalExp - table[level];

    return {
        level,
        currentExp,
        isMax: level >= CONFIG.LEVEL.MAX_LEVEL
    };
  }

  // [修改] 清除缓存：同时清除 info 和 inventory
  async invalidateUserCache(userId) {
    await this.env.KV_CACHE.delete(`uinfo:${userId}`);
    await this.env.KV_CACHE.delete(`uinv:${userId}`); // 新增
  }

  // 计算升级所需经验
  calculateRequiredExp(level) {
    const { BASE_EXP, EXP_MULTIPLIER } = CONFIG.LEVEL;
    return Math.floor(BASE_EXP * Math.pow(level, EXP_MULTIPLIER));
  }

  // 计算等级进度百分比
  calculateLevelProgress(exp, level) {
      if (level >= CONFIG.LEVEL.MAX_LEVEL) return 100;
      const expNeeded = this.calculateRequiredExp(level + 1);
      if (expNeeded <= 0) return 100;
      return Math.max(0, Math.min(100, Math.floor((exp / expNeeded) * 100)));
  }

  async register(request) {
    const { username, nickname, password } = await request.json();
    if (!username || !password) return jsonResponse({ error: 'Missing fields' }, 400);

    try {
      // [安全] 对密码进行哈希处理
      const hashedPassword = await this.hashPassword(password);
      
      await this.env.DB.prepare(
        'INSERT INTO users (username, nickname, password, coins, level, exp, total_exp, login_streak, last_login_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        username,
        nickname || username,
        hashedPassword,
        1000,  // 初始积分
        1,     // 初始等级
        0,     // 初始经验
        0,     // 初始总经验
        0,     // 初始登录连续天数
        null,  // 最后登录日期
        Date.now()
      ).run();
      
      return jsonResponse({ success: true });
    } catch (e) {
      console.error(e);
      return jsonResponse({ error: 'Username Taken' }, 409);
    }
  }

  /**
   * [修改] 用户每日签到 (修复竞态条件)
   * 使用数据库原子更新防止并发双倍领取
   * 支持用户本地时区
   */
  async checkIn(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);

    // 1. 获取用户最新状态
    const user = await this.env.DB.prepare(
      'SELECT id, login_streak, last_login_date FROM users WHERE id = ?'
    ).bind(currentUser.id).first();

    if (!user) return jsonResponse({ error: 'User not found' }, 404);

    // 2. 获取用户时区偏移 (分钟)
    const timezoneOffset = this.parseTimezoneOffset(request);
    
    // 3. 日期判断 (使用用户本地时区)
    const now = new Date();
    const todayStr = this.getLocalDateString(now, timezoneOffset);
    const fullDateStr = now.toISOString(); // 数据库仍存储 UTC 时间
    
    let lastDateStr = null;
    if (user.last_login_date) {
      const lastDate = new Date(user.last_login_date);
      lastDateStr = this.getLocalDateString(lastDate, timezoneOffset);
    }

    // 内存预判 (减轻DB压力)
    if (lastDateStr === todayStr) {
      return jsonResponse({ error: 'Already checked in today' }, 400);
    }

    // 4. 计算连续签到天数 (使用本地时区日期)
    let streak = user.login_streak || 0;
    if (lastDateStr && this.isConsecutiveDay(lastDateStr, todayStr)) {
      streak += 1;
    } else {
      streak = 1; // 断签重置
    }

    // 5. 计算奖励
    const streakBonusArr = CONFIG.LEVEL.CHECK_IN.STREAK_BONUS;
    const bonusIndex = Math.min(streak - 1, streakBonusArr.length - 1);
    const streakBonus = streakBonusArr[bonusIndex] || 0;
    
    const coinsReward = CONFIG.LEVEL.CHECK_IN.BASE_COINS + streakBonus;
    const expReward = CONFIG.LEVEL.EXP_GAIN.CHECK_IN;

    // 6. 数据库原子更新 (WHERE 子句包含日期检查，防止并发)
    // [修复] 升级时需要正确处理 exp 字段
    // 注意：这里仍然使用 UTC 日期进行比较，因为数据库存储的是 UTC
    // 但我们需要将用户本地日期转换为 UTC 日期进行比较
    const utcTodayStr = now.toISOString().split('T')[0];
    
    // 先计算是否会升级
    const currentTotalExp = (currentUser.total_exp || 0) + expReward;
    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expReward);
    
    let result;
    if (levelUpInfo.hasLevelUp) {
        // 升级时：设置新等级，exp 重置为新等级的剩余经验
        const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
        result = await this.env.DB.prepare(
          `UPDATE users
           SET coins = coins + ?,
               level = ?,
               exp = ?,
               total_exp = total_exp + ?,
               last_login_date = ?,
               login_streak = ?
           WHERE id = ?
           AND (last_login_date IS NULL OR substr(last_login_date, 1, 10) != ?)`
        ).bind(coinsReward, levelUpInfo.newLevel, newExp, expReward, fullDateStr, streak, currentUser.id, utcTodayStr).run();
    } else {
        // 未升级时：正常累加经验
        result = await this.env.DB.prepare(
          `UPDATE users
           SET coins = coins + ?,
               exp = exp + ?,
               total_exp = total_exp + ?,
               last_login_date = ?,
               login_streak = ?
           WHERE id = ?
           AND (last_login_date IS NULL OR substr(last_login_date, 1, 10) != ?)`
        ).bind(coinsReward, expReward, expReward, fullDateStr, streak, currentUser.id, utcTodayStr).run();
    }

    // 7. 检查是否更新成功 (meta.changes === 0 说明被并发拦截)
    if (result.meta.changes === 0) {
        return jsonResponse({ error: 'Already checked in today' }, 400);
    }

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    currentUser.total_exp = (currentUser.total_exp || 0) + expReward;
    currentUser.coins = (currentUser.coins || 0) + coinsReward;
    if (levelUpInfo.hasLevelUp) {
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
      currentUser.coins = (currentUser.coins || 0) + levelUpInfo.coinsReward;
    } else {
      currentUser.exp = (currentUser.exp || 0) + expReward;
    }

    // [新增] 关键：清除缓存
    await this.invalidateUserCache(currentUser.id);

    return jsonResponse({
      success: true,
      userCoins: currentUser.coins,
      checkIn: {
        coins: coinsReward,
        exp: expReward,
        streak: streak,
        streakBonus: streakBonus,
        timezoneOffset: timezoneOffset,
        localDate: todayStr
      }
    });
  }

  /**
   * [新增] 领取等级奖励
   */
  async claimReward(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    
    const { targetLevel } = await request.json();
    const level = parseInt(targetLevel);
    
    // 1. 验证参数
    if (isNaN(level) || !CONFIG.LEVEL.REWARDS.MILESTONES[level]) {
      return jsonResponse({ error: 'Invalid reward level' }, 400);
    }

    // 2. 验证用户等级
    const user = await this.env.DB.prepare(
      'SELECT level FROM users WHERE id = ?'
    ).bind(currentUser.id).first();

    if (user.level < level) {
      return jsonResponse({ error: 'Level requirement not met' }, 403);
    }

    // 3. 检查是否已领取
    // 使用 level_rewards 表记录领取状态
    const claimed = await this.env.DB.prepare(
      'SELECT id FROM level_rewards WHERE user_id = ? AND level = ?'
    ).bind(currentUser.id, level).first();

    if (claimed) {
      return jsonResponse({ error: 'Reward already claimed' }, 409);
    }

    // 4. 发放奖励
    const rewardConfig = CONFIG.LEVEL.REWARDS.MILESTONES[level];
    const coinsToAdd = rewardConfig.coins || 0;
    const batch = [];

    // 加金币
    if (coinsToAdd > 0) {
      batch.push(
        this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?')
          .bind(coinsToAdd, currentUser.id)
      );
    }

    // 如果有称号，加称号
    if (rewardConfig.title) {
      batch.push(
        this.env.DB.prepare(
          // 注意这里使用的是 title_id 字段，与 schema.sql 对应
          'INSERT OR IGNORE INTO user_titles (user_id, title_id, unlocked_at) VALUES (?, ?, ?)'
        ).bind(currentUser.id, rewardConfig.title, Date.now())
      );
    }

    // 记录领取状态 (表结构: id, user_id, level, reward_type, reward_data, claimed_at)
    // 假设 reward_type 固定为 'milestone'
    batch.push(
      this.env.DB.prepare(
        'INSERT INTO level_rewards (user_id, level, reward_type, reward_data, claimed_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(currentUser.id, level, 'milestone', JSON.stringify(rewardConfig), Date.now())
    );

    await this.env.DB.batch(batch);
     
     // [修复] 更新内存中的用户数据
     currentUser.coins = (currentUser.coins || 0) + coinsToAdd;
     
     // [新增] 清除缓存
     await this.invalidateUserCache(currentUser.id);
     
     return jsonResponse({ success: true, userCoins: currentUser.coins, reward: rewardConfig });
  }

  // 辅助函数：判断日期连续
  isConsecutiveDay(lastDateStr, todayStr) {
    const last = new Date(lastDateStr);
    const current = new Date(todayStr);
    // 重置时间为0点，确保只比较日期
    last.setHours(0,0,0,0);
    current.setHours(0,0,0,0);
    const diffTime = Math.abs(current - last);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  // 获取用户本地时区的日期字符串 (YYYY-MM-DD)
  // timezoneOffset: 时区偏移分钟数 (如 +480 表示 UTC+8)
  getLocalDateString(date, timezoneOffset = 0) {
    // 将 UTC 时间转换为本地时间
    const localTime = new Date(date.getTime() + timezoneOffset * 60000);
    const year = localTime.getUTCFullYear();
    const month = String(localTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 从请求头解析时区偏移 (分钟)
  parseTimezoneOffset(request) {
    const tzHeader = request.headers.get('X-User-Timezone');
    if (!tzHeader) return 0; // 默认 UTC
    
    // 格式可以是 "+08:00" 或 "480" (分钟)
    if (tzHeader.includes(':')) {
      const match = tzHeader.match(/^([+-]?)(\d{1,2}):(\d{2})$/);
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2], 10);
        const minutes = parseInt(match[3], 10);
        return sign * (hours * 60 + minutes);
      }
    }
    
    const offset = parseInt(tzHeader, 10);
    return isNaN(offset) ? 0 : offset;
  }

  async login(request) {
    const { username, password } = await request.json();
    
    // 1. 查询用户信息（包括密码哈希和金币）
    const user = await this.env.DB.prepare(
      'SELECT id, username, nickname, password, coins, level, exp, total_exp FROM users WHERE username = ?'
    ).bind(username).first();

    if (!user) return jsonResponse({ error: 'Invalid Credentials' }, 403);

    // [安全] 验证密码哈希
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return jsonResponse({ error: 'Invalid Credentials' }, 403);
    }

    // [修复] 基于 total_exp 重新计算等级和当前经验值，确保数据一致性
    const totalExp = user.total_exp || 0;
    const { level: calculatedLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);

    // 2. 生成 Token
    const token = crypto.randomUUID();
    
    // 3. 构建 Session 数据
    // 使用基于 total_exp 计算出的正确等级和经验值
    const sessionData = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      coins: user.coins || 0,
      level: calculatedLevel,
      exp: currentExp,
      total_exp: user.total_exp
    };
    
    // 4. 存入 KV 缓存
    await this.env.KV_CACHE.put(`session:${token}`, JSON.stringify(sessionData), { expirationTtl: CONFIG.TTL.SESSION });

    // 5. 返回结果
    // 移除了 daily_login_reward 字段
    return jsonResponse({
      success: true,
      token,
      user: sessionData
    });
  }

  // [修改] getInfo: 移除 inventory 子查询，轻量化
  async getInfo(currentUser) {
    if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    const cacheKey = `uinfo:${currentUser.id}`;
    const cachedData = await this.env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cachedData) {
      return jsonResponse(cachedData, 200, { 'X-Cache-Status': 'HIT' });
    }

    // 优化后的 SQL：移除 inv_json 子查询
    const sql = `
      SELECT 
        u.username, u.nickname, u.coins, u.draw_count, u.wins, 
        u.level, u.exp, u.total_exp, u.last_login_date,
        (
          SELECT title_id 
          FROM user_titles 
          WHERE user_id = u.id AND is_equipped = 1
        ) as active_title
      FROM users u
      WHERE u.id = ?
    `;

    const userRes = await this.env.DB.prepare(sql).bind(currentUser.id).first();
    if (!userRes) return jsonResponse({ error: 'User Not Found' }, 404);

    // [修复] 基于 total_exp 重新计算等级和当前经验值，确保数据一致性
    const totalExp = userRes.total_exp || 0;
    const { level: calculatedLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);
    const currentLevel = calculatedLevel;
    const requiredExpForNextLevel = this.calculateRequiredExp(currentLevel + 1);
    const levelProgress = this.calculateLevelProgress(currentExp, currentLevel);
    
    // 处理称号
    let currentTitle = null;
    if (userRes.active_title) {
        currentTitle = { name: userRes.active_title };
    }

    // 响应中不再包含 inventory
    const responseData = {
      username: userRes.username,
      nickname: userRes.nickname,
      coins: userRes.coins,
      drawCount: userRes.draw_count,
      wins: userRes.wins,
      level: currentLevel,
      exp: currentExp,
      level_progress: levelProgress,
      required_exp_next: requiredExpForNextLevel, 
      title: currentTitle
    };

    this.ctx.waitUntil(
      this.env.KV_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: CONFIG.TTL.USER_INFO })
    );

    return jsonResponse(responseData, 200, { 'X-Cache-Status': 'MISS' });
  }

  // [新增] 专门获取库存的方法
  async getInventory(currentUser) {
    if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    const cacheKey = `uinv:${currentUser.id}`;
    const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' });
    if (cached) return jsonResponse(cached, 200, { 'X-Cache-Status': 'HIT' });

    // 简单的查询，不涉及 JOIN，速度快
    const results = await this.env.DB.prepare(
        'SELECT rarity, count FROM inventory WHERE user_id = ?'
    ).bind(currentUser.id).all();
    
    const inventory = {};
    // 初始化所有稀有度为 0
    ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => inventory[r] = 0);
    
    if (results.results) {
        results.results.forEach(row => {
            inventory[row.rarity] = row.count;
        });
    }

    // 缓存 60秒
    this.ctx.waitUntil(
        this.env.KV_CACHE.put(cacheKey, JSON.stringify(inventory), { expirationTtl: 60 })
    );
    
    return jsonResponse(inventory, 200, { 'X-Cache-Status': 'MISS' });
  }

  // [新增] 获取用户拥有的所有称号
  async getTitles(currentUser) {
    if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
    
    const titles = await this.env.DB.prepare(
        'SELECT title_id, is_equipped, unlocked_at FROM user_titles WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).bind(currentUser.id).all();
    
    return jsonResponse({ 
        success: true, 
        titles: titles.results || [] 
    });
  }

  // [新增] 装备/卸下称号
  async equipTitle(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
    const { titleId } = await request.json(); // titleId 传 null 代表卸下
    
    // 1. 如果是卸下称号
    if (!titleId) {
        await this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id).run();
        return jsonResponse({ success: true, message: 'Title unequipped' });
    }

    // 2. 检查是否拥有该称号
    const hasTitle = await this.env.DB.prepare(
        'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?'
    ).bind(currentUser.id, titleId).first();

    if (!hasTitle) return jsonResponse({ error: 'Title not owned' }, 403);

    // 3. 事务：先全部卸下，再装备指定的
    const batch = [
        this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id),
        this.env.DB.prepare('UPDATE user_titles SET is_equipped = 1 WHERE user_id = ? AND title_id = ?').bind(currentUser.id, titleId)
    ];
    
    await this.env.DB.batch(batch);
     
     // [新增] 清除缓存
     await this.invalidateUserCache(currentUser.id);
     
     return jsonResponse({ success: true, message: 'Title equipped', title: { name: titleId } });
  }

  // [新增] 修改昵称方法
  async updateProfile(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Unauthorized' }, 401);
    const { nickname } = await request.json();
    
    if (!nickname || nickname.length > 20) {
        return jsonResponse({ error: 'Invalid Nickname' }, 400);
    }

    try {
        await this.env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?')
            .bind(nickname, currentUser.id).run();
        
        // [新增] 清除用户缓存，确保下次 getInfo 拉取到新昵称
        await this.invalidateUserCache(currentUser.id);
        
        return jsonResponse({ success: true, nickname });
    } catch(e) {
        console.error('Update profile error:', e);
        return jsonResponse({ error: 'Update failed' }, 500);
    }
  }  
}

/**
 * GitHub 图床上传辅助函数
 * @param {Object} env - 环境变量
 * @param {string} path - GitHub 文件路径
 * @param {ArrayBuffer} content - 文件内容
 * @param {string} extension - 文件扩展名
 * @param {string} message - Git commit 消息
 * @returns {Promise<string|null>} - 成功返回图片 URL，失败返回 null
 */
async function uploadToGithub(env, path, content, extension, message) {
  try {
    const githubToken = env.GITHUB_TOKEN;
    const repoOwner = env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER;
    const repoName = env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO;

    if (!githubToken) {
      console.error('[GitHub Upload] Missing GITHUB_TOKEN environment variable');
      return null;
    }

    // 将 ArrayBuffer 转换为 Base64
    const base64Content = btoa(String.fromCharCode(...new Uint8Array(content)));

    // 构建 API URL
    const apiUrl = `${TECHNICAL_CONFIG.GITHUB.API_BASE}/repos/${repoOwner}/${repoName}/contents/${path}`;

    // 检查文件是否已存在（GitHub API 要求提供 sha）
    let sha = null;
    try {
      const checkRes = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Chouka-Worker'
        }
      });

      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }
    } catch (e) {
      // 文件不存在，继续上传
    }

    // 构建请求体
    const requestBody = {
      message: message,
      content: base64Content,
      branch: TECHNICAL_CONFIG.GITHUB.BRANCH
    };

    if (sha) {
      requestBody.sha = sha;
    }

    // 上传到 GitHub
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Chouka-Worker'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GitHub Upload] API Error:', response.status, response.statusText);
      console.error('[GitHub Upload] Error Details:', errorText);
      console.error('[GitHub Upload] Request URL:', apiUrl);
      console.error('[GitHub Upload] Token exists:', !!githubToken);
      console.error('[GitHub Upload] Token length:', githubToken ? githubToken.length : 0);
      return null;
    }

    const result = await response.json();

    // 返回 CDN 加速 URL (jsDelivr)
    // 格式: https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}
    const cdnUrl = `${TECHNICAL_CONFIG.GITHUB.CDN_BASE}/${repoOwner}/${repoName}@${TECHNICAL_CONFIG.GITHUB.BRANCH}/${path}`;

    console.log(`[GitHub Upload] Success: ${cdnUrl}`);
    return cdnUrl;

  } catch (e) {
    console.error('[GitHub Upload] Error:', e);
    return null;
  }
}

class GachaService {
  constructor(env, ctx, userService) {
    this.env = env;
    this.ctx = ctx;
    this.userService = userService;
  }

  /**
   * 缓冲池补充（后台异步）
   */
  async safeRefillGlobalBuffer(rarity, sourceList, slotIndex) {
      // 添加随机延迟，打散写入压力（0-3秒）
      await new Promise(r => setTimeout(r, Math.random() * 3000));

      try {
          const asset = await this.fetchAndUploadRandom(sourceList);
          if (asset.success) {
              const idx = slotIndex !== undefined ? slotIndex : Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
              const key = `${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${idx}`;
              await this.env.KV_CACHE.put(key, JSON.stringify(asset), { expirationTtl: CONFIG.TTL.STATIC_ASSET });
          }
      } catch (e) {
          console.error(`[Safe Refill Error] ${rarity}:`, e);
      }
  }

  // --- 缓冲系统保持不变 ---
  async consumeGlobalBuffer(rarity, sourceList) {
    const slotIndex = Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
    const key = `${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${slotIndex}`;
    const cachedAsset = await this.env.KV_CACHE.get(key, { type: 'json' });

    if (cachedAsset && cachedAsset.success) {
      this.ctx.waitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, slotIndex));
      return cachedAsset;
    }

    const freshAsset = await this.fetchAndUploadRandom(sourceList);
    this.ctx.waitUntil(this.safeRefillGlobalBuffer(rarity, sourceList, slotIndex));
    return freshAsset;
  }

  async fetchAndUploadRandom(sourceList) {
      const source = sourceList[Math.floor(Math.random() * sourceList.length)];
      return await this.fetchAndUpload(source);
  }

  async fetchAndUpload(source) {
    try {
        // 1. 获取重定向后的真实图片链接 (解决 api.anosu.top 返回 302 跳转的问题)
        // 我们需要先拿到真实的图片地址，才能传给压缩服务
        const initRes = await fetch(source.url, {
            method: 'HEAD', // 只获取头信息，不下载内容，速度快
            redirect: 'follow'
        });
        const finalUrl = initRes.url; // 这是真实的图片地址 (例如 https://i.pixiv.cat/xxx.jpg)

        // 2. 构建压缩代理 URL
        // 使用 wsrv.nl (Weserv) 免费服务
        // output=webp: 强制转为 webp
        // q=75: 质量 75%
        // w=1200: 宽度限制在 1200px (防止超大图)
        // il: 即使原图有防盗链也尝试加载
        const compressedUrl = `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&q=75&w=1200&il`;

        // 3. 下载已压缩的图片数据
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8秒超时
        const imgRes = await fetch(compressedUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (imgRes.ok) {
            // 获取压缩后的数据
            const compressedBuffer = await imgRes.arrayBuffer();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).slice(2, 8);
            
            // 既然我们要了 webp，扩展名就是 webp
            const extension = 'webp';
            const contentType = 'image/webp';
            
            // 检查大小：如果 Weserv 挂了或者返回空，做个兜底
            if (compressedBuffer.byteLength < 100) {
                throw new Error('Compressed image too small');
            }

            const filename = `images/${source.rarity}_${timestamp}_${randomStr}.${extension}`;
            
            // 4. 上传到 R2
            await this.env.R2_BUCKET.put(filename, compressedBuffer, {
                httpMetadata: {
                    contentType: contentType,
                    // 缓存 1 年
                    cacheControl: `public, max-age=${CONFIG.TTL.STATIC_ASSET}, immutable`
                }
            });
            
            console.log(`[Compression] Saved: ${(compressedBuffer.byteLength / 1024).toFixed(2)} KB`);

            return {
                success: true,
                imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`,
                rarity: source.rarity,
                sourceName: source.name
            };
        }
    } catch (e) {
        console.error('Fetch/Compress Error:', e);
        // 这里可以做个降级：如果压缩服务挂了，尝试直接下载原图上传
        // 但为了代码简洁，暂时返回失败，系统会自动重试
    }
    return { success: false, rarity: 'N', imageUrl: CONFIG.DEFAULT_IMG };
  }

  /**
   * [优化] 纯内存计算升级逻辑，不查库
   */
  calculateLevelUpRaw(currentUser, expGained) {
    // [修复] 基于 total_exp 重新计算当前等级，不依赖可能过期的 session 数据
    const originalTotalExp = currentUser.total_exp || 0;
    const currentTotalExp = originalTotalExp + expGained;
    
    const { level: currentLevel } = this.userService.calculateLevelFromTotalExp(originalTotalExp);
    const { level: calculatedLevel } = this.userService.calculateLevelFromTotalExp(currentTotalExp);

    if (calculatedLevel > currentLevel) {
      const levelsGained = calculatedLevel - currentLevel;
      const coinsReward = levelsGained * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL;
      return {
        hasLevelUp: true,
        newLevel: calculatedLevel,
        coinsReward: coinsReward
      };
    }
    return { hasLevelUp: false, coinsReward: 0 };
  }

  /**
   * [优化] 常规抽卡：0 读取，1 Batch 写入
   */
  async draw(currentUser) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    
    // 1. 获取资源
    const targetSource = CONFIG.SOURCES[Math.floor(Math.random() * CONFIG.SOURCES.length)];
    const targetRarity = targetSource.rarity;
    const sourcesOfThisRarity = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    
    let assetData = await this.consumeGlobalBuffer(targetRarity, sourcesOfThisRarity);
    if (!assetData.success) return jsonResponse({ success: false, message: '系统繁忙，请重试' });

    // 2. 内存计算数值
    const points = CONFIG.GAME.POINTS[assetData.rarity] || 5;
    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[assetData.rarity] || 5;
    const timestamp = Date.now();

    // 3. 计算升级 (Memory only)
    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
    const totalCoinsToAdd = points + levelUpInfo.coinsReward;

    // 4. 构建原子 Batch
    const batch = [];
    
    // 构建 User 更新语句 (合并金币、经验、等级)
    // [修复] 升级时需要重置 exp 为新等级的剩余经验值，而不是继续累加
    let userSql, userParams;
    if (levelUpInfo.hasLevelUp) {
        // 升级时：设置新等级，exp 重置为计算后的剩余经验
        const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
        userSql = 'UPDATE users SET coins = coins + ?, draw_count = draw_count + 1, level = ?, exp = ?, total_exp = total_exp + ?';
        userParams = [totalCoinsToAdd, levelUpInfo.newLevel, newExp, expGain];
    } else {
        // 未升级时：正常累加经验
        userSql = 'UPDATE users SET coins = coins + ?, draw_count = draw_count + 1, exp = exp + ?, total_exp = total_exp + ?';
        userParams = [totalCoinsToAdd, expGain, expGain];
    }
    userSql += ' WHERE id = ?';
    userParams.push(currentUser.id);
    batch.push(this.env.DB.prepare(userSql).bind(...userParams));

    // Inventory 更新
    batch.push(this.env.DB.prepare(`
        INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1)
        ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1
    `).bind(currentUser.id, assetData.rarity));

    // 执行 Batch
    await this.env.DB.batch(batch);

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
    currentUser.coins = (currentUser.coins || 0) + totalCoinsToAdd;
    if (levelUpInfo.hasLevelUp) {
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
    } else {
      currentUser.exp = (currentUser.exp || 0) + expGain;
    }

    // 5. 异步副作用 (缓存/索引/排行榜)
    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));
    this.ctx.waitUntil(updateGalleryIndex(this.env, { url: assetData.imageUrl, username: currentUser.username, userId: currentUser.id, ts: timestamp }));
    
    // [优化] 仅 UR 级图片进入精选图库
    if (assetData.rarity === 'UR') {
        this.ctx.waitUntil(updateLeaderboard(this.env, {
            username: currentUser.nickname, imageUrl: assetData.imageUrl, rarity: assetData.rarity, timestamp
        }));
    }

    // 6. 返回前端所需数据，避免前端再次 fetchUserInfo
    return jsonResponse({
        success: true,
        rarity: assetData.rarity,
        imageUrl: assetData.imageUrl,
        pointsEarned: points,
        expGained: expGain,
        // 返回最新的金币数
        userCoins: currentUser.coins,
        levelUp: levelUpInfo.hasLevelUp ? { newLevel: levelUpInfo.newLevel, reward: levelUpInfo.coinsReward } : null
    });
  }

  /**
   * 获取可用的限定池列表
   */
  async getLimitedPools(currentUser) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    
    try {
      // 检查用户上传池是否有已审核的图片
      const uploadCount = await this.env.DB.prepare(
        'SELECT COUNT(*) as count FROM user_uploads WHERE status = ?'
      ).bind('approved').first();
      
      const pools = Object.entries(CONFIG.LIMITED.POOLS).map(([id, pool]) => ({
        id,
        name: pool.name,
        description: pool.description,
        cost: CONFIG.LIMITED.COST,
        type: pool.type,
        available: pool.type === 'uploads' ? uploadCount.count > 0 : true,
        count: pool.type === 'uploads' ? uploadCount.count : null
      }));
      
      return jsonResponse({ 
        success: true, 
        pools,
        defaultPool: CONFIG.LIMITED.DEFAULT_POOL
      });
    } catch (e) {
      console.error('[Get Pools Error]:', e);
      return jsonResponse({ error: 'Failed to get pools' }, 500);
    }
  }

  /**
   * [优化] 限定池：支持切换不同图池
   */
  async drawLimited(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    const cost = CONFIG.LIMITED.COST;
    
    // 获取选择的图池
    let poolId = CONFIG.LIMITED.DEFAULT_POOL;
    try {
      const body = await request.json();
      poolId = body.poolId || poolId;
      console.log(`[DrawLimited] Received poolId: ${poolId}, body:`, body);
    } catch (e) {
      // 如果没有请求体，使用默认池
      console.log(`[DrawLimited] No body found, using default poolId: ${poolId}`);
    }
    
    const pool = CONFIG.LIMITED.POOLS[poolId];
    console.log(`[DrawLimited] poolId: ${poolId}, pool:`, pool);
    if (!pool) {
      return jsonResponse({ error: 'Invalid pool' }, 400);
    }

    // 1. 扣费 (Write) - 利用 affected rows 判断余额是否充足
    const deductRes = await this.env.DB.prepare(
        'UPDATE users SET coins = coins - ?, draw_count = draw_count + 1 WHERE id = ? AND coins >= ?'
    ).bind(cost, currentUser.id, cost).run();

    if (deductRes.meta.changes === 0) return jsonResponse({ error: 'Not Enough Points' }, 403);
    
    // 内存更新余额 (用于后续计算)
    currentUser.coins = (currentUser.coins || cost) - cost;

    // 2. 获取资源 - 直接请求API，不使用预抽卡
    let assetData;
    const source = pool.sources[Math.floor(Math.random() * pool.sources.length)];
    console.log(`[DrawLimited] Fetching from API: ${source?.url}`);
    assetData = await this.fetchRandomImageAPI(source?.url);
    console.log(`[DrawLimited] API result:`, assetData);

    // 3. 失败退款
    if (!assetData || !assetData.success) {
      await this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(cost, currentUser.id).run();
      return jsonResponse({ 
        success: false, 
        error: 'api_empty',
        message: '卡池暂时空缺，积分已退还' 
      });
    }

    // 4. 计算与 Batch 更新
    // [修复] 升级时需要正确处理 exp 字段
    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW['UR'] || 500;
    const currentTotalExp = (currentUser.total_exp || 0) + expGain;
    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
    const batch = [];
    
    let userSql, userParams;
    if (levelUpInfo.hasLevelUp) {
        // 升级时：设置新等级和金币奖励，exp 重置为新等级的剩余经验
        const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
        userSql = 'UPDATE users SET level = ?, exp = ?, total_exp = total_exp + ?, coins = coins + ?';
        userParams = [levelUpInfo.newLevel, newExp, expGain, levelUpInfo.coinsReward];
    } else {
        // 未升级时：正常累加经验
        userSql = 'UPDATE users SET exp = exp + ?, total_exp = total_exp + ?';
        userParams = [expGain, expGain];
    }
    userSql += ' WHERE id = ?';
    userParams.push(currentUser.id);
    
    batch.push(this.env.DB.prepare(userSql).bind(...userParams));
    batch.push(this.env.DB.prepare(`INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1`).bind(currentUser.id, assetData.rarity));

    await this.env.DB.batch(batch);

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
    if (levelUpInfo.hasLevelUp) {
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
      currentUser.coins = (currentUser.coins || 0) + levelUpInfo.coinsReward;
    } else {
      currentUser.exp = (currentUser.exp || 0) + expGain;
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));
    this.ctx.waitUntil(updateGalleryIndex(this.env, { url: assetData.imageUrl, username: currentUser.username, userId: currentUser.id, ts: Date.now() }));
    // [优化] 限定池仅 UR 级图片进入精选图库
    if (assetData.rarity === 'UR') {
        this.ctx.waitUntil(updateLeaderboard(this.env, { username: currentUser.nickname, imageUrl: assetData.imageUrl, rarity: assetData.rarity, timestamp: Date.now() }));
    }

    return jsonResponse({
        success: true, imageUrl: assetData.imageUrl, rarity: assetData.rarity, expGained: expGain,
        userCoins: currentUser.coins
    });
  }

  /**
   * [优化] 合成逻辑
   */
  async craft(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    const { targetRarity } = await request.json();
    const recipe = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const costRarity = recipe[targetRarity];
    if (!costRarity) return jsonResponse({ error: 'Invalid Recipe' }, 400);

    // 1. 扣素材
    const deductRes = await this.env.DB.prepare(
        'UPDATE inventory SET count = count - 5 WHERE user_id = ? AND rarity = ? AND count >= 5'
    ).bind(currentUser.id, costRarity).run();

    if (deductRes.meta.changes === 0) return jsonResponse({ error: `Not enough ${costRarity} cards` }, 403);

    // 2. 获取目标卡
    const sources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    const validSources = sources.length > 0 ? sources : CONFIG.SOURCES; 
    const assetData = await this.consumeGlobalBuffer(targetRarity, validSources);

    // 3. 失败退素材
    if (!assetData.success) {
      await this.env.DB.prepare('UPDATE inventory SET count = count + 5 WHERE user_id = ? AND rarity = ?').bind(currentUser.id, costRarity).run();
      return jsonResponse({ success: false, message: '合成失败，素材已退还' });
    }

    // 4. Batch 更新
    // [修复] 升级时需要正确处理 exp 字段
    const expGain = CONFIG.LEVEL.EXP_GAIN.CRAFT;
    const currentTotalExp = (currentUser.total_exp || 0) + expGain;
    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
    const batch = [];

    let userSql, userParams;
    if (levelUpInfo.hasLevelUp) {
        // 升级时：设置新等级和金币奖励，exp 重置为新等级的剩余经验
        const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
        userSql = 'UPDATE users SET level = ?, exp = ?, total_exp = total_exp + ?, coins = coins + ?';
        userParams = [levelUpInfo.newLevel, newExp, expGain, levelUpInfo.coinsReward];
    } else {
        // 未升级时：正常累加经验
        userSql = 'UPDATE users SET exp = exp + ?, total_exp = total_exp + ?';
        userParams = [expGain, expGain];
    }
    userSql += ' WHERE id = ?';
    userParams.push(currentUser.id);

    batch.push(this.env.DB.prepare(userSql).bind(...userParams));
    batch.push(this.env.DB.prepare(`INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1`).bind(currentUser.id, assetData.rarity));
   
    await this.env.DB.batch(batch);

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
    if (levelUpInfo.hasLevelUp) {
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
    } else {
      currentUser.exp = (currentUser.exp || 0) + expGain;
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));
    // [优化] 合成系统仅 UR 级图片进入精选图库
    if (assetData.rarity === 'UR') {
        this.ctx.waitUntil(updateLeaderboard(this.env, { username: currentUser.nickname, imageUrl: assetData.imageUrl, rarity: assetData.rarity, timestamp: Date.now() }));
    }
    this.ctx.waitUntil(updateGalleryIndex(this.env, { url: assetData.imageUrl, username: currentUser.username, userId: currentUser.id, ts: Date.now() }));

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    if (levelUpInfo.hasLevelUp) {
      currentUser.coins = (currentUser.coins || 0) + levelUpInfo.coinsReward;
    }

    return jsonResponse({
        success: true, rarity: assetData.rarity, imageUrl: assetData.imageUrl, expGained: expGain,
        userCoins: currentUser.coins,
        // 告知前端本次消耗和获得，以便前端自行更新，无需 fetch
        craftResult: { consumed: costRarity, gained: assetData.rarity }
    });
  }

  async shopBuy(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    const { targetRarity } = await request.json();
    const price = CONFIG.GAME.SHOP[targetRarity];
    if (!price) return jsonResponse({ error: 'Invalid Pack' }, 400);

    const deductRes = await this.env.DB.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').bind(price, currentUser.id, price).run();
    if (deductRes.meta.changes === 0) return jsonResponse({ error: 'Not Enough Points' }, 403);
    
    currentUser.coins = (currentUser.coins || price) - price;

    const sources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    const validSources = sources.length > 0 ? sources : CONFIG.SOURCES;
    const assetData = await this.consumeGlobalBuffer(targetRarity, validSources);

    if (!assetData.success) {
      await this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(price, currentUser.id).run();
      return jsonResponse({ success: false, message: '购买失败，积分已退还' });
    }

    // [修复] 升级时需要正确处理 exp 字段
    const expGain = CONFIG.LEVEL.EXP_GAIN.SHOP_BUY;
    const currentTotalExp = (currentUser.total_exp || 0) + expGain;
    const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
    const batch = [];
    
    let userSql, userParams;
    if (levelUpInfo.hasLevelUp) {
        // 升级时：设置新等级和金币奖励，exp 重置为新等级的剩余经验
        const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
        userSql = 'UPDATE users SET level = ?, exp = ?, total_exp = total_exp + ?, coins = coins + ?';
        userParams = [levelUpInfo.newLevel, newExp, expGain, levelUpInfo.coinsReward];
    } else {
        // 未升级时：正常累加经验
        userSql = 'UPDATE users SET exp = exp + ?, total_exp = total_exp + ?';
        userParams = [expGain, expGain];
    }
    userSql += ' WHERE id = ?';
    userParams.push(currentUser.id);

    batch.push(this.env.DB.prepare(userSql).bind(...userParams));
    batch.push(this.env.DB.prepare(`INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1`).bind(currentUser.id, assetData.rarity));
   
    await this.env.DB.batch(batch);

    // [修复] 更新内存中的用户数据，确保后续操作使用最新值
    currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
    if (levelUpInfo.hasLevelUp) {
      currentUser.level = levelUpInfo.newLevel;
      currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
      currentUser.coins = (currentUser.coins || 0) + levelUpInfo.coinsReward;
    } else {
      currentUser.exp = (currentUser.exp || 0) + expGain;
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));
    this.ctx.waitUntil(updateGalleryIndex(this.env, { url: assetData.imageUrl, username: currentUser.username, userId: currentUser.id, ts: Date.now() }));

    return jsonResponse({
        success: true, imageUrl: assetData.imageUrl, rarity: assetData.rarity, expGained: expGain,
        userCoins: currentUser.coins
    });
  }

  async playDice(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    const { betAmount, prediction } = await request.json();
    const bet = parseInt(betAmount);
    if (isNaN(bet) || bet < 10 || bet > 1000) return jsonResponse({ error: 'Invalid Bet' }, 400);
    if (!['small', 'big'].includes(prediction)) return jsonResponse({ error: 'Invalid Prediction' }, 400);

    const deductRes = await this.env.DB.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').bind(bet, currentUser.id, bet).run();
    if (deductRes.meta.changes === 0) return jsonResponse({ error: 'Not Enough Points' }, 403);
    
    // 更新内存余额
    currentUser.coins = (currentUser.coins || bet) - bet;

    const roll = Math.floor(Math.random() * 6) + 1;
    const isSmall = roll <= 3;
    const isWin = (prediction === 'small' && isSmall) || (prediction === 'big' && !isSmall);
    let winAmount = 0;
    let expGain = 0;
    
    const batch = [];
    let logDetail = `Bet:${bet} Roll:${roll} `;

    // [修复] 升级时需要正确处理 exp 字段
    if (isWin) {
        winAmount = bet * 2;
        expGain = CONFIG.LEVEL.EXP_GAIN.DICE_WIN;

        // 内存计算升级
        const currentTotalExp = (currentUser.total_exp || 0) + expGain;
        const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);

        let userSql, userParams;

        if (levelUpInfo.hasLevelUp) {
            // 升级时：金币 = 当前 + 赢钱 + 升级奖励，exp 重置为新等级的剩余经验
            const totalCoinsAdd = winAmount + levelUpInfo.coinsReward;
            const newExp = currentTotalExp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
            userSql = 'UPDATE users SET coins = coins + ?, wins = wins + 1, level = ?, exp = ?, total_exp = total_exp + ? WHERE id = ?';
            userParams = [totalCoinsAdd, levelUpInfo.newLevel, newExp, expGain, currentUser.id];
            currentUser.coins += totalCoinsAdd;
        } else {
            // 未升级时：金币 = 当前 + 赢钱
            userSql = 'UPDATE users SET coins = coins + ?, wins = wins + 1, exp = exp + ?, total_exp = total_exp + ? WHERE id = ?';
            userParams = [winAmount, expGain, expGain, currentUser.id];
            currentUser.coins += winAmount;
        }

        batch.push(this.env.DB.prepare(userSql).bind(...userParams));
        logDetail += `Win:${winAmount} Exp:${expGain}`;
    } else {
        // 输了只记录日志，不更新用户数据（已提前扣款）
        logDetail += `Lose`;
    }

    // 只有在有SQL语句时才执行batch（赢了才有更新，输了无更新）
    if (batch.length > 0) {
        await this.env.DB.batch(batch);
    }

    // [修复] 更新内存中的用户数据（仅在赢时获得经验）
    if (isWin && expGain > 0) {
      const levelUpInfo = this.calculateLevelUpRaw(currentUser, expGain);
      currentUser.total_exp = (currentUser.total_exp || 0) + expGain;
      if (levelUpInfo.hasLevelUp) {
        currentUser.level = levelUpInfo.newLevel;
        currentUser.exp = currentUser.total_exp - (globalThis.XP_TABLE[levelUpInfo.newLevel] || 0);
      } else {
        currentUser.exp = (currentUser.exp || 0) + expGain;
      }
    }

    this.ctx.waitUntil(this.userService.invalidateUserCache(currentUser.id));

    return jsonResponse({ success: true, roll, isWin, winAmount, expGained: expGain, userCoins: currentUser.coins });
  }

  /**
   * [修改] 用户上传图片 - 上传到 GitHub
   */
  async uploadImage(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);

    try {
      const formData = await request.formData();
      const file = formData.get('image');
      const rarity = formData.get('rarity') || 'N';

      if (!file) return jsonResponse({ error: 'No image provided' }, 400);

      // 验证文件类型
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return jsonResponse({ error: 'Invalid file type. Only JPEG, PNG, GIF, WebP allowed' }, 400);
      }

      // 验证文件大小 (最大 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return jsonResponse({ error: 'File too large. Max 5MB' }, 400);
      }

      // 读取文件数据
      const fileBuffer = await file.arrayBuffer();

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).slice(2, 8);
      const extension = file.type.split('/')[1] || 'jpg';
      const filename = `${currentUser.id}_${timestamp}_${randomStr}.${extension}`;
      const githubPath = `${CONFIG.GITHUB.PATH_PREFIX}/${filename}`;

      // 上传到 GitHub
      const githubUrl = await uploadToGithub(
        this.env,
        githubPath,
        fileBuffer,
        extension,
        `Upload image from user ${currentUser.username} at ${new Date().toISOString()}`
      );

      if (!githubUrl) {
        console.error('[Upload] GitHub upload failed for user:', currentUser.username);
        return jsonResponse({ error: 'Failed to upload to GitHub. Please check server logs or contact admin.' }, 500);
      }

      // 记录到数据库
      await this.env.DB.prepare(
        'INSERT INTO user_uploads (user_id, username, r2_key, url, rarity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(currentUser.id, currentUser.username, githubPath, githubUrl, rarity, 'pending', timestamp).run();

      console.log(`[Upload] User ${currentUser.username} uploaded image: ${githubPath}`);

      return jsonResponse({
        success: true,
        message: 'Image uploaded successfully, awaiting review',
        imageUrl: githubUrl,
        uploadId: timestamp
      });

    } catch (e) {
      console.error('[Upload Error]:', e);
      return jsonResponse({ error: 'Upload failed: ' + e.message }, 500);
    }
  }

  /**
   * [新增] 获取随机用户上传图片
   */
  async getRandomUserUpload() {
    try {
      // 获取已审核通过的上传图片
      const upload = await this.env.DB.prepare(
        'SELECT url, rarity FROM user_uploads WHERE status = ? ORDER BY RANDOM() LIMIT 1'
      ).bind('approved').first();
      
      if (!upload) {
        return { success: false, message: 'No approved uploads available' };
      }
      
      return {
        success: true,
        imageUrl: upload.url,
        rarity: upload.rarity || 'UR',
        sourceName: 'User Upload'
      };
    } catch (e) {
      console.error('[Random Upload Error]:', e);
      return { success: false, message: 'Failed to get upload' };
    }
  }

  /**
   * [新增] 从随机图API获取图片
   * 支持返回302重定向或直接返回图片数据的API
   */
  async fetchRandomImageAPI(apiUrl) {
    try {
      if (!apiUrl) {
        return { success: false, message: 'API URL not provided' };
      }
      
      console.log(`[RandomImageAPI] Fetching from: ${apiUrl}`);
      
      // 方法1：尝试 HEAD 请求（适用于返回302重定向的API）
      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'HEAD',
          redirect: 'follow'
        });
        
        // 如果 HEAD 成功且发生了重定向（URL变化）
        if (response.ok && response.url !== apiUrl) {
          console.log(`[RandomImageAPI] HEAD redirect success: ${response.url}`);
          return {
            success: true,
            imageUrl: response.url,
            rarity: 'UR',
            sourceName: 'API Redirect'
          };
        }
      } catch (headError) {
        console.log(`[RandomImageAPI] HEAD request failed, trying GET: ${headError.message}`);
      }
      
      // 方法2：使用 GET 请求（适用于直接返回图片或JSON的API）
      response = await fetch(apiUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        console.error('[RandomImageAPI] GET Error:', response.status, response.statusText);
        return { success: false, message: `API returned ${response.status}` };
      }

      // 获取最终URL（可能是重定向后的）
      const finalUrl = response.url;
      
      // 检查内容类型
      const contentType = response.headers.get('content-type') || '';
      console.log(`[RandomImageAPI] Content-Type: ${contentType}`);
      
      // 如果直接返回图片数据
      if (contentType.includes('image/')) {
        console.log(`[RandomImageAPI] Direct image response: ${finalUrl}`);
        return {
          success: true,
          imageUrl: finalUrl,
          rarity: 'UR',
          sourceName: 'API Direct'
        };
      }
      
      // 如果返回JSON，尝试解析图片URL
      if (contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`[RandomImageAPI] JSON response:`, data);
        
        // 支持常见的JSON格式
        const imageUrl = data.url || data.image || data.img || data.data?.url || data.data?.image;
        if (imageUrl) {
          return {
            success: true,
            imageUrl: imageUrl,
            rarity: 'UR',
            sourceName: 'API JSON'
          };
        }
      }
      
      // 默认返回最终URL
      console.log(`[RandomImageAPI] Using final URL: ${finalUrl}`);
      return {
        success: true,
        imageUrl: finalUrl,
        rarity: 'UR',
        sourceName: 'API'
      };
      
    } catch (e) {
      console.error('[RandomImageAPI] Error:', e);
      return { success: false, message: 'Failed to get random image: ' + e.message };
    }
  }

  /**
   * [新增] 获取用户上传记录
   */
  async getUserUploads(currentUser, request) {
    if (!currentUser) return jsonResponse({ error: 'Login Required' }, 401);
    
    try {
      const url = new URL(request.url);
      const status = url.searchParams.get('status'); // 可选: pending, approved, rejected
      const limit = parseInt(url.searchParams.get('limit')) || 20;
      const offset = parseInt(url.searchParams.get('offset')) || 0;
      
      let sql = 'SELECT id, url, rarity, status, created_at, reviewed_at FROM user_uploads WHERE user_id = ?';
      let params = [currentUser.id];
      
      if (status) {
        sql += ' AND status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const uploads = await this.env.DB.prepare(sql).bind(...params).all();
      
      // 获取总数
      let countSql = 'SELECT COUNT(*) as total FROM user_uploads WHERE user_id = ?';
      let countParams = [currentUser.id];
      if (status) {
        countSql += ' AND status = ?';
        countParams.push(status);
      }
      const countResult = await this.env.DB.prepare(countSql).bind(...countParams).first();
      
      return jsonResponse({
        success: true,
        uploads: uploads.results || [],
        total: countResult.total,
        limit,
        offset
      });
      
    } catch (e) {
      console.error('[Get Uploads Error]:', e);
      return jsonResponse({ error: 'Failed to get uploads: ' + e.message }, 500);
    }
  }
}

async function handleHome() {
  return new Response(getHtmlPage(), { 
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      // 浏览器缓存 1分钟 (避免本地卡死)
      'Cache-Control': 'public, max-age=60',
      // Cloudflare 边缘缓存 1小时，且允许在过期后的 1天内先返回旧页面，后台更新
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    } 
  });
}

async function handleProfile() {
  return new Response(getProfilePage(), { 
    headers: { 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      // 个人页骨架也是静态的，同样利用 SWR 加速首屏
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    } 
  });
}

async function handleChangelog(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse(DEFAULT_CHANGELOG);
  let logs = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.CHANGELOG));
  return jsonResponse(logs || DEFAULT_CHANGELOG, 200, {
      // 浏览器缓存 5分钟
      'Cache-Control': `public, max-age=${CONFIG.TTL.PUBLIC_API}`,
      // CDN 缓存 1小时，允许过期后后台更新 (SWR)
      'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  });
}

async function handleGetAnnouncement(env) {
  if (!env.RECENT_REQUESTS) return jsonResponse({ enabled: false });
  const data = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.ANNOUNCEMENT));
  return jsonResponse(data || { enabled: false }, 200, {
      'Cache-Control': `public, max-age=${CONFIG.TTL.PUBLIC_API}`,
      // 公告不需要每秒都查，CDN 缓存 10分钟
      'CDN-Cache-Control': 'public, max-age=600, stale-while-revalidate=86400'
  });
}

async function handleAdminSaveAnnouncement(request, env) {
  const { password, announcement, refreshId } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
  
  // 获取旧数据
  const oldData = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.ANNOUNCEMENT));
  
  // 默认生成新ID (当前时间戳)
  let newId = Date.now();

  // 智能ID判断逻辑：
  // 如果没有强制刷新 (refreshId 为 false) 且存在旧数据
  if (!refreshId && oldData && oldData.id) {
      // 检查内容是否发生变化
      const isTitleSame = oldData.title === announcement.title;
      const isContentSame = oldData.content === announcement.content;
      
      // 如果标题和内容都没变，且没有强制刷新，才保留旧ID (避免重复弹窗)
      if (isTitleSame && isContentSame) {
          newId = oldData.id;
      }
      // 否则(内容变了)，newId 保持为 Date.now()，实现自动推送
  }

  const dataToSave = { ...announcement, id: newId };
  await env.RECENT_REQUESTS.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify(dataToSave));
  
  // 返回 newId 方便前端判断是否更新了 ID
  return jsonResponse({ success: true, updated: newId !== (oldData && oldData.id) });
}

async function handleShowcase(env) {
    if (!env.RECENT_REQUESTS) return jsonResponse([]);
    const list = await safeJsonParse(await env.RECENT_REQUESTS.get(CONFIG.KEYS.LEADERBOARD)) || [];
    const result = list.sort(() => 0.5 - Math.random()).slice(0, 6);
    
    return jsonResponse(result, 200, {
        // 浏览器缓存 5分钟
        'Cache-Control': `public, max-age=${CONFIG.TTL.PUBLIC_API}`,
        // CDN 缓存 5分钟，但允许 SWR。
        // 这样高并发下 KV 只需要每 5 分钟被读取一次，其余时间全走 CDN 内存
        'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    });
}

async function handleLibrary(request, env, url) {
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = 24;
  const offset = (page - 1) * pageSize;

  try {
      // 并行查询：获取当前页数据 + 获取总条数
      const [dataRes, countRes] = await Promise.all([
          env.DB.prepare(
              'SELECT url, username, created_at as ts FROM gallery ORDER BY created_at DESC LIMIT ? OFFSET ?'
          ).bind(pageSize, offset).all(),
          env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first()
      ]);

      const items = dataRes.results || [];
      const totalItems = countRes.total || 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
      const currentPage = Math.max(1, Math.min(page, totalPages));

      // 优化缓存策略：
      // 数据库查询非常昂贵，我们允许 CDN 缓存 1 小时 (3600s)。
      // stale-while-revalidate=86400 意味着：过期后的一天内，CDN 会先返回旧 HTML 给用户，
      // 然后在后台异步去 D1 更新数据。这对 D1 极为友好。
      return new Response(getLibraryHtml(items, { currentPage, totalPages, totalItems }), { 
          headers: { 
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=60', 
              'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' 
          } 
      });

  } catch (e) {
      console.error('Library Error:', e);
      return new Response('Gallery Database Error', { status: 500 });
  }
}

async function handleLibraryApi(request, env) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '24');
  const offset = (page - 1) * pageSize;

  try {
    // 并行查询：获取当前页数据 + 获取总条数
    const [dataRes, countRes] = await Promise.all([
      env.DB.prepare(
        'SELECT url, username, created_at as ts FROM gallery ORDER BY created_at DESC LIMIT ? OFFSET ?'
      ).bind(pageSize, offset).all(),
      env.DB.prepare('SELECT COUNT(*) as total FROM gallery').first()
    ]);

    const items = dataRes.results || [];
    const totalItems = countRes.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.max(1, Math.min(page, totalPages));

    return jsonResponse({
      items,
      pagination: {
        currentPage,
        totalPages,
        totalItems,
        pageSize,
        hasMore: currentPage < totalPages
      }
    }, 200, {
      'Cache-Control': 'public, max-age=60',
      'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    });

  } catch (e) {
    console.error('Library API Error:', e);
    return jsonResponse({ error: 'Database Error' }, 500);
  }
}

async function handleAdminVerify(request, env) {
  const { password } = await request.json();
  return jsonResponse({ success: password === env.admin }, password === env.admin ? 200 : 403);
}

async function handleAdminUsers(request, env) {
  const { password } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
  
  try {
    // 查询用户列表，按创建时间倒序排列
    const usersResult = await env.DB.prepare(
      'SELECT username, nickname, draw_count, coins, level, exp, total_exp, last_login_date, login_streak, created_at FROM users ORDER BY created_at DESC'
    ).all();
    
    const users = usersResult.results ? usersResult.results.map(user => ({
      username: user.username,
      nickname: user.nickname || user.username,
      drawCount: user.draw_count || 0,
      coins: user.coins || 0,
      level: user.level || 1,
      exp: user.exp || 0,
      totalExp: user.total_exp || 0,
      lastLoginDate: user.last_login_date,
      loginStreak: user.login_streak || 0,
      createdAt: user.created_at
    })) : [];
    
    return jsonResponse({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return jsonResponse({ error: 'Database error' }, 500);
  }
}

async function handleAdminSaveLog(request, env) {
  const { password, logs } = await request.json();
  if (password !== env.admin) return jsonResponse({ error: 'Auth Failed' }, 403);
  await env.RECENT_REQUESTS.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(logs));
  return jsonResponse({ success: true });
}

async function handleAdminUpdatePoints(request, env) {
  try {
    const { password, targetId, amount } = await request.json();
    
    // 1. 验证管理员权限
    if (password !== env.admin) {
      return jsonResponse({ error: 'Auth Failed' }, 403);
    }

    // 2. 验证参数
    // 前端传来的 targetId 是 username
    if (!targetId || amount === undefined || isNaN(amount)) {
      return jsonResponse({ error: 'Invalid parameters' }, 400);
    }

    // 3. 获取用户ID
    const user = await env.DB.prepare(
      'SELECT id, coins FROM users WHERE username = ?'
    ).bind(targetId).first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // 4. 执行更新 (支持增加或减少，amount可为负数)
    // 防止积分减为负数（可选逻辑，如果希望允许负债可去掉 Math.max）
    // const newCoins = Math.max(0, (user.coins || 0) + parseInt(amount));
    
    // 目前逻辑允许直接加减
    await env.DB.prepare(
      'UPDATE users SET coins = coins + ? WHERE id = ?'
    ).bind(parseInt(amount), user.id).run();

    // 积分变动后，主动失效用户信息缓存，保证前端 /user/info 立刻能拿到最新积分
    try {
      await env.KV_CACHE.delete(`uinfo:${user.id}`);
    } catch (cacheErr) {
      console.error('Failed to invalidate user cache after admin update points:', cacheErr);
    }

    return jsonResponse({ success: true, message: 'Points updated' });

  } catch (e) {
    console.error('Update points error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

async function handleAdminDeleteUser(request, env) {
  try {
    const { password, targetId } = await request.json();

    if (password !== env.admin) {
      return jsonResponse({ error: 'Auth Failed' }, 403);
    }

    // 获取用户ID
    const user = await env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(targetId).first();

    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404);
    }

    // [优化] 利用 ON DELETE CASCADE
    // 只需删除 users 表中的记录，数据库会自动删除 inventory, logs, gallery, titles 等关联数据
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();

    // 可以在这里显式清理 KV 缓存
    await env.KV_CACHE.delete(`uinfo:${user.id}`); // 如果能获取到 ID

    return jsonResponse({ success: true, message: 'User and associated data deleted' });

  } catch (e) {
    console.error('Delete user error:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

/**
 * [新增] 获取待审核的上传列表
 */
async function handleAdminUploads(request, env) {
  try {
    const { password, status = 'pending', limit = 50, offset = 0 } = await request.json();

    if (password !== env.admin) {
      return jsonResponse({ error: 'Auth Failed' }, 403);
    }

    // 查询上传列表
    let sql = `
      SELECT 
        id, user_id, username, url, rarity, status, 
        created_at, reviewed_at 
      FROM user_uploads 
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const uploads = await env.DB.prepare(sql)
      .bind(status, limit, offset)
      .all();

    // 获取总数
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM user_uploads WHERE status = ?'
    ).bind(status).first();

    return jsonResponse({
      success: true,
      uploads: uploads.results || [],
      total: countResult.total,
      limit,
      offset
    });

  } catch (e) {
    console.error('[Admin Uploads Error]:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

/**
 * [新增] 审核上传（通过/拒绝）
 */
async function handleAdminReviewUpload(request, env) {
  try {
    const { password, uploadId, action, rarity } = await request.json();

    if (password !== env.admin) {
      return jsonResponse({ error: 'Auth Failed' }, 403);
    }

    if (!uploadId || !['approved', 'rejected'].includes(action)) {
      return jsonResponse({ error: 'Invalid parameters' }, 400);
    }

    const reviewedAt = Date.now();

    if (action === 'approved') {
      // 通过审核：更新状态、稀有度、审核时间
      const validRarity = rarity || 'N';
      await env.DB.prepare(
        'UPDATE user_uploads SET status = ?, rarity = ?, reviewed_at = ? WHERE id = ?'
      ).bind('approved', validRarity, reviewedAt, uploadId).run();
      
      return jsonResponse({ 
        success: true, 
        message: 'Upload approved',
        rarity: validRarity
      });
    } else {
      // 拒绝审核：更新状态和审核时间
      await env.DB.prepare(
        'UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?'
      ).bind('rejected', reviewedAt, uploadId).run();
      
      return jsonResponse({ 
        success: true, 
        message: 'Upload rejected'
      });
    }

  } catch (e) {
    console.error('[Admin Review Upload Error]:', e);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

async function updateLeaderboard(env, newItem) {
  if (!env.RECENT_REQUESTS) return;
  const key = CONFIG.KEYS.LEADERBOARD;
  let list = await safeJsonParse(await env.RECENT_REQUESTS.get(key)) || [];
  list.unshift(newItem);
  if (list.length > 50) list = list.slice(0, 50);
  await env.RECENT_REQUESTS.put(key, JSON.stringify(list), { expirationTtl: CONFIG.TTL.LEADERBOARD });
}

async function updateGalleryIndex(env, newItem) {
  try {
    // 异步插入，不阻塞主线程
    // 同时也存入 username 作为快照/冗余，方便前端读取时无需 JOIN
    await env.DB.prepare(
      'INSERT INTO gallery (url, user_id, username, created_at) VALUES (?, ?, ?, ?)'
    ).bind(newItem.url, newItem.userId, newItem.username, newItem.ts).run();
  } catch (e) {
    console.error('Failed to update gallery D1:', e);
  }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  const headers = { 
    'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders 
  };
  return new Response(JSON.stringify(data), { status, headers });
}
function safeJsonParse(str) { try { return JSON.parse(str); } catch { return null; } }

const NEUTRAL_CSS = `
<style>
  :root {
    --primary: #3B82F6; --primary-dark: #2563EB; --secondary: #10B981;
    --bg-color: #F8FAFC; --card-bg: rgba(255, 255, 255, 0.95);
    --text-main: #334155; --text-light: #94A3B8; --danger: #EF4444;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius: 16px; 
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    background-color: var(--bg-color);
    background-image: linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px);
    background-size: 30px 30px; color: var(--text-main); font-family: var(--font); margin: 0; min-height: 100vh; overflow-x: hidden;
  }
  .btn {
    background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 0 var(--primary-dark); transition: all 0.1s; font-size: 0.95rem; font-family: var(--font);
  }
  .btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--primary-dark); }
  .btn.secondary { background: white; color: var(--text-main); border: 2px solid #E2E8F0; box-shadow: 0 4px 0 #CBD5E1; }
  .btn.secondary:active { box-shadow: 0 0 0 #CBD5E1; }
  .btn.danger { background: var(--danger); box-shadow: 0 4px 0 #B91C1C; }
  .btn.danger:active { box-shadow: 0 0 0 #B91C1C; }
  .glass-card { background: var(--card-bg); border: 1px solid #E2E8F0; border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .modal { 
    position: fixed; inset: 0; 
    background: rgba(15, 23, 42, 0.4); 
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: none; justify-content: center; align-items: center; 
    z-index: 2000; opacity: 0; transition: 0.2s; 
  }
  .modal.show { display: flex; opacity: 1; }
  .modal-content { 
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 24px; border-radius: var(--radius); 
    width: 90%; max-width: 450px; text-align: center; 
    transform: scale(0.95); transition: 0.2s; 
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); 
    max-height: 90vh; overflow-y: auto; position: relative; 
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
  .modal.show .modal-content { transform: scale(1); }
   .placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-light); text-align: center; font-size: 0.9rem; }
   .placeholder i { font-size: 3rem; margin-bottom: 16px; display: block; color: #CBD5E1; }
   .loading-spinner { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; align-items: center; color: var(--primary); text-align: center; font-size: 0.9rem; background: rgba(255,255,255,0.95); border-radius: var(--radius); z-index: 5; }
   .loading-spinner.show { display: flex; }
   .loading-spinner i { font-size: 3rem; margin-bottom: 16px; display: block; animation: spin 1s linear infinite; }
   .loading-spinner .loading-text { font-weight: 600; color: var(--text-main); }
   @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .modal-close-btn { position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; color: var(--text-light); cursor: pointer; padding: 5px; z-index: 10; }
  .modal-close-btn:hover { color: var(--danger); transform: rotate(90deg); transition: 0.2s; }
  .actions { padding: 16px 10px 10px 10px; display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1fr; }
  #drawBtn { grid-column: 1 / -1; height: 54px; font-size: 1.1rem; box-shadow: 0 6px 0 var(--primary-dark); }
  #drawBtn:active { transform: translateY(6px); box-shadow: 0 0 0 var(--primary-dark); }
  .actions .btn.secondary { padding: 8px 0; font-size: 1.2rem; }
  @media(min-width: 600px) {
    .actions { grid-template-columns: 2fr 1fr 1fr 1fr; }
    #drawBtn { grid-column: auto; height: auto; font-size: 0.95rem; }
    .actions .btn.secondary { font-size: 0.95rem; }
  }
  .rules-table { width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 10px; }
  .rules-table th { text-align: left; border-bottom: 2px solid #E2E8F0; padding: 6px; color: var(--primary); }
  .rules-table td { border-bottom: 1px solid #F1F5F9; padding: 6px; }
  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .shop-item { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 140px; }
  .shop-item:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
  .shop-item i { font-size: 2rem; margin-bottom: 10px; color: var(--primary); }
  .shop-item.disabled { opacity: 0.6; filter: grayscale(1); cursor: not-allowed; border-color: #E2E8F0 !important; transform: none !important; box-shadow: none !important; }
  .price-tag { background: linear-gradient(135deg, #FEF3C7, #FDE68A); color: #D97706; padding: 6px 10px; border-radius: 8px; font-weight:bold; font-size:0.9rem; margin-top:10px; display:inline-block; box-shadow: 0 2px 4px rgba(217,119,6,0.2); border: 1px solid #FBBF24; }
  .shop-item.can-craft { border: 2px solid var(--secondary); background-color: #ECFDF5; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); animation: pulse 2s infinite; }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
  .shop-cost { font-size: 0.8rem; color: var(--text-light); margin-top: 5px; }
  .rarity-tag { position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 12px; border-radius: 8px; font-weight: 900; color: white; font-size: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); opacity: 0; transform: scale(0.8); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid rgba(255,255,255,0.8); }
  .rarity-tag.show { opacity: 1; transform: scale(1); }
  .r-n { background: #64748B; } .r-r { background: #3B82F6; } .r-sr { background: #8B5CF6; } .r-ssr { background: linear-gradient(135deg, #F59E0B, #D97706); }
  .r-ur { background: linear-gradient(45deg, #EF4444, #EC4899, #8B5CF6); background-size: 200% 200%; animation: rainbow 3s ease infinite; border-color: #FFF; }
  @keyframes rainbow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  .admin-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.85rem; text-align: left; }
  .admin-table th { color: var(--text-light); font-weight: bold; padding: 8px; border-bottom: 2px solid #E2E8F0; }
  .admin-table td { padding: 8px; border-bottom: 1px solid #F1F5F9; }
  .admin-input { width: 100%; padding: 6px; border: 1px solid #E2E8F0; border-radius: 6px; font-family: var(--font); }
  .admin-tabs { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 2px solid #F1F5F9; padding-bottom: 10px; }
  .admin-tab { padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: bold; cursor: pointer; color: var(--text-light); transition: 0.2s; }
  .admin-tab.active { background: #E0F2FE; color: var(--primary); }
  .user-pill { background: white; padding: 6px 14px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .title-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.7rem; font-weight: bold; vertical-align: middle; margin-left: 6px; text-shadow: 0 1px 1px rgba(0,0,0,0.2); }
  .user-badge { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; }
  .user-row-meta { font-size: 0.75rem; color: #94A3B8; }
  .dice-stage { font-size: 5rem; color: var(--primary); margin: 20px 0; height: 80px; display: flex; align-items: center; justify-content: center; }
  .dice-result-anim { animation: shake 0.5s infinite; }
  @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(10deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(-10deg); } 100% { transform: rotate(0deg); } }
  .bet-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
  .bet-btn { padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1rem; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
  .bet-btn.small { background: #E0F2FE; color: #0284C7; border-color: #BAE6FD; }
  .bet-btn.small:hover { background: #BAE6FD; }
  .bet-btn.big { background: #FEE2E2; color: #DC2626; border-color: #FECACA; }
  .bet-btn.big:hover { background: #FECACA; }
  .banner-tabs {display: flex;background: rgba(255,255,255,0.5);border-radius: 12px;padding: 4px;margin-bottom: 12px;border: 1px solid #E2E8F0; position: relative;}
  .banner-tab {flex: 1;text-align: center;padding: 8px;border-radius: 8px;font-size: 0.9rem;font-weight: 800;cursor: pointer;color: var(--text-light);transition: 0.2s;position: relative;overflow: hidden;}
  .banner-tab.active {background: white;color: var(--primary);box-shadow: 0 2px 4px rgba(0,0,0,0.05);color: var(--primary);}
  .banner-tab.active.limited {color: #EF4444;}
  .btn.limited-btn {background: linear-gradient(45deg, #EF4444, #F59E0B);box-shadow: 0 4px 0 #B91C1C;border: none;}
  .btn.limited-btn:active {box-shadow: 0 0 0 #B91C1C;}
  .pool-info-tag {font-size: 0.7rem;background: rgba(0,0,0,0.05);padding: 2px 6px;border-radius: 4px;margin-left: 4px;vertical-align: middle;}
  /* [优化] 池列表项样式 */
  .pool-item {padding:12px;border-radius:10px;cursor:pointer;transition:all 0.2s;background:white;border:2px solid #FECACA;display:flex;flex-direction:column;gap:4px;}
  .pool-item:hover {transform:translateY(-1px);box-shadow:0 2px 8px rgba(239,68,68,0.1);}
  .pool-item.active {background:linear-gradient(135deg,#EF4444,#F59E0B);border-color:transparent;color:white;}
  .pool-item.unavailable {opacity:0.6;background:#F3F4F6;border-color:#E5E7EB;}
  .pool-item.unavailable:hover {transform:none;box-shadow:none;}
  .pool-item-header {display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:0.95rem;}
  .pool-status {font-size:0.8rem;opacity:0.9;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:6px;}
  .pool-item.active .pool-status {background:rgba(255,255,255,0.25);}
  .pool-desc {font-size:0.8rem;opacity:0.8;line-height:1.3;}
  .auth-tabs { display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #E2E8F0; padding-bottom:10px; }
  .auth-tab { flex:1; padding:8px; cursor:pointer; font-weight:bold; color:var(--text-light); border-radius:8px; transition:0.2s; }
  .auth-tab.active { background:var(--bg-color); color:var(--primary); }
  .refresh-spin { animation: spin-once 0.8s ease-in-out; color: var(--primary) !important; }
  @keyframes spin-once { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .switch { position: relative; display: inline-block; width: 48px; height: 24px; vertical-align: middle; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
  input:checked + .slider { background-color: var(--secondary); }
  input:checked + .slider:before { transform: translateX(24px); }
  .title-list { display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 300px; overflow-y: auto; margin-top: 10px; }
  .title-item { 
      padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; cursor: pointer; 
      display: flex; justify-content: space-between; align-items: center; transition: 0.2s;
  }
  .title-item:hover { background: #F8FAFC; border-color: var(--primary); }
  .title-item.active { background: #EFF6FF; border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
  .title-item.active i { color: var(--primary); }
  .title-text { font-weight: bold; color: var(--text-main); }
  .no-title-msg { text-align: center; color: #94A3B8; padding: 20px; font-size: 0.9rem; } 
  .form-row { margin-bottom: 15px; }
  .form-label { display: block; font-weight: bold; font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px; }
  .form-hint { font-size: 0.75rem; color: var(--text-light); margin-top: 4px; }
  .skeleton {
    background: #E2E8F0;
    background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 37%, #E2E8F0 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
    border-radius: 8px;
  }
  @keyframes skeleton-loading {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }
  .anim-shake { animation: shake-x 0.4s ease-in-out; }
  .anim-pop { animation: pop-scale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  
  @keyframes shake-x {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  @keyframes pop-scale {
    0% { transform: scale(0.95); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @media (max-width: 480px) {
    .modal-content { width: 95%; padding: 16px; max-width: none; }
    .shop-grid { grid-template-columns: 1fr; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; padding: 10px; }
    .actions { grid-template-columns: 1fr 1fr; gap: 8px; }
    #drawBtn { grid-column: 1 / -1; }
    .main-grid { grid-template-columns: 1fr; gap: 16px; }
    .header {
      flex-direction: row;
      gap: 12px;
      align-items: center;
      padding: 0 5px;
      max-width: 100%;
    }
    .logo-container { text-align: left; }
    .logo { font-size: 1.3rem; }
    .logo-subtitle { font-size: 0.75rem; margin-top: 2px; }
    .header-right { justify-content: flex-end; }
    .user-pill {
      font-size: 0.8rem;
      padding: 6px 10px 6px 8px;
      gap: 6px;
      max-width: none;
      margin: 0;
    }
    .user-avatar { width: 24px; height: 24px; font-size: 0.8rem; }
    .user-info { min-width: 0; }
    .user-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
    .user-title { font-size: 0.65rem; padding: 1px 4px; }
    .user-chevron { display: none; }
    #profileModal .modal-content { padding: 12px; }
    #profileModal .modal-content > div:first-child { margin-bottom: 15px; }
    #profileModal .modal-content > div:first-child > div:first-child { width: 60px; height: 60px; font-size: 1.5rem; }
    #profileModal .modal-content h3 { font-size: 1.2rem; }
    #profileModal .modal-content > div:nth-child(2) > div:first-child { grid-template-columns: 1fr; gap: 10px; }
    #profileModal .modal-content > div:nth-child(2) > div:nth-child(2) > div:first-child { flex-direction: column; gap: 10px; }
    #profileModal .modal-content > div:nth-child(2) > div:nth-child(3) > div:nth-child(2) { grid-template-columns: repeat(3, 1fr); }
    #profileModal .modal-content > div:nth-child(3) { grid-template-columns: 1fr; gap: 8px; }
  }
  @media (max-width: 768px) {
    .modal-content { max-width: 90%; }
    .shop-grid { grid-template-columns: 1fr 1fr; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
  }
  @media (max-width: 768px) and (min-width: 481px) {
    #profileModal .modal-content > div:nth-child(2) > div:nth-child(3) > div:nth-child(2) { grid-template-columns: repeat(4, 1fr); }
  }
</style>
`;

function getHtmlPage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>抽卡系统</title>
  <!-- 替换为国内 BootCDN 源 -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.bootcdn.net/ajax/libs/marked/12.0.1/marked.min.js"></script>
  ${NEUTRAL_CSS}
  <style>
    body { padding: 20px 20px 60px 20px; display: flex; flex-direction: column; align-items: center; }
    .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 10px; }
    .logo-container { display: flex; flex-direction: column; }
    .logo { font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; line-height: 1.2; }
    .logo span { color: var(--primary); }
    .logo-subtitle { font-size: 0.85rem; color: var(--text-light); margin-top: 4px; font-weight: 500; }
    .header-right { display: flex; align-items: center; }
    .user-pill {
      background: white;
      padding: 8px 16px 8px 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      font-size: 0.9rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .user-pill:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
      transform: translateY(-1px);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .user-name {
      font-weight: 700;
      color: var(--text-main);
    }
    .user-title {
      font-size: 0.7rem;
      color: var(--text-light);
      background: #F1F5F9;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .user-chevron {
      font-size: 0.8rem;
      color: #94A3B8;
      margin-left: 4px;
    }
    .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
    .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
    .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
    .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
    .stage img.show { opacity: 1; }
    .panel-container { display: flex; flex-direction: column; gap: 24px; }
    .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 800; font-size: 1rem; padding: 0 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    /* 精选图库特定样式 - 确保6张图片整齐排列 */
    #showcaseGrid {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
    }
    .grid-item { aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: #F1F5F9; cursor: pointer; border: 1px solid #E2E8F0; transition: 0.2s; }
    .grid-item:hover { border-color: var(--primary); transform: translateY(-2px); }
    .grid-item img { width: 100%; height: 100%; object-fit: cover; }
    .input-group input { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-family: var(--font); font-size: 1rem; text-align: center; color: var(--text-main); margin-bottom: 20px; outline: none; background: #F8FAFC; }
    .input-group input:focus { border-color: var(--primary); background: white; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 10px; z-index: 3000; animation: slideDown 0.3s; backdrop-filter: blur(8px); background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(255,255,255,0.1); }
    @keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    .log-container { padding: 20px; text-align: left; }
    .log-header { font-size: 1rem; font-weight: 800; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--primary); }
    .log-item { padding-left: 16px; border-left: 2px solid #E2E8F0; margin-bottom: 15px; position: relative; }
    .log-item::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid white; }
    .log-meta { font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .log-ver { font-weight: bold; color: var(--text-main); background: #F1F5F9; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
    .log-ver.todo {background: #F3E8FF;color: #7E22CE;border-color: #D8B4FE;box-shadow: 0 0 5px rgba(168, 85, 247, 0.2);}
    .log-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: bold; color: white; text-shadow: 0 1px 1px rgba(0,0,0,0.2); white-space: nowrap; }
    .log-content { font-size: 0.9rem; line-height: 1.5; color: var(--text-main); white-space: pre-wrap; }
    .log-toggle { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0; color: var(--text-light); cursor: pointer; font-size: 0.85rem; }
    .log-list.collapsed .log-item:nth-child(n+4) { display: none; }
    .md-content { text-align: left; padding: 10px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; max-height: 60vh; overflow-y: auto; color: var(--text-main); line-height: 1.6; }
    .md-content h1, .md-content h2, .md-content h3 { margin-top: 1em; margin-bottom: 0.5em; color: var(--primary-dark); }
    .md-content h1 { font-size: 1.5em; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
    .md-content h2 { font-size: 1.3em; }
    .md-content p { margin-bottom: 1em; }
    .md-content ul, .md-content ol { padding-left: 20px; margin-bottom: 1em; }
    .md-content li { margin-bottom: 5px; }
    .md-content code { background: #E2E8F0; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #D97706; }
    .md-content blockquote { border-left: 4px solid var(--primary); margin: 0; padding-left: 10px; color: var(--text-light); background: #EFF6FF; padding: 8px; border-radius: 4px; }
    .md-content img { max-width: 100%; border-radius: 6px; }
    .admin-textarea { width: 100%; height: 200px; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: monospace; resize: vertical; margin-bottom: 10px; }
    .toggle-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #F1F5F9; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <header class="header">
    <!-- 修改处：添加 onclick 事件和 cursor 样式 -->
    <div class="logo-container" onclick="App.openAdmin()" style="cursor: pointer;" title="点击进入管理面板">
      <div class="logo"><i class="fas fa-cube"></i> Gacha<span>System</span></div>
      <div class="logo-subtitle">抽卡收集系统</div>
    </div>
    <div class="header-right">
       <div class="user-pill" onclick="window.location.href='/user/profile'">
         <div class="user-avatar">
           <i class="fas fa-user-astronaut"></i>
         </div>
         <div class="user-info">
           <span class="user-name" id="navNickname">游客</span>
           <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
             <span class="user-level-badge" id="navLevel" style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">Lv.1</span>
             <span class="user-title" id="navTitle"></span>
           </div>
         </div>
         <i class="fas fa-chevron-right user-chevron"></i>
       </div>
    </div>
  </header>

  <div class="main-grid">
    <div class="gacha-card">
      <div class="banner-tabs">
        <div class="banner-tab active" id="tab-std" onclick="App.switchPool('std')">
            <span>常驻池</span>
        </div>
        <div class="banner-tab" id="tab-ltd" onclick="App.togglePoolDropdown()">
            <span>限定池 <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px; transition:transform 0.2s;" id="poolDropdownArrow"></i></span>
            <span class="pool-info-tag" id="ltdCostDisplay">500pts</span>
        </div>
        <!-- 限定池下拉弹窗 -->
        <div id="poolDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:linear-gradient(135deg, #FEF2F2, #FFF5F5); border:2px solid #FECACA; border-radius:12px; margin-top:8px; padding:8px; box-shadow:0 10px 25px rgba(239,68,68,0.15); z-index:100; max-height:250px; overflow-y:auto;">
          <div id="poolDropdownList" style="display:flex; flex-direction:column; gap:6px;">
            <!-- 动态填充 -->
          </div>
        </div>
      </div>
      <div class="stage" id="stage">
        <div id="rarityTag" class="rarity-tag">SSR</div>
        <div class="placeholder" id="placeholder">
          <i class="fas fa-gamepad"></i>
          <div>准备召唤</div>
        </div>
        <div class="loading-spinner" id="loadingSpinner">
          <i class="fas fa-circle-notch"></i>
          <div class="loading-text">召唤中...</div>
        </div>
        <img id="resultImg" alt="Result">
      </div>
      <div class="actions">
        <button class="btn" onclick="App.draw()" id="drawBtn">
          <i class="fas fa-bolt"></i> <span>召唤</span>
        </button>
        <button class="btn secondary" onclick="App.openCraft()" style="background:#FFF7ED; border-color:#FED7AA;">
          <i class="fas fa-flask"></i>
        </button>
        <button class="btn secondary" onclick="App.openShop()">
          <i class="fas fa-store"></i>
        </button>
        <button class="btn secondary" onclick="App.openDice()" style="background:#F0F9FF; border-color:#BAE6FD;">
          <i class="fas fa-dice"></i>
        </button>
        <button class="btn secondary" onclick="App.checkIn()" style="background:#ECFDF5; border-color:#6EE7B7; color:#059669;">
          <i class="fas fa-calendar-check"></i>
        </button>
        <button class="btn secondary" onclick="App.openUpload()" style="background:#F3E8FF; border-color:#C4B5FD; color:#7C3AED;">
          <i class="fas fa-cloud-upload-alt"></i>
        </button>
        <a href="/library" class="btn secondary"><i class="fas fa-th-large"></i></a>
      </div>
    </div>

    <div class="panel-container">
      <div class="showcase-box">
        <div class="box-header">
          <span><i class="fas fa-star" style="color:#F59E0B"></i> 精选图库</span>
          <i class="fas fa-rotate" id="refreshBtn" style="cursor:pointer; font-size:0.9rem; color:#94A3B8" onclick="App.loadShowcase()"></i>
        </div>
        <div class="grid" id="showcaseGrid">
          <div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">加载中...</div>
        </div>
      </div>
      <div class="glass-card log-container">
        <div class="log-header"><i class="fas fa-code-branch"></i> 更新履历</div>
        <div id="logList" class="log-list collapsed">
          <div style="text-align:center; color:#94A3B8;">加载中...</div>
        </div>
        <div class="log-toggle" id="logToggle" onclick="App.toggleLog()" style="display:none">
          <span>展开更多</span> <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
  </div>

  <div id="authModal" class="modal">
    <div class="modal-content">
      <h3 style="margin-top:0; color:var(--text-main)">身份验证</h3>
      <div class="auth-tabs">
         <div class="auth-tab active" id="tab-login" onclick="App.switchAuth('login')">登录</div>
         <div class="auth-tab" id="tab-register" onclick="App.switchAuth('register')">注册</div>
      </div>
      
      <div id="authForm">
        <div class="input-group">
            <input type="text" id="authUsername" placeholder="账号 (英文/数字)">
        </div>
        <div class="input-group" id="nickGroup" style="display:none;">
            <input type="text" id="authNickname" placeholder="昵称 (显示名)">
        </div>
        <div class="input-group">
            <input type="password" id="authPassword" placeholder="密码">
        </div>
      </div>
      
      <button class="btn" style="width:100%;" onclick="App.doAuth()">确认提交</button>
    </div>
  </div>

  <div id="craftModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>卡片合成</h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;">消耗5张低阶卡片，进行一次高阶召唤。</p>
      <div class="shop-grid">
        <div class="shop-item" id="craft-item-R" onclick="App.doCraft('R')"><div style="font-weight:bold; color:#3B82F6">R</div><div class="shop-cost">消耗: 5 N</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 N: <span id="invN">0</span></div></div>
        <div class="shop-item" id="craft-item-SR" onclick="App.doCraft('SR')"><div style="font-weight:bold; color:#8B5CF6">SR</div><div class="shop-cost">消耗: 5 R</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 R: <span id="invR">0</span></div></div>
        <div class="shop-item" id="craft-item-SSR" onclick="App.doCraft('SSR')"><div style="font-weight:bold; color:#F59E0B">SSR</div><div class="shop-cost">消耗: 5 SR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SR: <span id="invSR">0</span></div></div>
        <div class="shop-item" id="craft-item-UR" onclick="App.doCraft('UR')"><div style="font-weight:bold; color:#EF4444">UR</div><div class="shop-cost">消耗: 5 SSR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SSR: <span id="invSSR">0</span></div></div>
      </div>
    </div>
  </div>

  <div id="shopModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align:center; margin-bottom:15px;">
        <h3 style="margin:0 0 10px 0;">积分商店</h3>
        <div style="font-size:1.1rem; font-weight:bold; color:#F59E0B; background:#FEF3C7; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 3px 6px rgba(245,158,11,0.3);">
           <i class="fas fa-coins"></i> <span id="shopBalance">0</span>
        </div>
      </div>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px; text-align:center;">消耗积分购买指定等级的卡包。</p>
      <div class="shop-grid" id="shopContent"></div>
    </div>
  </div>

  <div id="diceModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>猜大小</h3>
      <p style="color:var(--text-light); font-size:0.9rem;">小(1-3) 或 大(4-6)，赔率1:1。</p>
      <div class="dice-stage"><i class="fas fa-dice-d6" id="diceIcon"></i></div>
      <div class="input-group" style="margin-bottom:10px;"><input type="number" id="betInput" placeholder="下注金额 (10-1000)"></div>
      <div class="bet-controls">
        <button class="bet-btn small" onclick="App.playDice('small')"><div>押小 (1-3)</div></button>
        <button class="bet-btn big" onclick="App.playDice('big')"><div>押大 (4-6)</div></button>
      </div>
      <div id="diceMsg" style="margin-top:15px; font-weight:bold; height:20px; color:#334155;"></div>
    </div>
  </div>

  <div id="uploadModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>上传图片</h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:15px;">选择图片上传，审核通过后可加入抽卡池。</p>
      <div style="border:2px dashed #C4B5FD; border-radius:12px; padding:30px; text-align:center; background:#FAF5FF; margin-bottom:15px;" id="uploadDropZone">
        <i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:#7C3AED; margin-bottom:10px;"></i>
        <div style="color:#6B7280; margin-bottom:10px;">点击或拖拽图片到此处</div>
        <div style="font-size:0.8rem; color:#9CA3AF;">支持 JPG, PNG, GIF, WebP (最大 5MB)</div>
        <input type="file" id="uploadInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;">
      </div>
      <div id="uploadPreview" style="display:none; margin-bottom:15px;">
        <img id="uploadPreviewImg" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid #E2E8F0;">
      </div>
      <div style="margin-bottom:15px;">
        <label style="display:block; margin-bottom:5px; color:#374151; font-size:0.9rem;">期望稀有度:</label>
        <select id="uploadRarity" style="width:100%; padding:10px; border:2px solid #E2E8F0; border-radius:8px; font-family:var(--font);">
          <option value="N">N (普通)</option>
          <option value="R">R (稀有)</option>
          <option value="SR">SR (超稀有)</option>
          <option value="SSR">SSR (特级超稀有)</option>
          <option value="UR">UR (极度稀有)</option>
        </select>
      </div>
      <button class="btn" style="width:100%;" onclick="App.doUpload()" id="uploadBtn">
        <i class="fas fa-upload"></i> 上传
      </button>
      <div id="uploadMsg" style="margin-top:15px; font-weight:bold; height:20px; color:#334155; text-align:center;"></div>
    </div>
  </div>

  <div id="rulesModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeRulesToProfile()"><i class="fas fa-times"></i></button>
      <h3>积分规则</h3>
      <p style="font-size:0.9rem; color:#94A3B8; margin-bottom:15px;">积分可用于在商店购买物品。</p>
      <div style="background:#F8FAFC; padding:10px; border-radius:12px; border:1px solid #E2E8F0;">
        <table class="rules-table">
          <thead><tr><th>行为</th><th>获得积分</th></tr></thead>
          <tbody>
            <tr><td>N</td><td style="font-weight:bold;">+5</td></tr>
            <tr><td>R</td><td style="font-weight:bold;">+10</td></tr>
            <tr><td>SR</td><td style="font-weight:bold;">+30</td></tr>
            <tr><td>SSR</td><td style="font-weight:bold;">+100</td></tr>
            <tr><td>UR</td><td style="font-weight:bold; color:#EF4444">+500</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="adminModal" class="modal">
    <div class="modal-content" style="max-width:650px;">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3 style="margin-top:0;">管理面板</h3>
      <div id="adminLogin">
        <div class="input-group"><input type="password" id="adminPass" placeholder="请输入管理员密码..."></div>
        <button class="btn" style="width:100%;" onclick="App.verifyAdmin()">确认</button>
      </div>
      <div id="adminPanel" style="display:none; text-align:left;">
        <div class="admin-tabs">
            <div class="admin-tab active" onclick="App.switchAdminTab('log')" id="tab-log">更新日志</div>
            <div class="admin-tab" onclick="App.switchAdminTab('users')" id="tab-users">用户管理</div>
            <div class="admin-tab" onclick="App.switchAdminTab('uploads')" id="tab-uploads">上传审核</div>
            <div class="admin-tab" onclick="App.switchAdminTab('ann')" id="tab-ann">系统公告</div>
        </div>
        <div id="view-log">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-weight:bold; font-size:0.9rem;">可视化编辑器</span>
            <button class="btn secondary" style="padding:4px 8px; font-size:0.8rem;" onclick="App.addAdminRow()">+ 新增一行</button>
            </div>
            <div style="max-height:300px; overflow-y:auto; margin-bottom:10px; border:1px solid #F1F5F9; border-radius:8px;">
            <table class="admin-table" id="adminTable"><thead><tr><th width="80">日期</th><th width="60">版本</th><th>内容</th><th width="100">标签</th><th width="40"></th></tr></thead><tbody id="adminTbody"></tbody></table>
            </div>
            <button class="btn" style="width:100%;" onclick="App.saveAdminLog()">保存更改</button>
        </div>
        <div id="view-users" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:bold; font-size:0.9rem;">注册用户列表</span>
                <button class="btn secondary" onclick="App.loadAdminUsers()" style="font-size:0.8rem;"><i class="fas fa-sync"></i></button>
            </div>
            <div style="max-height:350px; overflow-y:auto; border:1px solid #F1F5F9; border-radius:8px;">
                <table class="admin-table"><thead><tr><th>账号/昵称</th><th>召唤数</th><th>积分</th><th>操作</th></tr></thead><tbody id="userTbody"><tr><td colspan="4" style="text-align:center; padding:20px;">加载中...</td></tr></tbody></table>
            </div>
        </div>
        <div id="view-uploads" style="display:none;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:bold; font-size:0.9rem;">
                    待审核上传 
                    <span id="uploadsCountBadge" style="background:var(--primary); color:white; padding:2px 8px; border-radius:12px; font-size:0.75rem;">0</span>
                </span>
                <div style="display:flex; gap:8px;">
                    <select id="uploadStatusFilter" onchange="App.loadAdminUploads()" style="padding:4px 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:0.8rem;">
                        <option value="pending">待审核</option>
                        <option value="approved">已通过</option>
                        <option value="rejected">已拒绝</option>
                    </select>
                    <button class="btn secondary" onclick="App.loadAdminUploads()" style="font-size:0.8rem; padding:4px 10px;"><i class="fas fa-sync"></i></button>
                </div>
            </div>
            <div id="uploadsContainer" style="max-height:400px; overflow-y:auto; border:1px solid #F1F5F9; border-radius:8px;">
                <div style="text-align:center; padding:40px; color:var(--text-light);">
                    <i class="fas fa-images" style="font-size:2rem; margin-bottom:10px; display:block;"></i>
                    加载中...
                </div>
            </div>
        </div>
        <div id="view-ann" style="display:none;">
            <div class="form-row">
                <label class="form-label">公告标题</label>
                <input type="text" id="adminAnnTitle" class="admin-input" placeholder="例如：新春活动开启！">
            </div>
            
            <div class="form-row" style="display: flex; gap: 20px; align-items: flex-start;">
                <!-- 启用开关 -->
                <div>
                    <label class="form-label">启用状态</label>
                    <label class="switch">
                        <input type="checkbox" id="adminAnnEnable">
                        <span class="slider"></span>
                    </label>
                </div>
                
                <!-- 强制推送开关 -->
                <div>
                    <label class="form-label">强制弹窗</label>
                    <label class="switch">
                        <input type="checkbox" id="adminAnnRefresh">
                        <span class="slider"></span>
                    </label>
                    <div class="form-hint" style="max-width: 200px;">开启后，所有用户将再次看到此公告（用于重要更新）。</div>
                </div>
            </div>

            <div class="form-row">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <label class="form-label">公告内容 (Markdown)</label>
                    <a href="https://markdown.com.cn/basic-syntax/" target="_blank" style="font-size:0.75rem; color:var(--primary); text-decoration:none;">语法参考</a>
                </div>
                <textarea id="adminAnnContent" class="admin-textarea" placeholder="## 标题&#10;- 内容列表&#10;- 支持 **加粗**"></textarea>
            </div>

            <div style="display:flex; gap:10px;">
                <button class="btn" style="flex:2" onclick="App.saveAnnouncement()">
                    <i class="fas fa-save"></i> 保存并发布
                </button>
                <button class="btn secondary" style="flex:1" onclick="App.previewAnnouncement()">
                    <i class="fas fa-eye"></i> 预览
                </button>
            </div>
        </div>
      </div>
    </div>
  </div>

  <div id="announcementModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align: center; margin-bottom: 15px;">
        <i class="fas fa-bullhorn" style="font-size: 2rem; color: var(--primary);"></i>
        <h3 id="annTitle" style="margin: 10px 0 0 0;">公告</h3>
      </div>
      <div id="annContent" class="md-content">
      </div>
      <div style="margin-top: 20px;">
        <button class="btn" style="width: 100%;" onclick="App.closeAnnouncement()">我知道了</button>
      </div>
    </div>
  </div>

  <div id="imgModal" class="modal" onclick="this.classList.remove('show')">
    <img id="bigImg" style="max-width:95%; max-height:90vh; border-radius:8px;">
  </div>

  <script>
    const App = {
      username: localStorage.getItem('moe_username'),
      nickname: null, loading: false, adminPwd: null, logsData: [], currentAdminTab: 'log', inventory: {},
      currentPool: 'std',
      currentLimitedPool: '${CONFIG.LIMITED.DEFAULT_POOL}',
      limitedPools: [],
      authMode: 'login', 
      coins: 0,
      
      vibrate(type) {
        if (!navigator.vibrate) return;
        const patterns = {
          tap: 10,               // 普通点击
          success: [10, 30, 10], // 成功/抽到卡
          failure: [30, 50, 30], // 失败/报错
          heavy: 50              // 重要操作
        };
        try { navigator.vibrate(patterns[type] || 10); } catch(e){}
      },
      animate(elId, type) {
        const el = document.getElementById(elId);
        if(!el) return;
        const cls = type === 'error' ? 'anim-shake' : 'anim-pop';
        el.classList.remove('anim-shake', 'anim-pop');
        void el.offsetWidth; // 触发重绘
        el.classList.add(cls);
        // 动画结束后移除类，以便下次触发
        setTimeout(() => el.classList.remove(cls), 400);
      },
      async init() {
        this.initTheme();
        await this.fetchUserInfo();
        this.fetchInventory(); 
        this.loadShowcase();
        this.loadChangelog();
        this.checkAnnouncement();
      },
      // [优化] 限定池相关状态缓存
      _poolsCache: null,
      _poolsLoading: false,
      _poolsLastFetch: 0,
      
      switchPool(pool) {
        if(this.loading) return;
        this.currentPool = pool;
        const isLtd = pool === 'ltd';
        
        // 1. 更新标签页样式
        document.querySelectorAll('.banner-tab').forEach(el => el.classList.remove('active', 'limited'));
        const activeTab = document.getElementById('tab-' + pool);
        activeTab.classList.add('active');
        if (isLtd) activeTab.classList.add('limited');
        
        // 2. 显示/隐藏限定池选择器（不触发列表刷新）
        const poolDropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        if (poolDropdown) {
          poolDropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
        
        // 3. 更新按钮样式与图标
        const btn = document.getElementById('drawBtn');
        const icon = isLtd ? 'fa-star' : 'fa-bolt';
        btn.className = isLtd ? 'btn limited-btn' : 'btn';
        btn.innerHTML = \`<i class="fas \${icon}"></i> 召唤\`;
      },
      
      togglePoolDropdown() {
        const dropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        const isVisible = dropdown.style.display === 'block';
        
        if (!isVisible) {
          // 切换到限定池并显示下拉
          this.switchPool('ltd');
          dropdown.style.display = 'block';
          if (arrow) arrow.style.transform = 'rotate(180deg)';
          // 加载池列表（带缓存）
          this.loadLimitedPools();
          // 点击外部关闭
          this._closeDropdownHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target.id !== 'tab-ltd') {
              dropdown.style.display = 'none';
              if (arrow) arrow.style.transform = 'rotate(0deg)';
              document.removeEventListener('click', this._closeDropdownHandler);
              this._closeDropdownHandler = null;
            }
          };
          requestAnimationFrame(() => {
            document.addEventListener('click', this._closeDropdownHandler);
          });
        } else {
          dropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          if (this._closeDropdownHandler) {
            document.removeEventListener('click', this._closeDropdownHandler);
            this._closeDropdownHandler = null;
          }
        }
      },
      
      async loadLimitedPools(forceRefresh = false) {
        if (!this.username || this._poolsLoading) return;
        
        // 检查缓存（5分钟内有效）
        const now = Date.now();
        const cacheValid = this._poolsCache && (now - this._poolsLastFetch < 300000);
        
        if (!forceRefresh && cacheValid && this.limitedPools) {
          // 使用缓存，只更新UI
          this._renderPoolList();
          return;
        }
        
        this._poolsLoading = true;
        
        try {
          const res = await fetch('/limited/pools', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          
          if (data.success && data.pools) {
            this._poolsCache = data.pools;
            this._poolsLastFetch = now;
            this.limitedPools = data.pools;
            
            // 设置默认池
            if (!this.currentLimitedPool || !data.pools.find(p => p.id === this.currentLimitedPool)) {
              this.currentLimitedPool = data.defaultPool;
            }
            
            // 使用 requestAnimationFrame 渲染，避免阻塞
            requestAnimationFrame(() => this._renderPoolList());
          }
        } catch (e) { 
          console.error('Load pools failed', e);
          // 缓存失败时如果有旧缓存，继续使用
          if (this._poolsCache) {
            requestAnimationFrame(() => this._renderPoolList());
          }
        } finally {
          this._poolsLoading = false;
        }
      },
      
      // [优化] 渲染池列表（使用CSS类优化性能）
      _renderPoolList() {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl || !this.limitedPools) return;
        
        const currentPool = this.currentLimitedPool;
        const pools = this.limitedPools;
        
        // 构建HTML字符串（一次性插入）
        const html = pools.map(p => {
          const isActive = p.id === currentPool;
          const isAvailable = p.available;
          const statusText = p.available ? (p.count ? p.count + '张' : '可用') : '暂无图片';
          
          return \`
            <div class="pool-item \${isActive ? 'active' : ''} \${isAvailable ? '' : 'unavailable'}" 
                 onclick="App.selectPool('\${p.id}')"
                 data-pool-id="\${p.id}">
              <div class="pool-item-header">
                <span class="pool-name">\${p.name}</span>
                <span class="pool-status">\${statusText}</span>
              </div>
              <div class="pool-desc">\${p.description || ''}</div>
            </div>
          \`;
        }).join('');
        
        listEl.innerHTML = html;
      },
      
      // [优化] 选择池（不重新加载列表，只更新样式）
      selectPool(poolId) {
        if (this.currentLimitedPool === poolId) {
          // 如果点击的是已选中的池，直接关闭下拉
          document.getElementById('poolDropdown').style.display = 'none';
          const arrow = document.getElementById('poolDropdownArrow');
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          return;
        }
        
        this.currentLimitedPool = poolId;
        
        // 关闭下拉菜单
        document.getElementById('poolDropdown').style.display = 'none';
        const arrow = document.getElementById('poolDropdownArrow');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        
        // 显示提示
        const pool = this.limitedPools?.find(p => p.id === poolId);
        if (pool) {
          this.toast(\`已切换至: \${pool.name}\`, 'ok');
        }
        
        // [优化] 只更新UI样式，不重新请求数据
        requestAnimationFrame(() => this._updatePoolSelection(poolId));
      },
      
      // [优化] 更新池选中状态（仅修改CSS类）
      _updatePoolSelection(selectedId) {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl) return;
        
        const items = listEl.querySelectorAll('.pool-item');
        items.forEach(item => {
          const poolId = item.dataset.poolId;
          if (poolId === selectedId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      },
      switchAuth(mode) {
        this.authMode = mode;
        document.getElementById('tab-login').classList.toggle('active', mode === 'login');
        document.getElementById('tab-register').classList.toggle('active', mode === 'register');
        document.getElementById('nickGroup').style.display = mode === 'register' ? 'block' : 'none';
      },
      async fetchUserInfo() {
        if (!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) { 
              this.username = data.username; 
              this.nickname = data.nickname;
              // 强制转成数字，避免出现 undefined / NaN
              this.coins = Number.isFinite(Number(data.coins)) ? Number(data.coins) : 0;
              this.updateUI(data); 
          } else { 
              localStorage.removeItem('moe_username');
              this.username = null;
              document.getElementById('authModal').classList.add('show'); 
          }
        } catch(e) {}
      },
      async fetchInventory() {
          if (!this.username) return;
          try {
              const res = await fetch('/user/inventory', { headers: { 'X-User-ID': this.username } });
              const data = await res.json();
              if (data) {
                  this.inventory = data; // 更新内存中的库存
                  this.updateProfileStats(); // 如果个人资料页开着，更新数字
                  this.updateCraftStates();  // 如果合成页开着，更新按钮状态
              }
          } catch(e) { console.error('Inv load failed', e); }
      },
      updateUI(user) {
        // --- 1. 更新顶部导航栏 (Header) ---
        // 必须做非空检查，防止报错中断代码执行
        const navNick = document.getElementById('navNickname');
        if (navNick) navNick.innerText = user.nickname || user.username;

        const navLevel = document.getElementById('navLevel');
        if (navLevel) navLevel.innerText = 'Lv.' + (user.level || 1);

        const navTitle = document.getElementById('navTitle');
        if (navTitle) {
          if (user.title) { 
            navTitle.innerHTML = user.title.name; 
            navTitle.className = 'title-badge'; 
            // 如果后端返回了颜色则使用，否则默认
            navTitle.style.backgroundColor = user.title.color || '#3B82F6'; 
          } else { 
            navTitle.innerHTML = ''; 
            navTitle.className = 'user-title';
            navTitle.style.backgroundColor = 'transparent';
          }
        }

        // --- 2. 更新本地状态 (仅基础数据) ---
        // 注意：库存数据(this.inventory)不再此处更新，改为由 fetchInventory 独立处理
        this.coins = Number.isFinite(Number(user.coins)) ? Number(user.coins) : 0;

        // --- 3. 更新个人资料页的基础信息 (如果DOM存在) ---
        // 即使个人页模态框未打开，这些元素也可能存在于 DOM 中，安全起见都尝试更新
        const elProfileCoins = document.getElementById('profileCoins');
        if (elProfileCoins) elProfileCoins.innerText = this.coins;

        const elProfileLevel = document.getElementById('profileLevel');
        if (elProfileLevel) elProfileLevel.innerText = user.level || 1;

        const elProfileCount = document.getElementById('profileCount');
        if (elProfileCount) elProfileCount.innerText = user.drawCount || 0;
        
        const elProfileNick = document.getElementById('profileNickname');
        if (elProfileNick) elProfileNick.innerText = user.nickname || user.username;
        
        const elProfileUser = document.getElementById('profileUsername');
        if (elProfileUser) elProfileUser.innerText = user.username;

        // --- 4. 更新经验条 ---
        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;

        const elExp = document.getElementById('profileExp');
        if (elExp) elExp.innerText = exp;
        
        const elExpNext = document.getElementById('profileExpNext');
        if (elExpNext) elExpNext.innerText = next;
        
        const elProgText = document.getElementById('profileLevelProgress');
        if (elProgText) elProgText.innerText = progress + '%';
        
        const elProgBar = document.getElementById('profileExpBar');
        if (elProgBar) elProgBar.style.width = progress + '%';

        // --- 5. 更新个人页称号显示 ---
        const titleEl = document.getElementById('currentTitleDisplay');
        if (titleEl) {
            if (user.title && user.title.name) {
                titleEl.innerHTML = \`<span class="title-badge" style="background:linear-gradient(135deg, #3B82F6, #8B5CF6); font-size:1rem; padding:4px 10px;">\${user.title.name}</span>\`;
            } else {
                titleEl.innerHTML = \'<span style="color:#CBD5E1; font-weight:normal;">暂无称号</span>\';
            }
        }
      },
      updateProfileStats() {
        const inv = this.inventory;
        document.getElementById('invCountN').innerText = inv.N || 0;
        document.getElementById('invCountR').innerText = inv.R || 0;
        document.getElementById('invCountSR').innerText = inv.SR || 0;
        document.getElementById('invCountSSR').innerText = inv.SSR || 0;
        document.getElementById('invCountUR').innerText = inv.UR || 0;
        
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        document.getElementById('totalCards').innerText = totalCards;
        
        const drawCount = parseInt(document.getElementById('profileCount').innerText) || 0;
        const level = Math.floor(drawCount / 50) + 1;
        document.getElementById('profileLevel').innerText = level;
      },
      showMoreStats() {
        const inv = this.inventory;
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        const drawCount = parseInt(document.getElementById('profileCount').innerText) || 0;
        const coins = parseInt(document.getElementById('profileCoins').innerText) || 0;
        
        const successRate = drawCount > 0 ? '~' + Math.round((totalCards / drawCount) * 100) + '%' : 'N/A';
        const avgCoins = drawCount > 0 ? Math.round(coins / drawCount) : 'N/A';
        
        const statsHtml = '<div style="text-align:left; font-size:0.9rem;">' +
          '<div style="margin-bottom:10px;"><strong>卡片总数:</strong> ' + totalCards + '</div>' +
          '<div style="margin-bottom:10px;"><strong>卡片分布:</strong></div>' +
          '<div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:5px; margin-bottom:15px;">' +
            '<div style="text-align:center; padding:5px; background:#F1F5F9; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#64748B;">N</div>' +
              '<div style="font-weight:bold;">' + (inv.N || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#DBEAFE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#1E40AF;">R</div>' +
              '<div style="font-weight:bold;">' + (inv.R || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#EDE9FE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#5B21B6;">SR</div>' +
              '<div style="font-weight:bold;">' + (inv.SR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEF3C7; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#92400E;">SSR</div>' +
              '<div style="font-weight:bold;">' + (inv.SSR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEE2E2; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#991B1B;">UR</div>' +
              '<div style="font-weight:bold;">' + (inv.UR || 0) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:10px;"><strong>召唤成功率:</strong> ' + successRate + '</div>' +
          '<div style="margin-bottom:10px;"><strong>平均每次召唤获币:</strong> ' + avgCoins + '</div>' +
        '</div>';
        
        this.showStatsModal('详细统计', statsHtml);
      },
      showStatsModal(title, content) {
        const existingModal = document.getElementById('statsModal');
        if (existingModal) {
          const newModal = existingModal.cloneNode(false);
          existingModal.parentNode.replaceChild(newModal, existingModal);
          existingModal.remove();
        }
        
        const modalHtml = '<div class="modal show" id="statsModal" data-dynamic="true">' +
          '<div class="modal-content" style="max-width:500px;">' +
            '<button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>' +
            '<h3 style="margin-top:0;">' + title + '</h3>' +
            content +
            '<div style="margin-top:20px; text-align:center;">' +
              '<button class="btn" onclick="App.closeModals()" style="padding:8px 20px;">关闭</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('statsModal');
        if (modal) {
          const backdropClickHandler = function(e) {
            if (e.target === this) {
              App.closeModals();
            }
          };
          modal.addEventListener('click', backdropClickHandler);
          modal._backdropClickHandler = backdropClickHandler;
        }
      },
      editProfile() {
        const currentNickname = document.getElementById('profileNickname').innerText;
        const newNickname = prompt('输入新昵称 (最多20个字符):', currentNickname);
        if (newNickname && newNickname !== currentNickname && newNickname.length <= 20) {
          this.toast('更新个人资料中...', 'info');
          document.getElementById('profileNickname').innerText = newNickname;
          document.getElementById('navNickname').innerText = newNickname;
          this.toast('个人资料已更新！', 'ok');
        } else if (newNickname && newNickname.length > 20) {
          this.toast('昵称太长 (最多20个字符)', 'warn');
        }
      },
      shareProfile() {
        const nickname = document.getElementById('profileNickname').innerText;
        const drawCount = document.getElementById('profileCount').innerText;
        const coins = document.getElementById('profileCoins').innerText;
        const shareText = nickname + ' 的抽卡档案！召唤次数: ' + drawCount + ', 积分: ' + coins + '。快来玩吧：' + window.location.origin;
        
        if (navigator.share) {
          navigator.share({ title: nickname + " 的抽卡档案", text: shareText, url: window.location.origin }).catch(err => {
            this.copyToClipboard(shareText);
          });
        } else {
          this.copyToClipboard(shareText);
        }
      },
      copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          this.toast('链接已复制到剪贴板！', 'ok');
        }).catch(err => {
          this.toast('复制失败', 'warn');
        });
      },
      async checkIn() {
        if(this.loading) return;
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        
        this.loading = true;
        try {
            const res = await fetch('/user/check-in', { 
                method: 'POST', 
                headers: { 'X-User-ID': this.username } 
            });
            const data = await res.json();
            
            if(data.success) {
                const bonus = data.checkIn.streakBonus > 0 ? \` (连签奖励 +\${data.checkIn.streakBonus})\` : '';
                this.toast(\`签到成功！金币 +\${data.checkIn.coins}\${bonus}\`, 'ok');
                this.fetchUserInfo(); // 刷新金币显示
            } else {
                this.toast(data.error === 'Already checked in today' ? '今天已经签到过了' : data.error, 'warn');
            }
        } catch(e) {
            this.toast('网络请求失败', 'warn');
        } finally {
            this.loading = false;
        }
      },
      toggleTheme() {
        const currentTheme = localStorage.getItem('moe_theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('moe_theme', newTheme);
        this.applyTheme(newTheme);
        this.toast('已切换至' + (newTheme === 'dark' ? '深色' : '浅色') + '模式', 'ok');
      },
      applyTheme(theme) {
        if (theme === 'dark') {
          document.documentElement.style.setProperty('--bg-color', '#0F172A');
          document.documentElement.style.setProperty('--card-bg', 'rgba(30, 41, 59, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#F1F5F9');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        } else {
          document.documentElement.style.setProperty('--bg-color', '#F8FAFC');
          document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#334155');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        }
      },
      initTheme() {
        const savedTheme = localStorage.getItem('moe_theme') || 'light';
        this.applyTheme(savedTheme);
      },
      updateCraftStates() {
         const inv = this.inventory;
         document.getElementById('invN').innerText = inv.N || 0; document.getElementById('craft-item-R').classList.toggle('can-craft', (inv.N || 0) >= 5);
         document.getElementById('invR').innerText = inv.R || 0; document.getElementById('craft-item-SR').classList.toggle('can-craft', (inv.R || 0) >= 5);
         document.getElementById('invSR').innerText = inv.SR || 0; document.getElementById('craft-item-SSR').classList.toggle('can-craft', (inv.SR || 0) >= 5);
         document.getElementById('invSSR').innerText = inv.SSR || 0; document.getElementById('craft-item-UR').classList.toggle('can-craft', (inv.SSR || 0) >= 5);
      },
      mapError(err) {
        const map = {
          'Not Enough Points': '积分不足！',
          'Username Taken': '用户名或昵称已被占用',
          'Nickname Taken': '用户名或昵称已被占用',
          'User Not Found': '用户不存在',
          'Invalid Password': '密码错误',
          'Auth Failed': '认证失败',
          'Missing fields': '请填写完整信息',
          'Invalid Credentials': '账号或密码错误',
          'Invalid level': '无效的等级',
          'Level not reached yet': '尚未达到该等级',
          'Reward already claimed': '奖励已领取',
          'No special reward for this level': '该等级没有特殊奖励'
        };
        return map[err] || err;
      },
      async doAuth() {
        const u = document.getElementById('authUsername').value.trim();
        const p = document.getElementById('authPassword').value;
        const n = document.getElementById('authNickname').value.trim();
        
        if (this.authMode === 'register') {
             if (!u || !p || !n) return this.toast('请填写完整信息', 'warn');
             try {
                const res = await fetch('/auth/register', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, nickname: n, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.toast('注册成功，请登录', 'ok'); 
                    this.switchAuth('login');
                } else { 
                    this.toast(this.mapError(d.error), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
        } else {
             if (!u || !p) return this.toast('请输入账号和密码', 'warn');
             try {
                const res = await fetch('/auth/login', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.username = d.user.username;
                    localStorage.setItem('moe_username', d.user.username);
                    this.updateUI(d.user);
                    document.getElementById('authModal').classList.remove('show');
                } else { 
                    this.toast(this.mapError(d.error || '连接失败'), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
        }
      },
      async checkAnnouncement() {
        try {
          const res = await fetch('/announcement');
          const data = await res.json();
          if (data.enabled) {
            const lastReadId = localStorage.getItem('moe_ann_read');
            if (lastReadId !== String(data.id)) {
              this.showAnnouncementModal(data);
              this.currentAnnId = data.id; 
            }
          }
        } catch(e) {}
      },
      showAnnouncementModal(data) {
        document.getElementById('annTitle').innerText = data.title || '公告';
        document.getElementById('annContent').innerHTML = marked.parse(data.content || '');
        document.getElementById('announcementModal').classList.add('show');
      },
      closeAnnouncement() {
        if (this.currentAnnId) {
            localStorage.setItem('moe_ann_read', String(this.currentAnnId));
        }
        document.getElementById('announcementModal').classList.remove('show');
      },
      previewAnnouncement() {
        const content = document.getElementById('adminAnnContent').value;
        const title = document.getElementById('adminAnnTitle').value;
        this.showAnnouncementModal({ title: title + " (预览)", content: content });
      },
      async loadAdminAnnouncement() {
        try {
            const res = await fetch('/announcement');
            const data = await res.json();
            document.getElementById('adminAnnTitle').value = data.title || '';
            document.getElementById('adminAnnContent').value = data.content || '';
            // 修改为 checkbox 赋值
            document.getElementById('adminAnnEnable').checked = data.enabled || false;
            // 默认“强制弹窗”为关闭，防止误触
            document.getElementById('adminAnnRefresh').checked = false;
        } catch(e) { this.toast('加载失败', 'warn'); }
      },
      async saveAnnouncement() {
        const title = document.getElementById('adminAnnTitle').value;
        const content = document.getElementById('adminAnnContent').value;
        // 获取 checkbox 状态
        const enabled = document.getElementById('adminAnnEnable').checked;
        const refreshId = document.getElementById('adminAnnRefresh').checked; // 获取是否刷新ID
        
        if(!title || !content) return this.toast('请填写标题和内容', 'warn');
        
        try {
            const res = await fetch('/admin/save-announcement', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    password: this.adminPwd, 
                    announcement: { title, content, enabled },
                    refreshId: refreshId // 传给后端
                }) 
            });
            const d = await res.json();
            if(d.success) {
                this.toast('保存成功！' + (refreshId ? ' (已推送弹窗)' : ''), 'ok'); 
                // 保存成功后自动关闭强制推送开关，防止下次误触
                document.getElementById('adminAnnRefresh').checked = false;
            }
            else this.toast(this.mapError(d.error) || '保存失败', 'warn'); 
        } catch(e) { this.toast('网络错误', 'warn'); }
      },
      async loadChangelog() {
        try {
          const res = await fetch('/changelog'); this.logsData = await res.json(); const list = document.getElementById('logList');
          if(this.logsData && this.logsData.length) {
            list.innerHTML = this.logsData.map(log => {
              const isTodo = log.ver.includes('To-Do');
              const tag = log.tag || 'optimization';
              const tagLabels = {
                'optimization': { text: '优化', color: '#3B82F6', icon: 'fas fa-bolt' },
                'feature': { text: '功能', color: '#10B981', icon: 'fas fa-star' },
                'bugfix': { text: '修复', color: '#EF4444', icon: 'fas fa-bug' },
                'todo': { text: '待办', color: '#8B5CF6', icon: 'fas fa-thumbtack' },
                'documentation': { text: '文档', color: '#94A3B8', icon: 'fas fa-book' },
                'refactor': { text: '重构', color: '#F59E0B', icon: 'fas fa-code-branch' }
              };
              const tagInfo = tagLabels[tag] || tagLabels.optimization;
              return \`<div class="log-item"><div class="log-meta"><span class="log-ver \${isTodo?'todo':''} ">\${isTodo?'<i class="fas fa-thumbtack"></i> ':''}\${log.ver}</span> <span>\${log.date}</span> <span class="log-tag" style="background:\${tagInfo.color}"><i class="\${tagInfo.icon}"></i> \${tagInfo.text}</span></div><div class="log-content">\${log.content}</div></div>\`;
            }).join('');
            if (this.logsData.length > 3) document.getElementById('logToggle').style.display = 'block';
          }
        } catch(e) {}
      },
      toggleLog() { const list = document.getElementById('logList'); const btn = document.getElementById('logToggle'); list.classList.toggle('collapsed'); btn.innerHTML = list.classList.contains('collapsed') ? ('展开更多 <i class="fas fa-chevron-down"></i>') : ('收起列表 <i class="fas fa-chevron-up"></i>'); },
      async draw() {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        
        if (this.currentPool === 'ltd') {
             // [修复] 使用 this.coins 而不是查找不存在的 DOM 元素
             const currentCoins = this.coins;
             const cost = ${CONFIG.LIMITED.COST};
             if (currentCoins < cost) return this.toast('积分不足！', 'warn');
        }

        this.loading = true;
        const btn = document.getElementById('drawBtn');
        const img = document.getElementById('resultImg');
        const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        img.classList.remove('show');
        tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');

        try {
          let url = '/draw';
          let method = 'GET';
          let body = null;
          console.log('[DrawDebug] currentPool:', this.currentPool, 'currentLimitedPool:', this.currentLimitedPool);
          if (this.currentPool === 'ltd') {
              url = '/draw/limited';
              method = 'POST';
              // 发送选择的池 ID，如果没有选择则默认 genshin
              const poolId = this.currentLimitedPool || 'genshin';
              body = JSON.stringify({ poolId: poolId });
              console.log('[DrawDebug] Sending poolId:', poolId);
          }

          const fetchOptions = { method: method, headers: { 'X-User-ID': this.username, 'Content-Type': 'application/json' } };
          if (body) fetchOptions.body = body;
          const res = await fetch(url, fetchOptions);
          const data = await res.json();
          
          if(data.error) {
              if (data.error === 'USER_NOT_FOUND') {
                   document.getElementById('authModal').classList.add('show');
                   throw new Error('请登录或注册');
              }
              throw this.mapError(data.error);
          }
          this.handleDrawResult(data, img, tag, btn);
         } catch(e) {
           this.loading = false;
           document.getElementById('loadingSpinner').classList.remove('show');
           this.switchPool(this.currentPool);
           this.toast(e.message || e.toString(), 'warn');
         }
      },
      async doCraft(target) {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        const costMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
        if ((this.inventory[costMap[target]] || 0) < 5) return this.toast('需要 5 张 ' + costMap[target], 'warn');
        
        if(!confirm('确定消耗5张低阶卡合成1张 ' + target + ' 吗？')) return;
        
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-flask fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity: target }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
           if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); this.fetchUserInfo(); }
      },
      handleDrawResult(data, img, tag, btn, isSpecial = false) {
           img.src = data.imageUrl;
           
           const onImageLoad = () => {
               if (!img || !document.body.contains(img)) return;
               img.classList.add('show');
               const placeholder = document.getElementById('placeholder');
               const spinner = document.getElementById('loadingSpinner');
               const btn = document.getElementById('drawBtn');
               const tag = document.getElementById('rarityTag');
               if (placeholder) placeholder.style.display = 'none';
               if (spinner) spinner.classList.remove('show');
               this.loading = false;
              
              const icon = this.currentPool === 'ltd' ? 'fa-star' : 'fa-bolt';
              if (btn) btn.innerHTML = \`<i class="fas \${icon}"></i> 再召唤\`;

              if (data.rarity && tag) { 
                  tag.innerText = data.rarity; 
                  tag.className = 'rarity-tag r-' + data.rarity.toLowerCase(); 
                  tag.classList.add('show'); 
              }
             
             if(data.success) { 
                 // 1. 成功反馈
                 this.vibrate('success');
                 this.animate('drawBtn', 'success'); 
                 this.toast(isSpecial || this.currentPool === 'ltd' ? '召唤成功！' : '召唤成功', 'ok'); 

                 // 2. [关键优化] 直接使用后端返回的数据更新 UI，不再发起 fetch
                 let newCoins = data.userCoins !== undefined ? data.userCoins : data.newBalance;
                 // 容错：后端字段缺失或类型异常时，避免把 undefined 写进 this.coins
                 newCoins = Number.isFinite(Number(newCoins)) ? Number(newCoins) : null;
                 if (newCoins !== undefined) {
                    this.coins = newCoins === null ? this.coins : newCoins;
                    const pCoins = document.getElementById('profileCoins');
                    if (pCoins) pCoins.innerText = this.coins;
                 }
                 
                 // 3. 处理升级信息
                 if (data.levelUp) {
                     const { newLevel, reward } = data.levelUp;
                     this.toast(\`恭喜升级到 Lv.\${newLevel}！获得 \${reward} 金币\`, 'ok');
                     const pLevel = document.getElementById('profileLevel');
                     if(pLevel) pLevel.innerText = newLevel;
                     const navLevel = document.getElementById('navLevel');
                     if(navLevel) navLevel.innerText = 'Lv.' + newLevel;
                 }

                 // 4. [关键优化] 本地更新库存，不刷新
                 // 普通抽卡/限定抽卡
                 if (data.rarity && !isSpecial) {
                     if (this.inventory) {
                         this.inventory[data.rarity] = (this.inventory[data.rarity] || 0) + 1;
                         // 只有当用户真的打开了个人资料页或者合成页时，才去更新具体的 DOM
                         if (document.getElementById('profileModal').classList.contains('show')) {
                             this.updateProfileStats();
                         }
                         if (document.getElementById('craftModal').classList.contains('show')) {
                             this.updateCraftStates();
                         }
                     }
                 }
                 // 合成操作 (后端返回了 craftResult 最好，如果没有则全量刷新)
                 else if (isSpecial && data.craftResult) {
                       if (this.inventory) {
                           this.inventory[data.craftResult.consumed] = Math.max(0, (this.inventory[data.craftResult.consumed] || 0) - 5);
                           this.inventory[data.craftResult.gained] = (this.inventory[data.craftResult.gained] || 0) + 1;
                           this.updateCraftStates();
                           
                           // 3秒后后台同步，确保数据一致性
                           setTimeout(() => this.fetchInventory(), 3000);
                       }
                 }
                 // 兜底：如果是复杂操作且没有详细数据，稍微延迟后刷新一次
                 else if (isSpecial) {
                     setTimeout(() => this.fetchInventory(), 500);
                 }

             } else { 
                 this.vibrate('failure');
                 this.toast('连接失败', 'warn'); 
             }
          };
          
          if (img.complete) onImageLoad(); else { 
              img.onload = onImageLoad; 
              img.onerror = () => { 
                  this.loading = false; 
                  this.vibrate('failure');
                  this.animate('drawBtn', 'error');
                  this.switchPool(this.currentPool); 
                  this.toast('图片加载失败', 'warn'); 
              }; 
          }
      },
      openCraft() { if(!this.username) return document.getElementById('authModal').classList.add('show'); this.updateCraftStates(); document.getElementById('craftModal').classList.add('show'); },
      openRules() { document.getElementById('profileModal').classList.remove('show'); document.getElementById('rulesModal').classList.add('show'); },
      closeRulesToProfile() { document.getElementById('rulesModal').classList.remove('show'); document.getElementById('profileModal').classList.add('show'); },
      openShop() {
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        // 兜底：如果 coins 尚未正确初始化，视为 0，避免界面显示为 "undefined"
        const balance = Number.isFinite(Number(this.coins)) ? Number(this.coins) : 0;
        if(document.getElementById('shopBalance')) document.getElementById('shopBalance').innerText = balance;
        const packs = [{ id: 'R', color: '#3B82F6', price: 100 }, { id: 'SR', color: '#8B5CF6', price: 500 }, { id: 'SSR', color: '#F59E0B', price: 2000 }, { id: 'UR', color: '#EF4444', price: 8000 }];
        const container = document.getElementById('shopContent');
        if(container) {
            container.innerHTML = packs.map(p => {
                const can = balance >= p.price;
                return \`<div class="shop-item \${can?'':'disabled'}" \${can? \`onclick="App.buyPack('\${p.id}', \${p.price})"\` : ''}><div style="font-weight:900; font-size:1.5rem; color:\${p.color}">\${p.id}</div><div class="price-tag"><i class="fas fa-coins"></i> \${p.price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">\${can?'购买':'积分不足'}</div></div>\`;
            }).join('');
        }
        document.getElementById('shopModal').classList.add('show');
      },
      async buyPack(rarity, price) {
        if(this.loading) return;
        if(!confirm('确定花费 ' + price + ' 积分吗？')) return;
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-shopping-cart fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity: rarity }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); }
      },
      openDice() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('diceModal').classList.add('show'); document.getElementById('diceIcon').className = 'fas fa-dice-d6'; document.getElementById('diceMsg').innerText = ''; },
      openUpload() { 
        if(!this.username) return document.getElementById('authModal').classList.add('show'); 
        document.getElementById('uploadModal').classList.add('show'); 
        document.getElementById('uploadMsg').innerText = '';
        document.getElementById('uploadPreview').style.display = 'none';
        document.getElementById('uploadInput').value = '';
        
        // 绑定文件选择事件
        const input = document.getElementById('uploadInput');
        const dropZone = document.getElementById('uploadDropZone');
        
        input.onchange = (e) => {
          if(e.target.files && e.target.files[0]) {
            this.previewUpload(e.target.files[0]);
          }
        };
        
        dropZone.onclick = () => input.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = '#E9D5FF'; };
        dropZone.ondragleave = () => { dropZone.style.background = '#FAF5FF'; };
        dropZone.ondrop = (e) => {
          e.preventDefault();
          dropZone.style.background = '#FAF5FF';
          if(e.dataTransfer.files && e.dataTransfer.files[0]) {
            input.files = e.dataTransfer.files;
            this.previewUpload(e.dataTransfer.files[0]);
          }
        };
      },
      previewUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('uploadPreviewImg').src = e.target.result;
          document.getElementById('uploadPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      },
      async doUpload() {
        if(this.loading) return;
        
        const input = document.getElementById('uploadInput');
        const rarity = document.getElementById('uploadRarity').value;
        const msg = document.getElementById('uploadMsg');
        
        if(!input.files || !input.files[0]) {
          msg.innerText = '请先选择图片';
          msg.style.color = '#EF4444';
          return;
        }
        
        const file = input.files[0];
        
        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if(!allowedTypes.includes(file.type)) {
          msg.innerText = '不支持的文件类型';
          msg.style.color = '#EF4444';
          return;
        }
        
        // 验证文件大小 (5MB)
        if(file.size > 5 * 1024 * 1024) {
          msg.innerText = '文件过大，最大支持5MB';
          msg.style.color = '#EF4444';
          return;
        }
        
        this.loading = true;
        msg.innerText = '上传中...';
        msg.style.color = '#6B7280';
        document.getElementById('uploadBtn').disabled = true;
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('rarity', rarity);
          
          const res = await fetch('/user/upload', {
            method: 'POST',
            body: formData,
            headers: { 'X-User-ID': this.username }
          });
          
          const data = await res.json();
          
          if(data.error) {
            msg.innerText = this.mapError(data.error);
            msg.style.color = '#EF4444';
            this.vibrate('failure');
          } else {
            msg.innerText = '上传成功！等待审核';
            msg.style.color = '#10B981';
            this.vibrate('success');
            this.toast('图片上传成功', 'ok');
            setTimeout(() => this.closeModals(), 1500);
          }
        } catch(e) {
          msg.innerText = '上传失败';
          msg.style.color = '#EF4444';
          this.vibrate('failure');
        } finally {
          this.loading = false;
          document.getElementById('uploadBtn').disabled = false;
        }
      },
      async playDice(prediction) {
        if(this.loading) return; 
        const bet = parseInt(document.getElementById('betInput').value); 
        if(!bet || bet < 10) {
            // [优化] 输入错误反馈
            this.vibrate('failure');
            this.animate('betInput', 'error');
            return this.toast('最小下注为 10', 'warn');
        }

        this.loading = true; 
        this.vibrate('tap'); // 点击反馈

        const icon = document.getElementById('diceIcon'); 
        const msg = document.getElementById('diceMsg'); 
        
        icon.classList.add('dice-result-anim'); 
        msg.innerText = '骰子转动中...';
        
        try {
          const res = await fetch('/game/dice', { method: 'POST', body: JSON.stringify({ betAmount: bet, prediction: prediction }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          setTimeout(() => {
             this.loading = false; 
             icon.classList.remove('dice-result-anim');
             
             if(data.error) { 
                 this.vibrate('failure');
                 msg.innerText = this.mapError(data.error); 
                 return; 
             }
             
             const diceIcons = ['one', 'two', 'three', 'four', 'five', 'six']; 
             icon.className = \`fas fa-dice-\${diceIcons[data.roll - 1]}\`;
             
             // [优化] 胜负反馈动画与震动
             if(data.isWin) { 
                 this.vibrate('success');
                 this.animate('diceIcon', 'success'); // 图标弹跳
                 msg.innerText = \`你赢了！ (+\${data.winAmount})\`; 
                 msg.style.color = '#10B981'; 
                 this.toast('运气爆棚！', 'ok'); 
             } else { 
                 this.vibrate('failure');
                 this.animate('diceIcon', 'error'); // 图标抖动
                 msg.innerText = '你输了'; 
                 msg.style.color = '#EF4444'; 
             }
             
             this.coins = data.newBalance;
             const pCoins = document.getElementById('profileCoins');
             if(pCoins) pCoins.innerText = data.newBalance;
          }, 600);
        } catch(e) { 
            this.loading = false; 
            icon.classList.remove('dice-result-anim'); 
            this.vibrate('failure');
            this.toast('网络错误', 'warn'); 
        }
      },
      async loadShowcase() {
        const grid = document.getElementById('showcaseGrid'); 
        const btn = document.getElementById('refreshBtn');
        
        // [交互] 点击刷新时的反馈
        if(btn) {
            this.vibrate('tap');
            btn.classList.remove('refresh-spin');
            void btn.offsetWidth;
            btn.classList.add('refresh-spin');
        }

        // [优化] 渲染骨架屏：生成6个占位方块，不再显示简单的"加载中"
        // 保持高度与实际图片一致 (aspect-ratio: 1)
        const skeletonHtml = Array(6).fill(0).map(() => 
            \`<div class="grid-item skeleton" style="aspect-ratio:1; border:none;"></div>\`
        ).join('');
        grid.innerHTML = skeletonHtml;

        try { 
            const res = await fetch('/showcase?t=' + Date.now()); 
            const data = await res.json(); 
            if(data.length) { 
                // 图片加载后渐显效果已在原有CSS (.grid-item img) 中定义
                grid.innerHTML = data.map(item => 
                    \`<div class="grid-item anim-pop" onclick="App.preview('\${item.imageUrl}')"><img src="\${item.imageUrl}" loading="lazy"></div>\`
                ).join(''); 
            } else {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">暂无数据</div>';
            }
        } catch(e) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#EF4444;">加载失败</div>';
        }
        if(btn) setTimeout(() => btn.classList.remove('refresh-spin'), 800);
      },
      openAdmin() { this.closeModals(); document.getElementById('adminModal').classList.add('show'); },
      async verifyAdmin() {
        const pwd = document.getElementById('adminPass').value;
        try {
            const res = await fetch('/admin/verify', { method: 'POST', body: JSON.stringify({password: pwd}) }); const d = await res.json();
            if(d.success) { this.adminPwd = pwd; document.getElementById('adminLogin').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; this.switchAdminTab('log'); this.renderAdminTable(); } else { this.toast('密码错误', 'warn'); }
        } catch(e) { this.toast('网络错误', 'warn'); }
      },
      switchAdminTab(tab) { this.currentAdminTab = tab; document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active'); document.getElementById('view-log').style.display = tab === 'log' ? 'block' : 'none'; document.getElementById('view-users').style.display = tab === 'users' ? 'block' : 'none'; document.getElementById('view-uploads').style.display = tab === 'uploads' ? 'block' : 'none'; document.getElementById('view-ann').style.display = tab === 'ann' ? 'block' : 'none'; if(tab === 'users') this.loadAdminUsers(); if(tab === 'uploads') this.loadAdminUploads(); if(tab === 'ann') this.loadAdminAnnouncement();},
      async loadAdminUsers() {
        const tbody = document.getElementById('userTbody'); 
        
        // [优化] 表格骨架屏：生成5行，每行显示灰色条状
        const skeletonRow = \`
            <tr>
                <td><div class="skeleton" style="height:20px; width:80%; margin-bottom:4px;"></div><div class="skeleton" style="height:12px; width:50%;"></div></td>
                <td><div class="skeleton" style="height:20px; width:40%;"></div></td>
                <td><div class="skeleton" style="height:20px; width:60%;"></div></td>
                <td><div class="skeleton" style="height:24px; width:40px;"></div></td>
            </tr>
        \`;
        tbody.innerHTML = Array(5).fill(skeletonRow).join('');

        try { 
            const res = await fetch('/admin/users', { method: 'POST', body: JSON.stringify({ password: this.adminPwd }) }); 
            const data = await res.json(); 
            if(data.success && data.users.length) { 
                tbody.innerHTML = data.users.map(u => \`<tr><td><div style="font-weight:bold; color:var(--primary);">\${u.username}</div><div class="user-row-meta">\${u.nickname}</div></td><td><span class="user-badge">\${u.drawCount}</span></td><td><span class="user-badge" style="color:#F59E0B">\${u.coins}</span><button class="btn secondary" style="padding:2px 6px; font-size:0.7rem; margin-left:4px;" onclick="App.adminEditPoints('\${u.username}')">改</button></td><td><button class="btn danger" style="padding:4px 8px; font-size:0.7rem;" onclick="App.deleteUser('\${u.username}')">删</button></td></tr>\`).join(''); 
            } else { 
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">暂无用户</td></tr>'; 
            } 
        } catch(e) { 
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">加载失败</td></tr>'; 
        }
      },
      async adminEditPoints(userId) { const val = prompt('输入要增加或减少的积分:'); if(!val) return; const amount = parseInt(val); if(isNaN(amount)) return; try { const res = await fetch('/admin/update-points', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: userId, amount: amount }) }); const d = await res.json(); if(d.success) { this.toast('保存成功！', 'ok'); this.loadAdminUsers(); } else { this.toast(d.error, 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async deleteUser(id) { if(!confirm('确定删除该用户吗？此操作不可逆。')) return; try { const res = await fetch('/admin/delete-user', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: id }) }); const d = await res.json(); if(d.success) { this.toast('用户已删除', 'ok'); this.loadAdminUsers(); } else { this.toast('Error', 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async loadAdminUploads() {
        const container = document.getElementById('uploadsContainer');
        const status = document.getElementById('uploadStatusFilter').value;
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-light);"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:10px; display:block;"></i>加载中...</div>';
        try {
          const res = await fetch('/admin/uploads', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, status })
          });
          const d = await res.json();
          if(d.success) {
            document.getElementById('uploadsCountBadge').textContent = d.total || 0;
            if(!d.uploads || d.uploads.length === 0) {
              container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-light);"><i class="fas fa-inbox" style="font-size:2rem; margin-bottom:10px; display:block;"></i>暂无' + (status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已拒绝') + '的上传</div>';
              return;
            }
            let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:15px; padding:15px;">';
            d.uploads.forEach(u => {
              const dateStr = new Date(u.created_at).toLocaleString('zh-CN');
              const rarityClass = 'r-' + (u.rarity || 'N').toLowerCase();
              const rarityName = u.rarity || 'N';
              html += \`
                <div style="border:1px solid #E2E8F0; border-radius:8px; overflow:hidden; background:white;">
                  <div style="position:relative; aspect-ratio:1; background:#F8FAFC; cursor:pointer;" onclick="App.showImage('\${u.url}')">
                    <img src="\${u.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    <span class="rarity-tag \${rarityClass} show" style="position:absolute; top:8px; left:8px; font-size:0.75rem; padding:2px 8px;">\${rarityName}</span>
                  </div>
                  <div style="padding:10px;">
                    <div style="font-size:0.8rem; font-weight:bold; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${u.username}</div>
                    <div style="font-size:0.7rem; color:var(--text-light); margin-bottom:8px;">\${dateStr}</div>
                    \${status === 'pending' ? \`
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                      <select id="rarity-\${u.id}" style="padding:4px; border:1px solid #E2E8F0; border-radius:4px; font-size:0.75rem;">
                        <option value="N">N</option>
                        <option value="R">R</option>
                        <option value="SR">SR</option>
                        <option value="SSR">SSR</option>
                        <option value="UR" selected>UR</option>
                      </select>
                      <button class="btn" style="padding:4px; font-size:0.75rem;" onclick="App.reviewUpload(\${u.id}, 'approved')">通过</button>
                      <button class="btn secondary" style="padding:4px; font-size:0.75rem; grid-column:1/-1;" onclick="App.reviewUpload(\${u.id}, 'rejected')">拒绝</button>
                    </div>
                    \` : \`<div style="font-size:0.75rem; color:var(--text-light); text-align:center;">已\${status === 'approved' ? '通过' : '拒绝'}</div>\`}
                  </div>
                </div>
              \`;
            });
            html += '</div>';
            container.innerHTML = html;
          } else {
            container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>加载失败: ' + (d.error || 'Unknown') + '</div>';
          }
        } catch(e) {
          container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:10px; display:block;"></i>网络错误</div>';
        }
      },
      async reviewUpload(uploadId, action) {
        const rarity = action === 'approved' ? document.getElementById('rarity-' + uploadId).value : null;
        try {
          const res = await fetch('/admin/review-upload', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, uploadId, action, rarity })
          });
          const d = await res.json();
          if(d.success) {
            this.toast(action === 'approved' ? '已通过审核' : '已拒绝', 'ok');
            this.loadAdminUploads();
          } else {
            this.toast(d.error || '操作失败', 'warn');
          }
        } catch(e) {
          this.toast('网络错误', 'warn');
        }
      },
      renderAdminTable() { document.getElementById('adminTbody').innerHTML = this.logsData.map((log, idx) => \`<tr><td><input class="admin-input" value="\${log.date}" onchange="App.updateLog(\${idx}, 'date', this.value)"></td><td><input class="admin-input" value="\${log.ver}" onchange="App.updateLog(\${idx}, 'ver', this.value)"></td><td><input class="admin-input" value="\${log.content}" onchange="App.updateLog(\${idx}, 'content', this.value)"></td><td><select class="admin-input" style="padding:4px 6px;" onchange="App.updateLog(\${idx}, 'tag', this.value)"><option value="optimization" \${log.tag === 'optimization' ? 'selected' : ''}>优化</option><option value="feature" \${log.tag === 'feature' ? 'selected' : ''}>功能</option><option value="bugfix" \${log.tag === 'bugfix' ? 'selected' : ''}>修复</option><option value="todo" \${log.tag === 'todo' ? 'selected' : ''}>待办</option><option value="documentation" \${log.tag === 'documentation' ? 'selected' : ''}>文档</option><option value="refactor" \${log.tag === 'refactor' ? 'selected' : ''}>重构</option></select></td><td><button class="btn danger" style="padding:4px 8px; font-size:0.7rem;" onclick="App.delLog(\${idx})">删</button></td></tr>\`).join(''); },
      updateLog(idx, field, val) { this.logsData[idx][field] = val; }, addAdminRow() { this.logsData.unshift({date: new Date().toISOString().split('T')[0], ver:'v.X', content:'...', tag:'optimization'}); this.renderAdminTable(); }, delLog(idx) { this.logsData.splice(idx, 1); this.renderAdminTable(); },
      async saveAdminLog() { try { const res = await fetch('/admin/save-changelog', { method: 'POST', body: JSON.stringify({password: this.adminPwd, logs: this.logsData}) }); const d = await res.json(); if(d.success) { this.toast('保存成功！', 'ok'); this.loadChangelog(); } else { this.toast('保存失败', 'warn'); } } catch(e) { this.toast('保存失败', 'warn'); } },
      openProfile() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('profileModal').classList.add('show'); },
      closeModals() {
        document.querySelectorAll('.modal').forEach(m => {
          m.classList.remove('show');
          if (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true') {
            if (m._backdropClickHandler) {
              m.removeEventListener('click', m._backdropClickHandler);
              delete m._backdropClickHandler;
            }
            setTimeout(() => {
              if (m.parentNode && (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true')) {
                m.remove();
              }
            }, 300);
          }
        });
        setTimeout(() => {
          const statsModal = document.getElementById('statsModal');
          if (statsModal && statsModal.parentNode) {
            statsModal.remove();
          }
        }, 350);
      },
      logout() { if(confirm('确定要注销吗？')) { localStorage.removeItem('moe_username'); location.reload(); } },
      preview(src) { document.getElementById('bigImg').src=src; document.getElementById('imgModal').classList.add('show'); },
      toast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = \`<span>\${type==='ok'?'✅':'⚠️'}</span> \${msg}\`; document.body.appendChild(div); setTimeout(() => div.remove(), 2500); }
    };
    window.onload = () => {
        document.getElementById('ltdCostDisplay').innerText = '${CONFIG.LIMITED.COST} pts';
        App.init();
    };
  </script>
</body>
</html>
  `;
}

function getLibraryHtml(items, pager) {
  // 定义虚拟滚动和无限加载的专用 CSS
  const LIBRARY_CSS = `
  <style>
    :root {
      --gap: 16px;
      --bg-color: #F8FAFC;
    }
    body {
      padding-top: 70px;
      background-color: var(--bg-color);
      scrollbar-width: thin;
      margin: 0;
      height: 100vh;
      overflow: hidden; 
    }
    
    .nav {
      position: fixed; top: 0; left: 0; right: 0; height: 60px;
      background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 100;
      padding: 0 20px; 
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    
    .virtual-scroll-container {
      position: relative;
      width: 100%;
      height: calc(100vh - 70px); 
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .virtual-scroll-content {
      position: relative;
      width: 100%;
    }
    
    .masonry-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
      column-count: 2;
      column-gap: var(--gap);
    }
    
    @media (min-width: 640px) { .masonry-container { column-count: 3; } }
    @media (min-width: 1024px) { .masonry-container { column-count: 4; } }
    @media (min-width: 1280px) { .masonry-container { column-count: 5; } }

    .item {
      break-inside: avoid;
      margin-bottom: var(--gap);
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: 0 2px 5px rgba(0,0,0,0.03);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: zoom-in;
      position: relative;
      opacity: 0;
    }
    
    @keyframes fadeIn { to { opacity: 1; } }
    
    .item:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
      border-color: var(--primary);
      z-index: 2;
    }

    .img-wrapper {
      width: 100%;
      min-height: 150px; 
      background: #F1F5F9;
      position: relative;
    }

    .item img {
      width: 100%;
      height: auto;
      display: block;
      opacity: 0;
      transition: opacity 0.6s ease;
      object-fit: cover;
    }

    .item img.loaded { opacity: 1; }

    .item-user {
      padding: 10px 12px;
      background: white;
      font-size: 0.85rem;
      color: var(--text-main);
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #F1F5F9;
    }
    .user-tag {
      font-weight: bold;
      color: #64748B;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .loading-indicator {
      text-align: center;
      padding: 40px 0;
      color: #94A3B8;
      font-size: 0.9rem;
      column-span: all; 
      display: block;
      width: 100%;
      margin-top: 20px;
    }
    
    .end-message {
      display: inline-block;
      padding: 8px 20px;
      background: #F1F5F9;
      border-radius: 20px;
      color: #CBD5E1;
      font-size: 0.85rem;
      letter-spacing: 1px;
    }
    
    .loading-spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid #E2E8F0;
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 10px;
      vertical-align: middle;
    }
    
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    #backToTop {
      position: fixed; bottom: 30px; right: 30px;
      width: 50px; height: 50px; border-radius: 50%;
      background: var(--primary); color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; cursor: pointer;
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
      opacity: 0; pointer-events: none; transition: 0.3s;
      z-index: 90;
      border: none;
    }
    #backToTop.show { opacity: 1; pointer-events: auto; transform: translateY(0); }
    #backToTop:active { transform: scale(0.95); }

    .empty-state {
      text-align: center;
      padding: 100px 20px;
      color: #94A3B8;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
    }
    .empty-state i { font-size: 4rem; margin-bottom: 20px; color: #E2E8F0; }
  </style>
  `;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>图库 - 无限滚动</title>
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  ${LIBRARY_CSS}
</head>
<body>
  <nav class="nav">
    <div>
      <a href="/" class="btn secondary" style="padding: 8px 16px; font-size:0.9rem; border-radius:10px;">
        <i class="fas fa-arrow-left"></i> <span style="display:none; display:inline-block @media(min-width:400px);">返回</span>
      </a>
    </div>
    <div style="font-weight:bold; color:var(--text-main);">图库</div>
    <div style="width: 60px;"></div>
  </nav>

  <div class="virtual-scroll-container" id="scrollContainer">
    <div class="virtual-scroll-content" id="scrollContent">
      <div class="masonry-container" id="masonryContainer">
        ${items.length === 0 ? `
          <div class="empty-state">
            <i class="fas fa-images"></i>
            <h3>暂无图片</h3>
            <p>快去首页抽取卡片吧！</p>
          </div>
        ` : ''}
        
        <!-- 修复点：onclick="VirtualScroll.show(...)" -->
        ${items.map((item, index) => `
          <div class="item" data-index="${index}" onclick="VirtualScroll.show('${item.url}')" style="opacity:1">
            <div class="img-wrapper">
              <img data-src="${item.url}" class="lazy" alt="Image by ${item.username}">
            </div>
            <div class="item-user">
              <div class="user-tag"><i class="fas fa-user-circle"></i> ${item.username}</div>
              <div style="font-size:0.7rem; color:#CBD5E1;">${new Date(item.ts).toLocaleDateString()}</div>
            </div>
          </div>
        `).join('')}
        
        ${pager.currentPage < pager.totalPages ? `
          <div class="loading-indicator" id="loadingIndicator">
            <div class="loading-spinner"></div> 加载更多...
          </div>
        ` : ''}
        
        ${pager.currentPage >= pager.totalPages && items.length > 0 ? `
          <div class="loading-indicator">
            <span class="end-message">- 到底啦 -</span>
          </div>
        ` : ''}
      </div>
    </div>
  </div>

  <button id="backToTop" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">
    <i class="fas fa-arrow-up"></i>
  </button>

  <div id="imgModal" class="modal" onclick="this.classList.remove('show')">
    <img id="bigImg" style="max-width:95%; max-height:90vh; border-radius:8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
  </div>

  <script>
    const VirtualScroll = {
      currentPage: ${pager.currentPage},
      totalPages: ${pager.totalPages},
      totalItems: ${pager.totalItems},
      allItems: ${JSON.stringify(items)},
      
      pageSize: 24,
      isLoading: false,
      lastRenderedIndex: -1, 

      init() {
        this.setupImageLazyLoad(); 
        this.lastRenderedIndex = this.allItems.length - 1; 
        this.setupBackToTop();
        
        if (this.currentPage < this.totalPages) {
          this.setupInfiniteScroll();
        }
      },
      
      renderNewItems() {
        const masonryContainer = document.getElementById('masonryContainer');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        for (let i = this.lastRenderedIndex + 1; i < this.allItems.length; i++) {
            const item = this.allItems[i];
            if (!item) continue;

            const itemElement = this.createItemElement(item, i);
            
            if (loadingIndicator && loadingIndicator.parentNode === masonryContainer) {
                loadingIndicator.before(itemElement);
            } else {
                masonryContainer.appendChild(itemElement);
            }
        }
        this.lastRenderedIndex = this.allItems.length - 1;
        this.setupImageLazyLoad();
      },
      
      createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'item';
        div.style.animation = 'fadeIn 0.5s ease forwards';
        div.dataset.index = index;
        div.onclick = () => this.show(item.url); // 这里 this.show 是正确的，因为是在对象内部调用
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'img-wrapper';
        
        const img = document.createElement('img');
        img.setAttribute('data-src', item.url);
        img.className = 'lazy';
        img.alt = 'Image by ' + (item.username || 'Unknown');
        imgWrapper.appendChild(img);
        
        const itemUser = document.createElement('div');
        itemUser.className = 'item-user';
        
        const userTag = document.createElement('div');
        userTag.className = 'user-tag';
        userTag.innerHTML = '<i class="fas fa-user-circle"></i> ' + (item.username || 'Unknown');
        
        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = '0.7rem';
        dateDiv.style.color = '#CBD5E1';
        dateDiv.textContent = item.ts ? new Date(item.ts).toLocaleDateString() : '';
        
        itemUser.appendChild(userTag);
        itemUser.appendChild(dateDiv);
        
        div.appendChild(imgWrapper);
        div.appendChild(itemUser);
        
        return div;
      },
      
      setupInfiniteScroll() {
        const scrollContainer = document.getElementById('scrollContainer');
        const observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.isLoading && this.currentPage < this.totalPages) {
            this.loadMore();
          }
        }, {
          root: scrollContainer,
          rootMargin: '200px', 
          threshold: 0.1
        });
        
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
          observer.observe(loadingIndicator);
          this.observer = observer;
        }
      },
      
      async loadMore() {
        if (this.isLoading || this.currentPage >= this.totalPages) return;
        this.isLoading = true;
        
        const nextPage = this.currentPage + 1;
        
        try {
          const response = await fetch(\`/api/library/items?page=\${nextPage}&pageSize=\${this.pageSize}\`);
          const data = await response.json();
          
          if (data.items && data.items.length > 0) {
            this.allItems = this.allItems.concat(data.items);
            this.currentPage = nextPage;
            this.renderNewItems();
            
            if (this.currentPage >= this.totalPages) {
              const indicator = document.getElementById('loadingIndicator');
              if (indicator) {
                  indicator.innerHTML = '<span class="end-message">- 到底啦 -</span>';
                  if(this.observer) this.observer.disconnect();
              }
            }
          } else {
             this.currentPage = this.totalPages; 
             const indicator = document.getElementById('loadingIndicator');
             if (indicator) indicator.remove();
          }
        } catch (error) {
          console.error('加载更多失败:', error);
          const indicator = document.getElementById('loadingIndicator');
          if (indicator) {
            indicator.innerHTML = '<span style="color: var(--danger); cursor:pointer;" onclick="VirtualScroll.loadMore()">加载失败，点击重试</span>';
          }
        } finally {
          this.isLoading = false;
        }
      },
      
      setupImageLazyLoad() {
        const lazyImages = [].slice.call(document.querySelectorAll("img.lazy:not(.observing)"));
        if ("IntersectionObserver" in window) {
          const lazyImageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const lazyImage = entry.target;
                lazyImage.src = lazyImage.dataset.src;
                lazyImage.onload = () => {
                  lazyImage.classList.add("loaded");
                  if(lazyImage.parentElement) lazyImage.parentElement.style.minHeight = 'auto';
                };
                lazyImage.classList.remove("lazy");
                observer.unobserve(lazyImage);
              }
            });
          }, {
            root: document.getElementById('scrollContainer'),
            rootMargin: "200px 0px"
          });
          lazyImages.forEach((lazyImage) => {
            lazyImage.classList.add('observing');
            lazyImageObserver.observe(lazyImage);
          });
        } else {
          lazyImages.forEach((lazyImage) => {
            lazyImage.src = lazyImage.dataset.src;
            lazyImage.classList.add('loaded');
          });
        }
      },
      
      setupBackToTop() {
        const btn = document.getElementById('backToTop');
        const container = document.getElementById('scrollContainer');
        container.onscroll = () => {
             if (container.scrollTop > 300) btn.classList.add('show');
             else btn.classList.remove('show');
        };
      },
      
      show(url) {
        const img = document.getElementById('bigImg');
        img.src = url;
        document.getElementById('imgModal').classList.add('show');
      }
    };
    
    document.addEventListener("DOMContentLoaded", () => {
      VirtualScroll.init();
    });
  </script>
</body>
</html>
  `;
}

function getProfilePage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>个人档案 - GachaSystem</title>
  <!-- 使用国内 BootCDN -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  <style>
    body { padding: 20px; max-width: 800px; margin: 0 auto; }
    .profile-header { text-align: center; margin-bottom: 30px; }
    .avatar-large { 
      width: 100px; height: 100px; margin: 0 auto 15px; 
      background: linear-gradient(135deg, var(--primary), var(--secondary)); 
      border-radius: 50%; display: flex; align-items: center; justify-content: center; 
      font-size: 2.5rem; color: white; box-shadow: 0 8px 20px rgba(59,130,246,0.3); 
    }
    .stat-card { background: white; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; text-align: center; }
    .stat-val { font-size: 1.5rem; font-weight: bold; color: var(--text-main); }
    .stat-label { font-size: 0.8rem; color: var(--text-light); }
    .back-nav { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="back-nav">
    <a href="/" class="btn secondary" style="padding: 8px 16px;"><i class="fas fa-arrow-left"></i> 返回首页</a>
  </div>

  <div class="glass-card" style="padding: 30px;">
    <div class="profile-header">
      <div class="avatar-large"><i class="fas fa-user-astronaut"></i></div>
      <h2 id="profileNickname" style="margin: 0 0 5px 0;">加载中...</h2>
      <div style="color: #94A3B8;">@<span id="profileUsername">...</span></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
      <div class="stat-card">
        <div class="stat-label">当前积分</div>
        <div class="stat-val" style="color: #D97706;" id="profileCoins">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">当前等级</div>
        <div class="stat-val" style="color: var(--primary);" id="profileLevel">-</div>
      </div>
    </div>

    <!-- 经验条区域 -->
    <div style="background:white; padding:15px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#94A3B8; margin-bottom:5px;">
            <span>经验值: <span id="profileExp">0</span> / <span id="profileExpNext">100</span></span>
            <span id="profileLevelProgress">0%</span>
        </div>
        <div style="height:10px; background:#F1F5F9; border-radius:5px; overflow:hidden;">
            <div id="profileExpBar" style="height:100%; background:linear-gradient(90deg, #3B82F6, #8B5CF6); width:0%; transition:width 0.5s ease;"></div>
        </div>
    </div>

    <!-- 卡片统计区域 -->
    <div style="background:white; padding:15px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px;">
      <h4 style="margin: 0 0 15px 0; color: var(--text-main);">卡片收集统计</h4>
      <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;">
        <div class="stat-card" style="padding: 8px; background:#F1F5F9;">
          <div style="font-size:0.7rem; color:#64748B;">N</div>
          <div style="font-weight:bold;" id="invCountN">0</div>
        </div>
        <div class="stat-card" style="padding: 8px; background:#DBEAFE;">
          <div style="font-size:0.7rem; color:#1E40AF;">R</div>
          <div style="font-weight:bold;" id="invCountR">0</div>
        </div>
        <div class="stat-card" style="padding: 8px; background:#EDE9FE;">
          <div style="font-size:0.7rem; color:#5B21B6;">SR</div>
          <div style="font-weight:bold;" id="invCountSR">0</div>
        </div>
        <div class="stat-card" style="padding: 8px; background:#FEF3C7;">
          <div style="font-size:0.7rem; color:#92400E;">SSR</div>
          <div style="font-weight:bold;" id="invCountSSR">0</div>
        </div>
        <div class="stat-card" style="padding: 8px; background:#FEE2E2;">
          <div style="font-size:0.7rem; color:#991B1B;">UR</div>
          <div style="font-weight:bold;" id="invCountUR">0</div>
        </div>
      </div>
      <div style="text-align:center; margin-top:10px; font-size:0.8rem; color:#94A3B8;">
         召唤总数: <span id="profileCount">0</span>
      </div>
    </div>

    <!-- 称号展示区 -->
    <div style="background:white; padding:15px; border-radius:12px; border:1px solid #E2E8F0; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between;">
        <div>
            <div style="font-size:0.8rem; color:#94A3B8; margin-bottom:4px;">当前佩戴称号</div>
            <div id="currentTitleDisplay" style="font-weight:bold; font-size:1.1rem; color:var(--primary);">
                <span style="color:#CBD5E1; font-weight:normal;">暂无称号</span>
            </div>
        </div>
        <button class="btn secondary" style="padding:6px 12px; font-size:0.85rem;" onclick="App.openTitleManager()">
            <i class="fas fa-crown"></i> 更换
        </button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
        <button class="btn" onclick="App.openLevelRewards()" style="grid-column: 1 / -1; background: linear-gradient(135deg, #F59E0B, #D97706); border:none;">
            <i class="fas fa-gift"></i> 查看/领取等级奖励
        </button>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
        <button class="btn secondary" onclick="App.editProfile()"><i class="fas fa-edit"></i> 修改昵称</button>
        <button class="btn secondary" onclick="App.logout()"><i class="fas fa-sign-out-alt"></i> 注销登录</button>
    </div>

    <!-- 称号管理弹窗 -->
    <div id="titleModal" class="modal">
        <div class="modal-content">
            <button class="modal-close-btn" onclick="document.getElementById('titleModal').classList.remove('show')"><i class="fas fa-times"></i></button>
            <h3>称号管理</h3>
            <div id="titleList" class="title-list"></div>
            <button class="btn secondary" style="width:100%; margin-top:15px;" onclick="App.equipTitle(null)">卸下当前称号</button>
        </div>
    </div>
  </div>

  <!-- 等级奖励模态框 -->
    <div id="rewardModal" class="modal">
        <div class="modal-content">
            <button class="modal-close-btn" onclick="document.getElementById('rewardModal').classList.remove('show')"><i class="fas fa-times"></i></button>
            <h3>等级奖励</h3>
            <div id="rewardList" style="text-align:left; max-height:400px; overflow-y:auto;"></div>
        </div>
    </div>

  <div id="toast-container"></div>

  <script>
    const MILESTONES = {
        5: { coins: 500, title: '新手收藏家' },
        10: { coins: 1000, title: '初级收藏家' },
        20: { coins: 2000, title: '高级收藏家' },
        30: { coins: 3000, title: '资深收藏家' },
        50: { coins: 5000, title: '传说人物' },
        100: { coins: 10000, title: '卡片之神' }
    };
    
    const App = {
      username: localStorage.getItem('moe_username'),
      
      async init() {
        if (!this.username) {
            window.location.href = '/'; 
            return;
        }
        // [修复关键] 并行获取用户信息和库存信息
        await Promise.all([
            this.fetchUserInfo(),
            this.fetchInventory()
        ]);
      },

      async fetchUserInfo() {
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) {
             this.updateUI(data);
          } else {
             this.logout();
          }
        } catch(e) { console.error(e); }
      },

      // [新增] 独立获取库存的方法
      async fetchInventory() {
        try {
            const res = await fetch('/user/inventory', { headers: { 'X-User-ID': this.username } });
            const data = await res.json();
            if (data) {
                this.updateInventoryUI(data);
            }
        } catch(e) { console.error('Failed to load inventory', e); }
      },

      updateUI(user) {
        document.getElementById('profileNickname').innerText = user.nickname || user.username;
        document.getElementById('profileUsername').innerText = user.username;
        document.getElementById('profileCoins').innerText = user.coins || 0;
        document.getElementById('profileLevel').innerText = user.level || 1;
        document.getElementById('profileCount').innerText = user.drawCount || 0;

        // 更新经验条
        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;
        
        document.getElementById('profileExp').innerText = exp;
        document.getElementById('profileExpNext').innerText = next;
        document.getElementById('profileLevelProgress').innerText = progress + '%';
        document.getElementById('profileExpBar').style.width = progress + '%';

        // 更新称号显示
        const titleEl = document.getElementById('currentTitleDisplay');
        if (user.title && user.title.name) {
            titleEl.innerHTML = \`<span class="title-badge" style="background:linear-gradient(135deg, #3B82F6, #8B5CF6); font-size:1rem; padding:4px 10px;">\${user.title.name}</span>\`;
        } else {
            titleEl.innerHTML = '<span style="color:#CBD5E1; font-weight:normal;">暂无称号</span>';
        }
      },

      // [新增] 独立更新库存 UI 的方法
      updateInventoryUI(inv) {
        ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => {
            const el = document.getElementById('invCount' + r);
            if(el) el.innerText = inv[r] || 0;
        });
      },

      async openTitleManager() {
        const modal = document.getElementById('titleModal');
        const list = document.getElementById('titleList');
        list.innerHTML = '<div style="text-align:center;">加载中...</div>';
        modal.classList.add('show');

        try {
            const res = await fetch('/user/titles', {
                method: 'GET',
                headers: { 'X-User-ID': this.username }
            });
            const data = await res.json();
            
            if (data.success && data.titles.length > 0) {
                list.innerHTML = data.titles.map(t => \`
                    <div class="title-item \${t.is_equipped ? 'active' : ''}" onclick="App.equipTitle('\${t.title_id}')">
                        <span class="title-text">\${t.title_id}</span>
                        \${t.is_equipped ? '<i class="fas fa-check-circle"></i>' : ''}
                    </div>
                \`).join('');
            } else {
                list.innerHTML = '<div class="no-title-msg">你还没有获得任何称号<br>请努力升级或完成成就！</div>';
            }
        } catch(e) {
            list.innerHTML = '加载失败';
        }
      },

      openLevelRewards() {
        const modal = document.getElementById('rewardModal');
        const list = document.getElementById('rewardList');
        const currentLevel = parseInt(document.getElementById('profileLevel').innerText) || 1;
        
        let html = '';
        for (const [lvl, reward] of Object.entries(MILESTONES)) {
            const level = parseInt(lvl);
            const isReached = currentLevel >= level;
            let desc = \`金币 \${reward.coins}\`;
            if (reward.title) desc += \` + 称号 [\${reward.title}]\`;
            
            html += \`
            <div style="border:1px solid #E2E8F0; padding:10px; border-radius:8px; margin-bottom:10px; background:\${isReached ? '#F0FDF4' : '#F8FAFC'}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-weight:bold; color:\${isReached ? '#15803d' : '#94A3B8'}">Lv.\${level}</span>
                    \${isReached 
                        ? \`<button class="btn" style="padding:4px 10px; font-size:0.8rem; height:auto;" onclick="App.claimReward(\${level})">领取</button>\` 
                        : '<span style="font-size:0.8rem; color:#94A3B8">未达标</span>'
                    }
                </div>
                <div style="font-size:0.85rem; color:#475569;">\${desc}</div>
            </div>\`;
        }
        list.innerHTML = html;
        modal.classList.add('show');
      },

      async claimReward(level) {
        if(!confirm(\`确定领取 Lv.\${level} 的奖励吗？\`)) return;
        try {
            const res = await fetch('/user/claim-reward', {
                method: 'POST',
                headers: { 'X-User-ID': this.username },
                body: JSON.stringify({ targetLevel: level })
            });
            const data = await res.json();
            if(data.success) {
                alert('领取成功！');
                document.getElementById('rewardModal').classList.remove('show');
                this.fetchUserInfo();
            } else {
                const msg = data.error === 'Reward already claimed' ? '该奖励已经领取过了' : data.error;
                alert(msg);
            }
        } catch(e) { alert('网络错误'); }
      },

      async equipTitle(titleId) {
        try {
            const res = await fetch('/user/equip-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': this.username },
                body: JSON.stringify({ titleId })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('titleModal').classList.remove('show');
                this.toast(data.message, 'ok');
                this.fetchUserInfo();
            } else {
                this.toast(data.error || '操作失败', 'warn');
            }
        } catch(e) { this.toast('网络错误', 'warn'); }
      },

      async editProfile() {
        const current = document.getElementById('profileNickname').innerText;
        const newNick = prompt('输入新昵称 (最多20字符):', current);
        if (newNick && newNick !== current) {
            if(newNick.length > 20) { alert('昵称过长'); return; }
            try {
                const res = await fetch('/user/update-profile', {
                    method: 'POST',
                    headers: { 'X-User-ID': this.username },
                    body: JSON.stringify({ nickname: newNick })
                });
                const data = await res.json();
                if(data.success) {
                    document.getElementById('profileNickname').innerText = data.nickname;
                    alert('修改成功');
                } else { alert(data.error || '修改失败'); }
            } catch(e) { alert('网络错误'); }
        }
      },

      logout() {
        if(confirm('确定要退出登录吗？')) {
            localStorage.removeItem('moe_username');
            window.location.href = '/';
        }
      },

      toast(msg, type) { 
        const div = document.createElement('div'); 
        div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:10px 20px;border-radius:20px;z-index:9999;font-size:0.9rem;';
        div.innerText = msg;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2500); 
      }
    };

    window.onload = () => App.init();
  </script>
</body>
</html>
  `;
}