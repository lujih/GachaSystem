import { AppError } from '../../../src/utils/AppError.js';

export function errorMiddleware(err, c) {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message, code: err.code }, err.statusCode);
  }
  console.error('[api] Error:', err);
  return c.json({ success: false, error: err.message || 'API服务错误' }, 500);
}
