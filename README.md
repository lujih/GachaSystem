# Chouka 抽卡系统

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lujih/GachaSystem)

一个基于 Cloudflare Workers 的轻量级二次元抽卡（Gacha）系统，完整使用 Cloudflare 生态：Workers、D1（SQLite）、KV、R2 存储。支持用户注册/登录、抽卡（常驻/限定）、合成、商店购买、小游戏（骰子）、每日签到、图库与排行榜，并内置管理后台用于发布公告与管理用户。

---

## ✨ 关键特性

- ⚡ **Serverless**：无服务器架构，部署在 Cloudflare Workers，低延迟、高可用。
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
- KV Namespaces: `KV_CACHE`, `RECENT_REQUESTS`
- D1 Database: `DB`
- R2 Bucket: `R2_BUCKET`

### 必要环境变量（在 Cloudflare Dashboard -> Workers -> Settings -> Variables & Secrets）
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
# 本地开发
npx wrangler dev --local

# 使用远程 D1 开发
npx wrangler dev
```

---

## 🔧 Wrangler 绑定（来自 `wrangler.toml`）
- KV: `KV_CACHE` (id: adb207beb...) 以及 `RECENT_REQUESTS`
- D1: `DB` (database_name: `chouka`)
- R2: `R2_BUCKET` (bucket_name: `cloudflare-t1`)

---

## 📚 数据库结构概览
主要表：
- `users` — 用户信息（`id`, `username`, `nickname`, `password`, `coins`, `level`, `exp`, `total_exp`, `login_streak`, `draw_count`, `wins`）
- `gallery` — 图库索引（`url`, `user_id`, `username`, `created_at`）
- `inventory` — 背包（`user_id`, `rarity`, `count`）
- `logs` — 行为日志
- `level_rewards` — 等级奖励领取记录
- `user_titles` — 用户称号（`title_id`, `is_equipped`, `unlocked_at`）
- `user_uploads` — 玩家上传图片（`r2_key`, `github_path`, `url`, `rarity`, `status`）

---

## API 参考

### 通用说明
- **授权方式**：登录后返回 `token`，使用 `X-Session-Token: <token>` 请求头识别用户
- **调试方式**：`X-User-ID: <username>` 请求头（仅用于开发调试，不安全）
- **可选请求头**：`X-User-Timezone`（例如 `+08:00`），用于签到本地时区判断
- **通用响应格式**：
  ```json
  // 成功
  { "success": true, ... }
  // 失败
  { "error": "错误信息" }
  // HTTP 状态码：200=成功，400=请求错误，401=未登录，403=无权限，404=未找到，500=服务器错误
  ```

### 认证相关
| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/` | GET | 首页 HTML 页面 | - |
| `/auth/register` | POST | 注册用户 | `{"username": "string", "password": "string", "nickname"?:"string"}` |
| `/auth/login` | POST | 登录（返回 token） | `{"username": "string", "password": "string"}` |

**登录响应**：
```json
{
  "success": true,
  "token": "session_token_xxx",
  "user": { "username": "alice", "nickname": "alice", "coins": 1000, "level": 1, ... }
}
```

### 用户功能
| 端点 | 方法 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| `/user/info` | GET | 获取用户基本信息（含 claimedRewards） | - |
| `/user/profile` | GET | 获取用户详细信息 HTML 页面 | - |
| `/user/inventory` | GET | 获取背包稀有度统计 | - |
| `/user/update-profile` | POST | 更新昵称 | `{"nickname": "string"}` |
| `/user/check-in` | POST | 每日签到 | - |
| `/user/claim-reward` | POST | 领取等级奖励 | `{"targetLevel": number}` |
| `/user/titles` | GET | 获取已获得称号列表 | - |
| `/user/equip-title` | POST | 装备称号 | `{"titleId": "string"}` |
| `/user/upload` | POST | 上传图片 | `FormData: { image: File, rarity: "N\|R\|SR\|SSR\|UR" }` |
| `/user/uploads` | GET | 获取上传记录 | `?page=1&limit=20` |

**签到响应**：
```json
{
  "success": true,
  "checkIn": { "coins": 150, "exp": 50, "streak": 1 },
  "bonus": " (连续签到+30)"
}
```

