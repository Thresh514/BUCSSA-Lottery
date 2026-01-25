const { TestFramework } = require('../lib/test-framework.js');
const { performance } = require('perf_hooks');
require('dotenv').config();

const CONFIG = {
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET,
  concurrentUsers: parseInt(process.env.PHASE4_CONCURRENT || '1000', 10),
  spikeWindow: parseInt(process.env.PHASE4_SPIKE_WINDOW || '2000', 10), // 2 秒窗口内所有人提交
};

async function runPhase4() {
  console.log('🚀 Phase 4: 结算尖峰专项测试');
  console.log(`目标: ${CONFIG.wsTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`尖峰窗口: ${CONFIG.spikeWindow}ms (所有人在此窗口内提交答案)`);
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

  // 等待游戏开始（如果有管理员控制的话，这里假设已经准备好）
  console.log('⏳ 等待游戏开始信号（如果需要，请在管理后台启动游戏）...\n');
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // 记录结算开始时间
  const settlementStartTime = performance.now();
  console.log(`🚨 开始结算尖峰测试 - 所有用户在 ${CONFIG.spikeWindow}ms 内提交答案\n`);

  // 在指定窗口内让所有人提交答案
  const submitPromises = framework.sockets.map(({ userId, email }, index) => {
    // 在窗口内随机分布
    const delay = Math.random() * CONFIG.spikeWindow;
    return new Promise((resolve) => {
      setTimeout(async () => {
        const answer = Math.random() < 0.5 ? 'A' : 'B';
        const result = await framework.submitAnswer(userId, email, answer);
        resolve(result);
      }, delay);
    });
  });

  // 等待所有提交完成
  await Promise.all(submitPromises);
  
  const settlementEndTime = performance.now();
  const settlementDuration = settlementEndTime - settlementStartTime;

  console.log(`✅ 所有答案已提交，耗时: ${settlementDuration.toFixed(2)}ms\n`);

  // 等待结算完成（给系统一些时间处理）
  console.log('⏳ 等待结算完成...');
  await new Promise((resolve) => setTimeout(resolve, 10000));

  // 停止测试
  framework.stop();

  // 生成报告
  const report = framework.generateReport('phase4-settlement-spike');
  
  // 添加结算特定指标
  report.settlement = {
    spikeWindow: CONFIG.spikeWindow,
    actualDuration: settlementDuration,
    submissionsPerSecond: (CONFIG.concurrentUsers / (settlementDuration / 1000)).toFixed(2),
  };

  framework.printSummary(report);
  
  // 打印结算特定信息
  console.log('\n--- 结算尖峰统计 ---\n');
  console.log(`尖峰窗口: ${CONFIG.spikeWindow}ms`);
  console.log(`实际耗时: ${settlementDuration.toFixed(2)}ms`);
  console.log(`提交速率: ${report.settlement.submissionsPerSecond} 提交/秒`);
  
  if (report.metrics && report.metrics.redis) {
    console.log(`Redis 峰值 Ops/s: ${report.metrics.redis.maxOpsPerSecond}`);
    if (report.metrics.redis.maxLatency) {
      console.log(`Redis 最大延迟: ${report.metrics.redis.maxLatency.toFixed(2)}ms`);
    }
  }
  
  if (report.metrics && report.metrics.eventLoopLag) {
    console.log(`Event Loop Lag 峰值: ${report.metrics.eventLoopLag.max.toFixed(2)}ms`);
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
  runPhase4()
    .then(() => {
      console.log('✅ Phase 4 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phase 4 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { runPhase4 };
