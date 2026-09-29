# Chouka 抽卡系统

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lujih/GachaSystem)

一个基于 Cloudflare Pages 的轻量级二次元抽卡（Gacha）系统，完整使用 Cloudflare 生态：Pages Functions、D1（SQLite）、KV、R2 存储。支持用户注册/登录、抽卡（常驻/限定）、合成、商店购买、小游戏（骰子）、每日签到、图库与排行榜，并内置管理后台用于发布公告与管理用户。

---

## ✨ 关键特性

- ⚡ **Serverless**：无服务器架构，部署在 Cloudflare Pages（Functions），低延迟、高可用。
- 🎲 **抽卡系统**：常驻池与多类型限定池，稀有度：N / R / SR / SSR / UR；每次抽卡会获得积分与经验。
- 🎒 **背包与合成**：卡片以稀有度入库，支持用 5 件低阶卡合成 1 件高阶卡。
- 💰 **积分与商店**：积分可用于限定池与商城购买道具/卡片。
- 🖼️ **R2 自动图库**：抽到图片会索引到图库并同步到 R2，可公开访问展示。
- 👤 **玩家共建**：支持玩家上传图片，审核通过后可进入玩家共建池。
- 🏆 **称号系统**：升级可获得专属称号并装备展示。
- 🎁 **等级奖励**：达到特定等级可领取金币和专属称号。
- 🛡️ **管理员后台**：通过 `admin` 密钥登录，管理公告、更新日志、用户列表、积分调整与图片审核。

---

## 🚀 快速上手（部署要点）

### 必要的 Cloudflare 资源
- KV Namespaces: `KV_CACHE`
- D1 Database: `DB`
- R2 Bucket: `R2_BUCKET`

### 必要环境变量（在 Cloudflare Dashboard -> Pages -> Settings -> Variables & Secrets）
- `admin` (Secret) — 管理后台密码
- `GITHUB_TOKEN` (Secret) — GitHub Personal Access Token（需要 repo 权限）
- `GITHUB_OWNER` (Var) — GitHub 用户名（可选，默认：`lujih`）
- `GITHUB_REPO` (Var) — 图片仓库名（可选，默认：`chouka-images`）
- `R2_DOMAIN` (Var) — R2 公开访问域名（可选）

### 初始化数据库
将 `schema.sql` 的内容在 D1 控制台中执行（Console -> Execute SQL）或使用 CLI：

```bash
npx wrangler d1 execute chouka --remote --file=./schema.sql
```

### 本地开发与调试
```bash
# 本地开发（Vite HMR）
npm run dev

# SSR 预览（构建后）
npm run start

# 构建
npm run build
```

---

## 🔧 Wrangler 绑定（来自 `wrangler.jsonc`）
- KV: `KV_CACHE`
- D1: `DB` (database_name: `chouka`)
- R2: `R2_BUCKET` (bucket_name: `chouka-images`)

> ⚠️ `wrangler.jsonc` 中的 `database_id` / KV `id` 是占位符 `local-dev`，**部署前必须在 Cloudflare Dashboard 替换为真实 id**。

---

## 📚 数据库结构概览
主要表：
- `users` — 用户信息（`id`, `username`, `nickname`, `password`, `coins`, `level`, `exp`, `total_exp`, `login_streak`, `draw_count`, `wins`）
- `sessions` — 会话（token 仅存 SHA-256 哈希）
- `pity_counters` — 保底计数（常驻 ssr/ur + 限定 limited_ssr/limited_ur）
- `gallery` — 图库索引（`url` UNIQUE, `user_id`, `username`, `created_at`）
- `inventory` — 背包（`user_id`, `rarity`, `count`）
- `draw_history` — 抽卡历史
- `level_rewards` — 等级奖励领取记录
- `user_titles` — 用户称号（`title_id`, `is_equipped`, `unlocked_at`）
- `user_uploads` — 玩家上传图片（`r2_key`, `github_path`, `url`, `rarity`, `status`）
- `card_likes` / `card_bookmarks` — 图库点赞/收藏
- `buffer_claims` — 图片 buffer 领取去重
- `announcements` / `changelogs` — 公告与更新日志（D1 表）
- `leaderboard` — 排行榜（替代原 RECENT_REQUESTS KV）

---

## API 参考

> 所有端点统一挂在 `/api` 前缀下，下表中的路径均为**去掉 `/api` 前缀后**的相对路径。

