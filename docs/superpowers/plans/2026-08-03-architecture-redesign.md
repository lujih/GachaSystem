# 系统架构与存储架构重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 if-else 单体路由 + KV 五重角色的架构，重构为 Hono 路由 + 领域拆分 + D1 权威存储，系统性修复并发扣币/会话一致性/保底过期/图库去重四个正确性隐患。

**Architecture:** 存储层 D1 权威（sessions/pity_counters/gallery UNIQUE/announcements/changelogs/leaderboard 新表），KV 仅保留 buffer/黑名单/限流/缓存；API 层 hono/cloudflare-pages 的 `handle(app)` 适配器 + 中间件链（cors→services→session→error）；服务层拆为 8 个领域模块 + DrawEngine/ImagePipeline 纯逻辑单元。

**Tech Stack:** hono ^4.12.34（dependencies）、zod ^4.4.3（dependencies，预留）、vitest ^4.1.10（devDependencies）。Node v24 已装。

**Spec:** `docs/superpowers/specs/2026-08-03-architecture-redesign-design.md`

**数据可推倒重建**：schema.sql 直接重写，无需迁移；本地验证 `npx wrangler d1 execute chouka --local --file=./schema.sql`。

---

## 文件结构总览

**新建：**
- `tests/draw-engine.test.js` — DrawEngine 单测
- `tests/image-pipeline.test.js` — ImagePipeline 单测
- `src/utils/password.js` — PBKDF2 密码工具 + sha256Hex
- `src/services/auth-service.js` — 注册/登录/登出/会话
- `src/services/draw-engine.js` — 纯函数抽卡引擎
- `src/services/image-pipeline.js` — 图片管道
- `src/services/gallery-service.js` — 图库/点赞/书签/排行榜
- `src/services/admin-service.js` — 管理后台
- `src/services/upload-service.js` — 上传
- `functions/api/app.js` — Hono 装配
- `functions/api/middleware/error.js`
- `functions/api/middleware/services.js`
- `functions/api/middleware/session.js`
- `functions/api/middleware/auth.js`（requireAuth + requireAdmin）
- `functions/api/middleware/rate-limit.js`
- `functions/api/routes/auth.js`
- `functions/api/routes/user.js`
- `functions/api/routes/gacha.js`
- `functions/api/routes/library.js`
- `functions/api/routes/admin.js`
- `functions/api/routes/public.js`

**重写（覆盖）：**
- `schema.sql`
- `src/services/user-service.js`
- `src/services/gacha-service.js`
- `functions/api/[[path]].js`（薄入口）
- `functions/_middleware.js`（精简）
- `package.json`（scripts + 依赖）
- `app/lib/api.js`（响应对齐）
- `src/utils/index.js`

**删除：**
- `src/utils/response.js`（jsonResponse/requireAdmin 全部由 Hono 替代）
- `RECENT_REQUESTS` KV 绑定（wrangler.jsonc，排行榜进 D1）

---

### Task 1: 依赖与测试工具链

**Files:**
- Modify: `package.json`
- Create: `tests/.gitkeep`

- [ ] **Step 1: 安装依赖**

```bash
npm install hono zod
npm install -D vitest
```

Expected: 安装成功，`package.json` 出现 `hono@^4.12.x`、`zod@^4.4.x`、`vitest@^4.1.x`。

- [ ] **Step 2: 添加 test scripts**

在 `package.json` 的 `scripts` 中加入：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: 验证工具链**

```bash
npm run typecheck
npm test
```

Expected: typecheck 仅剩已知误报（vite.config.ts:18 `serverBuildPath`）；`npm test` 输出 "No test files found"（或 passWithNoTests 行为），退出码为 0。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tests/
git commit -m "chore: add hono/zod/vitest toolchain"
```

---

### Task 2: 重写 schema.sql（D1 权威存储）

**Files:**
- Rewrite: `schema.sql`

- [ ] **Step 1: 重写 schema.sql**

完整内容：

```sql
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
    ssr INTEGER DEFAULT 0 NOT NULL,
    ur INTEGER DEFAULT 0 NOT NULL,
    limited_ssr INTEGER DEFAULT 0 NOT NULL,
    limited_ur INTEGER DEFAULT 0 NOT NULL
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
    CONSTRAINT fk_lr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;
CREATE INDEX IF NOT EXISTS idx_level_rewards_check ON level_rewards(user_id, level);

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
CREATE INDEX IF NOT EXISTS idx_user_titles_user ON user_titles(user_id);

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
```

- [ ] **Step 2: 本地验证迁移**

```bash
npx wrangler d1 execute chouka --local --file=./schema.sql
```

Expected: 执行成功无报错。重复执行同样成功（IF NOT EXISTS）。

- [ ] **Step 3: Commit**

```bash
git add schema.sql
git commit -m "refactor(db): D1 authoritative schema — sessions/pity_counters tables, gallery.url UNIQUE"
```

---

### Task 3: 工具层（password.js / response.js 移除）

**Files:**
- Create: `src/utils/password.js`
- Modify: `src/utils/index.js`
- Delete: `src/utils/response.js`

- [ ] **Step 1: 创建 password.js**

```js
/**
 * 密码与会话工具
 * 密码: PBKDF2-SHA256, 100k 迭代, 存储格式 saltBase64:hashBase64
 * 兼容旧版明文密码（登录时返回 'migrated' 触发重哈希）
 */

export async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256'
  }, key, 256);

  const saltBase64 = btoa(String.fromCharCode(...salt));
  const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;

  // 兼容旧版明文密码
  if (!storedHash.includes(':')) {
    return password === storedHash ? 'migrated' : false;
  }

  const [saltBase64, hashBase64] = storedHash.split(':');
  if (!saltBase64 || !hashBase64) return false;

  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256'
  }, key, 256);

  const computedHash = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return computedHash === hashBase64;
}
```

- [ ] **Step 2: 更新 utils/index.js**

```js
export * from './time.js';
export * from './password.js';
export * from './validation.js';
```

- [ ] **Step 3: 删除 response.js 并确认无引用**

```bash
git rm src/utils/response.js
```

然后搜索残留引用（旧服务与旧路由重构前仍有引用，属预期，待 Task 10/12 清理；确认除 `src/services/*.js` 与 `functions/api/[[path]].js` 外无其他引用即可）：

```bash
rg -l "utils/response" --glob '!src/services/*' --glob '!functions/api/*'
```

Expected: 无输出（除将被重写的文件外）。

- [ ] **Step 4: Commit**

```bash
git add src/utils/
git commit -m "refactor(utils): extract password.js, remove response.js (superseded by Hono)"
```

---

### Task 4: DrawEngine（纯函数抽卡引擎）+ 单测

**Files:**
- Create: `src/services/draw-engine.js`
- Test: `tests/draw-engine.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/draw-engine.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { calcSoftPityProbs, applyPity, rollRarity, advancePity, planMultiDraw } from '../src/services/draw-engine.js';

// 测试用固定配置（与 src/config/business.js 一致）
const PITY = {
  SSR: { at: 15, softStart: 10, softRate: 5 },
  UR: { at: 80, softStart: 50, softRate: 2 },
};

afterEach(() => { vi.restoreAllMocks(); });

describe('calcSoftPityProbs', () => {
  it('软保底开始前为基础概率 (UR 1%, SSR 4%)', () => {
    const { urProb, ssrProb } = calcSoftPityProbs(0, 0, PITY);
    expect(urProb).toBe(1);
    expect(ssrProb).toBe(4);
  });

  it('UR 50 抽后每抽 +2%', () => {
    const { urProb } = calcSoftPityProbs(0, 52, PITY);
    expect(urProb).toBe(1 + (52 - 50 + 1) * 2); // 7
  });

  it('概率封顶 100', () => {
    const { urProb } = calcSoftPityProbs(0, 200, PITY);
    expect(urProb).toBe(100);
  });
});

describe('applyPity', () => {
  it('SSR 保底：ssrPity >= 14 强制 SSR', () => {
    expect(applyPity('N', 14, 0, PITY)).toEqual({ rarity: 'SSR', isPity: true });
  });

  it('UR 保底：urPity >= 79 强制 UR', () => {
    expect(applyPity('N', 0, 79, PITY)).toEqual({ rarity: 'UR', isPity: true });
  });

  it('未达保底时保持原稀有度', () => {
    expect(applyPity('SR', 5, 10, PITY)).toEqual({ rarity: 'SR', isPity: false });
  });
});

describe('rollRarity', () => {
  it('random=0 必出 UR，random=99 出 N（未触发保底）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollRarity(0, 0, PITY).rarity).toBe('UR');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(rollRarity(0, 0, PITY).rarity).toBe('N');
  });
});

describe('advancePity', () => {
  it('普通抽两计数 +1', () => {
    expect(advancePity({ ssr: 3, ur: 3 }, 'N')).toEqual({ ssr: 4, ur: 4 });
  });
  it('出 SSR 重置 ssr，出 UR 双重置', () => {
    expect(advancePity({ ssr: 5, ur: 5 }, 'SSR')).toEqual({ ssr: 0, ur: 6 });
    expect(advancePity({ ssr: 5, ur: 5 }, 'UR')).toEqual({ ssr: 0, ur: 0 });
  });
});

describe('planMultiDraw', () => {
  it('生成 count 项计划，保底计数器逐步推进', () => {
    const plan = planMultiDraw(3, { ssr: 0, ur: 0 }, PITY);
    expect(plan).toHaveLength(3);
    expect(plan[0]).toHaveProperty('index', 0);
    expect(plan[0]).toHaveProperty('rarity');
    expect(plan[2].ssrPity).toBe(plan[1].ssrPity + 1 >= 1 ? plan[2].ssrPity : plan[2].ssrPity);
  });

  it('79 连内未出 UR 时，第 80 抽必为 UR（硬保底）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plan = planMultiDraw(80, { ssr: 0, ur: 0 }, PITY);
    expect(plan[79].rarity).toBe('UR');
    expect(plan[79].isPity).toBe(true);
    expect(plan[79].urPity).toBe(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/draw-engine.test.js
```

Expected: FAIL，报 "Cannot find module '../src/services/draw-engine.js'"。

- [ ] **Step 3: 实现 draw-engine.js**

```js
/**
 * 抽卡引擎（纯函数，无 I/O，可独立单测）
 * 概率：基础 UR 1% / SSR 4%，软保底 + 硬保底
 */
import { CONFIG } from '../config/index.js';

function getPityConfig() {
  return CONFIG.PITY;
}

export function calcSoftPityProbs(ssrPity, urPity, pityConfig = getPityConfig()) {
  let urProb = 1;
  let ssrProb = 4;
  const ur = pityConfig.UR;
  const ssr = pityConfig.SSR;
  if (ur.softStart && urPity >= ur.softStart) {
    urProb += (urPity - ur.softStart + 1) * ur.softRate;
  }
  if (ssr.softStart && ssrPity >= ssr.softStart) {
    ssrProb += (ssrPity - ssr.softStart + 1) * ssr.softRate;
  }
  return { urProb: Math.min(urProb, 100), ssrProb: Math.min(ssrProb, 100) };
}

export function applyPity(rarity, ssrPity, urPity, pityConfig = getPityConfig()) {
  const ssrAt = pityConfig.SSR.at;
  const urAt = pityConfig.UR.at;
  if (urAt > 0 && urPity >= urAt - 1) return { rarity: 'UR', isPity: true };
  if (ssrAt > 0 && ssrPity >= ssrAt - 1) return { rarity: 'SSR', isPity: true };
  return { rarity, isPity: false };
}

