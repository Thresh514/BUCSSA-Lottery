# 少数派游戏后端系统

基于 Node.js + Socket.IO + Redis 的实时少数派游戏后端系统，支持多用户实时答题、自动淘汰和少数派晋级机制。

## 🎮 游戏规则

少数派游戏是一个基于群体决策的淘汰游戏：

1. **答题机制**：每轮提供 A/B 两个选项的题目
2. **时间限制**：每轮 30 秒答题时间
3. **淘汰规则**：选择多数派选项的用户被淘汰
4. **晋级机制**：选择少数派选项的用户晋级下一轮
5. **胜利条件**：最后存活的一名玩家获胜

## 🏗️ 技术架构

```
前端客户端 ←→ Socket.IO ←→ Node.js Server ←→ Redis
                ↑
管理端 ←→ Socket.IO
```

### 核心技术栈

- **后端框架**: Node.js + TypeScript + Express
- **实时通信**: Socket.IO v4.8.1
- **数据存储**: Redis v5.6.1
- **开发工具**: tsx (TypeScript 运行时)
- **环境管理**: dotenv

## 📁 项目结构

```
src/
├── index.ts              # 服务器入口文件
└── lib/
    ├── game.ts           # 游戏逻辑管理器
    ├── redis.ts          # Redis 连接和键值管理
    └── socket.ts         # Socket.IO 事件处理
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Redis 服务器
- TypeScript 支持

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

创建 `.env` 文件：

```env
# Redis 连接配置
REDIS_URL=redis://:password@host:port

# 前端应用地址
FRONTEND_URL=http://localhost:3000

# 默认游戏房间ID
DEFAULT_ROOM_ID=main_room

# 服务器端口
PORT=4000
```

### 3. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:4000` 启动

### 4. 生产环境部署

```bash
# 构建项目
npm run build

# 启动生产服务
npm start
```

## 🔌 WebSocket API

### 连接认证

客户端连接时需要提供邮箱认证：

```javascript
const socket = io('http://localhost:4000', {
  auth: {
    email: 'user@bu.edu'  // 支持 @bu.edu 和 @gmail.com
  }
});
```

### 客户端事件

#### 发送事件

- `submit_answer` - 提交答题
  ```javascript
  socket.emit('submit_answer', { answer: 'A' }); // 或 'B'
  ```

### 服务端事件

#### 接收事件

- `game_state` - 游戏状态更新
  ```javascript
  {
    status: 'waiting' | 'playing' | 'ended',
    currentQuestionId: string | null,
    round: number,
    timeLeft: number,
    totalPlayers: number,
    survivorsCount: number,
    eliminatedCount: number,
    onlineCount: number
  }
  ```

- `new_question` - 新题目发布
  ```javascript
  {
    question: {
      id: string,
      question: string,
      optionA: string,
      optionB: string
    },
    round: number,
    timeLeft: number,
    survivorsCount: number
  }
  ```

- `countdown` - 倒计时更新
  ```javascript
  { timeLeft: number }
  ```

- `round_result` - 轮次结果
  ```javascript
  {
    minorityOption: 'A' | 'B',
    minorityCount: number,
    majorityCount: number,
    eliminatedCount: number,
    survivorsCount: number,
    eliminatedUsers: string[]
  }
  ```

- `eliminated` - 用户淘汰通知
  ```javascript
  {
    userId: string,
    message: string
  }
  ```

- `game_ended` - 游戏结束
  ```javascript
  {
    winner: string | null,
    winnerEmail: string,
    message: string
  }
  ```

- `error` - 错误信息
  ```javascript
  { message: string }
  ```

## 🎯 核心功能

### GameManager 类

负责游戏逻辑的核心管理器：

```typescript
class GameManager {
  // 初始化游戏
  async initializeGame(): Promise<void>
  
  // 添加玩家
  async addPlayer(userEmail: string): Promise<void>
  
  // 开始新轮次
  async startNewRound(question: MinorityQuestion): Promise<void>
  
  // 提交答案
  async submitAnswer(userEmail: string, answer: 'A' | 'B'): Promise<void>
  
  // 结束轮次
  async endRound(): Promise<void>
  
  // 结束游戏
  async endGame(winner: string | null): Promise<void>
  
  // 获取游戏统计
  async getGameStats(): Promise<GameStats>
  
  // 重置游戏
  async resetGame(): Promise<void>
}
```

### Redis 数据模型

```typescript
// 游戏状态
game:{roomId}:state          // 游戏状态 (Hash)
game:{roomId}:round          // 当前轮次 (String)
game:{roomId}:winner         // 获胜者 (String)

// 房间数据
room:{roomId}:survivors      // 存活玩家 (Set)
room:{roomId}:eliminated     // 淘汰玩家 (Set)

// 题目数据
current_question:{roomId}    // 当前题目 (Hash)

// 用户数据
user:{email}:answer:{qid}    // 用户答题记录 (String)
user:{email}:session         // 用户会话 (Hash)
user:{email}:online          // 在线状态 (String, 5分钟过期)
```

## 🔧 开发指南

### 添加新功能

1. **扩展游戏逻辑**：在 `src/lib/game.ts` 中添加新方法
2. **添加 Socket 事件**：在 `src/lib/socket.ts` 中处理新事件
3. **更新数据模型**：在 `src/lib/redis.ts` 中定义新的 Redis 键

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `FRONTEND_URL` | 前端应用地址 | `http://localhost:3000` |
| `DEFAULT_ROOM_ID` | 默认房间ID | `main_room` |
| `PORT` | 服务器端口 | `4000` |

## 🚨 故障排除

### 常见问题

1. **Redis 连接失败**
   ```bash
   # 检查 Redis 服务
   redis-cli ping
   
   # 检查连接配置
   echo $REDIS_URL
   ```

2. **Socket.IO 连接问题**
   ```bash
   # 检查服务器状态
   curl -I http://localhost:4000/socket.io/
   
   # 检查 CORS 配置
   curl -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS http://localhost:4000/socket.io/
   ```

3. **端口占用**
   ```bash
   # 查找占用端口的进程
   lsof -ti:4000
   
   # 强制关闭
   lsof -ti:4000 | xargs kill -9
   ```

## 📊 性能优化

- **Redis 连接池**：自动管理连接
- **Socket.IO 优化**：支持 WebSocket 升级
- **内存管理**：用户在线状态 5 分钟自动过期
- **错误处理**：完善的错误捕获和日志记录

## 🔒 安全特性

- **邮箱域名验证**：仅支持 @bu.edu 和 @gmail.com
- **CORS 配置**：严格的前端域名限制
- **输入验证**：所有用户输入都经过验证
- **会话管理**：用户状态自动过期

## 📝 许可证

ISC License

---

**注意**: 生产环境部署前请务必修改默认配置和安全设置。
