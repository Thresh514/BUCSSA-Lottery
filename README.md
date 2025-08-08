# Minority Game - 前后端分离架构

这是一个重构后的少数派游戏项目，采用前后端分离的 monorepo 架构。

## 📁 项目结构

```
minority-game/
├── frontend/                 # Next.js 前端项目
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # React 组件
│   │   ├── lib/            # 前端工具函数
│   │   └── types/          # TypeScript 类型定义
│   ├── public/             # 静态资源
│   ├── package.json        # 前端依赖
│   └── .env.local          # 前端环境变量
├── backend/                 # Node.js + Socket.IO 后端项目
│   ├── src/
│   │   ├── lib/            # 后端工具函数 (Redis, Game Logic)
│   │   ├── routes/         # Express API 路由
│   │   └── socket/         # Socket.IO 相关
│   ├── package.json        # 后端依赖
│   └── .env               # 后端环境变量
└── start-dev.sh           # 开发环境启动脚本
```

## 🚀 快速开始

### 方法一：使用启动脚本（推荐）

```bash
cd minority-game
./start-dev.sh
```

### 方法二：手动启动

#### 1. 启动后端
```bash
cd minority-game/backend
npm install
npm run dev
```

#### 2. 启动前端
```bash
cd minority-game/frontend
npm install
npm run dev
```

## 🌐 访问地址

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:4000
- **健康检查**: http://localhost:4000/health

## 📡 API 端点

### 游戏相关
- `POST /api/submit-answer` - 提交答案
- `GET /api/admin/game-stats` - 获取游戏统计
- `POST /api/admin/next-question` - 发布下一题
- `POST /api/admin/reset-game` - 重置游戏

## 🔧 环境变量配置

### 前端 (.env.local)
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
```

### 后端 (.env)
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
```

## 📦 依赖管理

每个子项目都有独立的 `package.json`：

- **前端依赖**: React, Next.js, Tailwind CSS, Socket.IO Client
- **后端依赖**: Express, Socket.IO, Redis, CORS

## 🔄 重构变更

### 从原项目迁移的主要变更：

1. **API 路由迁移**: 将 Next.js API Routes 迁移到 Express 路由
2. **Socket.IO 分离**: 后端独立运行 Socket.IO 服务器
3. **环境变量分离**: 前后端使用独立的环境变量文件
4. **依赖优化**: 移除前端不必要的后端依赖

### 代码变更示例：

**前端 API 调用**:
```typescript
// 之前
fetch('/api/submit-answer', { ... })

// 现在
fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/submit-answer`, { ... })
```

## 🛠️ 开发指南

### 添加新的 API 端点

1. 在 `backend/src/routes/` 创建新的路由文件
2. 在 `backend/src/index.ts` 中注册路由
3. 在前端使用 `process.env.NEXT_PUBLIC_API_BASE` 调用

### 添加新的 Socket.IO 事件

1. 在 `backend/src/lib/socket.ts` 中添加事件处理
2. 在前端使用 Socket.IO Client 连接

## 🐛 故障排除

### 常见问题

1. **端口冲突**: 确保 3000 和 4000 端口未被占用
2. **Redis 连接**: 确保 Redis 服务器正在运行
3. **CORS 错误**: 检查 `FRONTEND_URL` 环境变量配置

### 调试技巧

- 后端日志会显示在控制台
- 前端开发工具可以查看网络请求
- 使用浏览器开发者工具调试 Socket.IO 连接

## �� 许可证

MIT License 