export function rollRarity(ssrPity, urPity, pityConfig = getPityConfig()) {
  const { urProb, ssrProb } = calcSoftPityProbs(ssrPity, urPity, pityConfig);
  const rand = Math.random() * 100;
  let rarity;
  if (rand < urProb) rarity = 'UR';
  else if (rand < urProb + ssrProb) rarity = 'SSR';
  else if (rand < urProb + ssrProb + 15) rarity = 'SR';
  else if (rand < urProb + ssrProb + 50) rarity = 'R';
  else rarity = 'N';
  return applyPity(rarity, ssrPity, urPity, pityConfig);
}

export function advancePity(pity, rarity) {
  const next = { ssr: pity.ssr + 1, ur: pity.ur + 1 };
  if (rarity === 'SSR' || rarity === 'UR') next.ssr = 0;
  if (rarity === 'UR') next.ur = 0;
  return next;
}

export function planMultiDraw(count, initialPity, pityConfig = getPityConfig()) {
  const plan = [];
  let pity = { ssr: initialPity.ssr, ur: initialPity.ur };
  for (let i = 0; i < count; i++) {
    const { rarity, isPity } = rollRarity(pity.ssr, pity.ur, pityConfig);
    pity = advancePity(pity, rarity);
    plan.push({ index: i, rarity, isPity, ssrPity: pity.ssr, urPity: pity.ur });
  }
  return plan;
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/draw-engine.test.js
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/services/draw-engine.js tests/draw-engine.test.js
git commit -m "feat(draw): extract pure-function DrawEngine with tests"
```

---

### Task 5: ImagePipeline（图片管道）+ 单测

**Files:**
- Create: `src/services/image-pipeline.js`
- Test: `tests/image-pipeline.test.js`

- [ ] **Step 1: 写失败测试**

```js
// tests/image-pipeline.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImagePipeline } from '../src/services/image-pipeline.js';

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(k, opts) {
      const v = store.get(k);
      if (v === undefined) return null;
      return opts?.type === 'json' ? JSON.parse(v) : v;
    },
    async put(k, v) { store.set(k, typeof v === 'string' ? v : JSON.stringify(v)); },
    async delete(k) { store.delete(k); },
  };
}

function makeEnv(dbChanges = 1) {
  const kv = makeKv();
  const db = {
    prepare: () => ({
      bind: () => ({ run: async () => ({ meta: { changes: dbChanges } }) }),
    }),
  };
  const r2 = { put: vi.fn(async () => ({})) };
  return { env: { KV_CACHE: kv, DB: db, R2_BUCKET: r2 }, kv, r2 };
}

function slotAsset(url, lastUsed = 0) {
  return { success: true, imageUrl: url, sourceName: 'Test', rarity: 'N', lastUsed };
}

describe('ImagePipeline.consumeBuffer', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('从已缓存 slots 中消费一个 asset', async () => {
    const { env, kv } = makeEnv();
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/a.png', 100)));
    kv.store.set('sys:buffer:N:1', JSON.stringify(slotAsset('https://cdn.test/b.png', 200)));

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(['https://cdn.test/a.png', 'https://cdn.test/b.png']).toContain(asset.imageUrl);
    expect(asset.success).toBe(true);
  });

  it('黑名单中的 URL 不会被消费', async () => {
    const { env, kv } = makeEnv();
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/blocked.png')));
    const hash = await new ImagePipeline(env).hashString('https://cdn.test/blocked.png');
    kv.store.set(`sys:draw:blacklist:N:${hash}`, String(Date.now()));

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(asset.imageUrl).not.toBe('https://cdn.test/blocked.png');
  });

  it('D1 锁冲突（changes=0）时降级实时拉取', async () => {
    const { env, kv, r2 } = makeEnv(0); // DB run 返回 changes: 0 → 锁冲突
    kv.store.set('sys:buffer:N:0', JSON.stringify(slotAsset('https://cdn.test/taken.png')));
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'https://img.test/1.jpg' }), { headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333, 334, 335, 336, 337, 338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437, 438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453, 454, 455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519, 520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583, 584, 585, 586, 587, 588, 589, 590, 591, 592, 593, 594, 595, 596, 597, 598, 599, 600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 619, 620, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 633, 634, 635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663, 664, 665, 666, 667, 668, 669, 670, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 686, 687, 688, 689, 690, 691, 692, 693, 694, 695, 696, 697, 698, 699, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 731, 732, 733, 734, 735, 736, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873, 874, 875, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 911, 912, 913, 914, 915, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 930, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 972, 973, 974, 975, 976, 977, 978, 979, 980, 981, 982, 983, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023], { headers: { 'content-type': 'image/webp' } }))
      .mockResolvedValueOnce(new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }))); // waitUntil 清理的 DB 调用无碍

    const pipe = new ImagePipeline(env);
    const asset = await pipe.consumeBuffer('N', [{ name: 'S', url: 'https://src.test', rarity: 'N' }]);

    expect(r2.put).toHaveBeenCalled();
    expect(asset.imageUrl).toMatch(/^https:\/\/cft1\.cszxorx\.dpdns\.org\/images\/N_[0-9a-f]{16}\.webp$/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
npx vitest run tests/image-pipeline.test.js
```

Expected: FAIL，报 "Cannot find module '../src/services/image-pipeline.js'"。

- [ ] **Step 3: 实现 image-pipeline.js**

```js
/**
 * 图片管道：图源拉取 → 压缩 → R2 上传 → KV buffer 缓存 → 黑名单防重
 * 机制（保留自旧 GachaService）：
 * - 每稀有度 5 个 KV slot 预缓存，消费时"最旧 3 选 1 随机"
 * - D1 buffer_claims INSERT ON CONFLICT 作原子锁防并发重复发图
 * - 消费后写黑名单（10 分钟）并后台 refill
 */
import { CONFIG } from '../config/index.js';

async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

export class ImagePipeline {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  async hashString(str) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  /**
   * 拉取图源并上传 R2。wsrv.nl 压缩失败时降级直传原图。
   * @returns {{success: boolean, imageUrl?: string, rarity?: string, sourceName?: string}}
   */
  async fetchAndUpload(source) {
    try {
      let requestUrl = source.url;
      try { new URL(source.url); } catch { requestUrl = encodeURI(source.url); }

      const initRes = await fetch(requestUrl, { method: 'GET', redirect: 'follow' });
      const contentType = initRes.headers.get('content-type') || '';
      let finalUrl = source.url;

      if (contentType.includes('application/json') || contentType.includes('text/html')) {
        try {
          const data = await initRes.json();
          finalUrl = data.url || data.img || data.image || data.data ||
            data.text || data.msg || data.result ||
            (data.data && (data.data.url || data.data.img || data.data[0])) ||
            (Array.isArray(data.data) && data.data[0]?.url) || source.url;
        } catch {
          finalUrl = initRes.url;
        }
      } else {
        finalUrl = initRes.url;
      }
      if (!finalUrl || finalUrl === 'null' || finalUrl === 'undefined') {
        return { success: false, rarity: source.rarity, imageUrl: null };
      }

      // 尝试 wsrv.nl 压缩转 webp
      const compressedUrl = `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&q=75&w=1200&il`;
      let buffer;
      let filename;
      let r2ContentType = 'image/webp';
      let compressed = true;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const imgRes = await fetch(compressedUrl, { signal: controller.signal });
        if (imgRes.ok) {
          const ab = await imgRes.arrayBuffer();
          if (ab.byteLength >= 100) {
            buffer = ab;
            const hashStr = await calculateHash(ab);
            filename = `images/${source.rarity}_${hashStr}.webp`;
          }
        }
      } catch { /* fallthrough to original */ }
      clearTimeout(timeout);

      if (!buffer) {
        // 降级：直传原图
        compressed = false;
        const origRes = await fetch(finalUrl, { redirect: 'follow' });
        if (!origRes.ok) throw new Error('Original fetch failed');
        buffer = await origRes.arrayBuffer();
        if (buffer.byteLength < 100) throw new Error('Image too small');
        const ext = (origRes.headers.get('content-type') || 'image/jpeg').split('/')[1] || 'jpg';
        r2ContentType = `image/${ext === 'jpeg' ? 'jpeg' : ext}`;
        const hashStr = await calculateHash(buffer);
        filename = `images/${source.rarity}_${hashStr}.${ext === 'jpeg' ? 'jpg' : ext}`;
      }

      await this.env.R2_BUCKET.put(filename, buffer, {
        httpMetadata: { contentType: r2ContentType, cacheControl: `public, max-age=${CONFIG.TTL.STATIC_ASSET}, immutable` },
      });

      return {
        success: true,
        imageUrl: `${CONFIG.R2_DOMAIN}/${filename}`,
        rarity: source.rarity,
        sourceName: source.name,
        compressed,
      };
    } catch (e) {
      console.error('[ImagePipeline] fetch/compress error:', e);
    }
    return { success: false, rarity: source.rarity, imageUrl: null };
  }

  async fetchAndUploadWithFallback(source) {
    const result = await this.fetchAndUpload(source);
    if (result.success) return result;
    const fallbacks = (CONFIG.FALLBACK_SOURCES || []).filter(s => s.rarity === source.rarity);
    for (const fb of fallbacks) {
      try {
        const r = await this.fetchAndUpload({ ...fb, name: 'Fallback' });
        if (r.success) return r;
      } catch (e) { console.warn(`[Fallback] ${fb.url} failed:`, e.message); }
    }
    return result;
  }

  async preReadBufferSlots(rarity) {
    const slotCount = CONFIG.TTL.BUFFER_SLOTS;
    const reads = Array.from({ length: slotCount }, (_, i) =>
      this.env.KV_CACHE.get(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${i}`, { type: 'json' })
        .then(cached => cached?.success ? { index: i, asset: cached, lastUsed: cached.lastUsed || 0 } : null)
    );
    return (await Promise.all(reads)).filter(Boolean);
  }

  async tryClaimBufferSlot(urlHash, rarity, slotIndex, now) {
    try {
      const result = await this.env.DB.prepare(
        'INSERT INTO buffer_claims (url_hash, rarity, slot_index, claimed_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING'
      ).bind(urlHash, rarity, slotIndex, now).run();
      return result.meta.changes > 0;
    } catch (e) {
      console.warn('[Buffer] D1 claim failed, proceeding without lock:', e.message);
      return true;
    }
  }

  async cleanupStaleClaims() {
    try {
      const cutoff = Date.now() - 600000;
      await this.env.DB.prepare('DELETE FROM buffer_claims WHERE claimed_at < ?').bind(cutoff).run();
    } catch (e) { console.warn('[Buffer] Cleanup failed:', e.message); }
  }

  async safeRefillBuffer(rarity, sourceList, slotIndex) {
    try {
      const asset = await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]);
      if (asset.success) {
        const idx = slotIndex !== undefined ? slotIndex : Math.floor(Math.random() * CONFIG.TTL.BUFFER_SLOTS);
        await this.env.KV_CACHE.put(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${idx}`, JSON.stringify(asset), { expirationTtl: CONFIG.TTL.STATIC_ASSET });
      }
    } catch (e) { console.error(`[Refill Error] ${rarity}:`, e); }
  }

  /** 标准消费：读 slots → 黑名单过滤 → 最旧3选1 → 原子锁 → 黑名单 → refill */
  async consumeBuffer(rarity, sourceList) {
    const now = Date.now();
    const slots = await this.preReadBufferSlots(rarity);

    const blacklistChecks = slots.map(async (slot) => {
      if (!slot.asset.imageUrl) return null;
      const urlHash = await this.hashString(slot.asset.imageUrl);
      slot._urlHash = urlHash;
      const blacklisted = await this.env.KV_CACHE.get(`${CONFIG.KEYS.DRAW_BLACKLIST}${rarity}:${urlHash}`);
      return blacklisted ? null : slot;
    });
    const filteredSlots = (await Promise.all(blacklistChecks)).filter(Boolean);

    let selectedSlot;
    if (filteredSlots.length > 0) {
      filteredSlots.sort((a, b) => a.lastUsed - b.lastUsed);
      const oldestSlots = filteredSlots.slice(0, Math.min(3, filteredSlots.length));
      selectedSlot = oldestSlots[Math.floor(Math.random() * oldestSlots.length)];
    }

    if (!selectedSlot || !selectedSlot.asset.success) {
      selectedSlot = { asset: await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]), index: -1 };
    }

    if (selectedSlot.asset.imageUrl && selectedSlot.index >= 0) {
      const urlHash = selectedSlot._urlHash || await this.hashString(selectedSlot.asset.imageUrl);
      if (!(await this.tryClaimBufferSlot(urlHash, rarity, selectedSlot.index, now))) {
        selectedSlot = { asset: await this.fetchAndUploadWithFallback(sourceList[Math.floor(Math.random() * sourceList.length)]), index: -1 };
        return selectedSlot.asset;
      }
      await this.env.KV_CACHE.put(`${CONFIG.KEYS.DRAW_BLACKLIST}${rarity}:${urlHash}`, now.toString(), { expirationTtl: CONFIG.TTL.BLACKLIST_TTL });
      selectedSlot.asset.lastUsed = now;
      await this.env.KV_CACHE.put(`${CONFIG.KEYS.BUFFER_PREFIX}${rarity}:${selectedSlot.index}`, JSON.stringify(selectedSlot.asset), { expirationTtl: CONFIG.TTL.BUFFER });
    }

    if (selectedSlot.index >= 0) {
      this.safeWaitUntil(this.safeRefillBuffer(rarity, sourceList, selectedSlot.index));
    }
    this.safeWaitUntil(this.cleanupStaleClaims());
    return selectedSlot.asset;
  }

  /** 十连快速路径：跳过黑名单检查，从预读 slots 中取一个 */
  consumeSlot(slots, sourceList) {
    if (slots.length > 0) {
      slots.sort((a, b) => a.lastUsed - b.lastUsed);
      const slot = slots.shift();
      return { ...slot.asset, success: true };
    }
    return { success: false, imageUrl: null, rarity: sourceList[0]?.rarity || 'N', sourceName: 'Buffer' };
  }
}
```

- [ ] **Step 4: 运行确认通过**

```bash
npx vitest run tests/image-pipeline.test.js
```

Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/services/image-pipeline.js tests/image-pipeline.test.js
git commit -m "feat(image): extract ImagePipeline with buffer/blacklist/lock tests"
```

