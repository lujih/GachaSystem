/**
 * =========================================
 * Chouka 抽卡系统 - 主入口 (优化版本)
 * 模块化架构，支持JSDoc注释和统一错误处理
 * =========================================
 */

// 模块导入
import { 
  CONFIG, 
  getConfig, 
  getEnvironmentAwareConfig,
  DEFAULT_CHANGELOG,
  HTTP_STATUS 
} from './src/config/index.js';
import { 
  jsonResponse, 
  successResponse, 
  errorResponse, 
  safeJsonParse, 
  requireAdmin,
  validateContentType,
  handleOptions,
  paginatedResponse 
} from './src/utils/response.js';
import { 
  getBeijingTime, 
  getBeijingDateStr, 
  getBeijingISOString, 
  utcToBeijing
} from './src/utils/time.js';
import { 
  validateUsername, 
  validatePassword, 
  validateNickname, 
  validateRarity, 
  validateBetAmount, 
  validatePrediction,
  validateAndThrow,
  validateUrl 
} from './src/utils/validation.js';
import { UserService } from './src/services/user-service.js';
import { GachaService, uploadToGithub } from './src/services/gacha-service.js';
import { getIndexPage } from './src/templates/index-page.js';
import { getLibraryPage } from './src/templates/library-page.js';
import { getProfilePage } from './src/templates/profile-page.js';
import { AppError, errorHandler } from './src/utils/AppError.js';

// =========================================
// 工具函数
// =========================================

/**
 * 规范化路径，移除末尾斜杠和查询参数
 * @param {string} pathname - 原始路径
 * @returns {string} 规范化后的路径
 */
function normalizePath(pathname) {
  const normalized = pathname.replace(/\/$/, '').split('?')[0];
  return normalized || '/';
}

/**
 * 提取用户ID从请求头或查询参数
 * @param {Request} request - HTTP请求对象
 * @returns {string|null} 用户ID或null
 */
function extractUserId(request) {
  // 优先从Header获取
  const headerUserId = request.headers.get('X-User-ID');
  if (headerUserId) return headerUserId;
  
  // 从URL参数获取
  const url = new URL(request.url);
  return url.searchParams.get('user_id');
}

/**
 * 从请求中获取当前用户
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @returns {Promise<Object|null>} 用户数据或null
 */
async function getCurrentUser(request, env) {
  const token = request.headers.get('X-Session-Token');
  if (!token) return null;
  
  const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
  if (!sessionData) return null;
  
  return sessionData;
}

/**
 * 验证API密钥（如果配置了）
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @throws {AppError} 当API密钥无效时
 */
function validateApiKey(request, env) {
  const apiKey = env.API_KEY;
  if (!apiKey) return; // 未配置API密钥，跳过验证
  
  const providedKey = request.headers.get('X-API-Key');
  if (!providedKey || providedKey !== apiKey) {
    throw AppError.authError('无效的API密钥');
  }
}

/**
 * 记录请求日志（调试模式下）
 * @param {Request} request - HTTP请求对象
 * @param {any} [body] - 请求体
 * @param {Env} env - 环境变量
 */
function logRequest(request, body, env) {
  if (!CONFIG.DEBUG_MODE_ENABLED) return;
  
  const url = new URL(request.url);
  console.log('[请求日志]', {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    userId: extractUserId(request),
    timestamp: new Date().toISOString(),
    ...(body && { body: typeof body === 'object' ? body : { raw: body } })
  });
}

// =========================================
// 路由处理器
// =========================================

