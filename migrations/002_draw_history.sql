-- Migration 002: 抽卡历史记录表 + 保底计数器配置 (2026-04-02)

-- 创建抽卡历史记录表
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
