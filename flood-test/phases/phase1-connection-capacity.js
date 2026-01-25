const { TestFramework } = require('../lib/test-framework.js');
require('dotenv').config();

const CONFIG = {
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  jwtSecret: process.env.JWT_SECRET,
  concurrentUsers: parseInt(process.env.PHASE1_CONCURRENT || '1000', 10),
  rampRate: parseInt(process.env.PHASE1_RAMP_RATE || '30', 10), // 每秒连接数
  holdDuration: parseInt(process.env.PHASE1_HOLD_DURATION || '600', 10), // 保持连接时间（秒）
};

async function runPhase1() {
  console.log('🚀 Phase 1: 连接容量基线测试');
  console.log(`目标: ${CONFIG.wsTarget}`);
  console.log(`并发用户数: ${CONFIG.concurrentUsers}`);
  console.log(`Ramp 速率: ${CONFIG.rampRate} 用户/秒`);
  console.log(`保持连接时长: ${CONFIG.holdDuration} 秒`);
  console.log('---\n');

  const framework = new TestFramework(CONFIG);
  framework.start();

  let userId = 0;
  const connectionInterval = 1000 / CONFIG.rampRate; // 毫秒

  // 创建连接的函数
  const createConnections = () => {
    const interval = setInterval(() => {
      if (framework.sockets.length < CONFIG.concurrentUsers) {
        framework.createUserConnection(++userId);
      } else {
        clearInterval(interval);
        console.log(`✅ 已创建 ${CONFIG.concurrentUsers} 个连接`);
      }
    }, connectionInterval);

    return interval;
  };

  // 开始创建连接
  const connectionIntervalId = createConnections();

  // 定期打印进度
  const progressInterval = setInterval(() => {
    const stats = framework.getConnectionStats();
    const elapsed = framework.getDuration() / 1000;
    console.log(
      `⏱️  ${elapsed.toFixed(1)}s - ` +
      `已连接: ${stats.successful}, ` +
      `失败: ${stats.failed}, ` +
      `活跃: ${stats.currentActive}, ` +
      `成功率: ${stats.successRate.toFixed(2)}%`
    );
  }, 10000);

  // 等待所有连接建立
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (framework.sockets.length >= CONFIG.concurrentUsers) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 1000);
  });

  // 等待额外时间确保连接稳定
  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log(`\n⏳ 保持连接 ${CONFIG.holdDuration} 秒...\n`);

  // 保持连接指定时间
  await new Promise((resolve) => {
    setTimeout(() => {
      clearInterval(progressInterval);
      resolve();
    }, CONFIG.holdDuration * 1000);
  });

  // 停止测试
  framework.stop();

  // 生成报告
  const report = framework.generateReport('phase1-connection-capacity');
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
  runPhase1()
    .then(() => {
      console.log('✅ Phase 1 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Phase 1 测试失败:', error);
      process.exit(1);
    });
}

module.exports = { runPhase1 };
