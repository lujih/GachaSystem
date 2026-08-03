/**
 * 认证服务：注册 / 登录 / 登出 / 会话解析
 * 会话权威存储：D1 sessions 表（token 仅存 SHA-256 哈希）
 * KV 仅作 60s 读缓存（可丢，DB 兜底）
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { validateUsername, validatePassword } from '../utils/validation.js';
import { hashPassword, verifyPassword, sha256Hex } from '../utils/password.js';

export class AuthService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  async register(input) {
    const { username, nickname, password } = input || {};
    if (!username || !password) throw AppError.validationError('缺少必要字段');

    const ue = validateUsername(username);
    if (ue) throw AppError.validationError(ue);
    const pe = validatePassword(password);
    if (pe) throw AppError.validationError(pe);

    try {
      const hashedPassword = await hashPassword(password);
      await this.env.DB.prepare(
        'INSERT INTO users (username, nickname, password, coins, level, exp, total_exp, login_streak, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)'
      ).bind(username, nickname || username, hashedPassword, 1000, 1, 0, 0, 0, Date.now()).run();
      return { success: true };
    } catch (e) {
      console.error(e);
      if (String(e.message).includes('UNIQUE constraint')) {
        throw AppError.conflictError('用户名已被占用');
      }
      throw AppError.serverError('注册失败，请稍后重试');
    }
  }

  buildSessionUser(user) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`,
      coins: user.coins || 0,
      level: user.level,
      exp: user.exp,
      total_exp: user.total_exp || 0,
    };
  }

  async login(input) {
    const { username, password } = input || {};
    if (!username || !password) throw AppError.authError('凭证无效');

    const user = await this.env.DB.prepare(
      'SELECT id, username, nickname, password, coins, level, exp, total_exp FROM users WHERE username = ?'
    ).bind(username).first();
    if (!user) throw AppError.authError('凭证无效');

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) throw AppError.authError('凭证无效');

    if (isPasswordValid === 'migrated') {
      const newHash = await hashPassword(password);
      await this.env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(newHash, user.id).run();
    }

    const token = crypto.randomUUID();
    const tokenHash = await sha256Hex(token);
    const now = Date.now();
    const expiresAt = now + CONFIG.TTL.SESSION;

    await this.env.DB.prepare(
      'INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(tokenHash, user.id, now, expiresAt, now).run();

    this.safeWaitUntil(this.cleanupExpiredSessions());

    return { token, user: this.buildSessionUser(user) };
  }

  async logout(token) {
    if (token) {
      const tokenHash = await sha256Hex(token);
      await this.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
      if (this.env.KV_CACHE) await this.env.KV_CACHE.delete(`session:${tokenHash}`).catch(() => {});
    }
    return { success: true };
  }

  async cleanupExpiredSessions() {
    try {
      await this.env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run();
    } catch (e) { console.warn('[Sessions] cleanup failed:', e.message); }
  }

  /**
   * 按 token 解析当前用户（DB 权威值）。返回 null 表示无效/过期。
   */
  async getSessionUser(token) {
    if (!token) return null;
    const tokenHash = await sha256Hex(token);

    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(`session:${tokenHash}`, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }

    const row = await this.env.DB.prepare(
      `SELECT s.expires_at, u.id, u.username, u.nickname, u.coins, u.level, u.exp, u.total_exp
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    ).bind(tokenHash, Date.now()).first();
    if (!row) return null;

    const user = this.buildSessionUser(row);
    if (this.env.KV_CACHE) {
      this.safeWaitUntil(
        this.env.KV_CACHE.put(`session:${tokenHash}`, JSON.stringify(user), { expirationTtl: 60 })
      );
    }
    return user;
  }
}
