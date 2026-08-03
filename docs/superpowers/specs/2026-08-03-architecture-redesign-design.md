# 系统架构与存储架构重新设计 Spec

**日期**: 2026-08-03
**状态**: 待审核
**方案**: Hono 路由 + 领域拆分 + D1 权威存储（方案 A）

---

## 背景与目标

现有系统（Remix v2 SPA on Cloudflare Pages）存在四类问题：

1. **正确性隐患**
   - 并发扣币 TOCTOU：先 SELECT 检查余额 → 再 DB.batch 扣减，双请求可同时通过检查
   - 会话一致性：KV session 快照携带可变业务字段（coins/level），并发操作 last-write-wins 互相覆盖
   - 保底计数器存 KV 且 TTL 仅 7 天，长期玩家进度丢失
   - `gallery.url` 无 UNIQUE 约束但使用 `ON CONFLICT(url)`，图库去重失效、无限膨胀
2. **可维护性**
   - 353 行 if-else 单体路由（`functions/api/[[path]].js`）
   - GachaService 1070 行 / UserService 525 行大而全
   - 两套错误模式并存（`jsonResponse` 内联 vs `AppError`）
   - 两套限流实现并存（内联 login/register/admin vs `checkRateLimit`）
   - `logs` 表从未写入；`errorHandler`/`AppError` 定义了未使用
3. **存储职责混乱**：KV 同时充当会话/保底/缓存/锁/内容（公告/日志/排行榜）五重角色，无权威源
4. **时间格式混乱**：INTEGER ms 与 ISO 字符串混用（`created_at` vs `last_login_date`）

已确认的约束决策：
- 现网数据**可推倒重建**，无需迁移兼容
- **允许引入新依赖**（hono、zod 等）
- 改动范围：**后端为主 + 前端适配**（`app/lib/api.js` 及少量调用处）

## 方案（已确认）

**D1 权威 + KV 精简 + Hono 路由 + 领域拆分。**

## 存储层设计

### D1 Schema 重构（schema.sql 重写）

| 表 | 变更 | 解决问题 |
|---|---|---|
| `users` | 保留；时间戳统一 INTEGER ms；`last_login_at INTEGER` 替代 `last_login_date`（签到判断查询时用 `getBeijingDateStr` 计算）；`CHECK(coins >= 0)` 兜底 | 负币 / 时间格式混乱 |
| `sessions` | **新增**：`id, token_hash UNIQUE, user_id, created_at, expires_at, last_seen_at`；token 仅存 SHA-256 哈希 | KV 会话 → D1 权威，消除 last-write-wins |
| `pity_counters` | **新增**：`user_id PK, ssr, ur, limited_ssr, limited_ur` | 保底 7 天 KV 过期丢失 |
| `gallery` | `url` 加 **UNIQUE**；时间戳 INTEGER ms | 图库去重失效（配合现有 `ON CONFLICT(url)`） |
| `announcements` | **新增**：`id, title, content, enabled, updated_at` | KV 内容存储 → D1 |
| `changelogs` | **新增**：`id, date, ver, content, tag, created_at` | 同上 |
| `leaderboard` | **新增**：`id, username, rarity, image_url, created_at`（替代 RECENT_REQUESTS KV） | KV 职责收窄 |
| `logs` | **删除**（从未写入） | 清理死表 |
| `inventory` / `draw_history` / `user_titles` / `level_rewards` / `user_uploads` / `card_likes` / `card_bookmarks` / `buffer_claims` | 保留（`buffer_claims` 机制正确） | — |

删除 schema.sql 顶部 `PRAGMA foreign_keys = ON;`（D1 默认强制外键，见规范依据）。

### KV 精简后职责（仅 4 类，全部可丢）

```
KV_CACHE:
  图片 buffer     sys:buffer:{rarity}:{slot}
  黑名单          sys:draw:blacklist:{rarity}:{urlHash}
  限流计数        rl:{key}（expirationTtl 自动过期）
  读缓存          uinfo:{id} / uinv:{id} / pity 缓存 / session 缓存（DB 为权威，缓存可丢）
RECENT_REQUESTS:  删除（排行榜进 D1）
R2:               不变（抽卡图 + 玩家上传）
```

### 时间统一

所有表时间戳统一 `INTEGER ms`（`Date.now()`）。签到/每日判断仅在查询时用 `getBeijingDateStr` 计算，删除 `last_login_date` ISO 字符串字段。

## API 层设计（Hono）

### 目录结构

```
functions/
  _middleware.js            仅保留：CSP nonce 注入、安全头（CORS 全部移交 hono/cors）
  [[path]].js               不变：Remix SSR 入口
  api/
    [[path]].js             薄入口：export const onRequest = handle(app)
    app.js                  Hono app 装配：中间件链 + 挂载领域路由
    middleware/
      session.js            会话解析（KV 缓存读 → D1 sessions 兜底 → c.set('user')）
      auth.js               鉴权中间件（必须登录 / requireAdmin）
      rate-limit.js         统一限流（KV 计数，替代三处内联）
      error.js              全局错误处理（AppError → 标准 JSON）
    routes/
      auth.js               /auth/*
      user.js               /user/*（含 /user/profile-data）
      gacha.js              /draw /decompose /game /shop /limited
      library.js            /library/*（公开 + 互动）
      admin.js              /admin/*
      public.js             /showcase /announcement /changelog /library/items /health
```

### 集成方式（官方规范）

```js
// functions/api/[[path]].js
import { handle } from 'hono/cloudflare-pages';
import { app } from './app.js';
export const onRequest = handle(app);
```

