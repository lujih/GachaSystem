/**
 * 业务配置层 - 游戏逻辑相关配置
 */
export const BUSINESS_CONFIG = {
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
    DRAW_COST: 0,
    CRAFT_COST: 5,
    SHOP: { 'R': 150, 'SR': 600, 'SSR': 2500, 'UR': 10000 },
    DICE: { MIN_BET: 10, MAX_BET: 1000, PAYOUT: 2 }
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
      BASE_COINS: 150,
      STREAK_BONUS: [0, 30, 80, 150, 250, 350, 500]
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
