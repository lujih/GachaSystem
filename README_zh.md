# 🎲 无服务器动漫抽卡系统

![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Cloudflare D1](https://img.shields.io/badge/Database-D1_(SQLite)-blue)
![Cloudflare KV](https://img.shields.io/badge/Storage-KV-orange)
![Cloudflare R2](https://img.shields.io/badge/Assets-R2-green)
![License](https://img.shields.io/badge/license-MIT-green)

一个全栈、轻量级、支持事务的抽卡（召唤）游戏引擎，完全运行在 **Cloudflare Workers** 上。采用无服务器架构，使用 **D1** 存储用户数据，**KV** 进行高速缓存，**R2** 存储资产。

## ✨ 功能特性

*   **用户系统**：安全的注册与登录，支持会话管理（KV 缓存认证）。
*   **抽卡机制**：
    *   **常驻池**：常规召唤，按稀有度概率抽取。
    *   **限定池**：特殊活动，消耗更高，包含专属逻辑。
    *   **资产管理**：自动从外部 API 获取动漫图片，并持久化存储在 **Cloudflare R2** 中。
*   **经济系统**：
    *   **积分**：通过抽卡或赢得小游戏获得积分。
    *   **商店**：购买特定稀有度的卡包。
    *   **合成**：合成系统（消耗 5 张低阶卡获得 1 张高阶卡）。
*   **小游戏**："猜大小"骰子赌博，赢取额外积分。
*   **数据完整性**：使用 **D1 事务（批量）** 确保积分和库存始终保持同步。
*   **社交与管理**：
    *   **图库**：浏览已收集的卡片（支持懒加载）。
    *   **排行榜**：实时显示最新抽卡记录。
    *   **管理面板**：管理用户、编辑更新日志、发布公告。
*   **国际化**：内置支持 **英文** 和 **简体中文**。

## 🛠 技术栈

*   **运行时**：Cloudflare Workers
*   **数据库**：Cloudflare D1 (SQLite) - *存储用户、库存、日志*
*   **缓存/会话**：Cloudflare KV - *存储会话、预加载缓冲区、排行榜*
*   **对象存储**：Cloudflare R2 - *存储卡片图片*
*   **前端**：原生 HTML/CSS/JS（嵌入在 Worker 中，单文件）

## 🚀 部署指南

### 前提条件

1.  一个 Cloudflare 账户。
2.  已安装 Node.js 和 npm。
3.  已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)。

### 1. 克隆与设置

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
```

### 2. 创建 Cloudflare 资源

运行以下命令在您的 Cloudflare 账户中创建必要的资源：

```bash
# 登录到 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create gacha-db

# 创建 KV 命名空间
wrangler kv:namespace create "KV_CACHE"
wrangler kv:namespace create "RECENT_REQUESTS"

# 创建 R2 存储桶
wrangler r2 bucket create gacha-images
```

### 3. 配置 `wrangler.toml`

在根目录创建或编辑 `wrangler.toml`。**将 ID 替换为第 2 步生成的 ID。**

```toml
name = "gacha-worker"
main = "src/worker.js"
compatibility_date = "2023-12-01"

# D1 数据库
[[d1_databases]]
binding = "DB"
database_name = "gacha-db"
database_id = "YOUR_D1_DATABASE_ID_HERE"

# KV 命名空间
[[kv_namespaces]]
binding = "KV_CACHE"
id = "YOUR_KV_CACHE_ID_HERE"

[[kv_namespaces]]
binding = "RECENT_REQUESTS"
id = "YOUR_RECENT_REQUESTS_ID_HERE"

# R2 存储桶
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "gacha-images"

# 管理员密码
[vars]
admin = "your_secure_admin_password"
```

### 4. 初始化数据库架构

执行 SQL 架构以在 D1 中创建所需的表。

创建名为 `schema.sql` 的文件：

```sql
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS logs;

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    nickname TEXT,
    password TEXT NOT NULL,
    coins INTEGER DEFAULT 1000,
    draw_count INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    created_at INTEGER
);

CREATE TABLE inventory (
    user_id INTEGER NOT NULL,
    rarity TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, rarity)
);

CREATE TABLE logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    detail TEXT,
    rarity TEXT,
    created_at INTEGER
);

CREATE INDEX idx_inv_user ON inventory(user_id);
CREATE INDEX idx_logs_user ON logs(user_id);
```

将架构应用到您的 D1 数据库：

```bash
# 用于本地开发
wrangler d1 execute gacha-db --local --file=./schema.sql

# 用于生产部署
wrangler d1 execute gacha-db --file=./schema.sql
```

### 5. R2 域名设置

1.  前往 Cloudflare 控制台 > R2 > 选择您的存储桶 (`gacha-images`)。
2.  进入 **设置** > **公共访问**。
3.  连接一个自定义域名（例如 `assets.yourdomain.com`）或允许 R2.dev 子域名。
4.  **重要**：在 `src/worker.js` 中更新 `R2_DOMAIN` 常量为该域名：

```javascript
const CONFIG = {
  // ...
  R2_DOMAIN: "https://assets.yourdomain.com", 
  // ...
};
```

### 6. 部署

```bash
wrangler deploy
```

您的抽卡游戏现已上线！🚀

## ⚙️ 配置

您可以在 `src/worker.js` 的 `CONFIG` 对象中自定义游戏平衡和资源：

*   **SOURCES**：添加/删除用于图片生成的 API 端点。
*   **GAME.POINTS**：更改每个稀有度获得的积分。
*   **GAME.SHOP**：调整商店价格。
*   **GAME.DICE**：调整赌博限制。

## 🕹️ 管理面板

通过点击 **"用户档案"** -> **"管理面板"** 访问管理面板。
输入您在 `wrangler.toml` 中设置的密码（在 `[vars] admin` 下）。

*   **更新日志编辑器**：更新可见的更新日志。
*   **用户管理器**：查看统计数据、修改积分或封禁用户。
*   **公告**：推送全局通知。

## 🤝 贡献

欢迎提交 Pull Request。对于重大更改，请先开启一个 Issue 讨论您想要更改的内容。

## 📄 许可证

[MIT](LICENSE)