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