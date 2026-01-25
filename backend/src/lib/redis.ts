import { createClient } from 'redis';

// 获取 Redis 连接配置
function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️  REDIS_URL 未设置，使用默认值: redis://localhost:6379');
    return {
      url: 'redis://localhost:6379',
    };
  }

  // 解析 Redis URL 以提供更好的错误信息
  try {
    const url = new URL(redisUrl);
    console.log(`🔗 Redis 连接配置: ${url.protocol}//${url.hostname}:${url.port || '6379'}${url.password ? ' (有密码)' : ' (无密码)'}`);
  } catch (error) {
    console.error('❌ Redis URL 格式错误:', redisUrl);
    throw new Error(`Redis URL 格式错误: ${redisUrl}`);
  }

  return {
    url: redisUrl,
  };
}

// 创建Redis客户端
const redisConfig = getRedisConfig();
const redis = createClient(redisConfig);

// 连接Redis并监听错误和重连事件
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

redis.connect().catch((error: any) => {
  connectionAttempts++;
  console.error(`❌ Redis 连接失败 (尝试 ${connectionAttempts}/${maxConnectionAttempts}):`, error.message);
  
  if (error.message.includes('password') || error.message.includes('AUTH')) {
    console.error('💡 提示: 看起来是密码认证问题。请检查:');
    console.error('   1. Redis 是否设置了密码 (requirepass)');
    console.error('   2. REDIS_URL 格式是否正确: redis://:password@localhost:6379');
    console.error('   3. 如果 Redis 没有密码，使用: redis://localhost:6379');
  } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
    console.error('💡 提示: 无法连接到 Redis 服务器。请检查:');
    console.error('   1. Redis 服务是否已启动: redis-cli ping');
    console.error('   2. Redis 是否运行在正确的端口 (默认 6379)');
    console.error('   3. 防火墙是否阻止了连接');
  } else if (error.message.includes('ENOTFOUND')) {
    console.error('💡 提示: 无法解析 Redis 主机名。请检查:');
    console.error('   1. REDIS_URL 中的主机名是否正确');
    console.error('   2. 网络连接是否正常');
  }
});

redis.on("error", (err: any) => {
  console.error("❌ Redis 错误:", err.message);
  
  // 提供更详细的错误信息
  if (err.message.includes('password') || err.message.includes('AUTH')) {
    console.error('💡 这是密码认证错误。请检查 REDIS_URL 中的密码是否正确。');
  }
});

redis.on("connect", () => {
  console.log("✅ Redis 连接成功");
  connectionAttempts = 0; // 重置连接尝试计数
});

redis.on("ready", () => {
  console.log("✅ Redis 准备就绪");
});

redis.on("end", () => {
  console.log("⚠️  Redis 连接关闭");
});

redis.on("reconnecting", () => {
  connectionAttempts++;
  console.log(`🔄 Redis 正在重连 (尝试 ${connectionAttempts}/${maxConnectionAttempts})...`);
  
  if (connectionAttempts >= maxConnectionAttempts) {
    console.error(`❌ Redis 重连失败，已尝试 ${maxConnectionAttempts} 次`);
    console.error('💡 请检查 Redis 服务状态和连接配置');
  }
});

export { redis };

// Redis key 生成器
export const RedisKeys = {
  gameStarted: (roomId: string) => `game:${roomId}:started`,

  // 当前题目信息
  currentQuestion: (roomId: string) => `current_question:${roomId}`,
  
  // 用户答题记录 - 使用邮箱作为用户标识
  userAnswer: (email: string, qid: string) => `user:${email}:answer:${qid}`,

  // 本轮结果
  gameAnswers: (roomId: string) => `game:${roomId}:answers`,

  // 房间存活用户
  roomSurvivors: (roomId: string) => `room:${roomId}:survivors`,
  
  // 房间淘汰用户
  roomEliminated: (roomId: string) => `room:${roomId}:eliminated`,
  
  // 用户会话信息 - 使用邮箱作为用户标识
  userSession: (email: string) => `user:${email}:session`,
  
  // 游戏状态
  gameState: (roomId: string) => `game:${roomId}:state`,
  
  // 当前轮次
  currentRound: (roomId: string) => `game:${roomId}:round`,
  
  // 用户在线状态
  userOnline: (email: string) => `user:${email}:online`,

  // 游戏平局状态
  gameTie: (roomId: string) => `game:${roomId}:tie`,
  
  // 游戏获胜者
  gameWinner: (roomId: string) => `game:${roomId}:winner`,

  // 管理员列表
  admin: () => "nextauth:admin_emails",

  display: () => "nextauth:display_emails",
  
  // NextAuth 用户认证相关
  // 弃用功能
  // nextAuthUser: (userId: string) => `nextauth:user:${userId}`,
  // nextAuthSession: (sessionToken: string) => `nextauth:session:${sessionToken}`,
  // nextAuthVerificationToken: (token: string) => `nextauth:verification_token:${token}`,
}; 