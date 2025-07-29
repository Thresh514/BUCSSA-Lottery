#!/bin/bash

echo "=== 少数派游戏系统开发环境启动脚本 ==="
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查Redis
echo "🔍 检查Redis服务..."
if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis客户端未找到，尝试启动Docker Redis..."
    if command -v docker &> /dev/null; then
        echo "🐳 启动Docker Redis容器..."
        docker run -d --name lottery-redis -p 6379:6379 redis:alpine
        echo "✅ Redis容器已启动"
    else
        echo "❌ 请安装Redis或Docker"
        echo "   macOS: brew install redis"
        echo "   Ubuntu: sudo apt-get install redis-server"
        exit 1
    fi
else
    # 测试Redis连接
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis 服务运行正常"
    else
        echo "⚠️  Redis服务未运行，尝试启动..."
        if command -v brew &> /dev/null; then
            brew services start redis
        elif command -v systemctl &> /dev/null; then
            sudo systemctl start redis
        else
            echo "❌ 请手动启动Redis服务"
            exit 1
        fi
    fi
fi

# 检查环境变量文件
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local 文件不存在，创建示例配置..."
    cat > .env.local << EOF
# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 密钥 (生产环境请使用复杂密钥)
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production

# 邮件服务配置 (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_app_password

# 应用配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEFAULT_ROOM_ID=main_room
EOF
    echo "✅ 已创建 .env.local 示例文件"
    echo "📝 请编辑 .env.local 文件配置您的邮箱信息"
fi

# 安装依赖
if [ ! -d node_modules ]; then
    echo "📦 安装项目依赖..."
    npm install
    echo "✅ 依赖安装完成"
fi

echo ""
echo "🚀 启动开发服务器..."
echo "📱 用户端: http://localhost:3000"
echo "🖥️  管理端: http://localhost:3000/admin"
echo "📧 请确保已配置邮箱服务"
echo ""

# 启动开发服务器
npm run dev 