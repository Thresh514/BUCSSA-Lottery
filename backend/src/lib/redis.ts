import { createClient } from 'redis';
import { ROOM_ID } from './room.js';

// 创建Redis客户端
const redis = createClient({
  url: process.env.REDIS_URL!,
});

// 连接Redis并监听错误和重连事件
redis.connect().catch(console.error);
redis.on("error", (err: Error) => console.error("Redis Error:", err));
redis.on("connect", () => {
  // Redis连接成功
});
redis.on("ready", () => {
  // Redis准备就绪
});
redis.on("end", () => {
  // Redis连接关闭
});
redis.on("reconnecting", () => {
  // Redis正在重连
});

export { redis };

// Redis key 生成器
export const RedisKeys = {
  gameStarted: () => `game:${ROOM_ID}:started`,

  // 当前题目信息
  currentQuestion: () => `current_question:${ROOM_ID}`,
  
  // 用户答题记录 - 使用邮箱作为用户标识
  userAnswer: (email: string, qid: string) => `user:${email}:answer:${qid}`,

  // 本轮结果
  gameAnswers: () => `game:${ROOM_ID}:answers`,

  // 房间存活用户
  roomSurvivors: () => `room:${ROOM_ID}:survivors`,
  
  // 房间淘汰用户
  roomEliminated: () => `room:${ROOM_ID}:eliminated`,
  
  // 用户会话信息 - 使用邮箱作为用户标识
  userSession: (email: string) => `user:${email}:session`,
  
  // 游戏状态
  gameState: () => `game:${ROOM_ID}:state`,
  
  // 当前轮次
  currentRound: () => `game:${ROOM_ID}:round`,
  
  // 用户在线状态
  userOnline: (email: string) => `user:${email}:online`,

  // 游戏平局状态
  gameTie: () => `game:${ROOM_ID}:tie`,
  
  // 游戏获胜者
  gameWinner: () => `game:${ROOM_ID}:winner`,

  // 管理员列表
  admin: () => "nextauth:admin_emails",

  display: () => "nextauth:display_emails",
  
  // NextAuth 用户认证相关
  // 弃用功能
  // nextAuthUser: (userId: string) => `nextauth:user:${userId}`,
  // nextAuthSession: (sessionToken: string) => `nextauth:session:${sessionToken}`,
  // nextAuthVerificationToken: (token: string) => `nextauth:verification_token:${token}`,
}; 