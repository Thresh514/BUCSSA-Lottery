const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

// 压力测试配置
const CONFIG = {
  target: 'ws://198.23.211.34:4000',
  concurrentUsers: 50,
  testDuration: 30, // 秒
  arrivalRate: 10 // 每秒新用户数
};

let connectedUsers = 0;
let failedUsers = 0;
let totalMessages = 0;
let startTime = performance.now();

// 创建单个用户连接
function createUser(userId) {
  const email = `user_${userId}@gmail.com`;
  
  const socket = io(CONFIG.target, {
    auth: { email },
    timeout: 10000
  });

  socket.on('connect', () => {
    connectedUsers++;
    console.log(`✅ 用户 ${userId} 连接成功 (${connectedUsers} 已连接)`);
    
    // 加入房间
    socket.emit('join', { roomId: 'default' });
    
    // 等待 2 秒后发送答案
    setTimeout(() => {
      socket.emit('answer', { answer: 'A' });
      totalMessages++;
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    failedUsers++;
    console.log(`❌ 用户 ${userId} 连接失败: ${error.message} (${failedUsers} 失败)`);
  });

  socket.on('game_state', (data) => {
    // console.log(`📥 用户 ${userId} 收到 game_state`);
  });

  socket.on('player_count_update', (data) => {
    // console.log(`📥 用户 ${userId} 收到 player_count_update`);
  });

  socket.on('disconnect', (reason) => {
    // console.log(`🔌 用户 ${userId} 断开连接: ${reason}`);
  });

  return socket;
}

// 运行压力测试
async function runLoadTest() {
  console.log('🚀 开始压力测试...');
  console.log(`目标: ${CONFIG.target}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`测试时长: ${CONFIG.testDuration} 秒`);
  console.log(`到达率: ${CONFIG.arrivalRate} 用户/秒`);
  console.log('---');

  const sockets = [];
  let userId = 0;

  // 创建用户连接
  const createInterval = setInterval(() => {
    if (sockets.length < CONFIG.concurrentUsers) {
      const socket = createUser(++userId);
      sockets.push(socket);
    }
  }, 1000 / CONFIG.arrivalRate);

  // 运行指定时间
  setTimeout(() => {
    clearInterval(createInterval);
    
    // 等待 5 秒后开始关闭连接
    setTimeout(() => {
      console.log('---');
      console.log('📊 测试结果:');
      console.log(`总连接数: ${sockets.length}`);
      console.log(`成功连接: ${connectedUsers}`);
      console.log(`失败连接: ${failedUsers}`);
      console.log(`总消息数: ${totalMessages}`);
      console.log(`成功率: ${((connectedUsers / (connectedUsers + failedUsers)) * 100).toFixed(2)}%`);
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`测试时长: ${duration.toFixed(2)} 秒`);
      console.log(`平均连接率: ${(connectedUsers / duration).toFixed(2)} 连接/秒`);
      
      // 关闭所有连接
      sockets.forEach(socket => socket.disconnect());
      console.log('🔚 测试完成');
    }, 5000);
  }, CONFIG.testDuration * 1000);
}

runLoadTest();
