/**
 * HTTP 响应工具函数
 */

/**
 * 创建JSON格式的HTTP响应
 * @param {any} data - 响应数据，可以是对象或ApiResponse格式
 * @param {number} [status=200] - HTTP状态码
 * @param {Object} [extraHeaders={}] - 额外的响应头
 * @returns {Response} HTTP响应对象
 * @example
 * // 返回成功响应
 * return jsonResponse({ success: true, data: result });
 * 
 * // 返回错误响应
 * return jsonResponse({ success: false, error: '错误消息' }, 400);
 */
export function jsonResponse(data, status = 200, extraHeaders = {}) {
  if (data.success === undefined) {
    data.success = status < 400;
  }
  const responseData = data;
  
  const headers = { 
    'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Session-Token, X-Admin-Mode',
    ...extraHeaders 
  };
  
  return new Response(JSON.stringify(responseData), { status, headers });
}

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} [message] - 成功消息
 * @returns {Response} HTTP响应对象
 */
export function successResponse(data, message) {
  return jsonResponse({
    success: true,
    data,
    ...(message && { message })
  });
}

/**
 * 创建错误响应
 * @param {string} error - 错误消息
 * @param {number} [status=400] - HTTP状态码
 * @param {string} [code] - 错误代码
 * @returns {Response} HTTP响应对象
 */
export function errorResponse(error, status = 400, code) {
  return jsonResponse({
    success: false,
    error,
    ...(code && { code })
  }, status);
}

/**
 * 安全解析JSON字符串
 * @param {string} str - JSON字符串
 * @param {any} [defaultValue=null] - 解析失败时的默认值
 * @returns {any} 解析后的对象或默认值
 */
export function safeJsonParse(str, defaultValue = null) { 
  try { 
    return JSON.parse(str); 
  } catch (error) { 
    console.warn('JSON解析失败:', { str: str?.substring(0, 100), error: error.message });
    return defaultValue; 
  } 
}

/**
 * 验证管理员权限
 * @param {Request} request - HTTP请求对象
 * @param {Env} env - 环境变量
 * @returns {Promise<{authorized: boolean, error?: string, password?: string}>} 验证结果
 * @throws {AppError} 当请求体解析失败时
 */
export async function requireAdmin(request, env) {
  try {
    const body = await request.json();
    
    if (!body.password || body.password !== env.admin) {
      return { authorized: false, error: '认证失败' };
    }
    
    return { authorized: true, password: body.password };
  } catch (error) {
    return { authorized: false, error: '请求体必须是有效的JSON格式' };
  }
}

/**
 * 创建分页响应
 * @param {Array} data - 数据数组
 * @param {number} page - 当前页码（从1开始）
 * @param {number} pageSize - 每页大小
 * @param {number} total - 总数据量
 * @returns {Response} 分页响应
 */
export function paginatedResponse(data, page, pageSize, total) {
  const totalPages = Math.ceil(total / pageSize);
  
  return successResponse({
    data,
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}