### 通用说明
- **授权方式**：登录后返回 `token`，使用 `X-Session-Token: <token>` 请求头识别用户
- **通用响应格式**：
  ```json
  // 成功
  { "success": true, ... }
  // 失败
  { "success": false, "error": "错误信息", "code": "错误码" }
  ```
- **HTTP 状态码**：200=成功，400=请求错误，401=未登录，403=无权限，404=未找到，429=触发限流，500=服务器错误
- **限流**：
  - 按 IP：`register` 5 次/10 分钟、`login` 10 次/10 分钟、`admin` 10 次/10 分钟、`upload` 10 次/10 分钟
  - 按会话用户：单抽 30/分钟、十连 20/分钟、限定池抽卡 20/分钟、分解/商店/合成 20/分钟、骰子 20/分钟、签到 5/分钟、点赞/收藏 60/分钟
  - 限流按**请求次数**计数而非成功次数（失败的请求同样占用配额）

### 认证相关
| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/auth/register` | POST | 注册用户 | `{"username": "string", "password": "string", "nickname"?:"string"}` |
| `/auth/login` | POST | 登录（返回 token） | `{"username": "string", "password": "string"}` |
| `/auth/logout` | POST | 吊销当前会话（删 DB 行 + KV 缓存） | - |

**登录响应**：
```json
{
  "success": true,
  "token": "session_token_xxx",
  "user": { "id": 1, "username": "alice", "nickname": "alice", "coins": 1000, "level": 1, "exp": 0, "total_exp": 0 }
}
```

### 用户功能
| 端点 | 方法 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| `/user/info` | GET | 用户信息（含等级进度、称号、保底计数、已领奖励） | - |
| `/user/profile-data` | GET | 背包 + 称号聚合 | - |
| `/user/inventory` | GET | 背包稀有度统计 | - |
| `/user/update-profile` | POST | 更新昵称 | `{"nickname": "string"}` |
| `/user/check-in` | POST | 每日签到 | - |
| `/user/claim-reward` | POST | 领取等级奖励 | `{"targetLevel": number}` |
| `/user/titles` | GET | 已获得称号列表 | - |
| `/user/equip-title` | POST | 装备称号 | `{"titleId": "string"}` |
| `/user/upload` | POST | 上传图片 | `FormData: { image: File, rarity: "N\|R\|SR\|SSR\|UR" }` |
| `/user/uploads` | GET | 上传记录 | `?page=1` |

**签到响应**：
```json
{
  "success": true,
  "checkIn": { "coins": 300, "exp": 50, "streak": 1, "streakBonus": 0 }
}
```

### 抽卡与游戏
| 端点 | 方法 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| `/draw` | GET | 常驻池单抽 | - |
| `/draw/multi` | POST | 常驻池多抽 | `{"count": number}`（1~10） |
| `/draw/limited` | POST | 限定池抽卡 | `{"poolId"?: "string", "count"?: number}` |
| `/draw/draw-history` | GET | 抽卡历史 | `?page=1&rarity=SSR` |
| `/limited/pools` | GET | 限定池列表 | - |
| `/decompose` | POST | 分解卡片换金币 | `{"rarity": "N\|R\|SR\|SSR\|UR", "count": number}` |
| `/user/craft` | POST | 卡片合成 | `{"targetRarity": "R\|SR\|SSR\|UR"}` |
| `/shop/buy` | POST | 商店购买 | `{"targetRarity": "R\|SR\|SSR\|UR"}` |
| `/game/dice` | POST | 骰子 | `{"betAmount": number}` |

**单抽响应**：
```json
{
  "success": true,
  "card": { "imageUrl": "https://...", "sourceName": "...", "rarity": "SSR", "success": true },
  "rarity": "SSR",
  "coinsReward": 262,
  "expGained": 150,
  "isPity": false,
  "pityInfo": { "ssrPity": 0, "urPity": 12, "ssrAt": 15, "urAt": 80 },
  "levelUp": { "newLevel": 3, "reward": 100 }
}
```

**多抽响应**：`cards[]` / `count` / `totalCost` / `expGained` / `levelUp` / `pityInfo` / `failedSlots`（失败槽位已按单抽价退款）

**分解响应**：`{ "decomposed": 10, "rarity": "N", "coinsPerCard": 7, "totalCoins": 70 }`

### 公共接口（无需登录）
| 端点 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/health` | GET | 健康检查与绑定状态 | - |
| `/showcase` | GET | 首页最新掉落（6 张） | - |
| `/changelog` | GET | 更新日志 | - |
| `/announcement` | GET | 系统公告（仅返回 `enabled=1`） | - |
| `/library/items` | GET | 图库 JSON | `?page=1&limit=20&rarity=SSR&sort=newest\|oldest\|rarity\|hot&period=all\|today\|week\|month&search=<用户名>` |
| `/library/like-counts` | GET | 点赞数批量查询 | `?ids=1,2,3`（最多 50 个） |

