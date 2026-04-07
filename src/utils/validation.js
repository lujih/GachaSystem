/**
 * 输入验证工具
 * 优化版本：添加JSDoc注释、统一错误格式、增强验证逻辑
 */

import { AppError } from './AppError.js';

/**
 * 验证用户名
 * @param {string} username - 待验证的用户名
 * @returns {string|null} 错误消息，null表示验证通过
 * @example
 * const error = validateUsername('user123');
 * if (error) throw AppError.validationError(error);
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return '用户名不能为空';
  }
  
  const trimmed = username.trim();
  
  // 长度验证
  if (trimmed.length < 3) {
    return '用户名长度至少需要3位';
  }
  if (trimmed.length > 20) {
    return '用户名长度不能超过20位';
  }
  
  // 字符集验证
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return '用户名只能包含字母、数字、下划线';
  }
  
  // 保留字检查
  const reservedWords = ['admin', 'administrator', 'system', 'root', 'guest'];
  if (reservedWords.includes(trimmed.toLowerCase())) {
    return '该用户名是保留字，请选择其他用户名';
  }
  
  return null;
}

/**
 * 验证密码
 * @param {string} password - 待验证的密码
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return '密码不能为空';
  }
  
  // 基本长度验证
  if (password.length < 6) {
    return '密码长度至少需要6位';
  }
  if (password.length > 100) {
    return '密码长度不能超过100位';
  }
  
  // 安全检查：防止常见弱密码
  const weakPasswords = ['123456', 'password', 'qwerty', 'admin123', 'letmein'];
  if (weakPasswords.includes(password.toLowerCase())) {
    return '密码过于简单，请使用更复杂的密码';
  }
  
  // 可选：密码强度检查
  // const hasLetter = /[a-zA-Z]/.test(password);
  // const hasNumber = /\d/.test(password);
  // const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  // if (!hasLetter || !hasNumber) {
  //   return '密码应包含字母和数字';
  // }
  
  return null;
}

/**
 * 验证昵称
 * @param {string} nickname - 待验证的昵称
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return '昵称不能为空';
  }
  
  const trimmed = nickname.trim();
  
  if (trimmed.length === 0) {
    return '昵称不能为空';
  }
  if (trimmed.length > 20) {
    return '昵称长度不能超过20位';
  }
  
  // 敏感词检查（简化版）
  const sensitiveWords = ['管理员', '系统', '官方', '客服'];
  for (const word of sensitiveWords) {
    if (trimmed.includes(word)) {
      return '昵称包含敏感词汇';
    }
  }
  
  return null;
}

/**
 * 验证稀有度
 * @param {string} rarity - 待验证的稀有度
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateRarity(rarity) {
  const validRarities = ['N', 'R', 'SR', 'SSR', 'UR'];
  
  if (!rarity || typeof rarity !== 'string') {
    return '稀有度不能为空';
  }
  
  if (!validRarities.includes(rarity.toUpperCase())) {
    return `无效的稀有度，有效值为: ${validRarities.join(', ')}`;
  }
  
  return null;
}

/**
 * 验证投注金额
 * @param {number|string} amount - 投注金额
 * @param {Object} config - 配置选项
 * @param {number} [config.min=10] - 最小投注金额
 * @param {number} [config.max=1000] - 最大投注金额
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateBetAmount(amount, config = {}) {
  const min = config.min || 10;
  const max = config.max || 1000;
  
  // 类型检查
  if (amount === undefined || amount === null || amount === '') {
    return '投注金额不能为空';
  }
  
  // 转换为数字
  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    return '投注金额必须是有效的数字';
  }
  
  // 范围检查
  if (numAmount < min) {
    return `投注金额不能小于 ${min}`;
  }
  if (numAmount > max) {
    return `投注金额不能大于 ${max}`;
  }
  
  // 整数检查
  if (!Number.isInteger(numAmount)) {
    return '投注金额必须是整数';
  }
  
  return null;
}

/**
 * 验证预测结果
 * @param {string} prediction - 预测结果
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validatePrediction(prediction) {
  const validPredictions = ['odd', 'even'];
  
  if (!prediction || typeof prediction !== 'string') {
    return '预测结果不能为空';
  }
  
  const lowerPrediction = prediction.toLowerCase();
  if (!validPredictions.includes(lowerPrediction)) {
    return `无效的预测结果，有效值为: ${validPredictions.join(', ')}`;
  }
  
  return null;
}

/**
 * 验证邮箱地址
 * @param {string} email - 待验证的邮箱
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return '邮箱地址不能为空';
  }
  
  const trimmed = email.trim();
  
  // 基本格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return '邮箱地址格式不正确';
  }
  
  // 长度验证
  if (trimmed.length > 254) {
    return '邮箱地址过长';
  }
  
  return null;
}

/**
 * 验证URL地址
 * @param {string} url - 待验证的URL
 * @param {Object} [options] - 验证选项
 * @param {boolean} [options.requireHttps=true] - 是否要求HTTPS
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateUrl(url, options = {}) {
  const { requireHttps = true } = options;
  
  if (!url || typeof url !== 'string') {
    return 'URL地址不能为空';
  }
  
  const trimmed = url.trim();
  
  try {
    const urlObj = new URL(trimmed);
    
    // 协议验证
    if (requireHttps && urlObj.protocol !== 'https:') {
      return 'URL必须使用HTTPS协议';
    }
    
    // 允许的协议
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return `不支持的协议，仅支持: ${allowedProtocols.join(', ')}`;
    }
    
    // 主机名验证
    if (!urlObj.hostname) {
      return 'URL必须包含主机名';
    }
    
  } catch (error) {
    return 'URL格式不正确';
  }
  
  return null;
}

/**
 * 验证整数范围
 * @param {number|string} value - 待验证的值
 * @param {Object} range - 范围配置
 * @param {number} range.min - 最小值
 * @param {number} range.max - 最大值
 * @returns {string|null} 错误消息，null表示验证通过
 */
export function validateIntegerRange(value, range) {
  if (value === undefined || value === null || value === '') {
    return '值不能为空';
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return '值必须是有效的数字';
  }
  
  if (!Number.isInteger(numValue)) {
    return '值必须是整数';
  }
  
  if (numValue < range.min) {
    return `值不能小于 ${range.min}`;
  }
  
  if (numValue > range.max) {
    return `值不能大于 ${range.max}`;
  }
  
  return null;
}

/**
 * 批量验证字段
 * @param {Object} obj - 包含字段的对象
 * @param {Array<{field: string, validator: Function, options?: any}>} validations - 验证规则数组
 * @returns {Array<{field: string, error: string}>} 验证错误数组，空数组表示全部通过
 */
export function validateFields(obj, validations) {
  const errors = [];
  
  for (const validation of validations) {
    const { field, validator, options } = validation;
    const value = obj[field];
    const error = validator(value, options);
    
    if (error) {
      errors.push({ field, error });
    }
  }
  
  return errors;
}

/**
 * 验证并抛出AppError
 * @param {Object} obj - 包含字段的对象
 * @param {Array<{field: string, validator: Function, options?: any}>} validations - 验证规则数组
 * @throws {AppError} 当验证失败时
 */
export function validateAndThrow(obj, validations) {
  const errors = validateFields(obj, validations);
  
  if (errors.length > 0) {
    throw AppError.validationError(
      '输入验证失败',
      { errors }
    );
  }
}