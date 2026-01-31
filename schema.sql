-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000,
    draw_count INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    exp INTEGER DEFAULT 0,
    total_exp INTEGER DEFAULT 0,
    last_login_date TEXT,
    login_streak INTEGER DEFAULT 0,
    created_at INTEGER
);

-- 图库表 (替代原有的 KV JSON 索引)
CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    username TEXT,
    created_at INTEGER
);

-- 背包表 (使用联合主键防止重复)
CREATE TABLE IF NOT EXISTS inventory (
    user_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, rarity)
);

-- 日志表 (可选，用于后台查询)
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    detail TEXT,
    rarity TEXT,
    created_at INTEGER
);

-- 等级奖励记录表 (记录用户已领取的等级奖励)
CREATE TABLE IF NOT EXISTS level_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    level INTEGER,
    reward_type TEXT,
    reward_data TEXT,
    claimed_at INTEGER
);

-- 用户称号表
CREATE TABLE IF NOT EXISTS user_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title_id TEXT NOT NULL,
    unlocked_at INTEGER,
    is_equipped INTEGER DEFAULT 0,
    UNIQUE(user_id, title_id)
);

-- 索引 (优化查询速度)
CREATE INDEX IF NOT EXISTS idx_inv_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_level_rewards_user ON level_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON gallery(created_at DESC);