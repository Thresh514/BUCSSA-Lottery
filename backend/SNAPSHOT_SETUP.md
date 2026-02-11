# Round Snapshot 设置说明

## 已完成的工作

1. ✅ 添加了 Prisma schema（`backend/prisma/schema.prisma`）
2. ✅ 添加了数据库操作模块（`backend/src/lib/database.ts`）
3. ✅ 修改了游戏逻辑（`backend/src/lib/game.ts`）
4. ✅ 更新了依赖（`backend/package.json`）

## 需要手动完成的步骤

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

在 `backend/.env` 文件中添加：

```env
DATABASE_URL="你的Railway PostgreSQL连接字符串"
```

**注意**：这个 `DATABASE_URL` 应该和 `frontend/.env.local` 中的相同。

### 3. 运行数据库迁移（前端）

```bash
cd frontend
npx prisma migrate dev --name add_round_snapshots
```

这会创建 RoundSnapshot、RoundElimination 和 GameResult 表。

### 4. 生成 Prisma Client（后端）

```bash
cd backend
npx prisma generate
```

这会生成 Prisma Client，供后端使用。

### 5. 测试

1. 启动后端服务器
2. 完成一轮游戏
3. 检查 PostgreSQL 数据库，确认 RoundSnapshot 和 RoundElimination 数据已写入
4. 完成游戏，检查 GameResult 数据已写入

## 功能说明

### Round Snapshot（每轮快照）
- **写入时机**：每轮游戏结束时
- **写入方式**：异步（Fire-and-forget）
- **作用**：备份数据，用于复盘和恢复

### Game Result（游戏结果）
- **写入时机**：游戏结束时
- **写入方式**：同步（带 500ms 超时保护）
- **作用**：关键数据，必须持久化（Winner/Tier）

## 注意事项

- 确保 `DATABASE_URL` 配置正确
- 确保前端已运行过 migration
- 如果数据库写入失败，游戏流程不受影响（Redis 已保存）
