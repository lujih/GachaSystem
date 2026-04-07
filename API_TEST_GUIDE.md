# GachaSystem API 测试指南

## 📋 概述
本文档提供优化后的GachaSystem API测试指南，用于验证第一阶段优化效果。

## 🚀 快速测试

### 1. 基本健康检查
```bash
# 使用curl测试健康端点
curl -X GET "https://你的workers域名/api/system/health"
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-04-07T08:34:00.000Z",
    "version": "1.0.0",
    "services": {
      "kv": true,
      "d1": true,
      "r2": true
    }
  }
}
```

### 2. 配置检查
```bash
curl -X GET "https://你的workers域名/api/system/config"
```

## 🔧 API端点测试

### 用户相关API

#### 用户注册
```bash
curl -X POST "https://你的workers域名/api/user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!",
    "nickname": "测试用户"
  }'
```

**测试用例：**
1. ✅ 正常注册
2. ❌ 用户名过短（<3字符）
3. ❌ 用户名包含非法字符
4. ❌ 密码过短（<6字符）
5. ❌ 昵称为空

#### 用户登录
```bash
curl -X POST "https://你的workers域名/api/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }'
```

### 抽卡相关API

#### 单次抽卡
```bash
curl -X GET "https://你的workers域名/api/gacha/draw?user_id=用户ID&pool=normal"
```

**需要Header：**
```bash
curl -X GET "https://你的workers域名/api/gacha/draw?pool=normal" \
  -H "X-User-ID: 用户ID"
```

#### 十连抽
```bash
curl -X GET "https://你的workers域名/api/gacha/multi-draw?user_id=用户ID&pool=normal"
```

### 卡牌库API

#### 获取卡牌库
```bash
curl -X GET "https://你的workers域名/api/gacha/library?user_id=用户ID&page=1&pageSize=20"
```

**分页测试：**
- page=1, pageSize=10
- page=0（应该返回错误）
- pageSize=101（应该返回错误，最大100）

#### 按稀有度筛选
```bash
curl -X GET "https://你的workers域名/api/gacha/library?user_id=用户ID&rarity=UR"
```

### 管理员API

#### 获取变更日志
```bash
curl -X GET "https://你的workers域名/api/admin/changelog" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "管理员密码"
  }'
```

#### 添加变更日志
```bash
curl -X POST "https://你的workers域名/api/admin/changelog" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "管理员密码",
    "date": "2026-04-07",
    "ver": "v1.1.0",
    "content": "代码质量优化完成",
    "tag": "success"
  }'
```

## 🧪 错误处理测试

### 验证错误处理
```bash
# 测试验证错误
curl -X POST "https://你的workers域名/api/user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",  # 过短
    "password": "123"   # 过短
  }'
```

**预期响应：**
```json
{
  "success": false,
  "error": "输入验证失败",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "timestamp": "2026-04-07T08:34:00.000Z",
  "details": {
    "errors": [
      {"field": "username", "error": "用户名长度至少需要3位"},
      {"field": "password", "error": "密码长度至少需要6位"}
    ]
  }
}
```

### 认证错误
```bash
# 测试缺少用户ID
curl -X GET "https://你的workers域名/api/gacha/draw"
```

**预期响应：**
```json
{
  "success": false,
  "error": "需要用户ID",
  "code": "AUTH_ERROR",
  "statusCode": 401,
  "timestamp": "2026-04-07T08:34:00.000Z"
}
```

### 权限错误
```bash
# 测试错误的管理员密码
curl -X GET "https://你的workers域名/api/admin/changelog" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "wrongpassword"
  }'
```

### 未找到错误
```bash
# 测试不存在的API端点
curl -X GET "https://你的workers域名/api/nonexistent"
```

## ⚡ 性能测试

### 响应时间监控
```bash
# 使用time命令测试响应时间
time curl -s -o /dev/null -w "%{http_code}" "https://你的workers域名/api/system/health"
```

### 并发测试（简单版）
```bash
# 同时发起5个请求
for i in {1..5}; do
  curl -s "https://你的workers域名/api/system/health" &
done
wait
```

## 🔒 安全性测试

### 输入验证测试
```bash
# SQL注入尝试
curl -X POST "https://你的workers域名/api/user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin\"; DROP TABLE users; --",
    "password": "password123",
    "nickname": "黑客"
  }'
```

### XSS尝试
```bash
curl -X POST "https://你的workers域名/api/user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "xssuser",
    "password": "password123",
    "nickname": "<script>alert(\"xss\")</script>"
  }'
```

## 📊 测试结果记录表

| 测试项目 | 测试用例 | 预期结果 | 实际结果 | 通过 |
|---------|---------|---------|---------|------|
| 健康检查 | GET /api/system/health | 返回健康状态 | | |
| 用户注册 | 正常注册 | 注册成功 | | |
| 用户注册 | 用户名过短 | 验证错误 | | |
| 用户登录 | 正常登录 | 登录成功 | | |
| 单次抽卡 | 有效用户ID | 抽卡成功 | | |
| 单次抽卡 | 缺少用户ID | 认证错误 | | |
| 十连抽 | 有效用户ID | 十连成功 | | |
| 卡牌库 | 分页查询 | 返回分页数据 | | |
| 卡牌库 | 无效页码 | 验证错误 | | |
| 变更日志 | 管理员权限 | 返回日志 | | |
| 变更日志 | 错误密码 | 认证错误 | | |
| 错误处理 | 验证错误 | 结构化错误 | | |
| 错误处理 | 未找到端点 | 404错误 | | |

## 🚀 自动化测试脚本

创建 `run-api-tests.sh`：

```bash
#!/bin/bash
BASE_URL="https://你的workers域名"

echo "🧪 开始API测试..."

# 健康检查
echo "1. 测试健康检查..."
curl -s "$BASE_URL/api/system/health" | jq '.status' | grep -q "healthy" && echo "✅ 通过" || echo "❌ 失败"

# 更多测试...
```

## 📝 测试注意事项

1. **测试环境**：先在测试环境进行完整测试
2. **数据清理**：测试完成后清理测试数据
3. **错误处理**：验证所有错误情况都被正确处理
4. **性能基准**：记录性能基准，用于后续优化对比
5. **安全测试**：确保所有安全漏洞都被修复

## 🔗 相关文档

- `OPTIMIZATION_SUMMARY.md` - 优化总结
- `deploy-test.sh` - 部署测试脚本
- 源代码中的JSDoc注释

---

**测试完成后，如果所有功能正常，可以部署到生产环境！** 🎉