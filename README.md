# 缩圈抽奖系统

基于 Next.js 的高并发答题抽奖系统，支持邮箱验证码登录、WebSocket 实时通信、按题目逐轮淘汰用户的抽奖游戏。

## 功能特性

- ✅ **邮箱验证码登录** - 安全的用户认证系统
- ⚡ **实时 WebSocket 通信** - Socket.IO 实现实时数据同步
- 🎯 **按题目逐轮淘汰** - 智能的淘汰机制
- 🏆 **最后一人获胜** - 支持大型竞赛活动
- 📱 **响应式设计** - 支持手机端答题和大屏管理
- 🚀 **高并发支持** - 预计支持 500+ 用户同时在线

## 技术栈

- **前端**: Next.js 15 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes + Socket.IO
- **数据库**: Redis (用户状态、游戏数据)
- **认证**: JWT + 邮箱验证码
- **邮件服务**: Nodemailer
- **部署**: Docker + PM2 + NGINX

## 系统架构

```
用户端 (手机) ←→ Socket.IO ←→ Next.js Server ←→ Redis
                    ↑
管理端 (大屏) ←→ Socket.IO
```

## 快速开始

### 1. 环境要求

- Node.js 18+
- Redis 服务器
- SMTP 邮件服务 (推荐 Gmail)

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

创建 `.env.local` 文件：

```env
# Redis 配置
REDIS_URL=redis://localhost:6379

# JWT 密钥 (生产环境请使用复杂密钥)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# 邮件服务配置 (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# 应用配置
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DEFAULT_ROOM_ID=main_room
```

### 4. 启动 Redis

```bash
# macOS (使用 Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 页面说明

| 页面 | 路径 | 描述 |
|------|------|------|
| 主页 | `/` | 系统介绍和导航 |
| 用户登录 | `/login` | 邮箱验证码登录 |
| 用户答题 | `/play` | 答题界面 |
| 管理大屏 | `/admin` | 控制游戏流程 |

## API 接口

### 认证接口

- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/verify-code` - 验证登录

### 管理接口

- `POST /api/admin/next-question` - 发布下一题
- `GET /api/admin/game-stats` - 获取游戏统计
- `POST /api/admin/reset-game` - 重置游戏

### WebSocket 事件

#### 服务端广播事件

- `new_question` - 新题目发布
- `countdown` - 倒计时更新
- `round_result` - 轮次结果
- `eliminated` - 用户淘汰通知
- `game_ended` - 游戏结束
- `game_state` - 游戏状态更新

#### 客户端发送事件

- `submit_answer` - 提交答案

## 游戏流程

1. **用户登录** - 输入邮箱接收验证码
2. **等待开始** - 用户进入答题页面等待
3. **管理员发题** - 通过管理大屏发布题目
4. **用户答题** - 30秒答题时间
5. **自动判定** - 系统自动淘汰答错用户
6. **继续游戏** - 重复流程直到剩余1人
7. **游戏结束** - 公布获胜者

## 数据结构

### Redis 键值设计

```
current_question:{room_id}    # 当前题目信息 (Hash)
user:{uid}:answer:{qid}       # 用户答题记录 (String)
room:{room_id}:survivors      # 存活用户列表 (Set)
room:{room_id}:eliminated     # 淘汰用户列表 (Set)
user:{uid}:session           # 用户会话信息 (Hash)
verification:{email}         # 验证码 (String, 5分钟过期)
game:{room_id}:state         # 游戏状态 (Hash)
game:{room_id}:round         # 当前轮次 (String)
```

### 题库格式

```json
[
  {
    "id": "q001",
    "question": "哪个是哺乳动物？",
    "options": {
      "A": "蛇",
      "B": "鱼", 
      "C": "狐狸",
      "D": "鸭"
    },
    "correct_option": "C"
  }
]
```

## 邮件配置

### Gmail 配置示例

1. 开启两步验证
2. 生成应用专用密码
3. 在 `.env.local` 中配置：

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_digit_app_password
```

### 其他邮件服务

支持任何 SMTP 服务，只需修改对应配置即可。

## 部署

### Docker 部署

1. 构建镜像：
```bash
docker build -t lottery-system .
```

2. 运行容器：
```bash
docker run -d -p 3000:3000 --env-file .env lottery-system
```

### 生产环境

推荐使用 PM2 + NGINX 部署：

1. 构建生产版本：
```bash
npm run build
```

2. 使用 PM2 启动：
```bash
pm2 start npm --name "lottery" -- start
```

3. 配置 NGINX 反向代理

## 开发说明

### 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API 路由
│   ├── login/          # 登录页面
│   ├── play/           # 答题页面
│   └── admin/          # 管理页面
├── components/         # React 组件
├── lib/               # 工具库
├── types/             # TypeScript 类型
└── data/              # 题库数据
```

### 自定义题库

编辑 `src/data/questions.json` 文件添加或修改题目。

### 扩展功能

- 添加更多题目类型
- 支持图片题目
- 增加难度分级
- 添加排行榜功能
- 支持多房间游戏

## 故障排除

### 常见问题

1. **Redis 连接失败**
   - 检查 Redis 服务是否启动
   - 确认 REDIS_URL 配置正确

2. **邮件发送失败**
   - 检查邮箱配置
   - 确认应用密码设置正确

3. **Socket.IO 连接问题**
   - 检查防火墙设置
   - 确认端口没有被占用

### 日志查看

```bash
# 开发环境
npm run dev

# 生产环境
pm2 logs lottery
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至项目维护者

---

**注意**: 生产环境部署前请务必修改默认的 JWT 密钥和其他安全配置。