### 图库交互（需登录）
| 端点 | 方法 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| `/library/my-items` | GET | 我的抽卡 / 我的收藏 | `?mode=mine\|bookmarks&page=1&rarity=&sort=&period=`（身份取自会话，不接受 `userId`） |
| `/library/my-interactions` | GET | 我的点赞与收藏 ID 列表 | - |
| `/library/my-likes` | GET | 仅点赞列表 | - |
| `/library/my-bookmarks` | GET | 仅收藏列表 | - |
| `/library/like` | POST / DELETE | 点赞 / 取消 | `{"galleryId": number}` |
| `/library/bookmark` | POST / DELETE | 收藏 / 取消 | `{"galleryId": number}` |

### 管理员接口
> 所有接口 Body 需包含 `"password": "admin密码"`，比对 `env.admin`（secret，注意是小写 a）。
> 鉴权中间件会消费 body 流并解析为 `adminBody`，handler 从 `c.get('adminBody')` 读取字段。

| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/admin/verify` | POST | 验证管理员密码 | `{"password": "string"}` |
| `/admin/users` | POST | 用户列表（分页） | `{"page": 1, "limit": 100}` |
| `/admin/update-points` | POST | 修改用户积分 | `{"targetId": <数字用户 id>, "amount": number}` |
| `/admin/delete-user` | POST | 删除用户（外键级联清理关联数据） | `{"targetId": <数字用户 id>}` |
| `/admin/save-changelog` | POST | 保存更新日志 | `{"logs": [{date, ver, content, tag}]}` |
| `/admin/save-announcement` | POST | 保存公告 | `{"announcement": {title, content, enabled}}` |
| `/admin/uploads` | POST | 上传列表 | `{"status": "pending\|approved\|rejected", "page": 1}` |
| `/admin/review-upload` | POST | 审核图片 | `{"uploadId": number, "action": "approved\|rejected", "rarity"?: "N\|R\|SR\|SSR\|UR"}` |

### 请求示例
```bash
BASE=https://your-domain.com/api

# 注册
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Passw0rd!x","nickname":"爱丽丝"}' \
  $BASE/auth/register

# 登录
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"Passw0rd!x"}' \
  $BASE/auth/login

# 抽卡（使用返回的 token）
curl -H "X-Session-Token: <token>" $BASE/draw

# 十连
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"count":10}' $BASE/draw/multi

# 限定池十连
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"poolId":"genshin","count":10}' $BASE/draw/limited

# 每日签到
curl -X POST -H "X-Session-Token: <token>" $BASE/user/check-in

# 合成 SSR 卡
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"targetRarity":"SSR"}' $BASE/user/craft

# 商店购买 UR 卡
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"targetRarity":"UR"}' $BASE/shop/buy

# 骰子，押注 100
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"betAmount":100}' $BASE/game/dice

# 分解 10 张 N 卡
curl -X POST -H "Content-Type: application/json" -H "X-Session-Token: <token>" \
  -d '{"rarity":"N","count":10}' $BASE/decompose

# 我的收藏
curl -H "X-Session-Token: <token>" "$BASE/library/my-items?mode=bookmarks"

# 上传图片
curl -X POST -H "X-Session-Token: <token>" \
  -F "image=@/path/to/image.jpg" -F "rarity=SSR" \
  $BASE/user/upload

# 登出（吊销服务端会话）
curl -X POST -H "X-Session-Token: <token>" $BASE/auth/logout

# 管理员审核图片
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"<admin密码>","uploadId":1,"action":"approved","rarity":"SSR"}' \
  $BASE/admin/review-upload
