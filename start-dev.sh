#!/bin/bash

# Minority Game Development Startup Script
echo "🚀 启动 Minority Game 开发环境..."

# 检查是否安装了必要的工具
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 请先安装 Node.js"
    exit 1
fi

# 启动后端
echo "📡 启动后端服务器..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi
npm run dev &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端启动..."
sleep 3

# 启动前端
echo "🌐 启动前端服务器..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo "✅ 开发环境已启动!"
echo "📡 后端: http://localhost:4000"
echo "🌐 前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap "echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait 