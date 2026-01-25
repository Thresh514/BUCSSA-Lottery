const { runPhase1 } = require('./phases/phase1-connection-capacity.js');
const { runPhase2 } = require('./phases/phase2-low-frequency-messages.js');
const { runPhase3 } = require('./phases/phase3-progressive-throughput.js');
const { runPhase4 } = require('./phases/phase4-settlement-spike.js');
const { runPhase5 } = require('./phases/phase5-reconnect-storm.js');
const { ReportGenerator } = require('./lib/report-generator.js');
const http = require('http');
require('dotenv').config();

const PHASES = [
  { name: 'Phase 1: 连接容量基线', fn: runPhase1 },
  { name: 'Phase 2: 低频消息吞吐', fn: runPhase2 },
  { name: 'Phase 3: 中等吞吐逐步加速', fn: runPhase3 },
  { name: 'Phase 4: 结算尖峰专项', fn: runPhase4 },
  { name: 'Phase 5: 重连风暴专项', fn: runPhase5 },
];

// 检查服务器是否可用
async function checkServerAvailable() {
  return new Promise((resolve) => {
    const httpTarget = process.env.HTTP_TARGET || 'http://localhost:4000';
    const url = new URL(httpTarget);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 4000,
      path: '/health',
      method: 'GET',
      timeout: 3000,
    };

    const req = http.request(options, (res) => {
      resolve(true);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

async function runAllPhases() {
  console.log('🚀 开始执行所有压测阶段\n');
  console.log(`目标服务器: ${process.env.WS_TARGET || 'ws://localhost:4000'}`);
  console.log(`总阶段数: ${PHASES.length}\n`);

  // 检查服务器是否可用
  console.log('🔍 检查后端服务状态...');
  const serverAvailable = await checkServerAvailable();
  
  if (!serverAvailable) {
    console.error('\n❌ 后端服务不可用！');
    console.error(`   无法连接到: ${process.env.HTTP_TARGET || 'http://localhost:4000'}`);
    console.error('\n💡 请先启动后端服务:');
    console.error('   1. cd backend');
    console.error('   2. npm run dev');
    console.error('   3. 等待看到 "🚀 Minority Game Backend is running" 消息');
    console.error('   4. 然后重新运行压测\n');
    console.error('   或者运行: npm run check-server 来检查服务状态\n');
    process.exit(1);
  }
  
  console.log('✅ 后端服务可用\n');
  console.log('='.repeat(60));
  console.log('');

  const reports = [];
  const reportGenerator = new ReportGenerator();

  for (let i = 0; i < PHASES.length; i++) {
    const phase = PHASES[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`执行 ${i + 1}/${PHASES.length}: ${phase.name}`);
    console.log('='.repeat(60));
    console.log('');

    try {
      const report = await phase.fn();
      reports.push(report);
      
      // 保存文本报告
      const textReportPath = reportGenerator.saveTextReport(report);
      console.log(`📄 文本报告已保存到: ${textReportPath}\n`);

      // 阶段间休息
      if (i < PHASES.length - 1) {
        console.log('⏸️  阶段间休息 10 秒...\n');
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    } catch (error) {
      console.error(`❌ ${phase.name} 执行失败:`, error);
      console.error('继续执行下一阶段...\n');
    }
  }

  // 生成汇总报告
  console.log('\n' + '='.repeat(60));
  console.log('生成汇总报告');
  console.log('='.repeat(60));
  console.log('');

  const summary = reportGenerator.generateSummaryReport(reports);
  const summaryPaths = reportGenerator.saveSummaryReport(summary);
  
  console.log(`📄 汇总 JSON 报告: ${summaryPaths.json}`);
  console.log(`📄 汇总文本报告: ${summaryPaths.text}`);
  console.log('');

  // 打印汇总摘要
  console.log(reportGenerator.generateSummaryTextReport(summary));
  console.log('');

  console.log('✅ 所有压测阶段执行完成！');
  console.log(`📊 共生成 ${reports.length} 个阶段报告和 1 个汇总报告`);
}

// 处理中断信号
process.on('SIGINT', () => {
  console.log('\n\n🛑 收到中断信号，正在退出...');
  process.exit(1);
});

// 运行所有阶段
if (require.main === module) {
  runAllPhases()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 压测执行失败:', error);
      process.exit(1);
    });
}

module.exports = { runAllPhases };
