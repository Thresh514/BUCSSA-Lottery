# 少数派游戏 - 技术文档

## 🎯 游戏机制

少数派游戏是一个基于"少数派胜出"规则的多人答题游戏：

### 核心规则
- **每轮两选一题目（A/B）**
- **选择人数较少的选项晋级**
- **选择多数选项的玩家被淘汰**
- **最后剩下唯一一人即为赢家**

### 游戏流程

1. **管理员发布题目**
   - 通过 `/admin` 页面创建A/B两个选项的题目
   - 系统广播题目给所有存活用户

2. **玩家答题**
   - 用户通过 `/play` 页面选择A或B
   - 系统记录每个用户的答案

3. **少数派判定**
   - 统计A和B的选择人数
   - 选择人数较少的选项为"正确答案"
   - 选择该选项的用户晋级，其他用户淘汰

4. **游戏终局**
   - 如果仅剩1人晋级 → 触发 `game_ended`，广播胜者
   - 否则进入下一轮

## 🏗️ 技术架构

### Redis 数据结构

| Key | 类型 | 示例 | 描述 |
|-----|------|------|------|
| `room:{room_id}:survivors` | Set | `user1@bu.edu`, `user2@bu.edu` | 当前还在游戏中的用户 |
| `room:{room_id}:eliminated` | Set | `user3@bu.edu` | 被淘汰的用户 |
| `user:{email}:answer:{round}` | String | `"A"` | 用户第n轮的选择 |
| `game:{room_id}:round` | String | `"3"` | 当前轮数 |
| `game:{room_id}:state` | Hash | `status: playing` | 游戏状态 |
| `game:{room_id}:winner` | String | `user123@bu.edu` | 胜利者邮箱 |

### 核心类和方法

#### GameManager 类
```typescript
class GameManager {
  // 添加用户到游戏
  async addPlayer(userEmail: string): Promise<void>
  
  // 管理员发布新题目
  async startNewRound(question: MinorityQuestion): Promise<void>
  
  // 用户提交答案
  async submitAnswer(userEmail: string, answer: 'A' | 'B'): Promise<void>
  
  // 结束当前轮次并处理少数派晋级
  async endRound(): Promise<void>
  
  // 获取轮次统计
  async getRoundStats(): Promise<RoundStats | null>
}
```

### API 端点

#### 管理员API
- `POST /api/admin/next-question` - 发布新题目
- `GET /api/admin/game-stats` - 获取游戏统计
- `POST /api/admin/reset-game` - 重置游戏

#### 玩家API
- `POST /api/submit-answer` - 提交A/B答案

### WebSocket 事件

#### 客户端接收事件
- `new_question` - 新题目发布
- `countdown` - 倒计时更新
- `round_result` - 轮次结果
- `eliminated` - 被淘汰通知
- `game_ended` - 游戏结束
- `game_reset` - 游戏重置

#### 客户端发送事件
- `submit_answer` - 提交答案（通过HTTP API）

## 🎮 前端页面

### 管理员页面 (`/admin`)
- 题目发布表单（题目内容 + A/B选项）
- 实时游戏统计显示
- 当前轮次A/B选择人数统计
- 游戏控制按钮（发布题目、重置游戏）

### 玩家页面 (`/play`)
- 实时题目显示
- A/B选项选择界面
- 倒计时显示
- 游戏状态提示
- 淘汰/获胜通知

## 🧪 测试验证

运行测试脚本验证游戏逻辑：
```bash
node scripts/test-minority-game.js
```

测试场景：
- 5个用户参与游戏
- 3人选择A，2人选择B
- 验证B选项（少数派）获胜
- 验证2人晋级，3人被淘汰

## 🚀 部署说明

### 环境要求
- Node.js 18+
- Redis 6+
- Next.js 14+

### 启动步骤
1. 安装依赖：`npm install`
2. 配置环境变量（Redis连接等）
3. 启动开发服务器：`npm run dev`
4. 访问 `/admin` 开始游戏

### 游戏流程
1. 管理员访问 `/admin` 页面
2. 点击"发布新题目"创建A/B题目
3. 玩家访问 `/play` 页面参与游戏
4. 系统自动处理少数派逻辑和淘汰机制
5. 重复直到产生唯一获胜者

## 🔧 配置选项

### 环境变量
```env
REDIS_URL=redis://localhost:6379
DEFAULT_ROOM_ID=default
SITE_URL=http://localhost:3000
```

### 游戏参数
- 答题时间：30秒
- 支持邮箱域名：@bu.edu, @gmail.com
- 房间ID：可配置多个房间

## 📊 监控和统计

### 实时统计
- 存活人数
- 淘汰人数
- 当前轮次
- 在线用户数
- A/B选择人数

### 游戏历史
- 每轮题目内容
- 选择统计
- 淘汰用户列表
- 获胜者信息

## 🎯 扩展功能

### 可能的改进
1. **多房间支持** - 支持多个同时进行的游戏
2. **题目库** - 预设题目库，随机选择
3. **排行榜** - 历史游戏记录和排名
4. **观众模式** - 被淘汰用户可观看剩余比赛
5. **自定义规则** - 支持不同的淘汰规则

### 技术优化
1. **性能优化** - Redis连接池、缓存策略
2. **错误处理** - 更完善的错误处理和恢复机制
3. **日志系统** - 详细的游戏日志记录
4. **安全加固** - 防作弊机制、请求频率限制 