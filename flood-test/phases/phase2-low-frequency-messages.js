const { TestFramework } = require('../lib/test-framework.js');
require('dotenv').config();

const CONFIG = {
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET,
  concurrentUsers: parseInt(process.env.PHASE2_CONCURRENT || '1000', 10),
  messageInterval: parseInt(process.env.PHASE2_MESSAGE_INTERVAL || '12000', 10), // 每用户每 12 秒提交一次
  testDuration: parseInt(process.env.PHASE2_DURATION || '600', 10), // 测试持续时间（秒）
};

async function runPhase2() {
  console.log('🚀 Phase 2: 低频消息吞吐测试');
  console.log(`目标: ${CONFIG.wsTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`消息间隔: ${CONFIG.messageInterval}ms (每用户)`);
  console.log(`测试时长: ${CONFIG.testDuration} 秒`);
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
    
    // 最多等待 60 秒
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 60000);
  });

  console.log(`✅ 已建立 ${framework.getConnectionStats().currentActive} 个连接\n`);

  // 为每个用户设置定期提交答案
  const submitIntervals = [];
  framework.sockets.forEach(({ userId, email }) => {
    const interval = setInterval(async () => {
      const answer = Math.random() < 0.5 ? 'A' : 'B';
      await framework.submitAnswer(userId, email, answer);
    }, CONFIG.messageInterval + Math.random() * 2000); // 添加一些随机性
    
    submitIntervals.push(interval);
  });

  console.log(`⏳ 开始发送消息，持续 ${CONFIG.testDuration} 秒...\n`);

  // 定期打印进度
  const progressInterval = setInterval(() => {
    const stats = framework.getConnectionStats();
    const msgStats = framework.getMessageStats();
    const elapsed = framework.getDuration() / 1000;
    
    console.log(
      `⏱️  ${elapsed.toFixed(1)}s - ` +
      `活跃连接: ${stats.currentActive}, ` +
      `消息总数: ${msgStats.total}, ` +
      `消息速率: ${msgStats.perSecond.toFixed(2)} msg/s`
    );
  }, 10000);

  // 运行指定时间
  await new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(progressInterval);
      submitIntervals.forEach(interval => clearInterval(interval));
      resolve();
    }, CONFIG.testDuration * 1000);
  });

  // 停止测试
  framework.stop();

  // 生成报告
  const report = framework.generateReport('phase2-low-frequency-messages');
  framework.printSummary(report);
  
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
  runPhase2()
    .then(() => {
      console.log('✅ Phase 2 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phase 2 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { runPhase2 };
