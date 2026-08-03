-- D1 权威存储 schema v2（重构：sessions/pity_counters 落表，gallery.url 唯一）
-- 注意：D1 默认强制外键约束（等同 PRAGMA foreign_keys=on），无需显式声明
-- 时间戳统一 INTEGER 毫秒（Date.now()）

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000 NOT NULL CHECK (coins >= 0),
    draw_count INTEGER DEFAULT 0 NOT NULL,
    wins INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    exp INTEGER DEFAULT 0 NOT NULL,
    total_exp INTEGER DEFAULT 0 NOT NULL,
    last_login_at INTEGER,           -- 替代 last_login_date (ISO 字符串)
    login_streak INTEGER DEFAULT 0 NOT NULL,
    created_at INTEGER NOT NULL
) STRICT;

-- 会话表（权威）：token 仅存 SHA-256 哈希
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 保底计数器表（权威）：常驻 + 限定独立计数，永久保留
CREATE TABLE IF NOT EXISTS pity_counters (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ssr INTEGER DEFAULT 0 NOT NULL CHECK (ssr >= 0),
    ur INTEGER DEFAULT 0 NOT NULL CHECK (ur >= 0),
    limited_ssr INTEGER DEFAULT 0 NOT NULL CHECK (limited_ssr >= 0),
    limited_ur INTEGER DEFAULT 0 NOT NULL CHECK (limited_ur >= 0)
) STRICT;

-- 图库（url 唯一约束 → 配合 ON CONFLICT(url) 去重生效）
CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username TEXT,
    rarity TEXT DEFAULT 'N',
    source_name TEXT,
    created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON gallery(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_rarity ON gallery(rarity, created_at DESC);

-- 背包
CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    count INTEGER DEFAULT 0 NOT NULL CHECK (count >= 0),
    PRIMARY KEY (user_id, rarity),
    CONSTRAINT fk_inv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 抽卡历史
CREATE TABLE IF NOT EXISTS draw_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    rarity TEXT NOT NULL,
    is_pity INTEGER DEFAULT 0 NOT NULL,
    source_name TEXT,
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_draw_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_draw_history_user_created ON draw_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_draw_history_rarity ON draw_history(user_id, rarity);

-- 等级奖励记录
CREATE TABLE IF NOT EXISTS level_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_data TEXT,
    claimed_at INTEGER NOT NULL,
    UNIQUE(user_id, level),
    CONSTRAINT fk_lr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 用户称号
CREATE TABLE IF NOT EXISTS user_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_id TEXT NOT NULL,
    unlocked_at INTEGER NOT NULL,
    is_equipped INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(user_id, title_id),
    CONSTRAINT fk_title_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- 玩家上传
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
    CONSTRAINT fk_upload_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_uploads_pool ON user_uploads(status, rarity);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON user_uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_status_created ON user_uploads(status, created_at DESC);

-- 点赞 / 书签
CREATE TABLE IF NOT EXISTS card_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, gallery_id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_likes_gallery ON card_likes(gallery_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON card_likes(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS card_bookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, gallery_id)
) STRICT;
CREATE INDEX IF NOT EXISTS idx_bookmarks_gallery ON card_bookmarks(gallery_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON card_bookmarks(user_id, created_at DESC);

-- Buffer 声明表（并发防止重复发图的原子锁，机制保留）
CREATE TABLE IF NOT EXISTS buffer_claims (
    url_hash TEXT NOT NULL PRIMARY KEY,
    rarity TEXT NOT NULL,
    slot_index INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_buffer_claims_claimed ON buffer_claims(claimed_at);

-- 公告（KV 内容存储迁 D1）
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    enabled INTEGER DEFAULT 0 NOT NULL,
    updated_at INTEGER NOT NULL
) STRICT;

-- 更新日志（KV 内容存储迁 D1）
CREATE TABLE IF NOT EXISTS changelogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ver TEXT NOT NULL,
    content TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at INTEGER NOT NULL
) STRICT;

-- 排行榜（替代 RECENT_REQUESTS KV）
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    rarity TEXT NOT NULL,
    image_url TEXT NOT NULL,
    created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS idx_leaderboard_created ON leaderboard(created_at DESC);
