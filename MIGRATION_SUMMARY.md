# 🚀 Minority Game 重构总结

## ✅ 重构完成！

你的项目已成功重构为前后端分离的 monorepo 架构。

## 📁 新的项目结构

```
minority-game/
├── frontend/                 # Next.js 前端 (端口 3000)
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # React 组件
│   │   ├── lib/            # 前端工具函数
│   │   └── types/          # TypeScript 类型
│   ├── public/             # 静态资源
│   ├── package.json        # 前端依赖
│   └── .env.local          # 前端环境变量
├── backend/                 # Node.js + Socket.IO 后端 (端口 4000)
│   ├── src/
│   │   ├── lib/            # 后端工具函数
│   │   ├── routes/         # Express API 路由
│   │   └── socket/         # Socket.IO 相关
│   ├── package.json        # 后端依赖
│   └── .env               # 后端环境变量
├── README.md               # 项目说明
├── start-dev.sh           # 一键启动脚本
└── MIGRATION_SUMMARY.md   # 本文件
```

## 🔄 主要变更

### 1. API 路由迁移
- **之前**: Next.js API Routes (`/api/*`)
- **现在**: Express 路由 (`backend/src/routes/*`)

### 2. 依赖分离
- **前端**: 移除 Redis、JWT、Nodemailer 等后端依赖
- **后端**: 添加 CORS、Express 路由等

### 3. 环境变量分离
- **前端**: `.env.local` - 仅包含前端相关配置
- **后端**: `.env` - 包含 Redis、JWT 等后端配置

### 4. API 调用更新
```typescript
// 之前
fetch('/api/submit-answer', { ... })

// 现在
fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/submit-answer`, { ... })
```

## 🚀 如何启动

### 方法一：一键启动（推荐）
```bash
cd minority-game
./start-dev.sh
```

### 方法二：分别启动
```bash
# 启动后端
cd minority-game/backend
npm run dev

# 启动前端（新终端）
cd minority-game/frontend
npm run dev
```

## 🌐 访问地址

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:4000
- **健康检查**: http://localhost:4000/health

## 📡 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/submit-answer` | POST | 提交答案 |
| `/api/admin/game-stats` | GET | 获取游戏统计 |
| `/api/admin/next-question` | POST | 发布下一题 |
| `/api/admin/reset-game` | POST | 重置游戏 |

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

## ✅ 验证清单

- [x] 项目结构创建完成
- [x] 依赖安装完成
- [x] API 路由迁移完成
- [x] 环境变量配置完成
- [x] 前端 API 调用更新完成
- [x] 启动脚本创建完成
- [x] 文档编写完成

## 🎯 下一步

1. **启动项目**: 运行 `./start-dev.sh`
2. **测试功能**: 访问 http://localhost:3000 测试游戏
3. **配置环境**: 根据需要修改 `.env` 文件
4. **部署准备**: 准备生产环境配置

## 🐛 常见问题

### Q: 启动时出现端口冲突？
A: 确保 3000 和 4000 端口未被占用，或修改 `.env` 文件中的端口配置。

### Q: Redis 连接失败？
A: 确保 Redis 服务器正在运行，检查 `REDIS_URL` 配置。

### Q: CORS 错误？
A: 检查后端的 `FRONTEND_URL` 环境变量是否正确配置。

### Q: API 调用失败？
A: 确保后端服务器正在运行，检查 `NEXT_PUBLIC_API_BASE` 配置。

## 🎉 恭喜！

你的项目已成功重构为现代化的前后端分离架构！现在你可以：

- 独立开发和部署前后端
- 更好的代码组织和维护
- 更灵活的扩展和定制
- 更清晰的职责分离

享受你的新架构吧！🚀 