/**
 * 处理API路由
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleApiRoute(request, env, ctx) {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  
  // 根据路径路由到不同的处理器
  switch (path) {
    // 用户相关
    case '/api/user/register':
      return handleUserRegister(request, env, ctx);
    case '/api/user/login':
      return handleUserLogin(request, env, ctx);
    case '/api/user/profile':
      return handleUserProfile(request, env, ctx);
    case '/api/user/info':
      return handleUserInfo(request, env, ctx);
    case '/api/user/inventory':
      return handleUserInventory(request, env, ctx);
    case '/api/user/craft':
      return handleUserCraft(request, env, ctx);
    // 抽卡相关
    case '/api/gacha/draw':
      return handleGachaDraw(request, env, ctx);
    case '/api/gacha/multi-draw':
      return handleGachaMultiDraw(request, env, ctx);
    case '/api/gacha/library':
      return handleGachaLibrary(request, env, ctx);
    case '/api/limited/pools':
      return handleLimitedPools(request, env, ctx);
    // 商店
    case '/api/shop/buy':
      return handleShopBuy(request, env, ctx);
    // 游戏
    case '/api/game/dice':
      return handleGameDice(request, env, ctx);
    // 展示和公告
    case '/api/showcase':
      return handleShowcase(request, env, ctx);
    case '/api/announcement':
      return handleAnnouncement(request, env, ctx);
    // 管理
    case '/api/admin/changelog':
      return handleAdminChangelog(request, env, ctx);
    case '/api/admin/upload':
      return handleAdminUpload(request, env, ctx);
    case '/api/admin/save-changelog':
      return handleAdminSaveChangelog(request, env, ctx);
    case '/api/admin/save-announcement':
      return handleAdminSaveAnnouncement(request, env, ctx);
    // 系统
    case '/api/system/config':
      return handleSystemConfig(request, env, ctx);
    case '/api/system/health':
      return handleSystemHealth(request, env, ctx);
    default:
      throw AppError.notFoundError('API端点');
  }
}

/**
 * 处理用户注册
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleUserRegister(request, env, ctx) {
  validateContentType(request);
  
  const body = await request.json();
  logRequest(request, body, env);
  
  // 输入验证
  validateAndThrow(body, [
    { field: 'username', validator: validateUsername },
    { field: 'password', validator: validatePassword },
    { field: 'nickname', validator: validateNickname }
  ]);
  
  const userService = new UserService(env, ctx);
  const result = await userService.register(request);
  
  return successResponse(result, '注册成功');
}

/**
 * 处理用户登录
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleUserLogin(request, env, ctx) {
  validateContentType(request);
  
  const body = await request.json();
  logRequest(request, body, env);
  
  // 输入验证
  validateAndThrow(body, [
    { field: 'username', validator: validateUsername },
    { field: 'password', validator: validatePassword }
  ]);
  
  const userService = new UserService(env, ctx);
  const result = await userService.login(request);
  
  return successResponse(result, '登录成功');
}

/**
 * 处理用户资料
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleUserProfile(request, env, ctx) {
  const userId = extractUserId(request);
  if (!userId) {
    throw AppError.authError('需要用户ID');
  }
  
  const userService = new UserService(env, ctx);
  const profile = await userService.getUserProfile(userId);
  
  return successResponse(profile);
}

/**
 * 处理获取用户信息
 */
async function handleUserInfo(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  const userService = new UserService(env, ctx);
  return await userService.getInfo(currentUser);
}

/**
 * 处理获取用户背包
 */
async function handleUserInventory(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  const userService = new UserService(env, ctx);
  return await userService.getInventory(currentUser);
}

/**
 * 处理卡片合成
 */
async function handleUserCraft(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  validateContentType(request);
  const body = await request.json();
  
  const gachaService = new GachaService(env, ctx);
  return await gachaService.craft(currentUser, body);
}

/**
 * 处理获取限定池列表
 */
async function handleLimitedPools(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  const gachaService = new GachaService(env, ctx);
  return await gachaService.getLimitedPools(currentUser);
}

/**
 * 处理商店购买
 */
async function handleShopBuy(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  validateContentType(request);
  const body = await request.json();
  
  const gachaService = new GachaService(env, ctx);
  return await gachaService.shopBuy(currentUser, body);
}

/**
 * 处理骰子游戏
 */
async function handleGameDice(request, env, ctx) {
  const currentUser = await getCurrentUser(request, env);
  if (!currentUser) {
    return jsonResponse({ error: '请先登录' }, 401);
  }
  
  validateContentType(request);
  const body = await request.json();
  
  const gachaService = new GachaService(env, ctx);
  return await gachaService.playDice(currentUser, { poolId: body.poolId, betAmount: body.betAmount, prediction: body.prediction });
}

