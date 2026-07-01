-- 开启外键约束支持 (SQLite/D1 默认可能关闭，建议显式开启)
PRAGMA foreign_keys = ON;

-- 1. 用户表
-- 使用 STRICT 模式强制类型安全
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000 NOT NULL,
    draw_count INTEGER DEFAULT 0 NOT NULL,
    wins INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    exp INTEGER DEFAULT 0 NOT NULL,
    total_exp INTEGER DEFAULT 0 NOT NULL,
    last_login_date TEXT, -- 存 ISO8601 字符串
    login_streak INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL
) STRICT;

-- 2. 图库表
-- 优化：存储 user_id 而不是 username，关联更紧密
CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    user_id INTEGER,
    username TEXT, -- 保留作为快照，或者仅使用 user_id 并在查询时 JOIN
    rarity TEXT DEFAULT 'N',
    source_name TEXT, -- 图源名称
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_gallery_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 3. 背包表
-- 优化：增加 count >= 0 约束，防止负数
CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    count INTEGER DEFAULT 0 NOT NULL CHECK (count >= 0),
    PRIMARY KEY (user_id, rarity),
    CONSTRAINT fk_inv_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 4. 日志表
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT, -- 日志表保留 username 快照是合理的，方便追溯已删除用户的记录
    action TEXT NOT NULL,
    detail TEXT,
    rarity TEXT,
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_logs_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 5. 等级奖励记录表
CREATE TABLE IF NOT EXISTS level_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_data TEXT,
    claimed_at INTEGER NOT NULL,
    CONSTRAINT fk_lr_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 6. 用户称号表
CREATE TABLE IF NOT EXISTS user_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL,
    is_equipped INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(user_id, title_id),
    CONSTRAINT fk_title_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 7. 用户上传表
CREATE TABLE IF NOT EXISTS user_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    github_path TEXT,
    url TEXT NOT NULL,
    rarity TEXT DEFAULT 'N',
    status TEXT DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    reviewed_at INTEGER,
    CONSTRAINT fk_upload_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 8. 抽卡历史记录 (2026-04-02 新增)
CREATE TABLE IF NOT EXISTS draw_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    rarity TEXT NOT NULL,
    is_pity INTEGER DEFAULT 0 NOT NULL,
    source_name TEXT,
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_draw_history_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 索引：抽卡历史记录查询优化
CREATE INDEX IF NOT EXISTS idx_draw_history_user_created ON draw_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draw_history_rarity ON draw_history(user_id, rarity);

-- =========================================
-- 索引优化
-- =========================================

-- users: username 已经是 UNIQUE，自动有索引，无需额外创建

-- inventory: 主键 (user_id, rarity) 已经覆盖了 user_id 的查询，无需 idx_inv_user

-- logs: 经常按用户查，或者按时间查
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON logs(user_id, created_at DESC);

-- level_rewards: 经常查询某用户某等级是否领过
CREATE INDEX IF NOT EXISTS idx_level_rewards_check ON level_rewards(user_id, level);

-- user_titles: 查询用户拥有的称号
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);

-- gallery: 首页“最新掉落”需要按时间倒序查询
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON gallery(created_at DESC);
-- gallery: 个人主页查看自己的图库
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery(user_id, created_at DESC);

-- 索引：抽卡时需要快速随机获取已通过的卡片
CREATE INDEX IF NOT EXISTS idx_uploads_pool ON user_uploads(status, rarity);
-- 索引：查询用户上传记录
CREATE INDEX IF NOT EXISTS idx_uploads_user ON user_uploads(user_id, created_at DESC);
-- 索引：审核时按状态和时间查询
CREATE INDEX IF NOT EXISTS idx_uploads_status_created ON user_uploads(status, created_at DESC);

-- gallery: 游标分页优化 (使用 id 作为游标)
CREATE INDEX IF NOT EXISTS idx_gallery_id ON gallery(id DESC);

-- gallery: 按稀有度过滤
CREATE INDEX IF NOT EXISTS idx_gallery_rarity ON gallery(rarity, created_at DESC);

-- logs: 按操作类型过滤
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_rarity ON logs(rarity, created_at DESC);

-- draw_history: 按稀有度和时间查询
CREATE INDEX IF NOT EXISTS idx_draw_history_rarity_time ON draw_history(rarity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draw_history_username ON draw_history(user_id, username, created_at DESC);

-- users: 快速查询
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Migration: add rarity column to gallery (existing databases — safe on new DBs where column already exists)
-- SQLite 3.35+ supports IF NOT EXISTS for DROP COLUMN but not ADD COLUMN;
-- these are wrapped per D1 best practices and will be harmless no-ops on already-migrated schemas

-- 10. 点赞表
CREATE TABLE IF NOT EXISTS card_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, gallery_id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_likes_gallery ON card_likes(gallery_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON card_likes(user_id, created_at DESC);

-- 11. 书签表
CREATE TABLE IF NOT EXISTS card_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, gallery_id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_bookmarks_gallery ON card_bookmarks(gallery_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON card_bookmarks(user_id, created_at DESC);

-- 12. Buffer 声明表（并发防止重复发图）
-- 用 D1 INSERT ON CONFLICT 做原子锁：
-- 两个请求同时选中同一 slot → 只有一个能 INSERT 成功，另一个降级为直取
CREATE TABLE IF NOT EXISTS buffer_claims (
    url_hash TEXT NOT NULL PRIMARY KEY,
    rarity TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL
) STRICT;

-- 清理超过 10 分钟的旧声明（通过定时任务或懒清理）
CREATE INDEX IF NOT EXISTS idx_buffer_claims_claimed ON buffer_claims(claimed_at);