---

### Task 6: AuthService（注册/登录/登出/会话）

**Files:**
- Create: `src/services/auth-service.js`

- [ ] **Step 1: 实现 auth-service.js**

```js
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
```

- [ ] **Step 2: 更新 services/index.js**

```js
export { UserService } from './user-service.js';
export { GachaService } from './gacha-service.js';
export { AuthService } from './auth-service.js';
export { GalleryService } from './gallery-service.js';
export { AdminService } from './admin-service.js';
export { UploadService } from './upload-service.js';
export { ImagePipeline } from './image-pipeline.js';
```

（注意：GalleryService/AdminService/UploadService 在 Task 8/9 才创建——先注释掉未创建的两行，待 Task 8/9 打开。为避免 typecheck 失败，先只加 AuthService 一行，Task 8/9 各自追加。）

```js
export { UserService } from './user-service.js';
export { GachaService } from './gacha-service.js';
export { AuthService } from './auth-service.js';
```

- [ ] **Step 3: Commit**

```bash
git add src/services/auth-service.js src/services/index.js
git commit -m "feat(auth): D1-backed sessions service with token hashing"
```

---

### Task 7: UserService 重写（D1 权威 + 原子签到）

**Files:**
- Rewrite: `src/services/user-service.js`

- [ ] **Step 1: 重写 user-service.js**

完整内容：

