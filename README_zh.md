# 🎲 动漫抽卡系统

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/数据库-D1_(SQLite)-blue)
![Cloudflare KV](https://img.shields.io/badge/存储-KV-orange)
![Cloudflare R2](https://img.shields.io/badge/资源-R2-green)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

一个完全跑在 **Cloudflare Workers** 上的全栈、轻量、支持事务的抽卡游戏引擎。采用无服务器架构，用 **D1** 存数据保证一致性，**KV** 做高速缓存，**R2** 存放各种资源。

## ✨ 核心功能

*   **用户系统**：安全注册登录，带会话管理（认证信息放 KV 缓存）
*   **抽卡玩法**：
    *   **常驻池**：普通抽卡，按概率出不同稀有度卡牌
    *   **限定池**：活动专属，消耗更高且有特殊规则
    *   **资源管理**：自动从外部 API 抓动漫图，永久存到 **Cloudflare R2**
*   **经济体系**：
    *   **货币**：抽卡或玩小游戏都能赚金币
    *   **商店**：直接购买特定稀有度的卡包
    *   **合成**：5 张低阶卡可以合成 1 张高阶卡（分解重练）
*   **小游戏**：“猜大小”骰子玩法，赚点外快
*   **数据安全**：用 **D1 事务（批量操作）** 确保金币和背包数据永不乱套
*   **社交管理**：
    *   **图鉴**：翻看已收集的卡牌（懒加载优化）
    *   **排行榜**：实时显示最新抽卡记录
    *   **管理后台**：管理用户、编辑更新日志、发全服公告
*   **多语言**：内置 **英文** 和 **简体中文**

## 🛠️ 技术栈

*   **运行环境**：Cloudflare Workers
*   **数据库**：Cloudflare D1 (SQLite) - *存用户、背包、日志*
*   **缓存/会话**：Cloudflare KV - *存会话、预加载数据、排行榜*
*   **文件存储**：Cloudflare R2 - *存卡牌图片*
*   **前端界面**：原生 HTML/CSS/JS（直接嵌在 Worker 里，单文件搞定）

## 🚀 快速部署

### 准备一下

1.  有个 Cloudflare 账号
2.  电脑装好 Node.js 和 npm
3.  安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)

### 1. 拉代码 & 装依赖

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

### 2. 创建 Cloudflare 资源

在 Cloudflare 账号里创建需要的资源：

```bash
# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create chouka

# 创建 KV 存储空间
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "RECENT_REQUESTS"

# 创建 R2 存储桶
wrangler r2 bucket create gacha-images
```

### 3. 配置 `wrangler.toml`

在项目根目录创建或修改 `wrangler.toml` 文件。**记得把第二步生成的 ID 填进去**

```toml
name = "chouka"
main = "worker.js"
compatibility_date = "2026-01-16"

# D1 数据库配置
[[d1_databases]]
binding = "DB"
database_name = "chouka"
database_id = "YOUR_D1_DATABASE_ID_HERE"

# KV 配置
[[kv_namespaces]]
binding = "KV_CACHE"
id = "YOUR_KV_CACHE_ID_HERE"

[[kv_namespaces]]
binding = "RECENT_REQUESTS"
id = "YOUR_RECENT_REQUESTS_ID_HERE"

# R2 配置
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "gacha-images"

# 管理员密码（自己设个安全的）
[vars]
admin = "your_secure_admin_password"
```

### 4. 初始化数据库

创建数据库表结构：

新建 `schema.sql` 文件：

```sql
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
```

执行建表：

```bash
# 本地开发用
wrangler d1 execute gacha-db --local --file=./schema.sql

# 正式部署用
wrangler d1 execute gacha-db --file=./schema.sql
```

### 5. 设置 R2 访问域名

1.  进 Cloudflare 控制台 > R2 > 选你的存储桶 (`gacha-images`)
2.  点 **设置** > **公共访问**
3.  绑定自定义域名（比如 `assets.yourdomain.com`）或者直接用 R2.dev 子域名
4.  **重要**：在 `worker.js` 里更新 `R2_DOMAIN` 配置：

```javascript
const CONFIG = {
  // ...
  R2_DOMAIN: "https://assets.yourdomain.com", 
  // ...
};
```

### 6. 一键部署

```bash
wrangler deploy
```

搞定！你的抽卡游戏已经上线啦！🚀

## ⚙️ 自定义配置

游戏的各种参数可以在 `worker.js` 的 `CONFIG` 对象里调整：

*   **SOURCES**：添加/删减图片生成的 API 来源
*   **GAME.POINTS**：调整不同稀有度卡牌给的积分
*   **GAME.SHOP**：修改商店价格
*   **GAME.DICE**：设置猜大小游戏的上下限

## 🕹️ 管理后台

点 **"用户资料"** -> **"管理面板"** 就能进后台。
密码就是刚才在 `wrangler.toml` 里设的那个（`[vars] admin`）。

*   **更新日志**：编辑游戏更新公告
*   **用户管理**：查看数据、调金币、封号
*   **公告发布**：发全服通知

## 🤝 参与贡献

欢迎提 Pull Request！如果想做大改动，建议先开个 issue 讨论一下。

## 📄 开源协议

[MIT](LICENSE)