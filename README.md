# Chouka Gacha System

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/你的GitHub用户名/你的仓库名)

一个基于 Cloudflare Workers 全栈构建的轻量级二次元抽卡系统。集成了 D1 数据库、KV 缓存和 R2 对象存储，支持用户系统、卡池召唤、合成、商店、小游戏以及图鉴管理。

## ✨ 功能特性

*   **⚡️ Serverless 架构**: 完全运行在 Cloudflare 生态（Workers + D1 + KV + R2）上，低成本高性能。
*   **🎲 抽卡系统**: 包含常驻池和限定池（扣除积分），支持不同的概率配置。
*   **🎒 背包与合成**: 抽到的卡片存入数据库，支持消耗 5 张低阶卡合成 1 张高阶卡。
*   **💰 积分经济**: 内置签到（模拟）、商店购买、骰子猜大小（赚取积分）功能。
*   **🖼️ 自动图库**: 抽到的图片会自动上传至 R2 存储桶，并生成全服共享的图鉴和排行榜。
*   **🛡️ 用户系统**: 完整的注册、登录流程，使用 D1 存储数据，KV 缓存 Session。
*   **🔧 管理后台**: 内置可视化的更新日志编辑器、公告管理和用户管理面板。

## 🚀 快速部署 (一键部署)

### 1. 点击部署按钮
点击上方的 **"Deploy to Cloudflare Workers"** 按钮。Cloudflare 将会自动引导你完成以下步骤：
1.  授权连接你的 GitHub 账号。
2.  Cloudflare 会检测 `wrangler.toml` 配置。
3.  **关键步骤**：在部署向导中，它会提示你需要创建对应的资源。请按照提示确认创建：
    *   **KV Namespaces**: `KV_CACHE` 和 `RECENT_REQUESTS`
    *   **D1 Database**: `DB`
    *   **R2 Bucket**: `R2_BUCKET`

### 2. 配置环境变量
部署完成后，进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> 选择刚部署的项目 -> **Settings** -> **Variables and Secrets**。

添加以下变量：
*   `admin`: 设置一个字符串（例如 `123456`），这将作为管理后台的登录密码。

### 3. 初始化数据库 (重要)
由于 D1 数据库创建后是空的，你需要手动执行 SQL 来创建表结构。

1.  在 Cloudflare Dashboard 中，进入 **Storage & Databases** -> **D1**。
2.  点击你刚刚创建的数据库（通常名字包含 `chouka` 或 `DB`）。
3.  点击 **Console** 标签页。
4.  将仓库中 `schema.sql` 文件的内容复制粘贴进去，点击 **Execute**。

### 4. 设置 R2 公开访问 (可选)
为了让抽到的图片能在前端显示，你需要允许 R2 的公开访问，或者绑定自定义域名。
1.  进入 **R2** -> 点击你的存储桶。
2.  点击 **Settings** -> **Public Access**。
3.  开启 **R2.dev subdomain** (允许测试使用) 或连接自定义域名。
4.  **注意**：如果使用了 R2.dev 子域名或自定义域名，请修改代码配置中的 `R2_DOMAIN` 变量，或者在环境变量中添加 `R2_DOMAIN` 覆盖默认值。

---

## 🛠️ 手动部署 (命令行)

如果你更喜欢使用 CLI 工具：

1.  **Clone 仓库**
    ```bash
    git clone https://github.com/你的用户名/你的仓库名.git
    cd 你的仓库名
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **创建资源**
    ```bash
    # 创建 KV
    npx wrangler kv:namespace create KV_CACHE
    npx wrangler kv:namespace create RECENT_REQUESTS
    
    # 创建 D1
    npx wrangler d1 create chouka
    
    # 创建 R2
    npx wrangler r2 bucket create chouka-img
    ```

4.  **修改配置**
    将上一步生成的 ID 填入 `wrangler.toml` 文件中对应的位置。

5.  **初始化数据库**
    ```bash
    npx wrangler d1 execute chouka --remote --file=./schema.sql
    ```

6.  **部署**
    ```bash
    npx wrangler deploy
    ```

## 📝 环境变量说明

| 变量名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `admin` | Secret | 管理员后台密码 |
| `R2_DOMAIN` | Var | R2 存储桶的公开访问域名 (例如 `https://pub-xxx.r2.dev`) |

## 🤝 贡献
欢迎提交 Issue 和 Pull Request！

## 📄 License
MIT