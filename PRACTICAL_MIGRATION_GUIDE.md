# GachaSystem TypeScript 实战迁移指南

## 🎯 现状
- ✅ 项目已克隆到本地: `gacha-cn/`
- ✅ TypeScript 迁移目录已创建: `ts-migration/`
- ✅ 第一个工具文件已迁移: `validation.js` → `validation.ts`
- ✅ 类型定义已创建: `types/index.ts`
- ✅ 测试文件已创建: `validation.test.ts`

## 🚀 实战迁移步骤

### 步骤 1: 安装依赖
```bash
cd /root/.openclaw/workspace/gacha-cn/ts-migration
npm install
```

### 步骤 2: 验证 TypeScript 配置
```bash
# 类型检查
npm run type-check

# 运行测试
npm test

# 构建项目
npm run build
```

### 步骤 3: 逐步迁移文件

#### 3.1 迁移工具函数 (优先级: 高)
1. **已完成**: `utils/validation.js` → `utils/validation.ts`
2. **待迁移**: `utils/response.js` → `utils/response.ts`
3. **待迁移**: `utils/time.js` → `utils/time.ts`

#### 3.2 迁移配置 (优先级: 高)
1. **待迁移**: `config/constants.js` → `config/constants.ts`
2. **待迁移**: `config/index.js` → `config/index.ts`
3. **待迁移**: `config/business.js` → `config/business.ts`
4. **待迁移**: `config/technical.js` → `config/technical.ts`

#### 3.3 迁移服务层 (优先级: 中)
1. **待迁移**: `services/user-service.js` → `services/user-service.ts`
2. **待迁移**: `services/gacha-service.js` → `services/gacha-service.ts`
3. **待迁移**: `services/index.js` → `services/index.ts`

#### 3.4 迁移模板 (优先级: 低)
1. **待迁移**: `templates/*.js` → `templates/*.ts`

#### 3.5 迁移主入口 (优先级: 高)
1. **待迁移**: `worker.js` → `src/index.ts`

### 步骤 4: 创建迁移脚本

#### 4.1 查看原文件结构
```bash
cd /root/.openclaw/workspace/gacha-cn
find src -name "*.js" -type f
```

#### 4.2 手动迁移示例: `utils/response.js`
```bash
# 1. 查看原文件
cat src/utils/response.js

# 2. 创建 TypeScript 版本
# 编辑 ts-migration/src/utils/response.ts

# 3. 添加类型注解
# 4. 创建测试文件
# 5. 运行测试验证
```

### 步骤 5: 测试和验证

#### 5.1 单元测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- validation.test.ts

# 测试覆盖率
npm run test:coverage
```

#### 5.2 集成测试
```bash
# 创建集成测试目录
mkdir -p __tests__/integration

# 编写 API 测试
# 使用 Supertest 测试路由
```

#### 5.3 构建验证
```bash
# 构建项目
npm run build

# 检查输出
ls -la dist/
```

### 步骤 6: 更新配置文件

#### 6.1 更新 `wrangler.toml`
```toml
name = "chouka"
main = "dist/worker.js"  # 改为 TypeScript 编译输出
compatibility_date = "2026-03-03"
```

#### 6.2 创建数据库迁移
```bash
# 复制原数据库 schema
cp ../schema.sql .

# 创建 TypeScript 迁移脚本
# (如果需要)
```

### 步骤 7: 部署测试

#### 7.1 本地开发测试
```bash
# 启动开发服务器
npm run dev

# 测试 API 端点
curl http://localhost:8787/
```

#### 7.2 部署到测试环境
```bash
# 构建项目
npm run build

# 部署到 Cloudflare Workers
npm run deploy
```

## 🔧 具体文件迁移示例

### 示例: 迁移 `utils/response.js`

**原文件内容**:
```javascript
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
}
```

**TypeScript 版本** (`utils/response.ts`):
```typescript
import { ApiResponse } from '../types';

