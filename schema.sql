-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000,
    draw_count INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
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

-- 索引 (优化查询速度)
CREATE INDEX IF NOT EXISTS idx_inv_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);