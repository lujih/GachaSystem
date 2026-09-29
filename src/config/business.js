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

  // 卡牌价值（单一数据源）：CARD_VALUE = 分解一张该稀有度卡返还的金币。
  //
  // ⚠️ 关键不变式：抽卡会同时给「金币 + 卡」，而卡又能分解成金币，
  // 所以每抽总收入是 CARD_VALUE × (1 + DRAW_COIN_RATIO)，而不是 CARD_VALUE 本身。
  // 必须满足  E[CARD_VALUE] × (1 + DRAW_COIN_RATIO) < DRAW_COST，
  // 否则「抽一张 → 分解 → 再抽」仍是无上限的造币回路。
  //
  // 反解依据：长期占比 N 40.7% / R 34.1% / SR 14.7% / SSR 8.3% / UR 2.2%（含软保底）。
  // 当前值 E[CARD_VALUE]=60，×1.3=78 < 单抽成本 100（ROI −22%），十连 −13%。
  // 不变式由 tests/economy-invariants.test.js 守护，改数值前请先跑。
  CARD_VALUE: { 'N': 6, 'R': 17, 'SR': 56, 'SSR': 225, 'UR': 1125 },
  // 抽卡即时金币 = round(CARD_VALUE × 该比例)，其余价值留在卡片里，分解时才兑现
  DRAW_COIN_RATIO: 0.3,

  // 游戏数值配置
  GAME: {
    DRAW_COST: 100,             // 单抽消耗
    MULTI_DRAW_COST: 900,       // 十连消耗（9折优惠）
    MULTI_DRAW_MAX: 10,
    CRAFT_COST: 5,
    SHOP: { 'R': 150, 'SR': 600, 'SSR': 2500, 'UR': 10000 },
    // PAYOUT 经 36 种点数穷举反解：庄家优势 16.7%
    // 赔付 = bet * PAYOUT * 0.5 * mult（mult: sum>=10→1, 对子→2, sum=7→4）
    DICE: { MIN_BET: 10, MAX_BET: 1000, PAYOUT: 1.5, COOLDOWN_MS: 3000 },
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