export function jsonResponse<T>(
  data: ApiResponse<T> | any, 
  status: number = 200, 
  headers: Record<string, string> = {}
): Response {
  const responseData = data.success !== undefined ? data : { success: true, data };
  
  return new Response(JSON.stringify(responseData), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function safeJsonParse<T = any>(
  str: string, 
  defaultValue: T | null = null
): T | null {
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    return defaultValue;
  }
}

export function requireAdmin(password: string, envAdmin: string): boolean {
  return password === envAdmin;
}
```

### 示例: 迁移 `config/constants.js`

**TypeScript 版本** (`config/constants.ts`):
```typescript
import { Config } from '../types';

export const BUSINESS_CONFIG: Config['BUSINESS'] = {
  RARITY_PROBABILITIES: {
    N: 0.50,
    R: 0.30,
    SR: 0.15,
    SSR: 0.04,
    UR: 0.01
  },
  RARITY_POINTS: {
    N: 5,
    R: 15,
    SR: 50,
    SSR: 200,
    UR: 1000
  },
  // ... 其他配置
};

export const TECHNICAL_CONFIG: Config['TECHNICAL'] = {
  SESSION_EXPIRY: 24 * 60 * 60,
  RATE_LIMIT_WINDOW: 60,
  RATE_LIMIT_MAX: 60,
  // ... 其他配置
};
```

## 🧪 测试策略

### 1. 单元测试覆盖
- 每个工具函数都要有测试
- 测试边界条件
- 测试错误情况

### 2. 集成测试
- 测试 API 端点
- 测试数据库操作
- 测试外部服务集成

### 3. 端到端测试
- 测试完整用户流程
- 测试跨浏览器兼容性
- 测试性能

## 🔄 迁移工作流

### 每日工作流程
```bash
# 1. 选择要迁移的文件
# 2. 创建 TypeScript 版本
# 3. 添加类型注解
# 4. 编写测试
# 5. 运行测试验证
# 6. 提交更改
```

### Git 工作流
```bash
# 创建功能分支
git checkout -b migrate/utils-response

# 迁移文件
# 编辑 ts-migration/src/utils/response.ts

# 提交更改
git add .
git commit -m "feat: migrate response utilities to TypeScript"

# 推送到远程
git push origin migrate/utils-response

# 创建 Pull Request
```

## 🐛 常见问题解决

### 问题 1: 类型导入错误
```typescript
// 错误: Cannot find module '../types'
// 解决: 确保 types/index.ts 存在并导出
export * from './types';
```

### 问题 2: Cloudflare Workers 类型错误
```typescript
// 错误: Property 'DB' does not exist on type 'Env'
// 解决: 更新 types/index.ts 中的 Env 接口
export interface Env {
  DB: D1Database;
  // ... 其他绑定
}
```

### 问题 3: 测试运行失败
```bash
# 错误: Jest encountered an unexpected token
# 解决: 确保安装了 ts-jest
npm install --save-dev ts-jest @types/jest

# 更新 jest.config.js
preset: 'ts-jest'
```

## 📊 进度跟踪

### 已完成
- [x] 项目克隆和设置
- [x] TypeScript 基础配置
- [x] 验证工具迁移
- [x] 类型定义创建
- [x] 测试框架配置

### 进行中
- [ ] 响应工具迁移 (`utils/response.ts`)
- [ ] 时间工具迁移 (`utils/time.ts`)
- [ ] 配置迁移 (`config/` 目录)
- [ ] 服务层迁移 (`services/` 目录)

### 待进行
- [ ] 模板迁移 (`templates/` 目录)
- [ ] 主入口迁移 (`worker.js` → `index.ts`)
- [ ] 集成测试编写
- [ ] 部署验证

## 🦐 实战建议

### 1. 从小处开始
- 先迁移简单的工具函数
- 验证类型系统工作正常
- 逐步增加复杂度

### 2. 测试驱动
- 为每个迁移的功能编写测试
- 确保迁移不影响现有功能
- 保持高测试覆盖率

### 3. 类型安全
- 避免使用 `any` 类型
- 使用类型守卫进行运行时检查
- 为第三方库添加类型定义

### 4. 文档更新
- 更新代码注释
- 更新 API 文档
- 更新开发指南

## 🎉 开始实战迁移！

你现在可以:

1. **进入迁移目录**: `cd /root/.openclaw/workspace/gacha-cn/ts-migration`
2. **安装依赖**: `npm install`
3. **开始迁移**: 选择下一个要迁移的文件
4. **测试验证**: `npm test`

需要我帮你迁移下一个文件吗？比如 `utils/response.js` 或 `config/constants.js`？