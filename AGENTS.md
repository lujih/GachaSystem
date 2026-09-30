# AGENTS.md — Chouka Gacha System

Remix v2 SPA on Cloudflare Pages. React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova). D1 (SQLite), KV, R2. API 层使用 Hono。

## Commands

```bash
npm run dev          # vite HMR
npm run build        # remix vite:build → build/server/ + build/client/
npm run typecheck    # tsc (noEmit via tsconfig — 静态检查；源码多为 .js 且缺 JSDoc，实际覆盖面有限)
npm test             # vitest run（draw-engine / image-pipeline / economy-invariants / gacha-service / gallery-and-errors）
npm run test:integration  # tests/integration 裸 Node 冒烟脚本（需先 npm run build && npm run start）
npm run deploy       # npm run build && wrangler pages deploy ./build/client
npm run start        # wrangler pages dev ./build/client (SSR after build)
npm run preview      # npm run build && wrangler pages dev ./build/client
```

- D1 migration: `npx wrangler d1 execute chouka --remote --file=./schema.sql`
- `.npmrc`: `legacy-peer-deps=true` (shadcn compat)
- `.dev.vars` (gitignored，模板见 `.dev.vars.example`): `admin`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`
- `wrangler.jsonc`: `nodejs_compat` flag required；**Pages 项目用 `pages_build_output_dir`，不要用 `assets.directory`**——后者会让 `wrangler deploy` 产出不含 `functions/` 的 no-op Worker
- `vitest.config.mts` 独立于 `vite.config.ts`（不加载 Remix 插件，且排除 `tests/integration/`——那些是裸 Node 脚本，被默认 include 捕获会让 `npm test` 恒为红）
- 不要再往 `vite.config.ts` 的 remix 插件加 `serverBuildPath`：Vite 插件只解析 `buildDirectory` / `serverBuildFile`，该键会被静默忽略并使 tsc 报 TS2353

## Architecture

```
Browser → Cloudflare Pages
  /api/* → functions/_middleware.js（安全头）→ functions/api/[[path]].js（hono handle 薄入口）
           → Hono 中间件链（cors → services → session → 路由）
  /*     → functions/_middleware.js → functions/[[path]].js (Remix SSR)
```

- **functions/api/app.js 装配**：`createApp()` = `cors()`（allowHeaders 含 X-User-ID / X-Session-Token / X-Admin-Mode）+ `servicesMiddleware` + `sessionMiddleware` + `onError` + `notFound` + 6 个路由模块（auth / user / gacha `/` / library / admin / public），basePath `/api`。
- **中间件**：`functions/api/middleware/` — `error.js`（AppError → `{ success: false, error, code }`；非 AppError 一律回 `INTERNAL_ERROR` + 通用文案，**不回吐 `err.message`**，否则 D1 的表名/列名/约束名会泄露）、`services.js`（注入 7 个服务到 `c.get('services')`，并调用 `applyEnv(env)`）、`session.js`（X-Session-Token → `c.get('user')`）、`auth.js`（requireAuth / requireAdmin）、`rate-limit.js`。
- **服务层 8 模块**（`src/services/`）：auth-service / user-service / gacha-service / draw-engine（纯函数）/ image-pipeline / gallery-service / admin-service / upload-service。**实际实例化点是 `functions/api/middleware/services.js`**（`src/services/index.js` 是零引用的死文件）。
- **配置注入**：`src/config/index.js` 的 `CONFIG` 在模块加载期以空 env 固化；`applyEnv(env)` 必须在每请求开始时调用（servicesMiddleware 已调），否则 `R2_DOMAIN` / `GITHUB_*` 的环境变量覆盖会**静默失效**并回落到 `technical.js` 的硬编码值。
- **请求流约定**：服务返回数据对象或抛 `AppError`，路由层统一 `{ success: true, ...data }` 包装；错误由 onError 中间件统一 `{ success: false, error, code }`。服务层不直接返回 HTTP 响应。
- **`functions/_middleware.js`**：CORS preflight、安全头（XFO、nosniff、Referrer-Policy、Permissions-Policy 等；**未实现 HSTS**）、CSP。nonce 在渲染**前**生成，经 `context.data.nonce` → `[[path]].js` 的 `getLoadContext` 透传 → root loader → `<Scripts nonce>`。**不要改回「用正则给所有 `<script>` 补 nonce」**——那是 OWASP 点名的反模式，会让注入的 XSS 脚本也自动拿到合法 nonce。`script-src` 中的 `'unsafe-inline'` 已移除（存在 nonce 时按 CSP 规范本就被忽略）。API 会话解析已在 Hono 层，根中间件不再处理 session。
- **SSR loader 拿不到用户身份**：`context.data` 里**只有** `_middleware.js` 写入的 `nonce`，没有 `currentUser`。会话 token 存在 localStorage，服务端 request 上没有该头，因此 loader 无法鉴权。用户维度数据（如「我的抽卡/书签」）必须走客户端 API，见 `/api/library/my-items`（`listMyItems` 强制以会话身份覆盖调用方传入的 `userId`，防越权）。
- **Frontend**：8 routes under `app/routes/`. Path alias `~` → `app/`. Tailwind v4 (`@tailwindcss/vite` plugin, no `tailwind.config.js`). shadcn components in `app/components/ui/`. API client `app/lib/api.js` 自动附加 `X-Session-Token`。

## Database（D1 权威存储，15 表）

- 核心：`users` / `sessions`（token 仅存 SHA-256 哈希）/ `pity_counters`（保底）/ `gallery`（url UNIQUE）/ `inventory` / `draw_history` / `level_rewards` / `user_titles` / `user_uploads` / `card_likes` / `card_bookmarks` / `buffer_claims` / `announcements` / `changelogs` / `leaderboard`
- 时间戳统一 INTEGER ms（`Date.now()`）；`STRICT` mode，外键级联删除（D1 默认强制，无需 PRAGMA）
- KV 仅 4 类（全部可丢）：图片 buffer（`sys:buffer:*`）/ 抽卡黑名单（`sys:draw:blacklist:*`）/ 限流（`rl:*`）/ 读缓存（uinfo/uinv/session/pity，60s TTL）
- 图库去重：`gallery.url UNIQUE` + `ON CONFLICT(url) DO UPDATE`

## 关键机制（重点）

- **原子扣币**：`UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?` + `meta.changes` 检查（`gacha-service.js` 的 `deductCoins`），并发安全
- **失败退款**：取图失败 `refundCoins`；multiDraw 失败槽位退款；drawLimited 循环失败全退
- **保底**：`pity_counters` 表（常驻 ssr/ur + 限定 limited_ssr/limited_ur 列），upsert 用 `CASE WHEN excluded.x = 0 THEN 0 ELSE MAX(x, excluded.x) END`（重置恒胜）
- **会话**：`sessions` 表权威，token 仅存 SHA-256 哈希（`sha256Hex`），KV 60s 缓存可丢；登出删 DB 行 + 缓存
- **全局 buffer 并发**：`buffer_claims` 表 `INSERT ON CONFLICT DO NOTHING` 作原子分布式锁（按 URL hash），防止并发重复分发。**单抽（`consumeBuffer`）与十连快路径（`consumeSlot`）都必须走这把锁 + 黑名单 + refill**——历史上十连路径完全跳过，导致同一张图并发发给多人。refill 仅在 `selectedSlot.index >= 0` 时触发，避免 `sys:buffer:UR:-1` 脏 key。
- **经济数值**：`CARD_VALUE`（`business.js`）是**分解返还**的单一数据源；抽卡即时金币 = `CARD_VALUE × DRAW_COIN_RATIO(0.3)`，前端经 `/api/rarities` 取权威值，不要在前端硬编码副本。**关键不变式：`E[CARD_VALUE] × (1 + DRAW_COIN_RATIO) < DRAW_COST`**（当前 78 < 100）——抽卡同时给金币和卡，只断言 `E[CARD_VALUE] < DRAW_COST` 会漏掉一半收入，历史上正是这样漏判导致刷币回路未闭合。骰子 `DICE.PAYOUT` 同理，`reward = bet * PAYOUT * 0.5 * mult`。均有不变式测试（`tests/economy-invariants.test.js`），**改数值前先跑**。
- **draw-engine** 为纯函数模块：抽卡概率/保底计算无副作用，可单测（`tests/draw-engine.test.js`）。注意软保底会把 SSR/UR 实际产出率显著抬高（实测 8.3%/2.2% vs 基础 4%/1%），**按基础概率做经济测算会算错**。

## Admin Auth（重要！）

- `requireAdmin` 中间件（`functions/api/middleware/auth.js`）**消费 request body** 读取 `body.password` 与 `env.admin` **常量时间**比对（`timingSafeEqual`，异或累积不提前返回）；不通过则 403 `认证失败`。`env.admin` 未配置时 fail-closed 直接拒绝。内置限流 `rl:admin:{ip}` 10次/10min/IP（429）——**只计失败尝试**：成功请求不写入计数，否则管理员本人操作 10 次就会被自己锁住 10 分钟。
- **admin 路由 handler 从 `c.get('adminBody')` 读取字段**（requireAdmin 已解析 body 并存入 context，body 流已消费无法二次读取）：

```js
app.post('/users', requireAdmin, async (c) => {
  const { page, limit } = c.get('adminBody');
  ...
});
```

- 管理员凭据：`env.admin`（secret，小写 a）

## Error Handling & Validation

- 统一 `AppError`（`src/utils/AppError.js`：`validationError` / `authError` / `permissionError` / `notFoundError` / `conflictError` / `serverError` 等静态工厂）+ Hono `onError` 中间件
- 校验：`src/utils/validation.js`（validators 返回 `null` 或错误串，不抛异常）；用户消息中文
- **Gotcha**：`validatePrediction`（`src/utils/validation.js`）目前是**零调用的死代码**，骰子端点根本不收 `prediction` 字段。改动前请先确认它是否还需要保留。
- 密码：PBKDF2-SHA256 100k 迭代（`src/utils/password.js`），存储 `saltBase64:hashBase64`；明文密码兼容：登录返回 `'migrated'` 触发重哈希

## 已知限制（Gotchas）

- 会话缓存 60s 携带可变字段（coins/level），展示值可能陈旧 60s；货币正确性由原子扣币保证
- D1 batch 是原子事务（官方语义）；单条语句 auto-commit
- craft/decompose 库存 read-then-write 有 TOCTOU 竞态（CHECK count >= 0 兜底）
- KV 限流计数 TOCTOU（可接受）
- `wrangler.jsonc` 的 `database_id` / KV id 为占位符 `local-dev`（本地 wrangler 4.86 校验空字符串会崩溃）——**部署前必须替换为真实 id**（Cloudflare Dashboard 获取）
- **干净克隆 / CI 里 `wrangler pages dev` 会自建一个空的 D1（一张表都没有）**：`/library` 直接 500、`/api/admin/users` 也不可用。必须先 `npx wrangler d1 execute chouka --local --file=./schema.sql`。本地开发因为 `.wrangler/state` 里已有建表数据而掩盖了这一点，**只有干净环境会暴露**——CI 的 `runtime-smoke` job 就是为此存在，且已固化这一步。
- wsrv.nl 图片压缩代理是第三方依赖，失败时降级直传原图
- 前端 `app/lib/api.js` 自动附加 `X-Session-Token`（localStorage，XSS 风险已知，暂无对策）
- 上传校验（`/user/upload`）：双 MIME 检查（浏览器 file.type + magic bytes）、扩展名白名单（.jpg/.png/.gif/.webp）、`validateRarity`

## Rarity Configs（两套独立）

| Source | Location | Shape |
|--------|----------|-------|
| Frontend | `app/lib/rarity.js` | Tailwind classes（bg/border/text/dot/gradient/glow）+ 辅助函数（`rarityBg` 等） |
| Backend | `src/config/constants.js` | Hex 字符串：`RARITY_COLORS = { N: '#64748B', ... }` |

## Environment

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER` (default `lujih`), `GITHUB_REPO` (default `chouka-images`), `R2_DOMAIN`. Bindings: D1 `DB`, KV `KV_CACHE`, R2 `R2_BUCKET`.

## 技术配置（`src/config/`）

- `business.js`：概率/保底/费用/奖励数值（`CARD_VALUE` 为卡牌价值单一数据源）
- `technical.js`（注意：不是 `technichal`）：KV key（仅 `BUFFER_PREFIX`、`DRAW_BLACKLIST`）与 TTL
- `constants.js`：HTTP 状态、`RARITY_COLORS`
- `index.js`：`CONFIG` 汇总出口 + `mergeConfig` / `applyEnv` / `validateConfig`