/**
 * 处理单次抽卡
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleGachaDraw(request, env, ctx) {
  const userId = extractUserId(request);
  if (!userId) {
    throw AppError.authError('需要用户ID');
  }
  
  const url = new URL(request.url);
  const pool = url.searchParams.get('pool') || 'normal';
  
  const gachaService = new GachaService(env, ctx);
  const result = await gachaService.drawCard(userId, pool);
  
  return successResponse(result, '抽卡成功');
}

/**
 * 处理十连抽
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleGachaMultiDraw(request, env, ctx) {
  const userId = extractUserId(request);
  if (!userId) {
    throw AppError.authError('需要用户ID');
  }
  
  const url = new URL(request.url);
  const pool = url.searchParams.get('pool') || 'normal';
  
  const gachaService = new GachaService(env, ctx);
  const results = await gachaService.multiDraw(userId, pool);
  
  return successResponse(results, '十连抽成功');
}

/**
 * 处理卡牌库查询
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleGachaLibrary(request, env, ctx) {
  const userId = extractUserId(request);
  if (!userId) {
    throw AppError.authError('需要用户ID');
  }
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20');
  const rarity = url.searchParams.get('rarity');
  
  // 验证分页参数
  if (page < 1) throw AppError.validationError('页码必须大于0');
  if (pageSize < 1 || pageSize > 100) {
    throw AppError.validationError('每页大小必须在1-100之间');
  }
  
  const gachaService = new GachaService(env, ctx);
  const { cards, total } = await gachaService.getUserLibrary(
    userId, 
    page, 
    pageSize, 
    rarity
  );
  
  return paginatedResponse(cards, page, pageSize, total);
}

/**
 * 处理管理员变更日志
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleAdminChangelog(request, env, ctx) {
  // 验证管理员权限
  const auth = await requireAdmin(request, env);
  if (!auth.authorized) {
    throw AppError.authError(auth.error);
  }
  
  if (request.method === 'GET') {
    const changelog = await env.KV_CACHE.get(CONFIG.KEYS.CHANGELOG);
    const data = changelog ? safeJsonParse(changelog) : DEFAULT_CHANGELOG;
    return successResponse(data);
  }
  
  if (request.method === 'POST') {
    validateContentType(request);
    const body = await request.json();
    
    // 验证变更日志条目
    if (!body.date || !body.ver || !body.content || !body.tag) {
      throw AppError.validationError('变更日志条目不完整');
    }
    
    const validTags = ['info', 'warning', 'success', 'error'];
    if (!validTags.includes(body.tag)) {
      throw AppError.validationError(`无效的标签，有效值为: ${validTags.join(', ')}`);
    }
    
    const existing = await env.KV_CACHE.get(CONFIG.KEYS.CHANGELOG);
    const changelog = existing ? safeJsonParse(existing) : DEFAULT_CHANGELOG;
    
    // 添加到开头
    changelog.unshift({
      date: body.date,
      ver: body.ver,
      content: body.content,
      tag: body.tag
    });
    
    // 只保留最近50条
    const trimmed = changelog.slice(0, 50);
    await env.KV_CACHE.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(trimmed));
    
    return successResponse(trimmed, '变更日志已更新');
  }
  
  throw AppError.validationError('不支持的HTTP方法');
}

/**
 * 处理管理员上传
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleAdminUpload(request, env, ctx) {
  // 验证管理员权限
  const auth = await requireAdmin(request, env);
  if (!auth.authorized) {
    throw AppError.authError(auth.error);
  }
  
  const formData = await request.formData();
  const file = formData.get('file');
  const rarity = formData.get('rarity') || 'UR';
  
  if (!file || !(file instanceof File)) {
    throw AppError.validationError('请上传有效的文件');
  }
  
  // 验证稀有度
  const rarityError = validateRarity(rarity);
  if (rarityError) {
    throw AppError.validationError(rarityError);
  }
  
  // 验证文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw AppError.validationError(
      `不支持的文件类型，支持: ${validTypes.join(', ')}`
    );
  }
  
  // 验证文件大小（最大5MB）
  if (file.size > 5 * 1024 * 1024) {
    throw AppError.validationError('文件大小不能超过5MB');
  }
  
  const buffer = await file.arrayBuffer();
  const result = await uploadToGithub(buffer, file.type, rarity, env);
  
  return successResponse(result, '文件上传成功');
}

/**
 * 处理系统配置
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleSystemConfig(request, env, ctx) {
  // 只返回公开的配置
  const publicConfig = {
    game: CONFIG.GAME,
    level: CONFIG.LEVEL,
    limited: CONFIG.LIMITED,
    rarity: {
      order: CONFIG.RARITY_ORDER,
      labels: CONFIG.RARITY_LABELS,
      colors: CONFIG.RARITY_COLORS
    },
    httpStatus: CONFIG.HTTP_STATUS
  };
  
  return successResponse(publicConfig);
}

/**
 * 处理系统健康检查
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleSystemHealth(request, env, ctx) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      kv: !!env.KV_CACHE,
      d1: !!env.DB,
      r2: !!env.R2_BUCKET
    }
  };
  
  return successResponse(health);
}

/**
 * 处理展示页面 - 获取精选掉落
 */