- `handle(app)` 把 Pages `eventContext`（含 `data`/`env`/`waitUntil`）注入为 `c.env.eventContext`；会话解析在 Hono 中间件内完成（不再依赖 Pages `api/_middleware.js`）
- 中间件链：`cors()` → 错误处理 → 会话解析 → 路由级鉴权/限流 → handler

### 响应与错误统一

- 服务层返回**数据对象**或抛 `AppError`；错误中间件统一包装为 `{ success, error }` + 状态码
- 成功响应统一 `{ success: true, ...data }`
- 删除服务内直接 `jsonResponse()` 的旧模式

## 服务层拆分

| 模块 | 文件 | 职责 |
|---|---|---|
| AuthService | `src/services/auth-service.js` | register / login / logout / session 生命周期（从 user-service 抽出） |
| UserService | `src/services/user-service.js` | info / inventory / check-in / titles / equip / profile / claim-reward / 等级计算 |
| GachaService | `src/services/gacha-service.js` | 仅编排：draw / multiDraw / drawLimited / craft / shopBuy / decompose / playDice |
| DrawEngine | `src/services/draw-engine.js` | 纯函数：概率、软/硬保底、十连计划（无 I/O，可单测） |
| ImagePipeline | `src/services/image-pipeline.js` | fetchAndUpload / 压缩 / R2 / buffer 消费 / 黑名单 / buffer_claims 锁 |
| GalleryService | `src/services/gallery-service.js` | 图库查询 / 点赞 / 书签 / 排行榜（从 router 内联 SQL 抽出） |
| AdminService | `src/services/admin-service.js` | 用户管理 / 上传审核 / 公告 / 日志 |
| UploadService | `src/services/upload-service.js` | 玩家上传 / 我的上传列表（从 gacha-service 抽出） |

规模目标：每服务 < 300 行；不建 Repository 层（YAGNI，服务内直接 SQL）。

## 正确性机制

| 问题 | 修复 |
|---|---|
| 并发扣币 | 先原子扣减 `UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?`（检查 `meta.changes`，0 → 余额不足）→ 再 batch 写入奖励/库存/历史 |
| 会话一致性 | sessions 表权威（token 哈希）；每请求 D1 查证（KV 缓存 60s 加速，miss 兜底 D1）；会话不携带可变业务字段 |
| 保底过期 | pity_counters 表 + KV 读缓存（写后失效） |
| 图库去重 | `gallery.url UNIQUE` 兜底；图库索引保持后台异步（`waitUntil`），不阻塞抽卡事务 |
| 限流统一 | `rateLimit(key, limit, window)` 中间件 |
| 错误统一 | AppError → 全局错误中间件；删除 jsonResponse 双模式 |
| 上传防刷 | 每用户待审核上限（如 20 条） |

## 图片管道重构

- buffer 机制（KV slots + 黑名单 + buffer_claims D1 锁）封装进 `ImagePipeline`
- `fetchAndUploadWithFallback` / `fetchAndUpload` / `hashString` / `consumeSlot` / `preReadBufferSlots` 移入 ImagePipeline
- 新增降级：wsrv.nl 压缩失败时直接上传原图（当前失败即整抽失败）
- 限定池主卡仍实时拉取，但复用 ImagePipeline

## 前端适配

- `app/lib/api.js`：响应结构对齐（`{ success, ...data }` 统一包装）
- 少量调用处适配字段名；`useAuth`/`useGacha` 逻辑不变
- 其余路由组件零改动

## 规范依据（Cloudflare 官方文档核对）

| 设计点 | 官方规范 |
|---|---|
| D1 batch 原子性 | `batch()` 是 SQL 事务，任一语句失败整体回滚（d1/worker-api） |
| D1 外键 | 默认强制（等同 `PRAGMA foreign_keys=on`），每条查询在隐式事务中执行 |
| 单条语句原子性 | auto-commit，条件 UPDATE 是标准原子扣减 |
| Hono × Pages | `hono/cloudflare-pages` 的 `handle(app)` 导出 `onRequest`（honojs/hono 官方适配器，`c.env.eventContext` 访问 Pages context） |
| Pages 中间件 | `functions/_middleware.js` 导出 `onRequest` 数组可链式；`cors()` 用 hono/cors 替代手写 |

## 测试与验证

- `DrawEngine` 纯函数单测：概率分布、软/硬保底边界（UR at 80 / SSR at 15）、十连保底序列
- `ImagePipeline` 单测：buffer 消费、黑名单、锁冲突降级（mock KV/D1）
- 无测试框架现状 → 引入 vitest（依赖允许引入）；`npm run test`
- 端到端验证：`npm run preview` 后跑通注册→登录→抽卡→签到→合成→分解→管理员审核全链路
- `npm run typecheck` 必须通过

## 实施阶段建议

| 阶段 | 内容 | 验证 |
|---|---|---|
| 1. 存储与基础设施 | 重写 schema.sql（新表/约束）、引入依赖（hono/zod/vitest）、`functions/api/` 新目录骨架 | D1 本地迁移 + typecheck |
| 2. 服务层 | DrawEngine / ImagePipeline 抽取 + 单测；Auth/User/Gallery/Admin/Upload/Gacha 服务重写 | vitest 通过 |
| 3. 路由层 | Hono app + 中间件链 + 6 个路由模块接入服务；删除旧 `[[path]].js` 单体逻辑 | preview 全链路 |
| 4. 前端适配 + 收尾 | `app/lib/api.js` 响应对齐、清理死代码（logs/errorHandler/旧限流）、更新 AGENTS.md | typecheck + 端到端 |

## 非目标（本次不涉及）

- 前端 UI 重写、状态管理引入
- 部署架构变更（保持 Pages + Functions）
- 现网数据迁移（推倒重建）
- wsrv.nl 替换为自建图片处理
