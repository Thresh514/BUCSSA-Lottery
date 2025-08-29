import { createClient } from 'redis';
// 创建Redis客户端
const redis = createClient({
    url: process.env.REDIS_URL,
});
// 连接Redis并监听错误和重连事件
redis.connect().catch(console.error);
redis.on("error", (err) => console.error("Redis Error:", err));
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
    // 当前题目信息
    currentQuestion: (roomId) => `current_question:${roomId}`,
    // 用户答题记录 - 使用邮箱作为用户标识
    userAnswer: (email, qid) => `user:${email}:answer:${qid}`,
    // 房间存活用户
    roomSurvivors: (roomId) => `room:${roomId}:survivors`,
    // 房间淘汰用户
    roomEliminated: (roomId) => `room:${roomId}:eliminated`,
    // 用户会话信息 - 使用邮箱作为用户标识
    userSession: (email) => `user:${email}:session`,
    // 游戏状态
    gameState: (roomId) => `game:${roomId}:state`,
    // 当前轮次
    currentRound: (roomId) => `game:${roomId}:round`,
    // 用户在线状态
    userOnline: (email) => `user:${email}:online`,
    // 游戏获胜者
    gameWinner: (roomId) => `game:${roomId}:winner`,
    // NextAuth 用户认证相关
    // 弃用功能
    // nextAuthUser: (userId: string) => `nextauth:user:${userId}`,
    // nextAuthSession: (sessionToken: string) => `nextauth:session:${sessionToken}`,
    // nextAuthVerificationToken: (token: string) => `nextauth:verification_token:${token}`,
};
//# sourceMappingURL=redis.js.map