import { AppError } from '../../../src/utils/AppError.js';

export function errorMiddleware(err, c) {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message, code: err.code }, err.statusCode);
  }
  if (err instanceof SyntaxError) {
    return c.json({ success: false, error: '请求体不是有效的 JSON', code: 'INVALID_JSON' }, 400);
  }
  // 非预期错误：完整细节只进服务端日志，不回吐客户端。
  // D1 的 err.message 含表名/列名/约束名（如 "CHECK constraint failed: count >= 0"），
  // 并发 decompose / claimReward 即可稳定触发，属于信息泄露。
  console.error('[api] Unhandled Error:', err);
  return c.json({ success: false, error: '服务器内部错误', code: 'INTERNAL_ERROR' }, 500);
}