async function handleShowcase(request, env, ctx) {
  try {
    const cards = await env.DB.prepare(`
      SELECT c.*, u.username 
      FROM cards c 
      LEFT JOIN users u ON c.user_id = u.id 
      ORDER BY c.created_at DESC 
      LIMIT 6
    `).all();
    
    return jsonResponse({ cards: cards.results || [] });
  } catch (error) {
    console.error('[handleShowcase] Error:', error);
    return jsonResponse({ cards: [] });
  }
}

/**
 * 处理公告
 */
async function handleAnnouncement(request, env, ctx) {
  try {
    const announcement = await env.KV_CACHE.get(CONFIG.KEYS.ANNOUNCEMENT, { type: 'json' });
    return jsonResponse(announcement || { title: '', content: '', enabled: false });
  } catch (error) {
    console.error('[handleAnnouncement] Error:', error);
    return jsonResponse({ title: '', content: '', enabled: false });
  }
}

/**
 * 处理保存更新日志
 */
async function handleAdminSaveChangelog(request, env, ctx) {
  await requireAdmin(request, env);
  validateContentType(request);
  
  const body = await request.json();
  const { logs } = body;
  
  if (!Array.isArray(logs)) {
    return jsonResponse({ error: '无效的日志格式' }, 400);
  }
  
  const trimmed = logs.slice(0, 50);
  await env.KV_CACHE.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(trimmed));
  
  return successResponse({ message: '更新日志已保存' });
}

/**
 * 处理保存公告
 */
async function handleAdminSaveAnnouncement(request, env, ctx) {
  await requireAdmin(request, env);
  validateContentType(request);
  
  const body = await request.json();
  const { announcement } = body;
  
  if (!announcement) {
    return jsonResponse({ error: '公告内容不能为空' }, 400);
  }
  
  await env.KV_CACHE.put(
    CONFIG.KEYS.ANNOUNCEMENT, 
    JSON.stringify({ ...announcement, updatedAt: new Date().toISOString() })
  );
  
  return successResponse({ message: '公告已保存' });
}

// =========================================
// 页面路由处理器
// =========================================

/**
 * 处理页面路由
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @returns {Promise<Response>} HTTP响应
 */
