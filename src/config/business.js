/**
 * 业务配置层 - 游戏逻辑相关配置
 */
export const BUSINESS_CONFIG = {
  // 图源配置（每个稀有度多个备用源，抽卡时随机选取）
  SOURCES: [
    // N — 随机动漫图
    { name: 'Random Anime', url: 'https://api.anosu.top/img', rarity: 'N' },
    { name: 'Anime 2', url: 'https://www.loliapi.com/acg/pc/', rarity: 'N' },
    // R — 兽耳/轻度精选
    { name: 'Kemonomimi', url: 'https://api.anosu.top/img?sort=furry', rarity: 'R' },
    { name: 'Waifu R', url: 'https://www.loliapi.com/acg/pe/', rarity: 'R' },
    // SR — P站精选
    { name: 'Pixiv Best', url: 'https://api.anosu.top/img?sort=pixiv', rarity: 'SR' },
    { name: 'Lolimi SR', url: 'https://api.lolimi.cn/API/api/api.php', rarity: 'SR' },
    // SSR — 高质量精选
    { name: 'Stockings', url: 'https://api.anosu.top/img?sort=setu', rarity: 'SSR' },
    { name: 'Lolimi SSR', url: 'https://api.lolimi.cn/API/api/api.php?n=2', rarity: 'SSR' },
    // UR — 顶级精选
    { name: 'Absolute Territory', url: 'https://moe.jitsu.top/api?sort=r18', rarity: 'UR' },
    { name: 'V2 YS', url: 'https://v2.xxapi.cn/api/ys?return=302', rarity: 'UR' },
  ],

  // 图源备用池（当主源失败时 fallback 使用）
  FALLBACK_SOURCES: [
    { url: 'https://api.lolimi.cn/API/api/api.php', rarity: 'SR' },
    { url: 'https://api.lolimi.cn/API/api/api.php?n=', rarity: 'N' },
    { url: 'https://v2.xxapi.cn/api/ys?return=302', rarity: 'UR' }
  ],

  // 保底配置（含软保底）
  PITY: {
    SSR: { at: 15, softStart: 10, softRate: 5 },   // 10抽后每抽+5% SSR 概率，15抽硬保底
    UR:  { at: 80, softStart: 50, softRate: 2 },    // 50抽后每抽+2% UR 概率，80抽硬保底
  },

  // 限定池配置
  LIMITED: {
    COST: 500,
    MULTI_COST: 4500,  // 十连 9 折
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
        name: '玩家共建池',
        description: '由玩家上传的精选图片库，持续更新中',
        sources: [
          { name: 'Community Uploads', url: 'https://github_images.mahiro-seeker.dpdns.org/?format=json', rarity: 'UR' }
        ],
        type: 'api'
      },
      'beautiful_legs': {
        name: '美腿精选',
        description: '精选美腿图片',
        sources: [
          { name: 'Beautiful Legs API', url: 'https://api.lolimi.cn/API/meizi/api?type=value', rarity: 'UR' }
        ],
        type: 'api'
      },
      'illustration': {
        name: '精选插画',
        description: '精选画师GTZ taejune的插画',
        sources: [
          { name: 'GTZ taejune API', url: 'https://api.r10086.com/樱道随机图片api接口.php?图片系列=P站系列1', rarity: 'UR' }
        ],
        type: 'api'
      }
    },
    DEFAULT_POOL: 'genshin'
  },

  // 游戏数值配置
  GAME: {
    POINTS: { 'N': 5, 'R': 15, 'SR': 50, 'SSR': 200, 'UR': 1000 },
    DRAW_COST: 100,             // 单抽消耗
    MULTI_DRAW_COST: 900,       // 十连消耗（9折优惠）
    MULTI_DRAW_MAX: 10,
    CRAFT_COST: 5,
    SHOP: { 'R': 150, 'SR': 600, 'SSR': 2500, 'UR': 10000 },
    DICE: { MIN_BET: 10, MAX_BET: 1000, PAYOUT: 2, COOLDOWN_MS: 3000 },
    DECOMPOSE: { 'N': 50, 'R': 30, 'SR': 80, 'SSR': 250, 'UR': 1000 }, // 分解返还金币
  },

  // 等级系统配置
  LEVEL: {
    EXP_GAIN: {
      DRAW: { 'N': 10, 'R': 20, 'SR': 50, 'SSR': 150, 'UR': 600 },
      CRAFT: 50,
      SHOP_BUY: 20,
      DICE_WIN: 30,
      CHECK_IN: 50,
    },
    BASE_EXP: 100,
    EXP_MULTIPLIER: 1.5,
    MAX_LEVEL: 100,
    CHECK_IN: {
      BASE_COINS: 300,
      STREAK_BONUS: [0, 50, 100, 200, 300, 400, 600]
    },
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