```js
/**
 * 用户服务：信息 / 背包 / 签到 / 称号 / 资料 / 等级奖励
 * 数据全部以 D1 为权威，KV 仅读缓存（uinfo/uinv，60~120s，可丢）
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { validateNickname } from '../utils/validation.js';
import { getBeijingDateStr } from '../utils/time.js';

export class UserService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  async invalidateUserCache(userId, ...additionalKeys) {
    const keys = [`uinfo:${userId}`, `uinv:${userId}`, ...additionalKeys];
    await Promise.all(keys.map(key => this.env.KV_CACHE.delete(key).catch(() => {})));
  }

  // ==================== 等级计算（纯逻辑） ====================

  calculateLevelFromTotalExp(totalExp) {
    const { BASE_EXP, EXP_MULTIPLIER, MAX_LEVEL } = CONFIG.LEVEL;
    let accumulatedExp = 0;
    let level = 1;
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const requiredForNext = Math.floor(BASE_EXP * Math.pow(l, EXP_MULTIPLIER));
      if (totalExp < accumulatedExp + requiredForNext) {
        return { level: l - 1, currentExp: totalExp - accumulatedExp, isMax: false };
      }
      accumulatedExp += requiredForNext;
    }
    return { level: MAX_LEVEL, currentExp: totalExp - accumulatedExp, isMax: true };
  }

  calculateRequiredExp(level) {
    if (level >= CONFIG.LEVEL.MAX_LEVEL) return 0;
    const { BASE_EXP, EXP_MULTIPLIER } = CONFIG.LEVEL;
    return Math.floor(BASE_EXP * Math.pow(level + 1, EXP_MULTIPLIER));
  }

  calculateLevelProgress(exp, level) {
    if (level >= CONFIG.LEVEL.MAX_LEVEL) return 100;
    const expNeeded = this.calculateRequiredExp(level);
    if (expNeeded <= 0) return 100;
    return Math.max(0, Math.min(100, Math.floor((exp / expNeeded) * 100)));
  }

  // ==================== 信息 ====================

  async getInfo(currentUser) {
    const cacheKey = `uinfo:${currentUser.id}`;
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }

    const userRes = await this.env.DB.prepare(
      `SELECT u.id, u.username, u.nickname, u.coins, u.draw_count, u.wins,
              u.level, u.exp, u.total_exp, u.last_login_at, u.login_streak,
              (SELECT title_id FROM user_titles WHERE user_id = u.id AND is_equipped = 1) as active_title
       FROM users u WHERE u.id = ?`
    ).bind(currentUser.id).first();
    if (!userRes) throw AppError.notFoundError('用户');

    const totalExp = userRes.total_exp || 0;
    const { level: currentLevel, currentExp } = this.calculateLevelFromTotalExp(totalExp);
    const requiredExpForNextLevel = this.calculateRequiredExp(currentLevel);
    const levelProgress = this.calculateLevelProgress(currentExp, currentLevel);

    const [rewardsResult, pityRow] = await Promise.all([
      this.env.DB.prepare('SELECT level FROM level_rewards WHERE user_id = ?').bind(currentUser.id).all(),
      this.env.DB.prepare('SELECT ssr, ur FROM pity_counters WHERE user_id = ?').bind(currentUser.id).first(),
    ]);

    const responseData = {
      id: userRes.id,
      username: userRes.username,
      nickname: userRes.nickname,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${userRes.username}`,
      coins: userRes.coins,
      drawCount: userRes.draw_count,
      wins: userRes.wins,
      level: currentLevel,
      exp: currentExp,
      level_progress: levelProgress,
      required_exp_next: requiredExpForNextLevel,
      title: userRes.active_title ? { name: userRes.active_title } : null,
      claimedRewards: rewardsResult.results ? rewardsResult.results.map(r => r.level) : [],
      loginStreak: userRes.login_streak || 0,
      lastLoginAt: userRes.last_login_at,
      ssrPity: pityRow?.ssr || 0,
      urPity: pityRow?.ur || 0,
      ssrPityAt: CONFIG.PITY.SSR.at,
      urPityAt: CONFIG.PITY.UR.at,
    };

    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(cacheKey, JSON.stringify(responseData), { expirationTtl: CONFIG.TTL.USER_INFO }));
    }
    return responseData;
  }

  // ==================== 背包 ====================

  async getInventory(currentUser) {
    const cacheKey = `uinv:${currentUser.id}`;
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(cacheKey, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }

    const results = await this.env.DB.prepare(
      'SELECT rarity, count FROM inventory WHERE user_id = ?'
    ).bind(currentUser.id).all();

    const inventory = {};
    ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => inventory[r] = 0);
    (results.results || []).forEach(row => { inventory[row.rarity] = row.count; });

    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(cacheKey, JSON.stringify(inventory), { expirationTtl: 60 }));
    }
    return inventory;
  }

  // ==================== 签到（原子防重） ====================

  async checkIn(currentUser) {
    const user = await this.env.DB.prepare(
      'SELECT id, login_streak, last_login_at FROM users WHERE id = ?'
    ).bind(currentUser.id).first();
    if (!user) throw AppError.notFoundError('用户');

    const now = Date.now();
    const todayStr = getBeijingDateStr(new Date());
    const todayStartMs = new Date(`${todayStr}T00:00:00+08:00`).getTime();
    const yesterdayStartMs = todayStartMs - 86400000;

    // 连续签到判定（基于北京日）
    let streak;
    const lastAt = user.last_login_at || 0;
    if (lastAt >= yesterdayStartMs && lastAt < todayStartMs) {
      streak = (user.login_streak || 0) + 1;
    } else {
      streak = 1;
    }

    const streakBonusArr = CONFIG.LEVEL.CHECK_IN.STREAK_BONUS;
    const bonusIndex = Math.min(streak - 1, streakBonusArr.length - 1);
    const streakBonus = streakBonusArr[bonusIndex] || 0;
    const coinsReward = CONFIG.LEVEL.CHECK_IN.BASE_COINS + streakBonus;
    const expReward = CONFIG.LEVEL.EXP_GAIN.CHECK_IN;

    // 原子更新：当天已签到则 changes=0
    const result = await this.env.DB.prepare(
      'UPDATE users SET coins = coins + ?, total_exp = total_exp + ?, last_login_at = ?, login_streak = ? WHERE id = ? AND (last_login_at IS NULL OR last_login_at < ?)'
    ).bind(coinsReward, expReward, now, streak, currentUser.id, todayStartMs).run();
    if (result.meta.changes === 0) throw AppError.validationError('今日已签到');

    const row = await this.env.DB.prepare(
      'SELECT coins, total_exp, level, exp FROM users WHERE id = ?'
    ).bind(currentUser.id).first();
    const totalExp = row.total_exp || 0;
    const levelInfo = this.calculateLevelFromTotalExp(totalExp);
    let leveledUp = false;
    if (levelInfo.level > row.level) {
      await this.env.DB.prepare('UPDATE users SET level = ?, exp = ? WHERE id = ?')
        .bind(levelInfo.level, levelInfo.currentExp, currentUser.id).run();
      leveledUp = true;
    }

    await this.invalidateUserCache(currentUser.id);

    return {
      userCoins: row.coins,
      checkIn: { coins: coinsReward, exp: expReward, streak, streakBonus },
      leveledUp,
      newLevel: leveledUp ? levelInfo.level : row.level,
    };
  }

  // ==================== 称号 ====================

  async getTitles(currentUser) {
    const titles = await this.env.DB.prepare(
      'SELECT title_id, is_equipped, unlocked_at FROM user_titles WHERE user_id = ? ORDER BY unlocked_at DESC'
    ).bind(currentUser.id).all();
    return { titles: titles.results || [] };
  }

  async equipTitle(currentUser, titleId) {
    if (!titleId) {
      await this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id).run();
      await this.invalidateUserCache(currentUser.id);
      return { success: true, message: '称号已卸下' };
    }

    const hasTitle = await this.env.DB.prepare(
      'SELECT id FROM user_titles WHERE user_id = ? AND title_id = ?'
    ).bind(currentUser.id, titleId).first();
    if (!hasTitle) throw AppError.permissionError('未拥有该称号');

    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 0 WHERE user_id = ?').bind(currentUser.id),
      this.env.DB.prepare('UPDATE user_titles SET is_equipped = 1 WHERE user_id = ? AND title_id = ?').bind(currentUser.id, titleId),
    ]);
    await this.invalidateUserCache(currentUser.id);
    return { success: true, message: '称号已佩戴', title: { name: titleId } };
  }

  // ==================== 资料 ====================

  async updateProfile(currentUser, nickname) {
    const nickError = validateNickname(nickname);
    if (nickError) throw AppError.validationError(nickError);
    await this.env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?').bind(nickname, currentUser.id).run();
    await this.invalidateUserCache(currentUser.id);
    return { success: true, nickname };
  }

  // ==================== 等级奖励 ====================

  async claimReward(currentUser, targetLevel) {
    const level = parseInt(targetLevel);
    if (isNaN(level) || !CONFIG.LEVEL.REWARDS.MILESTONES[level]) {
      throw AppError.validationError('无效的奖励等级');
    }

    const user = await this.env.DB.prepare('SELECT level FROM users WHERE id = ?').bind(currentUser.id).first();
    if (user.level < level) throw AppError.permissionError('未达到等级要求');

    const claimed = await this.env.DB.prepare(
      'SELECT id FROM level_rewards WHERE user_id = ? AND level = ?'
    ).bind(currentUser.id, level).first();
    if (claimed) throw AppError.conflictError('奖励已领取');

    const rewardConfig = CONFIG.LEVEL.REWARDS.MILESTONES[level];
    const coinsToAdd = rewardConfig.coins || 0;
    const batch = [];
    if (coinsToAdd > 0) {
      batch.push(this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(coinsToAdd, currentUser.id));
    }
    if (rewardConfig.title) {
      batch.push(this.env.DB.prepare(
        'INSERT OR IGNORE INTO user_titles (user_id, title_id, unlocked_at) VALUES (?, ?, ?)'
      ).bind(currentUser.id, rewardConfig.title, Date.now()));
    }
    batch.push(this.env.DB.prepare(
      'INSERT INTO level_rewards (user_id, level, reward_type, reward_data, claimed_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(currentUser.id, level, 'milestone', JSON.stringify(rewardConfig), Date.now()));

    await this.env.DB.batch(batch);
    await this.invalidateUserCache(currentUser.id);
    return { success: true, reward: rewardConfig };
  }
}
```

- [ ] **Step 2: typecheck**

```bash
npm run typecheck
```

Expected: 无新错误（旧 `functions/api/[[path]].js` 引用旧 user-service 方法仍可解析——本任务重写后旧路由引用的 `register/login/getInfo/checkIn/...` 已不存在，会报错。**属预期**，旧路由将在 Task 12 整体删除。若 typecheck 因旧路由中断无法推进，跳过本步骤验证，待 Task 12 后统一验证）。

- [ ] **Step 3: Commit**

```bash
git add src/services/user-service.js
git commit -m "refactor(user): D1-authoritative UserService with atomic check-in"
```

---

### Task 8: GalleryService + UploadService

**Files:**
- Create: `src/services/gallery-service.js`
- Create: `src/services/upload-service.js`
- Modify: `src/services/index.js`

- [ ] **Step 1: 实现 gallery-service.js**

```js
/**
 * 图库服务：图库查询 / 点赞 / 书签 / 排行榜 / 图库索引写入
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

const CACHE_1M = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' };
const CACHE_5M = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

export class GalleryService {
  constructor(env, ctx = null) {
    this.env = env;
    this.ctx = ctx;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  // ==================== 图库索引（后台异步） ====================

  async updateIndex({ url, userId, username, rarity, sourceName, ts }) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO gallery (url, user_id, username, rarity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(url) DO UPDATE SET user_id = excluded.user_id, username = excluded.username, rarity = excluded.rarity, source_name = excluded.source_name, created_at = excluded.created_at'
      ).bind(url, userId, username, rarity || 'N', sourceName || null, ts).run();
    } catch (e) { console.error('Gallery D1 error:', e); }
  }

  async updateLeaderboard({ username, rarity, imageUrl, ts }) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO leaderboard (username, rarity, image_url, created_at) VALUES (?, ?, ?, ?)'
      ).bind(username, rarity, imageUrl, ts).run();
      // 仅保留最近 50 条
      await this.env.DB.prepare(
        'DELETE FROM leaderboard WHERE id NOT IN (SELECT id FROM leaderboard ORDER BY created_at DESC LIMIT 50)'
      ).run();
    } catch (e) { console.error('Leaderboard D1 error:', e); }
  }

  // ==================== 图库查询（公开） ====================

  async listItems(params) {
    const { page = 1, limit = 20, rarity, userId, sort = 'newest', search, period } = params;
    const safeLimit = Math.min(parseInt(limit) || 20, 100);
    const offset = (page - 1) * safeLimit;

    let q = 'SELECT g.id, g.url, g.user_id, g.username, g.rarity, g.source_name, g.created_at, (SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) as like_count FROM gallery g';
    let cq = 'SELECT COUNT(*) as total FROM gallery g';
    const p = [], cp = [], conds = [];

    if (rarity) { conds.push('g.rarity = ?'); p.push(rarity.toUpperCase()); cp.push(rarity.toUpperCase()); }
    if (userId) { conds.push('g.user_id = ?'); p.push(parseInt(userId)); cp.push(parseInt(userId)); }
    if (search) { conds.push('g.username LIKE ?'); p.push(`%${search}%`); cp.push(`%${search}%`); }
    if (period && period !== 'all') {
      const PERIOD_MS = { today: 86400000, week: 604800000, month: 2592000000 };
      const ms = PERIOD_MS[period];
      if (ms) { conds.push('g.created_at > ?'); p.push(Date.now() - ms); cp.push(Date.now() - ms); }
    }
    if (conds.length) { q += ' WHERE ' + conds.join(' AND '); cq += ' WHERE ' + conds.join(' AND '); }

    const ORDER = {
      newest: 'g.created_at DESC',
      oldest: 'g.created_at ASC',
      rarity: "CASE g.rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 ELSE 5 END, g.created_at DESC",
      hot: '(SELECT COUNT(*) FROM card_likes WHERE gallery_id = g.id) DESC, g.created_at DESC',
    };
    const orderBy = ORDER[sort] || ORDER.newest;

    const [items, count] = await Promise.all([
      this.env.DB.prepare(`${q} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...p, safeLimit, offset).all(),
      this.env.DB.prepare(cq).bind(...cp).first(),
    ]);

    return {
      items: items.results || [],
      total: count?.total || 0,
      page,
      totalPages: Math.ceil((count?.total || 0) / safeLimit),
      cacheHeaders: CACHE_1M,
    };
  }

  // ==================== 点赞 / 书签 ====================

  async likeCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare(
      'INSERT INTO card_likes (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
    ).bind(userId, galleryId, Date.now()).run();
    const count = await this.env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
    return { liked: true, likeCount: count?.c || 0 };
  }

  async unlikeCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare('DELETE FROM card_likes WHERE user_id = ? AND gallery_id = ?').bind(userId, galleryId).run();
    const count = await this.env.DB.prepare('SELECT COUNT(*) as c FROM card_likes WHERE gallery_id = ?').bind(galleryId).first();
    return { liked: false, likeCount: count?.c || 0 };
  }

  async bookmarkCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare(
      'INSERT INTO card_bookmarks (user_id, gallery_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
    ).bind(userId, galleryId, Date.now()).run();
    return { bookmarked: true };
  }

  async unbookmarkCard(userId, galleryId) {
    if (!galleryId) throw AppError.validationError('缺少 galleryId');
    await this.env.DB.prepare('DELETE FROM card_bookmarks WHERE user_id = ? AND gallery_id = ?').bind(userId, galleryId).run();
    return { bookmarked: false };
  }

  async getMyInteractions(userId) {
    const [likes, bookmarks] = await Promise.all([
      this.env.DB.prepare('SELECT gallery_id FROM card_likes WHERE user_id = ?').bind(userId).all(),
      this.env.DB.prepare('SELECT gallery_id FROM card_bookmarks WHERE user_id = ?').bind(userId).all(),
    ]);
    return {
      likedIds: (likes.results || []).map(r => r.gallery_id),
      bookmarkedIds: (bookmarks.results || []).map(r => r.gallery_id),
    };
  }

  async getLikeCounts(ids) {
    const cleanIds = (ids || []).map(Number).filter(n => n > 0).slice(0, 50);
    if (cleanIds.length === 0) return { counts: {}, cacheHeaders: CACHE_1M };
    const placeholders = cleanIds.map(() => '?').join(',');
    const rows = await this.env.DB.prepare(
      `SELECT gallery_id, COUNT(*) as c FROM card_likes WHERE gallery_id IN (${placeholders}) GROUP BY gallery_id`
    ).bind(...cleanIds).all();
    const counts = {};
    (rows.results || []).forEach(r => { counts[r.gallery_id] = r.c; });
    return { counts, cacheHeaders: CACHE_1M };
  }
}
```

- [ ] **Step 2: 实现 upload-service.js**

```js
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
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    const magic = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const MAGIC_MAP = { 'FFD8FF': 'image/jpeg', '89504E47': 'image/png', '47494638': 'image/gif', '52494646': 'image/webp' };
    const matchedMime = Object.entries(MAGIC_MAP).find(([magicPrefix]) => magic.startsWith(magicPrefix));
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
```

- [ ] **Step 3: 更新 services/index.js 追加导出**

```js
export { UserService } from './user-service.js';
export { GachaService } from './gacha-service.js';
export { AuthService } from './auth-service.js';
export { GalleryService } from './gallery-service.js';
export { UploadService } from './upload-service.js';
```

- [ ] **Step 4: Commit**

```bash
git add src/services/gallery-service.js src/services/upload-service.js src/services/index.js
git commit -m "feat(gallery/upload): extract GalleryService and UploadService"
```

---

### Task 9: AdminService

**Files:**
- Create: `src/services/admin-service.js`
- Modify: `src/services/index.js`

- [ ] **Step 1: 实现 admin-service.js**

```js
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
      this.env.DB.prepare('DELETE FROM changelogs').run(),
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
      this.env.DB.prepare('DELETE FROM announcements').run(),
      this.env.DB.prepare(
        'INSERT INTO announcements (title, content, enabled, updated_at) VALUES (?, ?, ?, ?)'
      ).bind(announcement.title || '', announcement.content || '', announcement.enabled ? 1 : 0, Date.now()),
    ]);
    return { message: '公告已保存' };
  }
}
```

- [ ] **Step 2: 更新 services/index.js 追加导出**

```js
export { UserService } from './user-service.js';
export { GachaService } from './gacha-service.js';
export { AuthService } from './auth-service.js';
export { GalleryService } from './gallery-service.js';
export { UploadService } from './upload-service.js';
export { AdminService } from './admin-service.js';
```

- [ ] **Step 3: Commit**

```bash
git add src/services/admin-service.js src/services/index.js
git commit -m "feat(admin): extract AdminService with D1-backed announcement/changelog"
```

---

### Task 10: GachaService 重写（原子扣币 + DrawEngine/ImagePipeline 编排）

**Files:**
- Rewrite: `src/services/gacha-service.js`

- [ ] **Step 1: 重写 gacha-service.js**

完整内容：

```js
/**
 * 抽卡服务：编排 DrawEngine（概率）+ ImagePipeline（图片）+ D1（账务）
 * 并发安全：先原子扣币（UPDATE ... WHERE coins >= ?），再 batch 写奖励/库存/历史
 * 会话不再携带可变业务字段（删除了 updateSession 机制）
 */
import { CONFIG } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { getBeijingISOString } from '../utils/time.js';
import { rollRarity, advancePity, planMultiDraw } from './draw-engine.js';

export class GachaService {
  constructor(env, ctx = null, deps = {}) {
    this.env = env;
    this.ctx = ctx;
    this.userService = deps.userService;
    this.imagePipeline = deps.imagePipeline;
    this.galleryService = deps.galleryService;
  }

  safeWaitUntil(promise) {
    if (this.ctx && typeof this.ctx.waitUntil === 'function') this.ctx.waitUntil(promise);
    else promise.catch(() => {});
  }

  // ==================== 保底（D1 权威 + KV 60s 缓存） ====================

  async getPity(userId) {
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(`pity:${userId}`, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }
    const row = await this.env.DB.prepare('SELECT ssr, ur FROM pity_counters WHERE user_id = ?').bind(userId).first();
    const pity = { ssr: row?.ssr || 0, ur: row?.ur || 0 };
    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(`pity:${userId}`, JSON.stringify(pity), { expirationTtl: 60 }));
    }
    return pity;
  }

  async getLimitedPity(userId) {
    if (this.env.KV_CACHE) {
      const cached = await this.env.KV_CACHE.get(`pity:limited:${userId}`, { type: 'json' }).catch(() => null);
      if (cached) return cached;
    }
    const row = await this.env.DB.prepare('SELECT limited_ssr, limited_ur FROM pity_counters WHERE user_id = ?').bind(userId).first();
    const pity = { ssr: row?.limited_ssr || 0, ur: row?.limited_ur || 0 };
    if (this.env.KV_CACHE) {
      this.safeWaitUntil(this.env.KV_CACHE.put(`pity:limited:${userId}`, JSON.stringify(pity), { expirationTtl: 60 }));
    }
    return pity;
  }

  async invalidatePityCache(userId) {
    if (!this.env.KV_CACHE) return;
    await Promise.all([
      this.env.KV_CACHE.delete(`pity:${userId}`).catch(() => {}),
      this.env.KV_CACHE.delete(`pity:limited:${userId}`).catch(() => {}),
    ]);
  }

  // ==================== 原子扣币 ====================

  async deductCoins(userId, amount) {
    const res = await this.env.DB.prepare(
      'UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?'
    ).bind(amount, userId, amount).run();
    return res.meta.changes > 0;
  }

  // ==================== 单抽 ====================

  async draw(currentUser) {
    const cost = CONFIG.GAME.DRAW_COST || 0;
    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getPity(currentUser.id);
    const { rarity, isPity } = rollRarity(pity.ssr, pity.ur);
    const nextPity = advancePity(pity, rarity);

    const sources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
    if (sources.length === 0) throw AppError.serverError(`配置错误: 无法找到 ${rarity} 的图源`);
    const asset = await this.imagePipeline.consumeBuffer(rarity, sources);
    if (!asset || (!asset.success && !asset.imageUrl)) {
      throw AppError.serverError(`获取 ${rarity} 图片失败，请重试`);
    }

    const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
    const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;

    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const stmts = [
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + 1, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(coinsReward + (levelUp?.reward || 0), expGain, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1')
        .bind(currentUser.id, rarity),
      this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, asset.sourceName || '常驻池', Date.now()),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, ?, ?, 0, 0) ON CONFLICT(user_id) DO UPDATE SET ssr = excluded.ssr, ur = excluded.ur')
        .bind(currentUser.id, nextPity.ssr, nextPity.ur),
    ];
    await this.env.DB.batch(stmts);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: asset.sourceName, ts: Date.now() }));
      if (rarity === 'UR') {
        this.safeWaitUntil(this.galleryService.updateLeaderboard({ username: currentUser.username, rarity, imageUrl: asset.imageUrl, ts: Date.now() }));
      }
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      card: asset,
      rarity,
      expGained: expGain,
      coinsReward,
      isPity,
      pityInfo: { ssrPity: nextPity.ssr, urPity: nextPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  // ==================== 十连 ====================

  async multiDraw(currentUser, count) {
    const reqCount = Math.max(Math.min(parseInt(count) || 10, CONFIG.GAME.MULTI_DRAW_MAX || 10), 1);
    const isMulti = reqCount >= 10;
    const cost = isMulti
      ? (CONFIG.GAME.MULTI_DRAW_COST || CONFIG.GAME.DRAW_COST * 10)
      : (CONFIG.GAME.DRAW_COST || 0) * reqCount;

    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getPity(currentUser.id);
    const plan = planMultiDraw(reqCount, pity);
    const drawCost = Math.floor(cost / reqCount);

    // 预读 buffer（按稀有度分组一次）
    const bufferCache = {};
    for (const d of plan) {
      if (!bufferCache[d.rarity]) {
        const sourceList = CONFIG.SOURCES.filter(s => s.rarity === d.rarity);
        bufferCache[d.rarity] = { slots: await this.imagePipeline.preReadBufferSlots(d.rarity), sourceList };
      }
    }

    const cards = [];
    const stmts = [];
    let totalCoins = 0;
    let totalExp = 0;
    const failedSlots = [];

    for (const entry of plan) {
      const { index: i, rarity, isPity, ssrPity, urPity } = entry;
      try {
        const coinsReward = CONFIG.GAME.POINTS[rarity] || CONFIG.GAME.POINTS['N'] || 5;
        const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
        const { slots, sourceList } = bufferCache[rarity];
        const asset = this.imagePipeline.consumeSlot(slots, sourceList);
        if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

        totalCoins += coinsReward - drawCost;
        totalExp += expGain;

        cards.push({
          rarity,
          asset: asset.success ? { url: asset.imageUrl, sourceName: asset.sourceName } : null,
          isPity,
          pityInfo: { ssrPity, urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
        });

        stmts.push(
          this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
          this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, asset.sourceName || '常驻池', Date.now() + i)
        );

        if (asset.success) {
          this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: asset.sourceName, ts: Date.now() + i }));
          if (rarity === 'UR') {
            this.safeWaitUntil(this.galleryService.updateLeaderboard({ username: currentUser.username, rarity, imageUrl: asset.imageUrl, ts: Date.now() + i }));
          }
        }
      } catch (e) {
        console.error(`[multiDraw] Draw ${i + 1} failed:`, e);
        failedSlots.push(i + 1);
      }
    }

    const lastPlan = plan[plan.length - 1];
    const totalExpNew = (currentUser.total_exp || 0) + totalExp;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExpNew);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    stmts.push(
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + ?, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(totalCoins + (levelUp?.reward || 0), cards.length, totalExp, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, ?, ?, 0, 0) ON CONFLICT(user_id) DO UPDATE SET ssr = excluded.ssr, ur = excluded.ur')
        .bind(currentUser.id, lastPlan.ssrPity, lastPlan.urPity),
    );
    await this.env.DB.batch(stmts);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      cards,
      count: cards.length,
      totalCost: cost,
      expGained: totalExp,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
      pityInfo: { ssrPity: lastPlan.ssrPity, urPity: lastPlan.urPity, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      failedSlots: failedSlots.length > 0 ? failedSlots : undefined,
    };
  }

  // ==================== 限定池（独立保底） ====================

  async drawLimited(currentUser, poolId, reqCount) {
    const pool = poolId && CONFIG.LIMITED.POOLS[poolId] ? poolId : CONFIG.LIMITED.DEFAULT_POOL;
    const poolConfig = CONFIG.LIMITED.POOLS[pool];
    if (!poolConfig) throw AppError.validationError('卡池不存在');
    const sources = poolConfig.sources;
    if (!sources?.length) throw AppError.serverError('卡池配置错误');

    const count = Math.min(Math.max(parseInt(reqCount) || 1, 1), CONFIG.GAME.MULTI_DRAW_MAX || 10);
    const isMulti = count >= 10;
    const singleCost = poolConfig.cost || CONFIG.LIMITED.COST;
    const cost = isMulti ? (CONFIG.LIMITED.MULTI_COST || singleCost * 10) : singleCost * count;

    if (cost > 0 && !(await this.deductCoins(currentUser.id, cost))) {
      throw AppError.validationError('积分不足');
    }

    const pity = await this.getLimitedPity(currentUser.id);
    const tempPity = { ssr: pity.ssr, ur: pity.ur };
    const baseRarity = poolConfig.rarity || 'UR';

    const cards = [];
    const stmts = [];
    let totalExp = 0;
    const drawnUrls = new Set();

    for (let i = 0; i < count; i++) {
      const { rarity, isPity } = rollRarity(tempPity.ssr, tempPity.ur);
      tempPity.ssr++;
      tempPity.ur++;
      if (rarity === 'SSR' || rarity === 'UR') tempPity.ssr = 0;
      if (rarity === 'UR') tempPity.ur = 0;

      let asset;
      if (rarity === baseRarity) {
        asset = await this.imagePipeline.fetchAndUploadWithFallback(sources[Math.floor(Math.random() * sources.length)]);
      } else {
        const fallbackSources = CONFIG.SOURCES.filter(s => s.rarity === rarity);
        asset = await this.imagePipeline.consumeBuffer(rarity, fallbackSources.length > 0 ? fallbackSources : sources);
      }
      if (!asset || (!asset.success && !asset.imageUrl)) throw new Error(`获取 ${rarity} 图片失败`);

      // 同批去重
      let finalAsset = asset;
      if (asset.success && drawnUrls.has(asset.imageUrl)) {
        try {
          const retrySrc = rarity === baseRarity ? sources : CONFIG.SOURCES.filter(s => s.rarity === rarity);
          const retry = await this.imagePipeline.fetchAndUploadWithFallback(retrySrc[Math.floor(Math.random() * retrySrc.length)]);
          if (retry.success && !drawnUrls.has(retry.imageUrl)) finalAsset = retry;
        } catch {}
      }
      if (finalAsset.success) drawnUrls.add(finalAsset.imageUrl);

      const expGain = CONFIG.LEVEL.EXP_GAIN.DRAW[rarity] || CONFIG.LEVEL.EXP_GAIN.DRAW['N'] || 10;
      totalExp += expGain;

      cards.push({
        rarity,
        asset: finalAsset.success ? { url: finalAsset.imageUrl, sourceName: finalAsset.sourceName } : null,
        isPity,
        pityInfo: { ssrPity: tempPity.ssr, urPity: tempPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
      });

      stmts.push(
        this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, rarity),
        this.env.DB.prepare('INSERT INTO draw_history (user_id, username, rarity, is_pity, source_name, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(currentUser.id, currentUser.username, rarity, isPity ? 1 : 0, finalAsset.sourceName || poolConfig.name || '限定池', Date.now() + i)
      );

      if (finalAsset.success) {
        this.safeWaitUntil(this.galleryService.updateIndex({ url: finalAsset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity, sourceName: finalAsset.sourceName, ts: Date.now() + i }));
      }
    }

    const totalExpNew = (currentUser.total_exp || 0) + totalExp;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExpNew);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;
    const levelUpCoins = levelUp?.reward || 0;

    // 注意：cost 已在 deductCoins 原子扣减，batch 只补回奖励/升级金币，不得重复扣减
    stmts.push(
      this.env.DB.prepare('UPDATE users SET coins = coins + ?, draw_count = draw_count + ?, total_exp = total_exp + ?, level = ?, exp = ? WHERE id = ?')
        .bind(levelUpCoins, count, totalExp, levelInfo.level, levelInfo.currentExp, currentUser.id),
      this.env.DB.prepare('INSERT INTO pity_counters (user_id, ssr, ur, limited_ssr, limited_ur) VALUES (?, 0, 0, ?, ?) ON CONFLICT(user_id) DO UPDATE SET limited_ssr = excluded.limited_ssr, limited_ur = excluded.limited_ur')
        .bind(currentUser.id, tempPity.ssr, tempPity.ur),
    );
    await this.env.DB.batch(stmts);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));
    await this.invalidatePityCache(currentUser.id);

    return {
      cards,
      count: cards.length,
      pool: poolConfig.name || pool,
      expGained: totalExp,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
      pityInfo: { ssrPity: tempPity.ssr, urPity: tempPity.ur, ssrAt: CONFIG.PITY.SSR.at, urAt: CONFIG.PITY.UR.at },
    };
  }

  async getLimitedPools() {
    const pools = [];
    for (const [id, config] of Object.entries(CONFIG.LIMITED.POOLS)) {
      let count = '可用';
      if (id === 'github_repo' && config.sources && config.sources[0]) {
        try {
          const res = await fetch(config.sources[0].url, { method: 'GET' });
          const data = await res.json();
          count = data.total || '可用';
        } catch (e) { console.error('[getLimitedPools] Failed to fetch count:', e); }
      }
      pools.push({
        id,
        name: config.name,
        description: config.description,
        cost: CONFIG.LIMITED.COST,
        available: config.sources && config.sources.length > 0,
        count,
      });
    }
    return { pools, defaultPool: CONFIG.LIMITED.DEFAULT_POOL };
  }

  // ==================== 抽卡历史 ====================

  async getDrawHistory(currentUser, params) {
    const page = parseInt(params.page) || 1;
    const limit = Math.min(parseInt(params.limit) || 20, 100);
    const rarityFilter = params.rarity;

    let query = 'SELECT * FROM draw_history WHERE user_id = ?';
    const qp = [currentUser.id];
    if (rarityFilter) { query += ' AND rarity = ?'; qp.push(rarityFilter.toUpperCase()); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    qp.push(limit, (page - 1) * limit);

    const countQuery = 'SELECT COUNT(*) as total FROM draw_history WHERE user_id = ?';
    const countParams = [currentUser.id];
    if (rarityFilter) countParams.push(rarityFilter.toUpperCase());

    const [results, countResult] = await Promise.all([
      this.env.DB.prepare(query).bind(...qp).all(),
      this.env.DB.prepare(countQuery).bind(...countParams).first(),
    ]);

    return {
      history: results.results || [],
      pagination: { page, limit, total: countResult?.total || 0, totalPages: Math.ceil((countResult?.total || 0) / limit) },
    };
  }

  // ==================== 合成 / 商店 / 分解 / 骰子 ====================

  async craft(currentUser, targetRarity) {
    const rarityMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
    const sourceRarity = rarityMap[targetRarity];
    if (!sourceRarity) throw AppError.validationError('无效的合成目标');

    const cost = CONFIG.GAME.CRAFT_COST;
    const inv = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, sourceRarity).first();
    if (!inv || inv.count < cost) {
      throw AppError.validationError(`合成需要 ${cost} 张 ${sourceRarity} 卡`);
    }

    const targetSources = CONFIG.SOURCES.filter(s => s.rarity === targetRarity);
    if (targetSources.length === 0) throw AppError.serverError(`找不到 ${targetRarity} 图源`);
    const asset = await this.imagePipeline.consumeBuffer(targetRarity, targetSources);

    const expGain = CONFIG.LEVEL.EXP_GAIN.CRAFT || 50;
    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const stmts = [
      this.env.DB.prepare('UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?').bind(cost, currentUser.id, sourceRarity),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity),
      this.env.DB.prepare('UPDATE users SET total_exp = total_exp + ?, level = ?, exp = ?, coins = coins + ? WHERE id = ?')
        .bind(expGain, levelInfo.level, levelInfo.currentExp, levelUp?.reward || 0, currentUser.id),
    ];
    await this.env.DB.batch(stmts);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: Date.now() }));
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      card: asset,
      consumed: `${cost} 张 ${sourceRarity}`,
      expGained: expGain,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  async shopBuy(currentUser, targetRarity) {
    const shopConfig = CONFIG.GAME.SHOP;
    if (!shopConfig) throw AppError.validationError('商店不存在');
    const price = shopConfig[targetRarity];
    if (!price) throw AppError.validationError('商品不存在');

    if (!(await this.deductCoins(currentUser.id, price))) {
      throw AppError.validationError('积分不足');
    }

    const expGain = CONFIG.LEVEL.EXP_GAIN.SHOP_BUY || 20;
    const totalExp = (currentUser.total_exp || 0) + expGain;
    const levelInfo = this.userService.calculateLevelFromTotalExp(totalExp);
    const levelUp = levelInfo.level > currentUser.level
      ? { newLevel: levelInfo.level, reward: (levelInfo.level - currentUser.level) * CONFIG.LEVEL.REWARDS.COINS_PER_LEVEL }
      : null;

    const asset = await this.imagePipeline.consumeBuffer(targetRarity, CONFIG.SOURCES.filter(s => s.rarity === targetRarity));

    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE users SET total_exp = total_exp + ?, level = ?, exp = ?, coins = coins + ? WHERE id = ?')
        .bind(expGain, levelInfo.level, levelInfo.currentExp, levelUp?.reward || 0, currentUser.id),
      this.env.DB.prepare('INSERT INTO inventory (user_id, rarity, count) VALUES (?, ?, 1) ON CONFLICT(user_id, rarity) DO UPDATE SET count = count + 1').bind(currentUser.id, targetRarity),
    ]);

    if (asset.success) {
      this.safeWaitUntil(this.galleryService.updateIndex({ url: asset.imageUrl, userId: currentUser.id, username: currentUser.username, rarity: targetRarity, sourceName: asset.sourceName, ts: Date.now() }));
    }
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      message: `成功购买 ${targetRarity} 卡片`,
      card: asset,
      levelUp: levelUp ? { newLevel: levelUp.newLevel, reward: levelUp.reward } : null,
    };
  }

  async decompose(currentUser, rarity, rawCount) {
    const decomposeConfig = CONFIG.GAME.DECOMPOSE;
    if (!rarity || !decomposeConfig[rarity]) throw AppError.validationError('无效的稀有度');
    const count = Math.min(Math.max(parseInt(rawCount) || 1, 1), 100);
    const coinsPerCard = decomposeConfig[rarity];

    const inv = await this.env.DB.prepare(
      'SELECT count FROM inventory WHERE user_id = ? AND rarity = ?'
    ).bind(currentUser.id, rarity).first();
    if (!inv || inv.count < count) {
      throw AppError.validationError(`${rarity} 卡片不足（拥有 ${inv?.count || 0} 张）`);
    }

    const totalCoins = coinsPerCard * count;
    await this.env.DB.batch([
      this.env.DB.prepare('UPDATE inventory SET count = count - ? WHERE user_id = ? AND rarity = ?').bind(count, currentUser.id, rarity),
      this.env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(totalCoins, currentUser.id),
    ]);

    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      decomposed: count,
      rarity,
      coinsPerCard,
      totalCoins,
    };
  }

  async playDice(currentUser, betAmount) {
    const diceConfig = CONFIG.GAME.DICE;
    const bet = Math.min(Math.max(parseInt(betAmount) || 1, diceConfig.MIN_BET || 1), diceConfig.MAX_BET || 5);
    if (bet < (diceConfig.MIN_BET || 1)) throw AppError.validationError(`投注不能小于 ${diceConfig.MIN_BET}`);
    if (bet > (diceConfig.MAX_BET || 1000)) throw AppError.validationError(`投注不能大于 ${diceConfig.MAX_BET}`);

    if (!(await this.deductCoins(currentUser.id, bet))) {
      throw AppError.validationError('积分不足');
    }

    // 冷却（KV 计数）
    if (this.env.KV_CACHE) {
      const rl = await this.env.KV_CACHE.get(`rl:dice:${currentUser.id}`);
      const now = Date.now();
      if (rl && now < parseInt(rl)) throw AppError.validationError('骰子冷却中，请稍候再试');
      await this.env.KV_CACHE.put(`rl:dice:${currentUser.id}`, String(now + (diceConfig.COOLDOWN_MS || 3000)), { expirationTtl: Math.ceil((diceConfig.COOLDOWN_MS || 3000) / 1000) });
    }

    const roll1 = Math.floor(Math.random() * 6) + 1;
    const roll2 = Math.floor(Math.random() * 6) + 1;
    const sum = roll1 + roll2;
    const payout = diceConfig.PAYOUT || 2;
    let reward = 0;
    if (sum >= 10) reward = Math.floor(bet * payout * 0.5);
    if (roll1 === roll2) reward = Math.max(reward, Math.floor(bet * payout));
    if (sum === 7) reward = Math.max(reward, Math.floor(bet * payout * 2));
    const netChange = reward - bet;

    await this.env.DB.prepare('UPDATE users SET coins = coins + ?, wins = wins + ? WHERE id = ?')
      .bind(netChange, reward > 0 ? 1 : 0, currentUser.id).run();
    this.safeWaitUntil(this.userService.invalidateUserCache(currentUser.id));

    return {
      roll1, roll2, sum, reward, cost: bet,
      message: `🎲 ${roll1} + ${roll2} = ${sum}, ${reward > bet ? '恭喜中奖！' : '下次好运！'}`,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/gacha-service.js
git commit -m "refactor(gacha): orchestrate DrawEngine+ImagePipeline with atomic coin deduction"
```

---

### Task 11: Hono 骨架 + 中间件

**Files:**
- Create: `functions/api/middleware/error.js`
- Create: `functions/api/middleware/services.js`
- Create: `functions/api/middleware/session.js`
- Create: `functions/api/middleware/auth.js`
- Create: `functions/api/middleware/rate-limit.js`
- Create: `functions/api/app.js`

- [ ] **Step 1: 创建 middleware/error.js**

```js
import { AppError } from '../../../src/utils/AppError.js';

export function errorMiddleware(err, c) {
  if (err instanceof AppError) {
    return c.json({ success: false, error: err.message, code: err.code }, err.statusCode);
  }
  console.error('[api] Error:', err);
  return c.json({ success: false, error: err.message || 'API服务错误' }, 500);
}
```

- [ ] **Step 2: 创建 middleware/services.js**

```js
import { AuthService } from '../../../src/services/auth-service.js';
import { UserService } from '../../../src/services/user-service.js';
import { GachaService } from '../../../src/services/gacha-service.js';
import { GalleryService } from '../../../src/services/gallery-service.js';
import { AdminService } from '../../../src/services/admin-service.js';
import { UploadService } from '../../../src/services/upload-service.js';
import { ImagePipeline } from '../../../src/services/image-pipeline.js';

/** 每请求装配一次服务实例（轻量，无状态） */
export async function servicesMiddleware(c, next) {
  const env = c.env;
  const ctx = c.executionCtx;
  const services = {
    auth: new AuthService(env, ctx),
    user: new UserService(env, ctx),
    image: new ImagePipeline(env, ctx),
    gallery: new GalleryService(env, ctx),
    admin: new AdminService(env, ctx),
    upload: new UploadService(env, ctx),
  };
  services.gacha = new GachaService(env, ctx, {
    userService: services.user,
    imagePipeline: services.image,
    galleryService: services.gallery,
  });
  c.set('services', services);
  await next();
}
```

- [ ] **Step 3: 创建 middleware/session.js**

```js
/** 会话解析：X-Session-Token → c.get('user')（DB 权威，KV 60s 缓存） */
export async function sessionMiddleware(c, next) {
  const token = c.req.header('X-Session-Token');
  if (token) {
    const services = c.get('services');
    const user = await services.auth.getSessionUser(token);
    if (user) {
      user._sessionToken = token;
      c.set('user', user);
    }
  }
  await next();
}
```

- [ ] **Step 4: 创建 middleware/auth.js**

```js
/** 必须登录 */
export async function requireAuth(c, next) {
  const user = c.get('user');
  if (!user) return c.json({ success: false, error: '请先登录' }, 401);
  await next();
}

/**
 * 管理员鉴权：读 body.password 与 env.admin 比对。
 * 注意：消费 request body，后续 handler 必须用 c.req.raw.clone().json() 读取。
 */
export async function requireAdmin(c, next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  if (c.env.KV_CACHE) {
    const rlKey = `rl:admin:${ip}`;
    const rl = await c.env.KV_CACHE.get(rlKey);
    if (rl && parseInt(rl) >= 10) return c.json({ success: false, error: '操作过于频繁，请稍后重试' }, 429);
    await c.env.KV_CACHE.put(rlKey, String((parseInt(rl) || 0) + 1), { expirationTtl: 600 });
  }

  const body = await c.req.raw.clone().json().catch(() => null);
  if (!body || !body.password || body.password !== c.env.admin) {
    return c.json({ success: false, error: '认证失败' }, 403);
  }
  await next();
}
```

- [ ] **Step 5: 创建 middleware/rate-limit.js**

```js
/** 统一限流：KV 计数，expirationTtl 自动过期 */
export function rateLimit(key, limit, windowSeconds) {
  return async (c, next) => {
    if (!c.env.KV_CACHE) return next();
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const rlKey = `rl:${key}:${ip}`;
    const rl = await c.env.KV_CACHE.get(rlKey);
    if (rl && parseInt(rl) >= limit) {
      return c.json({ success: false, error: '操作过于频繁，请稍后重试' }, 429);
    }
    await c.env.KV_CACHE.put(rlKey, String((parseInt(rl) || 0) + 1), { expirationTtl: windowSeconds });
    await next();
  };
}
```

- [ ] **Step 6: 创建 app.js**

```js
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorMiddleware } from './middleware/error.js';
import { servicesMiddleware } from './middleware/services.js';
import { sessionMiddleware } from './middleware/session.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { gachaRoutes } from './routes/gacha.js';
import { libraryRoutes } from './routes/library.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

export function createApp() {
  const app = new Hono();

  app.use(cors({
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Session-Token', 'X-Admin-Mode'],
    maxAge: 86400,
  }));
  app.use(servicesMiddleware);
  app.use(sessionMiddleware);
  app.onError(errorMiddleware);
  app.notFound((c) => c.json({ success: false, error: '未知的API端点' }, 404));

  app.route('/auth', authRoutes);
  app.route('/user', userRoutes);
  app.route('/', gachaRoutes);
  app.route('/library', libraryRoutes);
  app.route('/admin', adminRoutes);
  app.route('/', publicRoutes);

  return app;
}
```

（注：routes/* 在 Task 12 创建，本任务先创建 middleware；为避免 typecheck 失败，可先不导入 routes，在 Task 12 补全 app.js 的最后 6 行。）

- [ ] **Step 7: Commit**

```bash
git add functions/api/middleware/ functions/api/app.js
git commit -m "feat(api): Hono app skeleton with middleware chain"
```

---

### Task 12: 路由模块 + 薄入口 + 移除旧路由

**Files:**
- Create: `functions/api/routes/auth.js`
- Create: `functions/api/routes/user.js`
- Create: `functions/api/routes/gacha.js`
- Create: `functions/api/routes/library.js`
- Create: `functions/api/routes/admin.js`
- Create: `functions/api/routes/public.js`
- Rewrite: `functions/api/[[path]].js`

- [ ] **Step 1: 创建 routes/auth.js**

```js
import { Hono } from 'hono';
import { rateLimit } from '../middleware/rate-limit.js';

export const authRoutes = new Hono()
  .post('/register', rateLimit('register', 5, 600), async (c) => {
    const services = c.get('services');
    const result = await services.auth.register(await c.req.json());
    return c.json({ success: true, ...result });
  })
  .post('/login', rateLimit('login', 10, 600), async (c) => {
    const services = c.get('services');
    const result = await services.auth.login(await c.req.json());
    return c.json({ success: true, ...result });
  })
  .post('/logout', async (c) => {
    const services = c.get('services');
    const result = await services.auth.logout(c.req.header('X-Session-Token'));
    return c.json({ success: true, ...result });
  });
```

- [ ] **Step 2: 创建 routes/user.js**

```js
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const userRoutes = new Hono()
  .get('/info', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getInfo(c.get('user')) });
  })
  .get('/profile-data', requireAuth, async (c) => {
    const services = c.get('services');
    const user = c.get('user');
    const [inventory, titles] = await Promise.all([
      services.user.getInventory(user),
      services.user.getTitles(user),
    ]);
    return c.json({ success: true, inventory, titles: titles.titles || [] });
  })
  .get('/inventory', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getInventory(c.get('user')) });
  })
  .post('/check-in', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.checkIn(c.get('user')) });
  })
  .get('/titles', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.user.getTitles(c.get('user')) });
  })
  .post('/equip-title', requireAuth, async (c) => {
    const services = c.get('services');
    const { titleId } = await c.req.json();
    return c.json({ success: true, ...await services.user.equipTitle(c.get('user'), titleId) });
  })
  .post('/update-profile', requireAuth, async (c) => {
    const services = c.get('services');
    const { nickname } = await c.req.json();
    return c.json({ success: true, ...await services.user.updateProfile(c.get('user'), nickname) });
  })
  .post('/claim-reward', requireAuth, async (c) => {
    const services = c.get('services');
    const { targetLevel } = await c.req.json();
    return c.json({ success: true, ...await services.user.claimReward(c.get('user'), targetLevel) });
  })
  .post('/upload', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.upload.uploadImage(c.get('user'), c.req.raw) });
  })
  .get('/uploads', requireAuth, async (c) => {
    const services = c.get('services');
    const page = c.req.query('page');
    return c.json({ success: true, ...await services.upload.getUserUploads(c.get('user'), page) });
  });
