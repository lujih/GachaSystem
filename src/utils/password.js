/**
 * 密码与会话工具
 * 密码: PBKDF2-SHA256, 100k 迭代, 存储格式 saltBase64:hashBase64
 * 兼容旧版明文密码（登录时返回 'migrated' 触发重哈希）
 */

export async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256'
  }, key, 256);

  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // 兼容旧版明文密码
  if (!storedHash.includes(':')) {
    return password === storedHash ? 'migrated' : false;
  }

  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) return false;

  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256'
  }, key, 256);

  const computedHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return computedHash === hashBase64;
}
