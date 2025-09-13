const { io } = require('socket.io-client');
const { performance } = require('perf_hooks');

// 测试配置
const CONFIG = {
  target: 'ws://198.23.211.34:4000',
  // 压力测试配置
  concurrentUsers: 100,
  testDuration: 60, // 秒 - 保持连接60秒
  connectionInterval: 200 // 毫秒
};

let totalConnections = 0;
let successfulConnections = 0;
let failedConnections = 0;
let connectionTimes = [];
let startTime = performance.now();
let connectedUsers = [];
let activeSockets = [];

// 生成随机用户邮箱
function generateEmail() {
  const uuid = Math.random().toString(36).substring(2, 10);
  return `user_${uuid}@gmail.com`;
}

// 测试用户登录/进入房间
async function testUserLogin() {
  const email = generateEmail();
  const connectionStartTime = performance.now();
  
  return new Promise((resolve) => {
    const socket = io(CONFIG.target, {
      auth: { email },
      timeout: 10000
    });

    socket.on('connect', () => {
      const connectionTime = performance.now() - connectionStartTime;
      
      totalConnections++;
      connectionTimes.push(connectionTime);
      successfulConnections++;
      connectedUsers.push(email);
      activeSockets.push(socket);
      
      console.log(`✅ 用户 ${email} 连接成功 - ${connectionTime.toFixed(2)}ms (总连接: ${successfulConnections})`);
      
      // 加入房间
      socket.emit('join', { roomId: 'default' });
      
      resolve({ success: true, connectionTime, email });
    });

    socket.on('connect_error', (error) => {
      const connectionTime = performance.now() - connectionStartTime;
      
      totalConnections++;
      connectionTimes.push(connectionTime);
      failedConnections++;
      
      console.log(`❌ 用户 ${email} 连接失败 - ${connectionTime.toFixed(2)}ms - ${error.message}`);
      
      resolve({ success: false, connectionTime, email, error: error.message });
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 用户 ${email} 断开连接: ${reason}`);
      // 从活跃连接中移除
      const index = activeSockets.indexOf(socket);
      if (index > -1) {
        activeSockets.splice(index, 1);
      }
    });

    // 监听游戏状态更新
    socket.on('game_state', (data) => {
      // 静默处理，避免日志过多
    });

    socket.on('player_count_update', (data) => {
      // 静默处理，避免日志过多
    });
  });
}

// 打印统计信息
function printStats() {
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n--- 📊 登录压力测试结果 ---');
  console.log(`目标: ${CONFIG.target}`);
  console.log(`测试时长: ${duration.toFixed(2)} 秒`);
  console.log(`总连接尝试: ${totalConnections}`);
  console.log(`成功连接: ${successfulConnections}`);
  console.log(`失败连接: ${failedConnections}`);
  console.log(`成功率: ${((successfulConnections / totalConnections) * 100).toFixed(2)}%`);
  console.log(`平均连接率: ${(successfulConnections / duration).toFixed(2)} 连接/秒`);
  console.log(`当前活跃连接: ${activeSockets.length}`);
  console.log(`已连接用户数: ${connectedUsers.length}`);
  
  if (connectionTimes.length > 0) {
    const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
    const minConnectionTime = Math.min(...connectionTimes);
    const maxConnectionTime = Math.max(...connectionTimes);
    
    // 计算百分位数
    const sortedTimes = connectionTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    console.log(`平均连接时间: ${avgConnectionTime.toFixed(2)}ms`);
    console.log(`最快连接时间: ${minConnectionTime.toFixed(2)}ms`);
    console.log(`最慢连接时间: ${maxConnectionTime.toFixed(2)}ms`);
    console.log(`P50 连接时间: ${p50.toFixed(2)}ms`);
    console.log(`P90 连接时间: ${p90.toFixed(2)}ms`);
    console.log(`P95 连接时间: ${p95.toFixed(2)}ms`);
    console.log(`P99 连接时间: ${p99.toFixed(2)}ms`);
  }
  
  // 保存连接的用户邮箱到文件，供后续测试使用
  if (connectedUsers.length > 0) {
    const fs = require('fs');
    fs.writeFileSync('connected-users.json', JSON.stringify(connectedUsers, null, 2));
    console.log(`\n💾 已保存 ${connectedUsers.length} 个用户邮箱到 connected-users.json`);
  }
  
  console.log('\n🎯 用户已连接并保持在线状态，现在可以在管理控制台发布题目了！');
  console.log('📝 发布题目后，可以运行: node submit-answer-test.js');
}

// 运行登录压力测试
async function runLoginTest() {
  console.log('🚀 开始登录压力测试...');
  console.log(`目标: ${CONFIG.target}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`保持连接时长: ${CONFIG.testDuration} 秒`);
  console.log(`连接间隔: ${CONFIG.connectionInterval}ms`);
  console.log('---');

  const connections = [];
  
  // 定期打印进度
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(`⏱️  ${elapsed.toFixed(1)}s - 总连接: ${totalConnections}, 成功: ${successfulConnections}, 失败: ${failedConnections}, 活跃: ${activeSockets.length}`);
  }, 5000);

  // 建立连接
  const connectionInterval = setInterval(() => {
    if (connections.length < CONFIG.concurrentUsers) {
      const connectionPromise = testUserLogin();
      connections.push(connectionPromise);
      
      // 连接完成后从数组中移除
      connectionPromise.finally(() => {
        const index = connections.indexOf(connectionPromise);
        if (index > -1) {
          connections.splice(index, 1);
        }
      });
    }
  }, CONFIG.connectionInterval);

  // 运行指定时间
  setTimeout(() => {
    clearInterval(connectionInterval);
    clearInterval(progressInterval);
    
    // 等待所有连接完成
    Promise.all(connections).then(() => {
      printStats();
      console.log('\n🔚 登录测试完成');
      console.log('💡 提示: 现在可以在管理控制台发布题目，然后运行 submit-answer-test.js');
    });
  }, CONFIG.testDuration * 1000);
}

// 运行测试
runLoginTest();