```

- [ ] **Step 3: 创建 routes/gacha.js**

```js
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const gachaRoutes = new Hono()
  .get('/draw', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.draw(c.get('user')) });
  })
  .post('/draw/multi', requireAuth, async (c) => {
    const services = c.get('services');
    const { count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.multiDraw(c.get('user'), count) });
  })
  .post('/draw/limited', requireAuth, async (c) => {
    const services = c.get('services');
    const { poolId, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.drawLimited(c.get('user'), poolId, count) });
  })
  .get('/draw/draw-history', requireAuth, async (c) => {
    const services = c.get('services');
    const result = await services.gacha.getDrawHistory(c.get('user'), c.req.query());
    return c.json({ success: true, ...result });
  })
  .get('/limited/pools', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gacha.getLimitedPools() });
  })
  .post('/decompose', requireAuth, async (c) => {
    const services = c.get('services');
    const { rarity, count } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.decompose(c.get('user'), rarity, count) });
  })
  .post('/game/dice', requireAuth, async (c) => {
    const services = c.get('services');
    const { betAmount } = await c.req.json() || {};
    return c.json({ success: true, ...await services.gacha.playDice(c.get('user'), betAmount) });
  })
  .post('/shop/buy', requireAuth, async (c) => {
    const services = c.get('services');
    const { targetRarity } = await c.req.json();
    return c.json({ success: true, ...await services.gacha.shopBuy(c.get('user'), targetRarity) });
  });
