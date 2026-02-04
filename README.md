# Chouka 抽卡系统

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lujih/GachaSystem)

一个基于 Cloudflare Workers 的轻量级二次元抽卡（Gacha）系统，完整使用 Cloudflare 生态：Workers、D1（SQLite）、KV、R2 存储。支持用户注册/登录、抽卡（常驻/限定）、合成、商店购买、小游戏（骰子）、每日签到、图库与排行榜，并内置管理后台用于发布公告与管理用户。

---

## ✨ 关键特性

- ⚡ **Serverless**：无服务器架构，部署在 Cloudflare Workers，低延迟、高可用。
- 🎲 **抽卡系统**：常驻池与限定池，稀有度：N / R / SR / SSR / UR；每次抽卡会获得积分与经验。
- 🎒 **背包与合成**：卡片以稀有度入库，支持用 5 件低阶卡合成 1 件高阶卡。
- 💰 **积分与商店**：积分可用于限定池与商城购买道具/卡片。
- 🖼️ **R2 自动图库**：抽到图片会索引到图库并同步到 R2，可公开访问展示。
- 🛡️ **管理员后台**：通过 `admin` 密钥登录，管理公告、更新日志、用户列表与积分调整。

---

## 🚀 快速上手（部署要点）

### 必要的 Cloudflare 资源
- KV Namespaces: `KV_CACHE`, `RECENT_REQUESTS`
- D1 Database: `DB`
- R2 Bucket: `R2_BUCKET`（示例在 `wrangler.toml` 中：`cloudflare-t1`）

### 必要环境变量（在 Cloudflare Dashboard -> Workers -> Settings -> Variables & Secrets）
- `admin` (Secret) — 管理后台密码
- 可选：`R2_DOMAIN` (Var) — 如果你使用 R2.dev 或自定义域来公开图片，请设置为 `https://...`。

### 初始化数据库
将 `schema.sql` 的内容在 D1 控制台中执行（Console -> Execute SQL）或使用 CLI：

```bash
npx wrangler d1 execute chouka --remote --file=./schema.sql
```

### 本地开发与调试
- 使用 `wrangler dev` 本地运行：

```bash
npx wrangler dev --local
```

（注意：本地 dev 模式下某些绑定（如 D1、R2）可能需要额外配置或使用 Cloudflare 提供的模拟方案）

---

## 🔧 Wrangler 绑定（来自 `wrangler.toml`）
- KV: `KV_CACHE` (id: adb207beb...) 以及 `RECENT_REQUESTS`
- D1: `DB` (database_name: `chouka`)
- R2: `R2_BUCKET` (bucket_name: `cloudflare-t1`)

---

## 📚 数据库结构概览（来自 `schema.sql`）
主要表：
- `users`：用户信息（`id`, `username`, `password`, `coins`, `level`, `exp`, `total_exp`, `login_streak`, ...）
- `gallery`：图库索引（`url`, `user_id`, `created_at`）
- `inventory`：背包（`user_id`, `rarity`, `count`）
- `logs`：行为日志
- `level_rewards`：等级奖励领取记录
- `user_titles`：用户称号
- `user_uploads`：用户上传图片与审核记录

建议在部署后先执行 `schema.sql` 完成表建立与索引创建。

---

## 🚧 API 参考（常用端点与示例）
通用说明：
- 授权方式：登录后会返回 `token`，随后将 `X-Session-Token: <token>` 放在请求头以识别用户。也支持 `X-User-ID: <username>` 作为只读快速标识（不安全，主要用于调试）。
- 可选请求头：`X-User-Timezone`（例如 `+08:00` 或 `480` 分钟），用于签到的本地时区判断。

重要端点：

1) 注册
- POST /auth/register
- Body JSON: { "username": "u", "password": "p", "nickname": "nick" }
- 返回: { success: true } 或 error

示例：
```bash
curl -X POST -H "Content-Type: application/json" -d '{"username":"alice","password":"pwd"}' https://<your-worker>/auth/register
```

2) 登录
- POST /auth/login
- Body JSON: { "username": "u", "password": "p" }
- 返回: { success: true, token: "...", user: { id, username, nickname, level, exp, total_exp } }

示例：
```bash
curl -X POST -H "Content-Type: application/json" -d '{"username":"alice","password":"pwd"}' https://<your-worker>/auth/login
# 将返回的 token 用于后续请求：
curl -H "X-Session-Token: <token>" https://<your-worker>/user/info
```

3) 获取用户信息
- GET /user/info
- 需要登录（X-Session-Token）
- 返回用户基础信息（不包含 inventory）

4) 获取库存
- GET /user/inventory
- 需要登录（X-Session-Token）
- 返回稀有度计数

5) 每日签到
- POST /user/check-in
- 需要登录（X-Session-Token）
- 可传 `X-User-Timezone` 以使用本地日期

6) 抽卡（常驻）
- GET /draw
- 需要登录（X-Session-Token）
- 返回: { success: true, rarity, imageUrl, pointsEarned, expGained }

7) 抽卡（限定池）
- POST /draw/limited
- 需要登录（X-Session-Token）
- 扣除固定积分（见 CONFIG.LIMITED.COST）

8) 合成
- POST /user/craft
- 需要登录（X-Session-Token）
- Body JSON: { "targetRarity": "SR" }

9) 商店购买
- POST /shop/buy
- Body JSON: { "targetRarity": "R" }

10) 骰子小游戏
- POST /game/dice
- Body JSON: { "betAmount": 100, "prediction": "small" } // prediction: 'small'|'big'

11) 公共接口
- GET /showcase  (首页最新掉落展示)
- GET /changelog
- GET /announcement
- GET /library (图库分页/检索)

12) 管理员相关（需 `admin` secret）
- POST /admin/verify  Body: { password }
- POST /admin/save-changelog  Body: { password, logs }
- POST /admin/save-announcement Body: { password, announcement }
- 以及用户管理、积分调整等 `POST /admin/*` 接口（详见源码）

安全提示：管理员接口需要在请求体内携带 `password` 并与 `env.admin` 做校验，务必使用 Secret 存放在 Cloudflare 环境变量中。

---

## 常见问题与排查小贴士
- 登录后请保存返回的 `token`，并在后续接口带上 `X-Session-Token`。
- 图片不显示：检查 R2 的 Public Access（或设置 `R2_DOMAIN`）；检查 `R2_BUCKET` 是否正确绑定。
- 数据库未生效：确认已对 D1 执行 `schema.sql`。
- 本地 `wrangler dev` 下若出现绑定缺失，优先在 Cloudflare Dashboard 上测试（真实环境）。

---

## 🤝 贡献 & 许可
欢迎提交 Issue、PR 或建议！项目采用 MIT 许可证，详见 `LICENSE`。

---

如果需要，我可以把 README 再补充 API 响应示例（JSON）或增加英文版说明。🚀
