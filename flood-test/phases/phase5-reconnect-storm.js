const { TestFramework } = require('../lib/test-framework.js');
const { performance } = require('perf_hooks');
require('dotenv').config();

const CONFIG = {
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET,
  concurrentUsers: parseInt(process.env.PHASE5_CONCURRENT || '1000', 10),
  disconnectPercentage: parseFloat(process.env.PHASE5_DISCONNECT_PCT || '0.3'), // 30% 断开
  reconnectDelay: parseInt(process.env.PHASE5_RECONNECT_DELAY || '5000', 10), // 5 秒后重连
  stableDuration: parseInt(process.env.PHASE5_STABLE_DURATION || '60', 10), // 稳定运行 60 秒
};

async function runPhase5() {
  console.log('🚀 Phase 5: 重连风暴专项测试');
  console.log(`目标: ${CONFIG.wsTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`断开比例: ${(CONFIG.disconnectPercentage * 100).toFixed(0)}%`);
  console.log(`重连延迟: ${CONFIG.reconnectDelay}ms`);
  console.log(`稳定运行时长: ${CONFIG.stableDuration} 秒`);
  console.log('---\n');

  const framework = new TestFramework(CONFIG);
  framework.start();

  // 先建立所有连接
  console.log('📡 正在建立连接...');
  for (let i = 1; i <= CONFIG.concurrentUsers; i++) {
    framework.createUserConnection(i);
    if (i % 100 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // 等待所有连接建立
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      const stats = framework.getConnectionStats();
      if (stats.currentActive >= CONFIG.concurrentUsers * 0.95) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 60000);
  });

  console.log(`✅ 已建立 ${framework.getConnectionStats().currentActive} 个连接\n`);

  // 稳定运行一段时间
  console.log(`⏳ 稳定运行 ${CONFIG.stableDuration} 秒...\n`);
  await new Promise((resolve) => setTimeout(resolve, CONFIG.stableDuration * 1000));

  // 记录断开前的状态
  const beforeDisconnect = {
    activeConnections: framework.getConnectionStats().currentActive,
    timestamp: Date.now(),
  };

  // 断开指定比例的连接
  const disconnectCount = Math.floor(CONFIG.concurrentUsers * CONFIG.disconnectPercentage);
  console.log(`🔌 断开 ${disconnectCount} 个连接 (${(CONFIG.disconnectPercentage * 100).toFixed(0)}%)...\n`);

  const socketsToDisconnect = framework.sockets
    .filter(({ socket }) => socket.connected)
    .slice(0, disconnectCount);

  socketsToDisconnect.forEach(({ socket }) => {
    socket.disconnect();
  });

  // 等待断开完成
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const afterDisconnect = {
    activeConnections: framework.getConnectionStats().currentActive,
    timestamp: Date.now(),
  };

  console.log(`✅ 已断开连接，当前活跃: ${afterDisconnect.activeConnections}\n`);

  // 等待指定时间后开始重连
  console.log(`⏳ 等待 ${CONFIG.reconnectDelay}ms 后开始重连...\n`);
  await new Promise((resolve) => setTimeout(resolve, CONFIG.reconnectDelay));

  // 记录重连开始时间
  const reconnectStartTime = performance.now();
  console.log(`🔄 开始重连风暴 - ${disconnectCount} 个客户端同时重连\n`);

  // 同时重连所有断开的客户端
  const reconnectPromises = socketsToDisconnect.map(({ userId, email }) => {
    return new Promise((resolve) => {
      const { socket: newSocket } = framework.createUserConnection(userId, email);
      
      newSocket.on('connect', () => {
        resolve({ success: true, userId });
      });

      newSocket.on('connect_error', (error) => {
        resolve({ success: false, userId, error: error.message });
      });

      // 超时处理
      setTimeout(() => {
        if (!newSocket.connected) {
          resolve({ success: false, userId, error: 'timeout' });
        }
      }, 10000);
    });
  });

  // 等待所有重连完成
  const reconnectResults = await Promise.all(reconnectPromises);
  const reconnectEndTime = performance.now();
  const reconnectDuration = reconnectEndTime - reconnectStartTime;

  const successfulReconnects = reconnectResults.filter(r => r.success).length;
  const failedReconnects = reconnectResults.filter(r => !r.success).length;

  console.log(`✅ 重连完成，耗时: ${reconnectDuration.toFixed(2)}ms\n`);
  console.log(`  成功: ${successfulReconnects}`);
  console.log(`  失败: ${failedReconnects}`);
  console.log(`  成功率: ${(successfulReconnects / reconnectResults.length * 100).toFixed(2)}%\n`);

  // 等待系统稳定
  console.log('⏳ 等待系统稳定...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  const afterReconnect = {
    activeConnections: framework.getConnectionStats().currentActive,
    timestamp: Date.now(),
  };

  // 停止测试
  framework.stop();

  // 生成报告
  const report = framework.generateReport('phase5-reconnect-storm');
  
  // 添加重连特定指标
  report.reconnect = {
    disconnectCount,
    disconnectPercentage: CONFIG.disconnectPercentage * 100,
    reconnectDelay: CONFIG.reconnectDelay,
    reconnectDuration,
    successfulReconnects,
    failedReconnects,
    reconnectSuccessRate: (successfulReconnects / reconnectResults.length * 100).toFixed(2),
    beforeDisconnect: beforeDisconnect.activeConnections,
    afterDisconnect: afterDisconnect.activeConnections,
    afterReconnect: afterReconnect.activeConnections,
  };

  framework.printSummary(report);
  
  // 打印重连特定信息
  console.log('\n--- 重连风暴统计 ---\n');
  console.log(`断开连接数: ${disconnectCount}`);
  console.log(`重连耗时: ${reconnectDuration.toFixed(2)}ms`);
  console.log(`重连成功率: ${report.reconnect.reconnectSuccessRate}%`);
  console.log(`断开前活跃: ${beforeDisconnect.activeConnections}`);
  console.log(`断开后活跃: ${afterDisconnect.activeConnections}`);
  console.log(`重连后活跃: ${afterReconnect.activeConnections}`);
  
  if (report.messages && report.messages.latency) {
    console.log(`Join/getRoomState P99: ${report.messages.latency.p99.toFixed(2)}ms`);
  }
  console.log('');

  const reportPath = framework.saveReport(report);
  console.log(`📄 详细报告已保存到: ${reportPath}\n`);

  // 关闭所有连接
  console.log('🔚 正在关闭所有连接...');
  await framework.closeAllConnections();
  console.log('✅ 所有连接已关闭\n');

  return report;
}

// 如果直接运行此脚本
if (require.main === module) {
  runPhase5()
    .then(() => {
      console.log('✅ Phase 5 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phase 5 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { runPhase5 };