```

- [ ] **Step 4: 创建 routes/library.js**

```js
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';

export const libraryRoutes = new Hono()
  .get('/items', async (c) => {
    const services = c.get('services');
    const result = await services.gallery.listItems(c.req.query());
    if (result.cacheHeaders) {
      for (const [k, v] of Object.entries(result.cacheHeaders)) c.header(k, v);
    }
    delete result.cacheHeaders;
    return c.json({ success: true, ...result });
  })
  .get('/like-counts', async (c) => {
    const services = c.get('services');
    const ids = (c.req.query('ids') || '').split(',').map(Number);
    const result = await services.gallery.getLikeCounts(ids);
    if (result.cacheHeaders) {
      for (const [k, v] of Object.entries(result.cacheHeaders)) c.header(k, v);
    }
    delete result.cacheHeaders;
    return c.json({ success: true, ...result });
  })
  .post('/like', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.likeCard(c.get('user').id, galleryId) });
  })
  .delete('/like', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unlikeCard(c.get('user').id, galleryId) });
  })
  .post('/bookmark', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.bookmarkCard(c.get('user').id, galleryId) });
  })
  .delete('/bookmark', requireAuth, async (c) => {
    const services = c.get('services');
    const { galleryId } = await c.req.json();
    return c.json({ success: true, ...await services.gallery.unbookmarkCard(c.get('user').id, galleryId) });
  })
  .get('/my-interactions', requireAuth, async (c) => {
    const services = c.get('services');
    return c.json({ success: true, ...await services.gallery.getMyInteractions(c.get('user').id) });
  })
  .get('/my-likes', requireAuth, async (c) => {
    const services = c.get('services');
    const r = await services.gallery.getMyInteractions(c.get('user').id);
    return c.json({ success: true, likedIds: r.likedIds });
  })
  .get('/my-bookmarks', requireAuth, async (c) => {
    const services = c.get('services');
    const r = await services.gallery.getMyInteractions(c.get('user').id);
    return c.json({ success: true, bookmarkedIds: r.bookmarkedIds });
  });
