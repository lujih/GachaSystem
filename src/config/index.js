/**
 * 配置管理模块
 * 优化版本：支持环境变量、配置验证、类型安全
 */

import { BUSINESS_CONFIG } from './business.js';
import { TECHNICAL_CONFIG } from './technical.js';
import { HTTP_STATUS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, GAME_ACTIONS } from './constants.js';
import { AppError } from '../utils/AppError.js';

/**
 * 环境配置接口
 * @typedef {Object} EnvConfig
 * @property {string} [R2_DOMAIN] - R2存储域名
 * @property {string} [GITHUB_OWNER] - GitHub仓库所有者
 * @property {string} [GITHUB_REPO] - GitHub仓库名
 * @property {string} [ADMIN_PASSWORD] - 管理员密码
 * @property {string} [DEBUG_MODE] - 调试模式
 */

/**
 * 合并后的配置接口
 * @typedef {Object} MergedConfig
 * @property {typeof BUSINESS_CONFIG.SOURCES} SOURCES - 图源配置
 * @property {typeof BUSINESS_CONFIG.FALLBACK_SOURCES} FALLBACK_SOURCES - 备用图源
 * @property {typeof BUSINESS_CONFIG.PITY} PITY - 保底配置
 * @property {typeof BUSINESS_CONFIG.LIMITED} LIMITED - 限定池配置
 * @property {typeof BUSINESS_CONFIG.GAME} GAME - 游戏数值配置
 * @property {typeof BUSINESS_CONFIG.LEVEL} LEVEL - 等级系统配置
 * @property {boolean} DEBUG_MODE_ENABLED - 调试模式
 * @property {typeof TECHNICAL_CONFIG.KEYS} KEYS - 存储键名
 * @property {typeof TECHNICAL_CONFIG.TTL} TTL - 缓存时间
 * @property {typeof TECHNICAL_CONFIG.INFRASTRUCTURE} INFRASTRUCTURE - 基础设施配置
 * @property {string} R2_DOMAIN - R2存储域名
 * @property {Object} GITHUB - GitHub配置
 * @property {string} GITHUB.OWNER - 仓库所有者
 * @property {string} GITHUB.REPO - 仓库名
 * @property {string} GITHUB.BRANCH - 分支
 * @property {string} GITHUB.API_BASE - API基础URL
 * @property {string} GITHUB.RAW_BASE - 原始文件URL
 * @property {string} GITHUB.CDN_BASE - CDN URL
 * @property {string} GITHUB.PATH_PREFIX - 路径前缀
 * @property {typeof HTTP_STATUS} HTTP_STATUS - HTTP状态码
 * @property {typeof RARITY_ORDER} RARITY_ORDER - 稀有度顺序
 * @property {typeof RARITY_LABELS} RARITY_LABELS - 稀有度标签
 * @property {typeof RARITY_COLORS} RARITY_COLORS - 稀有度颜色
 * @property {typeof GAME_ACTIONS} GAME_ACTIONS - 游戏动作
 */

/**
 * 变更日志条目
 * @typedef {Object} ChangelogEntry
 * @property {string} date - 日期 (YYYY-MM-DD)
 * @property {string} ver - 版本号
 * @property {string} content - 变更内容
 * @property {'info'|'warning'|'success'|'error'} tag - 标签类型
 */

/**
 * 合并配置，支持环境变量覆盖
 * @param {EnvConfig} [env={}] - 环境变量配置
 * @returns {MergedConfig} 合并后的配置
 * @throws {AppError} 当配置验证失败时
 */
function mergeConfig(env = {}) {
  // 解析环境变量
  const debugMode = env.DEBUG_MODE === 'true' || env.DEBUG_MODE === '1';
  
  // 构建配置对象
  const config = {
    // 业务配置
    ...BUSINESS_CONFIG,
    
    // 技术配置
    DEBUG_MODE_ENABLED: debugMode || TECHNICAL_CONFIG.DEBUG_MODE_ENABLED,
    KEYS: TECHNICAL_CONFIG.KEYS,
    TTL: TECHNICAL_CONFIG.TTL,
    INFRASTRUCTURE: TECHNICAL_CONFIG.INFRASTRUCTURE,
    
    // 动态配置（环境变量优先）
    R2_DOMAIN: env.R2_DOMAIN || TECHNICAL_CONFIG.INFRASTRUCTURE.R2_DOMAIN,
    GITHUB: {
      ...TECHNICAL_CONFIG.GITHUB,
      OWNER: env.GITHUB_OWNER || TECHNICAL_CONFIG.GITHUB.OWNER,
      REPO: env.GITHUB_REPO || TECHNICAL_CONFIG.GITHUB.REPO,
      // 安全：如果提供了token，使用环境变量的token
      ...(env.GITHUB_TOKEN && { TOKEN: env.GITHUB_TOKEN })
    },
    
    // 常量配置
    HTTP_STATUS,
    RARITY_ORDER,
    RARITY_LABELS,
    RARITY_COLORS,
    GAME_ACTIONS
  };
  
  // 验证关键配置
  validateConfig(config);
  
  return config;
}

