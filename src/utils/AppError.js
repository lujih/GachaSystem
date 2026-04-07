/**
 * 应用程序错误类
 * 统一错误处理，支持HTTP状态码和错误代码
 * @class AppError
 * @extends {Error}
 */
export class AppError extends Error {
  /**
   * 创建应用程序错误
   * @param {string} message - 错误消息
   * @param {number} [statusCode=500] - HTTP状态码
   * @param {string} [code] - 错误代码（用于客户端识别）
   * @param {any} [details] - 错误详情
   */
  constructor(message, statusCode = 500, code, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * 转换为JSON格式，用于API响应
   * @returns {Object} 错误响应对象
   */
  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details })
    };
  }

  /**
   * 创建验证错误
   * @static
   * @param {string} message - 错误消息
   * @param {any} [details] - 验证详情
   * @returns {AppError} 验证错误实例
   */
  static validationError(message, details) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * 创建认证错误
   * @static
   * @param {string} [message='认证失败'] - 错误消息
   * @returns {AppError} 认证错误实例
   */
  static authError(message = '认证失败') {
    return new AppError(message, 401, 'AUTH_ERROR');
  }

  /**
   * 创建权限错误
   * @static
   * @param {string} [message='权限不足'] - 错误消息
   * @returns {AppError} 权限错误实例
   */
  static permissionError(message = '权限不足') {
    return new AppError(message, 403, 'PERMISSION_ERROR');
  }

  /**
   * 创建未找到错误
   * @static
   * @param {string} resource - 资源名称
   * @returns {AppError} 未找到错误实例
   */
  static notFoundError(resource) {
    return new AppError(`${resource} 未找到`, 404, 'NOT_FOUND');
  }

  /**
   * 创建冲突错误
   * @static
   * @param {string} message - 错误消息
   * @returns {AppError} 冲突错误实例
   */
  static conflictError(message) {
    return new AppError(message, 409, 'CONFLICT');
  }

  /**
   * 创建服务器错误
   * @static
   * @param {string} [message='服务器内部错误'] - 错误消息
   * @returns {AppError} 服务器错误实例
   */
  static serverError(message = '服务器内部错误') {
    return new AppError(message, 500, 'SERVER_ERROR');
  }

  /**
   * 创建服务不可用错误
   * @static
   * @param {string} [message='服务暂时不可用'] - 错误消息
   * @returns {AppError} 服务不可用错误实例
   */
  static serviceUnavailableError(message = '服务暂时不可用') {
    return new AppError(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * 错误处理中间件
 * 捕获AppError并返回标准错误响应
 * @param {Error} error - 错误对象
 * @param {Request} request - 请求对象
 * @param {Env} env - 环境变量
 * @param {ExecutionContext} ctx - 执行上下文
 * @returns {Response} 错误响应
 */
export function errorHandler(error, request, env, ctx) {
  // 如果是AppError，使用其状态码和格式
  if (error instanceof AppError) {
    console.error(`[AppError ${error.statusCode}] ${error.message}`, {
      code: error.code,
      url: request.url,
      method: request.method,
      timestamp: error.timestamp
    });
    
    return new Response(
      JSON.stringify(error.toJSON()),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 其他错误，记录并返回500错误
  console.error('[Unhandled Error]', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });

  const serverError = AppError.serverError();
  return new Response(
    JSON.stringify(serverError.toJSON()),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}