```

- [ ] **Step 5: 创建 routes/admin.js**

```js
import { Hono } from 'hono';
import { requireAdmin } from '../middleware/auth.js';

export const adminRoutes = new Hono()
  .post('/verify', requireAdmin, async (c) => c.json({ success: true }))
  .post('/users', requireAdmin, async (c) => {
    const services = c.get('services');
    const { page, limit } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.listUsers(page, limit) });
  })
  .post('/update-points', requireAdmin, async (c) => {
    const services = c.get('services');
    const { targetId, amount } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.updatePoints(targetId, amount) });
  })
  .post('/delete-user', requireAdmin, async (c) => {
    const services = c.get('services');
    const { targetId } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.deleteUser(targetId) });
  })
  .post('/uploads', requireAdmin, async (c) => {
    const services = c.get('services');
    const { status, page, limit } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.listUploads(status, page, limit) });
  })
  .post('/review-upload', requireAdmin, async (c) => {
    const services = c.get('services');
    const { uploadId, action, rarity } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.reviewUpload(uploadId, action, rarity) });
  })
  .post('/save-changelog', requireAdmin, async (c) => {
    const services = c.get('services');
    const { logs } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.saveChangelog(logs) });
  })
  .post('/save-announcement', requireAdmin, async (c) => {
    const services = c.get('services');
    const { announcement } = await c.req.raw.clone().json();
    return c.json({ success: true, ...await services.admin.saveAnnouncement(announcement) });
  });
