import Redis from 'ioredis';
import { env } from './env';

// 创建Redis连接实例
export const redis = new Redis(env.REDIS_URL);

// Redis key 生成器
export const RedisKeys = {
  // 当前题目信息
  currentQuestion: (roomId: string) => `current_question:${roomId}`,
  
  // 用户答题记录
  userAnswer: (uid: string, qid: string) => `user:${uid}:answer:${qid}`,
  
  // 房间存活用户
  roomSurvivors: (roomId: string) => `room:${roomId}:survivors`,
  
  // 房间淘汰用户
  roomEliminated: (roomId: string) => `room:${roomId}:eliminated`,
  
  // 用户会话信息
  userSession: (uid: string) => `user:${uid}:session`,
  
  // 验证码
  verificationCode: (email: string) => `verification:${email}`,
  
  // 游戏状态
  gameState: (roomId: string) => `game:${roomId}:state`,
  
  // 当前轮次
  currentRound: (roomId: string) => `game:${roomId}:round`,
}; 