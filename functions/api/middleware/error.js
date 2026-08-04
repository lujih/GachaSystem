import { AppError } from '../../../src/utils/AppError.js';

export function errorMiddleware(err, c) {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message, code: err.code }, err.statusCode);
  }
  if (err instanceof SyntaxError) {
    return c.json({ success: false, error: '请求体不是有效的 JSON', code: 'INVALID_JSON' }, 400);
  }
  console.error('[api] Error:', err);
  return c.json({ success: false, error: err.message || 'API服务错误' }, 500);
}