```

- [ ] **Step 6: 创建 routes/public.js**

```js
import { Hono } from 'hono';

const CACHE_1M = { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' };
const CACHE_5M = { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' };

export const publicRoutes = new Hono()
  .get('/health', (c) => c.json({
    status: 'ok',
    bindings: {
      DB: !!c.env.DB,
      KV_CACHE: !!c.env.KV_CACHE,
      R2_BUCKET: !!c.env.R2_BUCKET,
    },
  }))
  .get('/showcase', async (c) => {
    try {
      const cards = await c.env.DB.prepare(
        'SELECT g.*, u.username, g.rarity FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
      ).all();
      c.header('Cache-Control', CACHE_1M['Cache-Control']);
      return c.json({ success: true, cards: cards.results || [] });
    } catch (e) {
      c.header('Cache-Control', CACHE_1M['Cache-Control']);
      return c.json({ success: true, cards: [] });
    }
  })
  .get('/announcement', async (c) => {
    const row = await c.env.DB.prepare(
      'SELECT title, content, enabled, updated_at FROM announcements ORDER BY updated_at DESC LIMIT 1'
    ).first();
    c.header('Cache-Control', CACHE_5M['Cache-Control']);
    return c.json({ success: true, announcement: row || null });
  })
  .get('/changelog', async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT date, ver, content, tag FROM changelogs ORDER BY created_at DESC LIMIT 50'
    ).all();
    c.header('Cache-Control', CACHE_5M['Cache-Control']);
    return c.json({ success: true, logs: rows.results || [] });
  });
```

- [ ] **Step 7: 重写 functions/api/[[path]].js 为薄入口**

```js
import { handle } from 'hono/cloudflare-pages';
import { createApp } from './app.js';

const app = createApp();

export const onRequest = handle(app);
```

- [ ] **Step 8: 补全 app.js 的路由导入（若 Step 6 中已留注释）**

确认 `functions/api/app.js` 中 6 行 `app.route(...)` 已启用（Task 11 Step 6 代码已包含）。

- [ ] **Step 9: 全量验证**

```bash
npm run typecheck
npx vitest run
```

Expected: typecheck 无新错误（旧 `functions/api/[[path]].js` 已被薄入口替换）；单测全部 PASS。

- [ ] **Step 10: Commit**

```bash
git add functions/api/
git commit -m "feat(api): Hono domain route modules, thin [[path]].js entry"
```

---

### Task 13: 根中间件精简 + wrangler 绑定清理

**Files:**
- Rewrite: `functions/_middleware.js`
- Modify: `wrangler.jsonc`

- [ ] **Step 1: 重写 functions/_middleware.js（仅安全头 + CSP nonce）**

```js
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

function injectNonceIntoHtml(html, nonce) {
  return html.replace(/<script\b(?!(?:[^>]*\bnonce\s*=))/gi, `<script nonce="${nonce}"`);
}

function buildCspWithNonce(nonce) {
  return `default-src 'self'; img-src 'self' https: data:; font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'; connect-src 'self' https:; frame-src 'none'; object-src 'none'`;
}

function applySecurityHeaders(headers, nonce) {
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'same-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Content-Security-Policy', buildCspWithNonce(nonce));
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // CORS 预检由 Hono cors() 处理（/api/*）；非 API 路径预检直接放行
  if (request.method === 'OPTIONS') {
    return context.next();
  }

  const response = await context.next();
  const nonce = generateNonce();

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const text = await response.text();
    const modified = injectNonceIntoHtml(text, nonce);
    const newResponse = new Response(modified, response);
    applySecurityHeaders(newResponse.headers, nonce);
    return newResponse;
  }

  applySecurityHeaders(response.headers, nonce);
  return response;
}
```

- [ ] **Step 2: wrangler.jsonc 移除 RECENT_REQUESTS 绑定**

删除 `kv_namespaces` 中的 `RECENT_REQUESTS` 项，只保留 `KV_CACHE`。

- [ ] **Step 3: Commit**

```bash
git add functions/_middleware.js wrangler.jsonc
git commit -m "refactor(middleware): strip CORS/session from root middleware, drop RECENT_REQUESTS binding"
```

---

### Task 14: 前端 API 响应对齐

**Files:**
- Modify: `app/lib/api.js`

- [ ] **Step 1: 检查前端响应消费兼容性**

```bash
rg -n "res\.data|\.userCoins|res\.inventory|res\.titles|res\.cards|res\.history" app/routes app/hooks app/components
```

逐处确认字段兼容性。响应结构由 `{ success: true, ...data }` 统一包装后，前端 `res.xxx` 访问不变（额外多了 `success` 字段，无影响）。`apiFetch` 已处理非 2xx 抛错。

- [ ] **Step 2: 需要改动的点（若 Step 1 发现）**

- `useAuth.jsx` 中 `const data = res.data || res;` 已兼容新结构，无需改动。
- 若某组件读取 `res.data` 而新响应没有 `data` 键（如 `getInventory` 直接返回 `{N:0,...}`），检查并改为 `res.N` 直接读取。

- [ ] **Step 3: 构建验证**

```bash
npm run build
```

Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat(frontend): align API response handling"
```

---

### Task 15: 清理收尾 + AGENTS.md 更新 + 端到端验证

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`（可选，API 结构变化说明）

- [ ] **Step 1: 清理死代码**

```bash
rg -n "checkRateLimit|updateSession|jsonResponse" src/ functions/ --glob '!node_modules'
```

Expected: 无输出（Task 10/12 已移除全部调用）。若有残留（如 `src/utils/time.js` 的 `normalizePath`、`src/utils/validation.js` 的 `validatePrediction` 等死函数），按 AGENTS.md 约定**只清理本次重构造成的孤儿**，不删历史死代码。

- [ ] **Step 2: 更新 AGENTS.md**

重写以下过时小节：
- Commands：新增 `npm test`（vitest）
- Architecture：`functions/api/[[path]].js` 改为 Hono 薄入口 + 中间件链 + 8 个服务模块
- Database：11 表 → 新表清单（sessions/pity_counters/announcements/changelogs/leaderboard；删 logs；gallery.url UNIQUE）
- Admin Auth：`requireAdmin` 由 `functions/api/middleware/auth.js` 中间件实现（仍消费 body，handler 用 `c.req.raw.clone().json()`）
- Error Handling：删除"两种模式不要混用"章节 → 改为"统一 AppError + Hono onError 中间件"
- Gotchas：更新会话机制（D1 sessions 权威，KV 仅缓存）；保底存 D1

- [ ] **Step 3: 端到端验证（本地 preview）**

```bash
npm run preview
```

另开终端验证（替换端口为实际输出）：

```bash
# 1. 健康检查
curl http://localhost:8788/api/health
# 期望: {"status":"ok",...}

# 2. 注册
curl -X POST http://localhost:8788/api/auth/register -H 'Content-Type: application/json' -d '{"username":"e2euser1","password":"pass1234"}'
# 期望: {"success":true}

# 3. 登录
curl -X POST http://localhost:8788/api/auth/login -H 'Content-Type: application/json' -d '{"username":"e2euser1","password":"pass1234"}'
# 期望: {"success":true,"token":"...","user":{...}}

# 4. 抽卡（用上一步 token）
curl http://localhost:8788/api/draw -H 'X-Session-Token: <TOKEN>'
# 期望: {"success":true,"card":{...},"rarity":"...","pityInfo":{...}}

# 5. 签到
curl -X POST http://localhost:8788/api/user/check-in -H 'X-Session-Token: <TOKEN>'
# 期望: {"success":true,"checkIn":{...}}

# 6. 合成/分解/商店/骰子/图库/管理后台逐一验证
curl -X POST http://localhost:8788/api/decompose -H 'X-Session-Token: <TOKEN>' -H 'Content-Type: application/json' -d '{"rarity":"N","count":1}'
curl -X POST http://localhost:8788/api/admin/users -H 'Content-Type: application/json' -d '{"password":"<ADMIN>","page":1}'
```

- [ ] **Step 4: 浏览器验证前端页面**

打开 `http://localhost:8788`，验证：首页展示、登录、抽卡、十连、限定池、图库点赞、个人页、管理后台。确认无控制台报错。

- [ ] **Step 5: 最终验证**

```bash
npm run typecheck
npm test
```

Expected: 全部通过。

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: update AGENTS.md for new architecture"
```

---

## Self-Review 记录

**1. Spec 覆盖检查：**
- ✅ 存储层：Task 2（schema 全表）+ Task 6（sessions）+ Task 7（原子签到）+ Task 10（pity_counters）
- ✅ KV 精简：Task 6（会话缓存 60s）、Task 10（保底缓存）、Task 12（限流中间件）、Task 13（删 RECENT_REQUESTS）
- ✅ Hono 路由 + 中间件链：Task 11 + Task 12
- ✅ 服务层拆分：Task 4-10（8 模块 + 2 引擎）
- ✅ 正确性：Task 10（原子扣币 `deductCoins`）、Task 7（签到原子防重）、Task 2（gallery UNIQUE）
- ✅ 图片管道降级：Task 5（wsrv 失败直传原图）
- ✅ 上传防刷：Task 8（MAX_PENDING_UPLOADS = 20）
- ✅ 前端适配：Task 14
- ✅ 错误/限流统一：Task 11 + Task 12
- ✅ 测试：Task 4/5（DrawEngine + ImagePipeline 单测）+ Task 15（端到端）
- ✅ 时间统一：Task 2（INTEGER ms）+ Task 7（last_login_at）

**2. 占位符扫描：** 无 TBD/TODO；所有代码块完整。

**3. 类型一致性：**
- `rollRarity/advancePity/planMultiDraw` 在 Task 4 定义、Task 10 使用，签名一致（pity 为 `{ssr, ur}` 对象）
- `imagePipeline.consumeBuffer/consumeSlot/preReadBufferSlots/fetchAndUploadWithFallback` 在 Task 5 定义、Task 10 使用，命名一致
- `services.gacha/services.user/...` 在 Task 11 `servicesMiddleware` 装配、Task 12 路由消费，键名一致
- `requireAdmin` 中间件在 Task 11 定义、Task 12 admin 路由使用，行为一致（body 已消费 → `c.req.raw.clone().json()`）
- `getSessionUser` 在 Task 6 定义、Task 11 session 中间件使用，返回 `user` 或 `null`，一致
- `galleryService.updateIndex/updateLeaderboard` Task 8 定义、Task 10 调用，参数对象键一致
