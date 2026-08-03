/**
 * 上传服务：玩家上传（双 MIME 校验）/ 我的上传列表
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { validateRarity } from '../utils/validation.js';

const MAX_PENDING_UPLOADS = 20;

export class UploadService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  async uploadImage(currentUser, request) {
    const formData = await request.formData();
    const file = formData.get('image');
    const rarityRaw = formData.get('rarity') || 'N';

    const rarityError = validateRarity(rarityRaw);
    if (rarityError) throw AppError.validationError(rarityError);
    const rarity = rarityRaw.toUpperCase();

    if (!file) throw AppError.validationError('未提供图片');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) throw AppError.validationError('无效的文件类型');

    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileName = file.name || '';
    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop().toLowerCase() : '';
    if (!allowedExts.includes(ext)) throw AppError.validationError('无效的文件扩展名');

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) throw AppError.validationError('文件过大，最大5MB');

    // 待审核数量上限（防刷存储）
    const pending = await this.env.DB.prepare(
      "SELECT COUNT(*) as c FROM user_uploads WHERE user_id = ? AND status = 'pending'"
    ).bind(currentUser.id).first();
    if ((pending?.c || 0) >= MAX_PENDING_UPLOADS) {
      throw AppError.validationError(`待审核上传已满 ${MAX_PENDING_UPLOADS} 条，请等待审核`);
    }

    const arrayBuffer = await file.arrayBuffer();

    // Magic bytes 校验
    const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
    const magic = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const MAGIC_MAP = {
      'FFD8FF': 'image/jpeg',
      '89504E47': 'image/png',
      '47494638': 'image/gif',
    };
    let matchedMime = Object.entries(MAGIC_MAP).find(([magicPrefix]) => magic.startsWith(magicPrefix));
    // WebP: RIFF....WEBP (bytes 8-11)
    if (!matchedMime && magic.startsWith('52494646') && magic.slice(16, 24) === '57454250') {
      matchedMime = ['5249464657454250', 'image/webp'];
    }
    if (!matchedMime) throw AppError.validationError('文件内容不是有效的图片格式');
    if (matchedMime[1] !== file.type) throw AppError.validationError('文件扩展名与内容不匹配');

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const r2Key = `uploads/${currentUser.id}_${timestamp}_${random}${ext}`;
    const r2Url = `${CONFIG.R2_DOMAIN}/${r2Key}`;

    await this.env.R2_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=3600' },
    });
    await this.env.DB.prepare(
      'INSERT INTO user_uploads (user_id, username, r2_key, url, rarity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(currentUser.id, currentUser.username, r2Key, r2Url, rarity, 'pending', Date.now()).run();

    return { success: true, url: r2Url, message: '上传成功，等待审核' };
  }

  async getUserUploads(currentUser, page = 1) {
    const safePage = parseInt(page) || 1;
    const limit = 20;
    const offset = (safePage - 1) * limit;
    const total = await this.env.DB.prepare('SELECT COUNT(*) as count FROM user_uploads WHERE user_id = ?').bind(currentUser.id).first();
    const uploads = await this.env.DB.prepare(
      'SELECT * FROM user_uploads WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(currentUser.id, limit, offset).all();
    return {
      uploads: uploads.results || [],
      total: total.count,
      page: safePage,
      totalPages: Math.ceil(total.count / limit),
    };
  }
}