async function handlePageRoute(request, env) {
  const url = new URL(request.url);
  const path = normalizePath(url.pathname);
  
  switch (path) {
    case '/':
      return new Response(getIndexPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    case '/library':
      return new Response(getLibraryPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    case '/profile':
      return new Response(getProfilePage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    case '/auth/login':
      return new Response(getIndexPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    case '/showcase':
    case '/changelog':
    case '/announcement':
      return new Response(getIndexPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    default:
      return handleStaticFile(request, env);
  }
}

/**
 * 处理静态文件请求
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @returns {Promise<Response>} HTTP响应
 */
async function handleStaticFile(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 简单的静态文件路由
  if (path.startsWith('/assets/') || path.startsWith('/static/')) {
    // 在实际项目中，这里应该从R2或CDN获取文件
    // 这里返回404，因为我们的项目主要提供API
    throw AppError.notFoundError('静态资源');
  }
  
  // 默认返回404
  throw AppError.notFoundError('页面');
}

// =========================================
// 主请求处理器
// =========================================

/**
 * 处理HTTP请求
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
async function handleRequest(request, env, ctx) {
  try {
    // 处理CORS预检请求
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // API路由
    if (path.startsWith('/api/')) {
      // 验证API密钥（如果配置了）
      validateApiKey(request, env);
      
      return await handleApiRoute(request, env, ctx);
    }
    
    // 页面路由
    return await handlePageRoute(request, env);
    
  } catch (error) {
    // 使用统一的错误处理器
    return errorHandler(error, request, env, ctx);
  }
}

// =========================================
// Cloudflare Workers 入口点
// =========================================

/**
 * Cloudflare Workers fetch事件处理器
 * 这是Cloudflare Workers的标准入口点
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Promise<Response>} HTTP响应
 */
export default {
  async fetch(request, env, ctx) {
    // 初始化配置（使用环境变量）
    const config = getEnvironmentAwareConfig(env);
    
    // 记录请求开始时间（用于性能监控）
    const startTime = Date.now();
    
    try {
      // 处理请求
      const response = await handleRequest(request, env, ctx);
      
      // 添加性能监控头
      const duration = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Request-ID', crypto.randomUUID());
      
      // 记录成功请求（调试模式下）
      if (config.DEBUG_MODE_ENABLED) {
        const url = new URL(request.url);
        console.log('[请求完成]', {
          method: request.method,
          path: url.pathname,
          status: response.status,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
      }
      
      return response;
      
    } catch (error) {
      // 这里捕获未处理的错误（应该已经被errorHandler处理了）
      console.error('[未处理的顶级错误]', error);
      
      // 返回通用的服务器错误
      return new Response(
        JSON.stringify({
          success: false,
          error: '服务器内部错误',
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: new Date().toISOString()
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': crypto.randomUUID()
          }
        }
      );
    }
  }
};

// =========================================
// 辅助函数和工具
// =========================================

/**
 * 性能监控装饰器
 * @param {Function} fn - 要监控的函数
 * @param {string} name - 函数名称（用于日志）
 * @returns {Function} 包装后的函数
 */
function withPerformanceMonitor(fn, name) {
  return async function(...args) {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;
      
      if (CONFIG.DEBUG_MODE_ENABLED && duration > 1000) {
        console.warn(`[性能警告] ${name} 执行时间过长: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[性能错误] ${name} 执行失败，耗时: ${duration}ms`, error);
      throw error;
    }
  };
}

/**
 * 重试装饰器
 * @param {Function} fn - 要重试的函数
 * @param {Object} options - 重试选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.delay - 重试延迟（毫秒）
 * @returns {Function} 包装后的函数
 */
function withRetry(fn, options = { maxRetries: 3, delay: 100 }) {
  return async function(...args) {
    let lastError;
    
    for (let i = 0; i <= options.maxRetries; i++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        
        // 如果是客户端错误，不重试
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // 最后一次尝试，直接抛出错误
        if (i === options.maxRetries) {
          break;
        }
        
        // 等待后重试
        if (options.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.delay));
        }
        
        // 指数退避
        options.delay *= 2;
      }
    }
    
    throw lastError;
  };
}

/**
 * 缓存装饰器
 * @param {Function} fn - 要缓存的函数
 * @param {Object} options - 缓存选项
 * @param {string} options.key - 缓存键
 * @param {number} options.ttl - 缓存时间（秒）
 * @returns {Function} 包装后的函数
 */
function withCache(fn, options) {
  return async function(...args) {
    const cacheKey = `${options.key}:${JSON.stringify(args)}`;
    
    // 尝试从缓存获取
    if (env.KV_CACHE) {
      const cached = await env.KV_CACHE.get(cacheKey);
      if (cached) {
        return safeJsonParse(cached);
      }
    }
    
    // 执行函数
    const result = await fn(...args);
    
    // 存储到缓存
    if (env.KV_CACHE && result) {
      await env.KV_CACHE.put(
        cacheKey, 
        JSON.stringify(result), 
        { expirationTtl: options.ttl }
      );
    }
    
    return result;
  };
}

// =========================================
// 导出工具函数（用于测试）
// =========================================

// 导出内部函数用于测试
export {
  handleRequest,
  handleApiRoute,
  handlePageRoute,
  normalizePath,
  extractUserId,
  withPerformanceMonitor,
  withRetry,
  withCache
};

// =========================================
// 版本信息和元数据
// =========================================

/**
 * 获取系统版本信息
 * @returns {Object} 版本信息
 */
export function getVersionInfo() {
  return {
    name: 'Chouka抽卡系统',
    version: '1.1.0',
    description: '基于Cloudflare Workers的抽卡系统',
    author: '路先生',
    repository: 'https://github.com/lujih/GachaSystem',
    license: 'MIT',
    features: [
      '用户认证系统',
      '多稀有度抽卡',
      '卡牌收集库',
      '管理员后台',
      'GitHub图床集成'
    ],
    optimized: {
      date: '2026-04-07',
      changes: [
        '添加JSDoc注释',
        '统一错误处理',
        '增强输入验证',
        '优化配置管理'
      ]
    }
  };
}

// 在模块加载时记录版本信息
console.log('🚀 Chouka抽卡系统已启动', getVersionInfo());