/**
 * 管理服务：用户管理 / 上传审核 / 公告 / 更新日志
 * 密码校验由路由层 requireAdmin 中间件完成（本服务不校验）
 */
import { AppError } from '../utils/AppError.js';

export class AdminService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  async listUsers(page = 1, limit = 100) {
    const safeLimit = Math.min(parseInt(limit) || 100, 200);
    const offset = (page - 1) * safeLimit;
    const users = await this.env.DB.prepare(
      'SELECT id, username, nickname, coins, level, exp, total_exp, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
    ).bind(safeLimit, offset).all();
    return { users: users.results || [] };
  }

  async updatePoints(targetId, amount) {
    if (!targetId || amount == null || typeof amount !== 'number') {
      throw AppError.validationError('参数不完整');
    }
    await this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(amount, targetId).run();
    return { success: true };
  }

  async deleteUser(targetId) {
    if (!targetId) throw AppError.validationError('用户ID不能为空');
    // 外键 ON DELETE CASCADE 级联清理全部关联数据
    await this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
    return { success: true };
  }

  async listUploads(status = 'pending', page = 1, limit = 20) {
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const offset = (page - 1) * safeLimit;
    const [items, count] = await Promise.all([
      this.env.DB.prepare('SELECT * FROM user_uploads WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(status, safeLimit, offset).all(),
      this.env.DB.prepare('SELECT COUNT(*) as total FROM user_uploads WHERE status = ?').bind(status).first(),
    ]);
    return { uploads: items.results || [], total: count?.total || 0, page };
  }

  async reviewUpload(uploadId, action, rarity) {
    if (!uploadId) throw AppError.validationError('上传ID不能为空');
    if (!['approved', 'rejected'].includes(action)) throw AppError.validationError('无效的操作');
    await this.env.DB.prepare('UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?').bind(action, Date.now(), uploadId).run();
    if (action === 'approved' && rarity) {
      await this.env.DB.prepare('UPDATE user_uploads SET rarity = ? WHERE id = ?').bind(rarity, uploadId).run();
    }
    return { success: true };
  }

  async saveChangelog(logs) {
    if (!Array.isArray(logs)) throw AppError.validationError('无效的日志格式');
    const batch = [
      this.env.DB.prepare('DELETE FROM changelogs'),
    ];
    for (const log of logs.slice(0, 50)) {
      batch.push(this.env.DB.prepare(
        'INSERT INTO changelogs (date, ver, content, tag, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(log.date || '', log.ver || '', log.content || '', log.tag || 'info', Date.now()));
    }
    await this.env.DB.batch(batch);
    return { message: '更新日志已保存' };
  }

  async saveAnnouncement(announcement) {
    if (!announcement) throw AppError.validationError('公告内容不能为空');
    await this.env.DB.batch([
      this.env.DB.prepare('DELETE FROM announcements'),
      this.env.DB.prepare(
        'INSERT INTO announcements (title, content, enabled, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(announcement.title || '', announcement.content || '', announcement.enabled ? 1 : 0, Date.now()),
    ]);
    return { message: '公告已保存' };
  }
}
