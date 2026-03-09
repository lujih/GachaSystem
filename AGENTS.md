# AGENTS.md - Chouka GachaSystem 开发指南

## 项目概述

基于 Cloudflare Workers 的二次元抽卡系统，使用 D1 (SQLite)、KV、R2 存储。

## 技术栈

- **运行时**: Cloudflare Workers (ES Modules)
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **存储**: Cloudflare R2
- **部署**: Wrangler

---

## 命令

### 本地开发

```bash
# 本地开发（使用本地 D1/KV）
npx wrangler dev --local

# 使用远程 D1 开发
npx wrangler dev

# 部署到 Cloudflare
npx wrangler deploy
```

### 数据库操作

```bash
# 初始化数据库
npx wrangler d1 execute chouka --remote --file=./schema.sql

# 查看 D1 数据
npx wrangler d1 execute chouka --remote --command="SELECT * FROM users"
```

### 测试

项目未配置自动化测试框架。手动测试方式：

1. 使用 `wrangler dev` 启动本地服务
2. 使用 curl 测试 API：

```bash
# 注册
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}' \
  http://localhost:8787/auth/register

# 登录
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}' \
  http://localhost:8787/auth/login

# 抽卡（需带上 token）
curl -H "X-Session-Token: <token>" \
  http://localhost:8787/draw
```

---

## 代码风格

### 通用规则

- 使用 ES Modules (`import`/`export`)
- 文件编码: UTF-8
- 缩进: 2 空格
- 语句结尾不强制分号
- 注释语言: 中文（与项目语言一致）

### 命名约定

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 文件 | kebab-case | `user-service.js` |
| 函数/变量 | camelCase | `getUserInfo`, `currentUser` |
| 常量 | UPPER_SNAKE_CASE | `BUSINESS_CONFIG`, `TTL` |
| 类 | PascalCase | `UserService`, `GachaService` |
| 数据库表 | snake_case | `users`, `user_uploads` |

### 导入规范

```javascript
// 模块导入（按顺序分组）
import { CONFIG, BUSINESS_CONFIG } from './src/config/index.js';
import { jsonResponse, safeJsonParse } from './src/utils/response.js';
import { UserService } from './src/services/user-service.js';
import { GachaService } from './src/services/gacha-service.js';
```

### 路由定义

使用对象映射表，格式: `'METHOD /path' => handler`

```javascript
const routes = {
  'GET /': () => handleRoute(() => handleHome(env)),
  'GET /user/info': () => handleRoute(() => userService.getInfo(currentUser)),
  'POST /auth/login': () => handleRoute(() => userService.login(request)),
  'GET /draw': () => handleRoute(() => gachaService.draw(currentUser)),
};
```

### 错误处理

统一使用 try/catch 包装路由处理器：

```javascript
const handleRoute = async (handler) => {
  try {
    return await handler();
  } catch (err) {
    console.error('Route Error:', err);
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
};
```

### 响应格式

使用 `jsonResponse(data, status, headers)` 工具函数：

```javascript
// 成功响应
return jsonResponse({ success: true, data: {...} });

// 错误响应
return jsonResponse({ error: '错误信息' }, 400);

// 带自定义 header
return jsonResponse(data, 200, { 'Cache-Control': 'no-store' });
```

### 请求处理

从请求体解析 JSON：

```javascript
const { username, password } = await request.json();
```

获取请求头：

```javascript
const token = request.headers.get('X-Session-Token');
const userId = request.headers.get('X-User-ID');
```

### 数据库操作

使用 D1 prepare API：

```javascript
// 查询单条
const user = await env.DB.prepare(
  'SELECT id, username FROM users WHERE username = ?'
).bind(username).first();

// 增删改
await env.DB.prepare(
  'UPDATE users SET coins = ? WHERE id = ?'
).bind(newCoins, userId).run();
```

### KV 操作

```javascript
// 读取
const value = await env.KV_CACHE.get(`session:${token}`);

// 写入（可选带过期时间）
await env.KV_CACHE.put(`session:${token}`, JSON.stringify(userData), {
  expirationTtl: 86400
});

// 删除
await env.KV_CACHE.delete(`session:${token}`);
```

### 异步处理

对于需要异步写入的操作，使用 `ctx.waitUntil`：

```javascript
ctx.waitUntil(asyncFunction());
```

---

## 项目结构

```
GachaSystem/
├── worker.js          # 主入口（路由 + 处理器）
├── wrangler.toml      # Workers 配置
├── schema.sql         # 数据库结构
├── src/
│   ├── config/        # 配置文件
│   │   ├── index.js
│   │   ├── business.js   # 业务配置
│   │   └── technical.js  # 技术配置
│   ├── utils/         # 工具函数
│   │   ├── response.js   # HTTP 响应工具
│   │   └── time.js       # 时间处理工具
│   └── services/      # 业务服务
│       ├── user-service.js
│       └── gacha-service.js
└── README.md
```

---

## 常用变量

| 变量 | 说明 |
|------|------|
| `env` | Cloudflare Workers 环境对象（含 DB, KV, R2） |
| `ctx` | ExecutionContext（用于 waitUntil） |
| `request` | FetchEvent 请求对象 |
| `currentUser` | 当前登录用户（从 token 解析） |

---

## 注意事项

1. **调试模式**: 使用 `X-User-ID` 请求头可绕过登录（仅开发环境）
2. **管理后台**: 通过 `password` 字段传递 admin 密码验证
3. **时区**: 使用北京时间（`getBeijingTime()`）处理日期
4. **图片存储**: 抽卡图片自动上传到 GitHub + R2