### 抽卡与游戏
| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/draw` | GET | 常驻池单抽 | - |
| `/limited/pools` | GET | 获取限定池列表 | - |
| `/draw/limited` | POST | 限定池抽卡 | `{"poolId"?:"string"}` |
| `/user/craft` | POST | 卡片合成 | `{"targetRarity": "R\|SR\|SSR\|UR"}` |
| `/shop/buy` | POST | 商店购买 | `{"targetRarity": "R\|SR\|SSR\|UR"}` |
| `/game/dice` | POST | 骰子猜大小 | `{"betAmount": number, "prediction": "small\|big"}` |

**抽卡响应**：
```json
{
  "success": true,
  "card": { "imageUrl": "https://...", "rarity": "SSR" },
  "points": 200,
  "exp": 50,
  "levelUp": { "newLevel": 2, "reward": 100 }
}
```

### 公共接口
| 端点 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/` | GET | 首页 | - |
| `/showcase` | GET | 首页最新掉落（精选6张） | - |
| `/changelog` | GET | 更新日志 | - |
| `/announcement` | GET | 系统公告 | - |
| `/library` | GET | 图库 HTML 页面 | `?page=1` |
| `/api/library/items` | GET | 图库 JSON API | `?page=1&limit=20&rarity=SSR` |

### 管理员接口
> 注意：所有接口 Body 需包含 `"password": "admin密码"`

| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/admin/verify` | POST | 验证管理员密码 | `{"password": "string"}` |
| `/admin/users` | POST | 用户列表（分页） | `{"page": 1, "limit": 20, "search"?:"string"}` |
| `/admin/update-points` | POST | 修改用户积分 | `{"targetId": "username", "amount": number}` |
| `/admin/delete-user` | POST | 删除用户 | `{"targetId": "username"}` |
| `/admin/save-changelog` | POST | 保存更新日志 | `{"logs": [{date, ver, content, tag}]}` |
| `/admin/save-announcement` | POST | 保存公告 | `{"announcement": {title, content, refreshId?}}` |
| `/admin/uploads` | POST | 待审核上传列表 | `{"status": "pending\|approved\|rejected", "page": 1}` |
| `/admin/review-upload` | POST | 审核图片 | `{"uploadId": number, "action": "approved\|rejected", "rarity"?:"N\|R\|SR\|SSR\|UR"}` |

### 请求示例
```bash
# 注册
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pwd123","nickname":"爱丽丝"}' \
  https://your-worker/auth/register

# 登录
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pwd123"}' \
  https://your-worker/auth/login

# 抽卡（使用返回的 token）
curl -H "X-Session-Token: <token>" \
  https://your-worker/draw

# 限定池抽卡
curl -X POST -H "Content-Type: application/json" \
  -H "X-Session-Token: <token>" \
  -d '{"poolId":"genshin"}' \
  https://your-worker/draw/limited

# 每日签到
curl -X POST -H "X-Session-Token: <token>" \
  https://your-worker/user/check-in

# 合成 SSR 卡
curl -X POST -H "Content-Type: application/json" \
  -H "X-Session-Token: <token>" \
  -d '{"targetRarity":"SSR"}' \
  https://your-worker/user/craft

# 商店购买 UR 卡
curl -X POST -H "Content-Type: application/json" \
  -H "X-Session-Token: <token>" \
  -d '{"targetRarity":"UR"}' \
  https://your-worker/shop/buy

# 骰子猜大，押注 100
curl -X POST -H "Content-Type: application/json" \
  -H "X-Session-Token: <token>" \
  -d '{"betAmount":100,"prediction":"big"}' \
  https://your-worker/game/dice

# 获取用户背包
curl -H "X-Session-Token: <token>" \
  https://your-worker/user/inventory

# 上传图片
curl -X POST -H "X-Session-Token: <token>" \
  -F "image=@/path/to/image.jpg" \
  -F "rarity=SSR" \
  https://your-worker/user/upload

# 管理员审核图片
curl -X POST -H "Content-Type: application/json" \
  -d '{"password":"admin123","uploadId":1,"action":"approved","rarity":"SSR"}' \
  https://your-worker/admin/review-upload
```

### 稀有度说明
| 稀有度 | 概率 | 抽卡积分 | 商店价格 |
|--------|------|----------|----------|
| N | 50% | 5 | - |
| R | 30% | 15 | 150 |
| SR | 15% | 50 | 600 |
| SSR | 4% | 200 | 2500 |
| UR | 1% | 1000 | 10000 |
---

## 🎮 游戏数值（玩家参考）

- **限定池抽卡费用**：500 积分
- **合成**：消耗 5 张同级别卡 → 1 张高一级卡
- **骰子游戏**：最小投注 10，最大投注 1000，赔率 2 倍
- **等级系统**：基础经验 100，经验乘数 1.5，最高等级 100
- **签到奖励**：基础 150 金币 + 50 经验，连续签到有额外奖励

---

## 常见问题

- 登录后保存 token，在后续请求中带上 `X-Session-Token`
- 图片不显示：检查 R2 Public Access 或 `R2_DOMAIN` 配置
- 数据库未生效：确认已执行 `schema.sql`
- 本地 `wrangler dev` 绑定缺失时，优先在 Cloudflare Dashboard 测试

---

## 🤝 贡献 & 许可
欢迎提交 Issue、PR 或建议！项目采用 MIT 许可证，详见 `LICENSE`。
