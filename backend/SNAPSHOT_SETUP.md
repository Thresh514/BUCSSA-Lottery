# Round Snapshot（Redis 崩溃恢复）设置说明

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
npx prisma migrate dev --name latest_snapshot_recovery
```

这会更新/创建 `RoundSnapshot`（最新快照）和 `GameResult` 表结构（以及历史遗留的 `RoundElimination` 若存在）。

### 4. 生成 Prisma Client（后端）

```bash
cd backend
npx prisma generate
```

这会生成 Prisma Client，供后端使用。

### 5. 测试

1. 启动后端服务器
2. 完成一轮游戏，并进入下一轮前的 `waiting` 状态
3. 检查 PostgreSQL 数据库，确认 `RoundSnapshot` 已 upsert（只会有**一条**最新记录），其中 `survivorEmails` 为当前存活用户邮箱列表
4. 可选：完成游戏，检查 `GameResult` 数据已写入
5. （恢复验证）清空 Redis（模拟崩溃）后重新连接 Socket，确认存活用户仍能继续下一轮

## 功能说明

### Round Snapshot（最新快照）
- **写入时机**：每轮结算结束后、进入下一轮前的 `waiting` 状态（轮次边界）
- **写入方式**：Upsert（单条记录），异步（Fire-and-forget）
- **作用**：仅用于 **Redis 崩溃/重启导致状态丢失** 时，回填最小可继续状态（存活用户邮箱 + 轮次号 + started）

### Game Result（游戏结果）
- **写入时机**：游戏结束时
- **写入方式**：同步（带 500ms 超时保护）
- **作用**：关键数据，必须持久化（Winner/Tier）

## 注意事项

- 确保 `DATABASE_URL` 配置正确
- 确保前端已运行过 migration，并在 Railway 部署时执行 `prisma migrate deploy`
- 如果数据库写入失败，游戏流程不受影响（Redis 已保存）
