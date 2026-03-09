/**
 * 北京时间工具函数
 */

// 获取北京时间
export function getBeijingTime(date = new Date()) {
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

// 获取北京日期字符串 (YYYY-MM-DD)
export function getBeijingDateStr(date = new Date()) {
  return getBeijingTime(date).toISOString().split('T')[0];
}

// 获取北京时间的ISO字符串
export function getBeijingISOString(date = new Date()) {
  return getBeijingTime(date).toISOString();
}

// 将UTC时间转换为北京时间
export function utcToBeijing(utcDateStr) {
  if (!utcDateStr) return null;
  const date = new Date(utcDateStr);
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

// 路径标准化
export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
