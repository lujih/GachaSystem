/**
 * 输入验证工具
 */

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return '用户名不能为空';
  }
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return '用户名长度需 3-20 位';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return '用户名只能包含字母、数字、下划线';
  }
  return null;
}

export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return '密码不能为空';
  }
  if (password.length < 6) {
    return '密码长度至少 6 位';
  }
  return null;
}

export function validateNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return '昵称不能为空';
  }
  const trimmed = nickname.trim();
  if (trimmed.length > 20) {
    return '昵称长度不能超过 20 位';
  }
  return null;
}

export function validateRarity(rarity) {
  const valid = ['N', 'R', 'SR', 'SSR', 'UR'];
  if (!valid.includes(rarity)) {
    return '无效的稀有度';
  }
  return null;
}

export function validateBetAmount(amount, config = {}) {
  const min = config.min || 10;
  const max = config.max || 1000;
  
  const num = parseInt(amount);
  if (isNaN(num) || num < min || num > max) {
    return `下注金额需在 ${min} - ${max} 之间`;
  }
  return null;
}

export function validatePrediction(prediction) {
  const valid = ['small', 'big'];
  if (!valid.includes(prediction)) {
    return '请选择押大或押小';
  }
  return null;
}

export function validatePoolId(poolId, pools) {
  if (!poolId) return null; // poolId 可选
  if (!pools[poolId]) {
    return '无效的卡池';
  }
  return null;
}

export function validatePositiveInteger(value, fieldName = '值') {
  const num = parseInt(value);
  if (isNaN(num) || num <= 0) {
    return `${fieldName}必须是正整数`;
  }
  return null;
}

export function validateRequired(obj, fields) {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      return `缺少必要字段: ${field}`;
    }
  }
  return null;
}

export function validateFileUpload(file) {
  if (!file) {
    return '未提供文件';
  }
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return '无效的文件类型，仅支持 jpg/png/gif/webp';
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return '文件过大，最大 5MB';
  }
  
  return null;
}
