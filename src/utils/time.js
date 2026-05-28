/**
 * 北京时间工具函数
 *
 * 核心设计：getBeijingTime 返回的 Date 对象内部是偏移后的时间，
 * 用 getUTC* 方法提取字段即为北京时间。不要用 toISOString() —
 * 它输出的是 UTC，不是偏移后的时间。
 */

const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

// 获取偏移后的 Date 对象（内部用，不要直接 toISOString）
export function getBeijingTime(date = new Date()) {
  return new Date(date.getTime() + BEIJING_OFFSET_MS);
}

// 从 Date 对象提取 YYYY-MM-DD（北京时间）
function dateToBeijingStr(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// 获取北京日期字符串 (YYYY-MM-DD)
export function getBeijingDateStr(date = new Date()) {
  return dateToBeijingStr(getBeijingTime(date));
}

// 获取北京时间的 ISO 字符串（用于存储，带 +08:00 后缀避免歧义）
export function getBeijingISOString(date = new Date()) {
  const bj = getBeijingTime(date);
  const y = bj.getUTCFullYear();
  const m = String(bj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(bj.getUTCDate()).padStart(2, '0');
  const h = String(bj.getUTCHours()).padStart(2, '0');
  const min = String(bj.getUTCMinutes()).padStart(2, '0');
  const s = String(bj.getUTCSeconds()).padStart(2, '0');
  const ms = String(bj.getUTCMilliseconds()).padStart(3, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}.${ms}+08:00`;
}

// 从任意日期字符串提取北京日期 (YYYY-MM-DD)
export function toDateStr(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.substring(0, 10);
  return dateToBeijingStr(getBeijingTime(d));
}

// 将UTC时间转换为北京时间（兼容旧数据）
export function utcToBeijing(utcDateStr) {
  if (!utcDateStr) return null;
  const date = new Date(utcDateStr);
  return new Date(date.getTime() + BEIJING_OFFSET_MS);
}

// 路径标准化
export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