/**
 * 验证配置的完整性
 * @param {MergedConfig} config - 待验证的配置
 * @throws {AppError} 当配置验证失败时
 */
function validateConfig(config) {
  const errors = [];
  
  // 验证R2域名
  if (!config.R2_DOMAIN || typeof config.R2_DOMAIN !== 'string') {
    errors.push('R2_DOMAIN配置无效');
  } else if (!config.R2_DOMAIN.startsWith('http')) {
    errors.push('R2_DOMAIN必须是有效的URL');
  }
  
  // 验证GitHub配置
  if (!config.GITHUB.OWNER || !config.GITHUB.REPO) {
    errors.push('GitHub仓库配置不完整');
  }
  
  // 验证游戏数值配置
  if (!config.GAME || typeof config.GAME !== 'object') {
    errors.push('游戏数值配置无效');
  } else {
    const { POINTS, DRAW_COST, MULTI_DRAW_COST } = config.GAME;
    
    if (!POINTS || typeof POINTS !== 'object') {
      errors.push('游戏点数配置无效');
    }
    
    if (typeof DRAW_COST !== 'number' || DRAW_COST < 0) {
      errors.push('单抽消耗配置无效');
    }
    
    if (typeof MULTI_DRAW_COST !== 'number' || MULTI_DRAW_COST < 0) {
      errors.push('十连抽消耗配置无效');
    }
  }
  
  // 如果有错误，抛出异常
  if (errors.length > 0) {
    throw AppError.serverError(`配置验证失败: ${errors.join('; ')}`);
  }
}

/**
 * 获取配置实例
 * 注意：在Cloudflare Workers中，env对象由平台提供
 * @param {EnvConfig} [env={}] - 环境变量
 * @returns {MergedConfig} 配置对象
 */
export function getConfig(env = {}) {
  return mergeConfig(env);
}

/**
 * 默认配置（使用空环境变量）
 * @type {MergedConfig}
 */
export const CONFIG = mergeConfig();

/**
 * 默认变更日志
 * @type {ChangelogEntry[]}
 */
export const DEFAULT_CHANGELOG = [
  { 
    date: new Date().toISOString().split('T')[0] || '2026-04-07', 
    ver: 'v1.0.0', 
    content: '系统初始化完成。', 
    tag: 'info' 
  },
  { 
    date: new Date().toISOString().split('T')[0] || '2026-04-07', 
    ver: 'v1.1.0', 
    content: '代码质量优化：添加JSDoc注释、统一错误处理、增强输入验证。', 
    tag: 'success' 
  }
];

/**
 * 获取环境敏感的配置
 * 根据环境变量调整配置值
 * @param {EnvConfig} env - 环境变量
 * @returns {MergedConfig} 调整后的配置
 */
export function getEnvironmentAwareConfig(env) {
  const config = mergeConfig(env);
  
  // 生产环境禁用调试模式
  if (env.NODE_ENV === 'production') {
    config.DEBUG_MODE_ENABLED = false;
  }
  
  // 开发环境调整缓存时间
  if (env.NODE_ENV === 'development') {
    config.TTL.CACHE = 10; // 开发环境缓存10秒
    config.TTL.USER_INFO = 5;
  }
  
  return config;
}

/**
 * 验证环境变量
 * @param {EnvConfig} env - 环境变量
 * @returns {Array<string>} 缺失的环境变量列表
 */
export function validateEnvironment(env) {
  const required = ['R2_DOMAIN'];
  const missing = [];
  
  for (const key of required) {
    if (!env[key]) {
      missing.push(key);
    }
  }
  
  return missing;
}

// 导出原始配置（用于测试和特殊场景）
export { BUSINESS_CONFIG, TECHNICAL_CONFIG, HTTP_STATUS, RARITY_ORDER, RARITY_LABELS, RARITY_COLORS, GAME_ACTIONS };