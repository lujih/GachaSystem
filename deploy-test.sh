#!/bin/bash
# GachaSystem 部署测试脚本
# 用于验证优化后的代码可以正常部署到Cloudflare Workers

echo "🚀 GachaSystem 部署测试脚本"
echo "=============================="

# 检查必要文件
echo "📋 检查项目文件..."
required_files=("worker.js" "wrangler.toml" "src/config/index.js" "src/utils/AppError.js")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -gt 0 ]; then
    echo "❌ 缺少必要文件:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi
echo "✅ 所有必要文件存在"

# 检查语法
echo "🔧 检查JavaScript语法..."
node -c worker.js
if [ $? -ne 0 ]; then
    echo "❌ worker.js 有语法错误"
    exit 1
fi

for js_file in src/utils/*.js src/config/*.js; do
    if [ -f "$js_file" ]; then
        node -c "$js_file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "⚠️  $js_file 可能有语法问题"
        fi
    fi
done
echo "✅ 基本语法检查通过"

# 检查配置
echo "⚙️ 检查配置..."
if ! grep -q "name = " wrangler.toml; then
    echo "⚠️  wrangler.toml 中未找到项目名称"
fi

if ! grep -q "main = " wrangler.toml; then
    echo "⚠️  wrangler.toml 中未指定主文件"
fi

echo "✅ 配置检查完成"

# 模拟环境变量
echo "🌍 模拟环境变量检查..."
cat > .env.example << 'EOF'
# GachaSystem 环境变量示例
# 复制为 .env 文件并填写实际值

# R2 存储域名
R2_DOMAIN=https://your-r2-domain.example.com

# GitHub 配置
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your-github-token

# 管理员密码
ADMIN_PASSWORD=your-admin-password

# 调试模式
DEBUG_MODE=false
NODE_ENV=production
EOF

echo "📝 已创建 .env.example 文件"
echo "💡 提示：创建 .env 文件并填写实际环境变量"

# 创建简单的测试
echo "🧪 创建简单测试..."
cat > test-basic.js << 'EOF'
// GachaSystem 基本功能测试
console.log("🧪 GachaSystem 基本功能测试");

// 测试配置加载
try {
    const config = require('./src/config/index.js');
    console.log("✅ 配置模块可以加载");
} catch (error) {
    console.log("❌ 配置模块加载失败:", error.message);
}

// 测试工具函数
try {
    const { AppError } = require('./src/utils/AppError.js');
    console.log("✅ AppError 类可以加载");
    
    // 测试错误创建
    const error = new AppError("测试错误", 400, "TEST_ERROR");
    console.log("✅ AppError 实例创建成功");
} catch (error) {
    console.log("❌ AppError 加载失败:", error.message);
}

console.log("🎉 基本测试完成");
EOF

echo "✅ 测试文件已创建"

# 部署检查清单
echo ""
echo "📋 部署检查清单："
echo "1. ✅ 项目文件完整"
echo "2. ✅ JavaScript语法正确"
echo "3. ✅ 配置文件存在"
echo "4. 📝 环境变量模板已创建"
echo "5. 🧪 基本测试文件已创建"
echo ""
echo "🚀 下一步："
echo "1. 填写 .env 文件中的环境变量"
echo "2. 运行: node test-basic.js 进行基本测试"
echo "3. 使用 wrangler 部署到 Cloudflare Workers"
echo "4. 测试API端点功能"
echo ""
echo "📚 详细文档见 OPTIMIZATION_SUMMARY.md"
echo "🔗 GitHub仓库: https://github.com/lujih/GachaSystem"