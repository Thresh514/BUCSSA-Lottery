const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

// 压力测试配置
const CONFIG = {
  target: 'ws://198.23.211.34:4000',
  concurrentUsers: 200, // 增加到 200 个并发用户
  testDuration: 60, // 60 秒测试
  arrivalRate: 20 // 每秒 20 个新用户
};

let connectedUsers = 0;
let failedUsers = 0;
let totalMessages = 0;
let startTime = performance.now();
let stats = {
  connections: [],
  messages: [],
  errors: []
};

// 创建单个用户连接
function createUser(userId) {
  const email = `user_${userId}@gmail.com`;
  const userStartTime = performance.now();
  
  const socket = io(CONFIG.target, {
    auth: { email }, 
    timeout: 10000
  });

  socket.on('connect', () => {
    const connectTime = performance.now() - userStartTime;
    connectedUsers++;
    
    stats.connections.push({
      userId,
      connectTime,
      timestamp: Date.now()
    });
    
    console.log(`✅ 用户 ${userId} 连接成功 (${connectedUsers} 已连接, ${connectTime.toFixed(2)}ms)`);
    
    // 加入房间
    socket.emit('join', { roomId: 'default' });
    
    // 等待 2 秒后发送答案
    setTimeout(() => {
      socket.emit('answer', { answer: 'A' });
      totalMessages++;
      stats.messages.push({
        userId,
        timestamp: Date.now()
      });
    }, 2000);
  });

  socket.on('connect_error', (error) => {
    const connectTime = performance.now() - userStartTime;
    failedUsers++;
    
    stats.errors.push({
      userId,
      error: error.message,
      connectTime,
      timestamp: Date.now()
    });
    
    console.log(`❌ 用户 ${userId} 连接失败: ${error.message} (${failedUsers} 失败, ${connectTime.toFixed(2)}ms)`);
  });

  socket.on('game_state', (data) => {
    // 静默处理，避免日志过多
  });

  socket.on('player_count_update', (data) => {
    // 静默处理，避免日志过多
  });

  socket.on('disconnect', (reason) => {
    // 静默处理，避免日志过多
  });

  return socket;
}

// 打印统计信息
function printStats() {
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n--- 📊 压力测试结果 ---');
  console.log(`测试时长: ${duration.toFixed(2)} 秒`);
  console.log(`总连接尝试: ${connectedUsers + failedUsers}`);
  console.log(`成功连接: ${connectedUsers}`);
  console.log(`失败连接: ${failedUsers}`);
  console.log(`成功率: ${((connectedUsers / (connectedUsers + failedUsers)) * 100).toFixed(2)}%`);
  console.log(`总消息数: ${totalMessages}`);
  console.log(`平均连接率: ${(connectedUsers / duration).toFixed(2)} 连接/秒`);
  console.log(`平均消息率: ${(totalMessages / duration).toFixed(2)} 消息/秒`);
  
  if (stats.connections.length > 0) {
    const connectTimes = stats.connections.map(c => c.connectTime);
    const avgConnectTime = connectTimes.reduce((a, b) => a + b, 0) / connectTimes.length;
    const maxConnectTime = Math.max(...connectTimes);
    const minConnectTime = Math.min(...connectTimes);
    
    console.log(`平均连接时间: ${avgConnectTime.toFixed(2)}ms`);
    console.log(`最快连接时间: ${minConnectTime.toFixed(2)}ms`);
    console.log(`最慢连接时间: ${maxConnectTime.toFixed(2)}ms`);
  }
  
  if (stats.errors.length > 0) {
    console.log('\n--- ❌ 错误统计 ---');
    const errorTypes = {};
    stats.errors.forEach(error => {
      errorTypes[error.error] = (errorTypes[error.error] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`${error}: ${count} 次`);
    });
  }
}

// 运行压力测试
async function runLoadTest() {
  console.log('🚀 开始高强度压力测试...');
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

  // 定期打印进度
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(`⏱️  ${elapsed.toFixed(1)}s - 已连接: ${connectedUsers}, 失败: ${failedUsers}, 消息: ${totalMessages}`);
  }, 10000);

  // 运行指定时间
  setTimeout(() => {
    clearInterval(createInterval);
    clearInterval(progressInterval);
    
    // 等待 5 秒后开始关闭连接
    setTimeout(() => {
      printStats();
      
      // 关闭所有连接
      sockets.forEach(socket => socket.disconnect());
      console.log('\n🔚 测试完成');
    }, 5000);
  }, CONFIG.testDuration * 1000);
}

runLoadTest();
