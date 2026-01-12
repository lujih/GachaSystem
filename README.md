# Cloudflare Workers Gacha System

一个基于 Cloudflare Workers 的现代化抽卡系统，具有完整的游戏化功能和精美的用户界面。

## 📋 项目介绍

这是一个功能丰富的抽卡系统，允许用户进行抽卡、合成、商店购买、骰子游戏等操作。系统使用 Cloudflare Workers 作为后端，R2 存储图片，KV 存储用户数据，提供高性能和可扩展性。

### 主要特性

- **🎯 双卡池系统**：常驻池和限定池，满足不同抽卡需求
- **🛠️ 卡片合成**：消耗低阶卡片合成高阶卡片
- **🏪 积分商店**：使用积分购买指定稀有度卡包
- **🎲 骰子游戏**：猜大小游戏，赢取更多积分
- **📊 用户系统**：个性化用户名、称号系统和排行榜
- **🖼️ 图库展示**：展示所有用户抽到的图片
- **📱 响应式设计**：适配桌面和移动设备
- **🌐 多语言支持**：中英文界面切换
- **🔧 管理面板**：管理员可以管理用户、更新日志和公告

### 技术栈

- **后端**：Cloudflare Workers (JavaScript)
- **存储**：Cloudflare R2 (图片存储)、Cloudflare KV (用户数据)
- **前端**：HTML5、CSS3、JavaScript (原生)
- **部署**：Wrangler CLI

## 🚀 快速部署

### 前提条件

1. 安装 [Node.js](https://nodejs.org/) (v16+)
2. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
3. Cloudflare 账户和 Workers 权限

### 部署步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/cloudflare-workers-gacha.git
   cd cloudflare-workers-gacha
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   创建 `wrangler.toml` 文件或使用现有配置：
   ```toml
   name = "gacha-system"
   main = "worker.js"
   compatibility_date = "2024-01-01"
   
   [[kv_namespaces]]
   binding = "USER_RECORDS"
   id = "your-kv-namespace-id"
   
   [[kv_namespaces]]
   binding = "RECENT_REQUESTS"
   id = "your-recent-kv-namespace-id"
   
   [[r2_buckets]]
   binding = "R2_BUCKET"
   bucket_name = "your-bucket-name"
   
   [vars]
   admin = "your-admin-password"
   ```

4. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

5. **创建 KV 命名空间**
   ```bash
   npx wrangler kv:namespace create "USER_RECORDS"
   npx wrangler kv:namespace create "RECENT_REQUESTS"
   ```

6. **创建 R2 存储桶**
   ```bash
   npx wrangler r2 bucket create "your-bucket-name"
   ```

7. **部署 Worker**
   ```bash
   npx wrangler deploy
   ```

## 📖 使用说明

### 用户功能

1. **注册登录**
   - 首次访问需要设置用户名（1-12个字符）
   - 系统会自动生成 UUID 并存储在本地

2. **抽卡系统**
   - **常驻池**：免费抽卡，获得随机稀有度卡片
   - **限定池**：消耗 500 积分抽卡，获得特定稀有度卡片
   - 稀有度等级：N、R、SR、SSR、UR

3. **积分系统**
   - 抽卡获得积分：N(5)、R(10)、SR(30)、SSR(100)、UR(500)
   - 积分可用于商店购买和限定池抽卡

4. **卡片合成**
   - 消耗 5 张低阶卡片合成 1 张高阶卡片
   - 合成路径：5×N → R、5×R → SR、5×SR → SSR、5×SSR → UR

5. **商店系统**
   - 使用积分购买指定稀有度卡包
   - 价格：R(100)、SR(500)、SSR(2000)、UR(8000)

6. **骰子游戏**
   - 猜大小游戏（1-3为小，4-6为大）
   - 赔率 1:1，下注范围 10-1000

### 管理员功能

1. **访问管理面板**
   - 在用户资料页面点击 "Admin Panel"
   - 输入管理员密码（在环境变量中配置）

2. **管理功能**
   - **用户管理**：查看、删除用户，修改用户积分
   - **更新日志**：编辑系统更新日志
   - **公告管理**：发布和管理系统公告

## 🔧 API 接口

### 用户相关
- `GET /user/info` - 获取用户信息
- `POST /user/update` - 更新用户名
- `POST /user/craft` - 卡片合成

### 抽卡相关
- `GET /draw` - 常驻池抽卡
- `POST /draw/limited` - 限定池抽卡
- `POST /shop/buy` - 商店购买
- `POST /game/dice` - 骰子游戏

### 展示相关
- `GET /showcase` - 获取展示图片
- `GET /library` - 图库页面
- `GET /changelog` - 获取更新日志
- `GET /announcement` - 获取公告

### 管理相关
- `POST /admin/verify` - 管理员验证
- `POST /admin/users` - 获取用户列表
- `POST /admin/save-changelog` - 保存更新日志
- `POST /admin/save-announcement` - 保存公告

## 🗂️ 项目结构

```
cloudflare-workers-gacha/
├── worker.js          # 主 Worker 文件
├── README.md          # 项目文档
├── package.json       # 项目配置
├── wrangler.toml      # Wrangler 配置
└── (其他配置文件)
```

### 核心模块

1. **配置模块** (`CONFIG`)
   - 图源配置、游戏参数、存储配置

2. **用户服务** (`UserService`)
   - 用户数据管理、用户信息查询

3. **抽卡服务** (`GachaService`)
   - 抽卡逻辑、图片获取、交易结算

4. **辅助函数**
   - 排行榜更新、图库索引、HTML 生成

## 🔒 环境变量配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `admin` | 管理员密码 | `my-secret-password` |
| `USER_RECORDS` | KV 命名空间绑定 | (自动绑定) |
| `RECENT_REQUESTS` | KV 命名空间绑定 | (自动绑定) |
| `R2_BUCKET` | R2 存储桶绑定 | (自动绑定) |

## 📊 数据存储

### KV 存储结构
- `user:{userId}` - 用户数据（积分、抽卡次数、库存）
- `name:{username}` - 用户名到用户ID的映射
- `buffer:{userId}` - 预加载的图片数据
- `SYSTEM_GALLERY_INDEX_V1` - 图库索引
- `SYSTEM_CHANGELOG` - 更新日志
- `SYSTEM_ANNOUNCEMENT` - 系统公告
- `recent` - 最近抽卡记录

### R2 存储结构
- `images/{base64_username}___{timestamp}___{random}.jpg` - 用户抽到的图片

## 🐛 故障排除

### 常见问题

1. **部署失败**
   - 检查 `wrangler.toml` 配置
   - 确保 KV 和 R2 命名空间已创建并正确绑定

2. **图片无法显示**
   - 检查 R2 存储桶权限
   - 验证 `CONFIG.R2_DOMAIN` 配置是否正确

3. **用户数据丢失**
   - 检查 KV 命名空间绑定
   - 验证 TTL 设置是否合理

4. **管理员功能无法使用**
   - 检查环境变量 `admin` 是否正确设置
   - 验证管理员密码是否正确

### 日志查看
```bash
npx wrangler tail
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范
- 使用清晰的代码注释
- 遵循现有的代码风格
- 添加适当的错误处理
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持与联系

如有问题或建议，请：
1. 查看 [Issues](https://github.com/your-username/cloudflare-workers-gacha/issues)
2. 提交新的 Issue
3. 或通过其他方式联系维护者

## 🔄 更新日志

查看系统内的更新日志页面或访问 `/changelog` 接口获取最新更新信息。

---

**提示**：首次部署后，建议立即访问 Worker 地址并设置管理员密码，然后通过管理面板配置系统公告和更新日志。