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
    DRAW_BLACKLIST: 'sys:draw:blacklist:'
  },

  TTL: {
    SESSION: 86400 * 7,
    BUFFER: 86400,
    CACHE: 60 * 5,
    LEADERBOARD: 86400 * 30,
    USER_INFO: 60,
    PUBLIC_API: 60,
    STATIC_ASSET: 31536000,
    BUFFER_SLOTS: 10,
    BLACKLIST_TTL: 300 // 5分钟黑名单
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