```

### 稀有度说明

> ⚠️ 下表是**含软保底**的长期实测占比（40 万次采样），不是基础概率。
> 基础概率为 UR 1% / SSR 4%，但软保底（SSR 第 10 抽起每抽 +5%，UR 第 50 抽起每抽 +2%）
> 会把实际产出率显著抬高。按基础概率做经济测算会得出错误结论。

| 稀有度 | 实际占比 | 分解返还 | 抽卡即时金币 | 商店价格 |
|--------|----------|----------|--------------|----------|
| N | 40.7% | 6 | 2 | - |
| R | 34.1% | 17 | 5 | 150 |
| SR | 14.7% | 56 | 17 | 600 |
| SSR | 8.3% | 225 | 68 | 2500 |
| UR | 2.2% | 1125 | 338 | 10000 |

「分解返还」来自 `src/config/business.js` 的 `CARD_VALUE`（唯一数据源），可通过
`GET /api/rarities` 取到；「抽卡即时金币」= `CARD_VALUE × 0.3`。

**经济不变式**：抽卡同时给金币和卡，而卡还能分解成金币，所以每抽总收入是
`E[CARD_VALUE] × (1 + 0.3) ≈ 78 < 单抽成本 100`（十连 −13%）。
这条不等式若被破坏，「抽一张→分解→再抽」就会成为无上限的造币回路。
`tests/economy-invariants.test.js` 会守护它，调整数值前请先跑 `npm test`。

---
## 🎮 游戏数值（玩家参考）

- **常驻池抽卡费用**：单抽 100 积分，十连 900 积分（9 折）
- **限定池抽卡费用**：单抽 500 积分，十连 4500 积分
- **保底**：SSR 第 15 抽硬保底（第 10 抽起每抽 +5% 概率），UR 第 80 抽硬保底（第 50 抽起每抽 +2%）
- **合成**：消耗 5 张同级别卡 → 1 张高一级卡
- **骰子游戏**：最小投注 10，最大投注 1000，冷却 3 秒
  赔付：点数 ≥10 → 0.75 倍；两骰相同 → 1.5 倍；点数 =7 → 3 倍；其余输掉下注
  （庄家优势约 16.7%）
- **等级系统**：基础经验 100，经验乘数 1.5，最高等级 100
- **签到奖励**：基础 300 金币 + 50 经验，连续签到有额外奖励（最高 +600）

---

## 常见问题

- 登录后保存 token，在后续请求中带上 `X-Session-Token`；**退出时务必调用 `/api/auth/logout`**，否则 token 在会话到期（7 天）前仍可用
- 图片不显示：检查 R2 Public Access 或 `R2_DOMAIN` 配置
- 数据库未生效：确认已执行 `schema.sql`
- 抽卡返回「获取 XX 图片失败」：第三方图源 API 不可用时会出现，此时**已自动全额退款**，可稍后重试
- 本地 `wrangler dev` 绑定缺失时，用 `npm run start`（`wrangler pages dev`）代替

---

## 🛠️ 开发指引

修改本项目前请先阅读 **[AGENTS.md](./AGENTS.md)**，其中记录了当前架构、关键机制
（原子扣币、保底、buffer 原子锁、经济数值反解原则）与已知限制。

常用命令：
```bash
npm test          # 单元测试（vitest）
npm run typecheck # 类型检查
npm run build     # 构建
```

`tests/integration/` 下是需手动起本地服务的冒烟脚本，入口 `npm run test:integration`。

```bash
npm run build && npm run start   # 另开一个终端保持运行（默认 127.0.0.1:8787）
npm run test:integration
```

**实测行为**：一轮约 70 秒。`admin` / `full` / `history-filter` / `limited-fallback` /
`money-reconciliation` / `rate-limit` 六个脚本会跑完，`review-upload` 与 `upload`
需要注册全新账号，而注册限流是 5 次/10 分钟/IP，因此**一轮跑不完 8 个脚本**——
这是限流器与测试设计的固有张力，不是 bug。

遇到限流时脚本会**秒级失败并提示**，不会挂起。可选做法：
- 等待约 10 分钟后重跑剩余脚本
- 清空本地 KV 归零计数（会连带清掉本地会话与图片 buffer，均可丢）：
  `rm -rf .wrangler/state/v3/kv`
- 手动执行单个脚本：`node tests/integration/rate-limit.test.mjs`

各脚本对账号的要求不同（`history-filter` 复用共享账号 `itest_shared_history`；
`rate-limit` / `money-reconciliation` / `upload` / `review-upload` 必须用全新账号，
因为它们依赖干净的限流计数器、初始 1000 余额或空的待审列表）。

---

## 🤝 贡献 & 许可
欢迎提交 Issue、PR 或建议！项目采用 MIT 许可证，详见 `LICENSE`。
