/**
 * HTTP 响应工具函数
 * 优化版本：添加JSDoc注释和错误处理
 */

import { AppError } from './AppError.js';

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
  // 确保响应数据格式统一
  const responseData = data.success !== undefined 
    ? data 
    : { success: true, data };
  
  const headers = { 
    'Content-Type': 'application/json', 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
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
    throw AppError.validationError('请求体必须是有效的JSON格式');
  }
}

/**
 * 计算数据的SHA-256哈希值（用于去重）
 * @param {ArrayBuffer|Uint8Array} buffer - 二进制数据
 * @returns {Promise<string>} 16位十六进制哈希值
 * @throws {AppError} 当计算失败时
 */
export async function calculateHash(buffer) {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch (error) {
    console.error('哈希计算失败:', error);
    throw AppError.serverError('文件处理失败');
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

/**
 * 验证请求内容类型
 * @param {Request} request - HTTP请求对象
 * @param {string} expectedType - 期望的内容类型
 * @throws {AppError} 当内容类型不匹配时
 */
export function validateContentType(request, expectedType = 'application/json') {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !contentType.includes(expectedType)) {
    throw AppError.validationError(
      `请求内容类型必须是 ${expectedType}`,
      { received: contentType, expected: expectedType }
    );
  }
}

/**
 * 处理OPTIONS请求（CORS预检）
 * @param {Request} request - HTTP请求对象
 * @returns {Response} CORS预检响应
 */
export function handleOptions(request) {
  const headers = request.headers;
  
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': headers.get('Access-Control-Request-Headers') || 'Content-Type, Authorization, X-User-ID',
      'Access-Control-Max-Age': '86400',
    }
  });
}