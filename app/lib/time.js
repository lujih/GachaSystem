/**
 * 前端北京时间工具（与 src/utils/time.js 后端算法一致）
 * 输入：毫秒时间戳（D1 存储格式）
 * 返回：北京日期字符串 YYYY-MM-DD，非法输入返回 null
 */
export function getBeijingDateStr(ts) {
  if (!Number.isFinite(ts)) return null;
  return new Date(ts + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
