/**
 * 技术配置层 - 系统实现相关配置
 */
export const TECHNICAL_CONFIG = {
  DEBUG_MODE_ENABLED: false, // 生产环境必须关闭，启用后可使用 X-User-ID header 调试

  KEYS: {
    CHANGELOG: 'system:changelog',
    ANNOUNCEMENT: 'system:announcement',
    LEADERBOARD: 'system:leaderboard',
    SITE_START_TIME: 'system:site_start_time',
    BUFFER_PREFIX: 'sys:buffer:',
    DRAW_BLACKLIST: 'sys:draw:blacklist:',
    STATS_DAILY: 'system:stats:daily',
    STATS_TOTAL: 'system:stats:total'
  },

  TTL: {
    SESSION: 86400 * 7,
    BUFFER: 86400,
    CACHE: 60 * 5,
    LEADERBOARD: 86400 * 30,
    USER_INFO: 120,           // 2分钟，减少D1查询频率
    PUBLIC_API: 60,
    STATIC_ASSET: 31536000,
    BUFFER_SLOTS: 5,          // 从10减半，每次抽卡KV读取减半
    BLACKLIST_TTL: 600         // 10分钟黑名单，减少重复图片
  },

  INFRASTRUCTURE: {
    R2_DOMAIN: 'https://cft1.cszxorx.dpdns.org',
    GITHUB: {
      TOKEN: '',
      OWNER: '',
      REPO: '',
      BRANCH: 'main',
      API_BASE: 'https://api.github.com',
      CDN_BASE: 'https://cdn.jsdelivr.net/gh'
    }
  },

  GITHUB: {
    API_BASE: 'https://api.github.com',
    RAW_BASE: 'https://raw.githubusercontent.com',
    CDN_BASE: 'https://cdn.jsdelivr.net/gh',
    OWNER: 'lujih',
    REPO: 'chouka-images',
    BRANCH: 'main',
    PATH_PREFIX: 'images'
  }
};
