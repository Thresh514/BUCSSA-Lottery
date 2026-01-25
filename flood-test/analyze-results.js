const fs = require('fs');
const path = require('path');

// 瓶颈分析阈值
const THRESHOLDS = {
  eventLoopLag: {
    warning: 50,  // ms
    critical: 100, // ms
  },
  cpu: {
    warning: 70,  // %
    critical: 90, // %
  },
  memory: {
    warning: 1024 * 1024 * 1024, // 1GB
    critical: 2 * 1024 * 1024 * 1024, // 2GB
  },
  redisLatency: {
    warning: 5,   // ms
    critical: 10,  // ms
  },
  redisOps: {
    warning: 10000,  // ops/s
    critical: 20000, // ops/s
  },
  connectionSuccessRate: {
    warning: 95,  // %
    critical: 90, // %
  },
  messageLatency: {
    warning: 100, // ms
    critical: 500, // ms
  },
};

function analyzeBottleneck(report) {
  const issues = [];
  const recommendations = [];

  // 分析连接成功率
  if (report.connections.successRate < THRESHOLDS.connectionSuccessRate.critical) {
    issues.push({
      type: 'connection',
      severity: 'critical',
      message: `连接成功率过低: ${report.connections.successRate.toFixed(2)}%`,
      recommendation: '检查系统硬上限（ulimit、TCP 连接数、Redis maxclients）',
    });
  } else if (report.connections.successRate < THRESHOLDS.connectionSuccessRate.warning) {
    issues.push({
      type: 'connection',
      severity: 'warning',
      message: `连接成功率偏低: ${report.connections.successRate.toFixed(2)}%`,
      recommendation: '检查网络配置和代理超时设置',
    });
  }

  // 分析 Event Loop Lag
  if (report.metrics && report.metrics.eventLoopLag) {
    const lag = report.metrics.eventLoopLag;
    if (lag.p99 > THRESHOLDS.eventLoopLag.critical) {
      issues.push({
        type: 'cpu',
        severity: 'critical',
        message: `Event Loop Lag 过高: P99=${lag.p99.toFixed(2)}ms`,
        recommendation: '检查 CPU 密集型操作，考虑优化同步 I/O 或使用 worker threads',
      });
    } else if (lag.p99 > THRESHOLDS.eventLoopLag.warning) {
      issues.push({
        type: 'cpu',
        severity: 'warning',
        message: `Event Loop Lag 偏高: P99=${lag.p99.toFixed(2)}ms`,
        recommendation: '监控 CPU 使用率，检查是否有阻塞操作',
      });
    }
  }

  // 分析 CPU 使用率
  if (report.metrics && report.metrics.cpu) {
    const cpu = report.metrics.cpu;
    if (cpu.max > THRESHOLDS.cpu.critical) {
      issues.push({
        type: 'cpu',
        severity: 'critical',
        message: `CPU 使用率过高: 最大=${cpu.max.toFixed(1)}%`,
        recommendation: '考虑水平扩展（多进程/多实例）或优化 CPU 密集型代码',
      });
    } else if (cpu.avg > THRESHOLDS.cpu.warning) {
      issues.push({
        type: 'cpu',
        severity: 'warning',
        message: `CPU 使用率偏高: 平均=${cpu.avg.toFixed(1)}%`,
        recommendation: '监控 CPU 趋势，考虑优化热点代码',
      });
    }
  }

  // 分析内存
  if (report.metrics && report.metrics.memory) {
    const memory = report.metrics.memory;
    if (memory.max > THRESHOLDS.memory.critical) {
      issues.push({
        type: 'memory',
        severity: 'critical',
        message: `内存使用过高: 最大=${memory.maxMB}MB`,
        recommendation: '检查内存泄漏，优化数据结构，考虑增加内存限制',
      });
    } else if (memory.max > THRESHOLDS.memory.warning) {
      issues.push({
        type: 'memory',
        severity: 'warning',
        message: `内存使用偏高: 最大=${memory.maxMB}MB`,
        recommendation: '监控内存增长趋势，检查是否有内存泄漏',
      });
    }
  }

  // 分析 Redis 延迟
  if (report.metrics && report.metrics.redis) {
    const redis = report.metrics.redis;
    if (redis.maxLatency && redis.maxLatency > THRESHOLDS.redisLatency.critical) {
      issues.push({
        type: 'redis',
        severity: 'critical',
        message: `Redis 延迟过高: 最大=${redis.maxLatency.toFixed(2)}ms`,
        recommendation: '检查 Redis 网络延迟、考虑使用本地 Redis 或优化 Redis 操作（批量、管道）',
      });
    } else if (redis.avgLatency && redis.avgLatency > THRESHOLDS.redisLatency.warning) {
      issues.push({
        type: 'redis',
        severity: 'warning',
        message: `Redis 延迟偏高: 平均=${redis.avgLatency.toFixed(2)}ms`,
        recommendation: '检查 Redis 配置和网络，考虑优化 Redis 查询',
      });
    }

    // 分析 Redis Ops/s
    if (redis.maxOpsPerSecond > THRESHOLDS.redisOps.critical) {
      issues.push({
        type: 'redis',
        severity: 'warning',
        message: `Redis 操作频率很高: 最大=${redis.maxOpsPerSecond} ops/s`,
        recommendation: '考虑优化 Redis 操作（批量操作、减少往返次数、使用管道）',
      });
    }
  }

  // 分析消息延迟
  if (report.messages && report.messages.latency) {
    const latency = report.messages.latency;
    if (latency.p99 > THRESHOLDS.messageLatency.critical) {
      issues.push({
        type: 'network',
        severity: 'critical',
        message: `消息延迟过高: P99=${latency.p99.toFixed(2)}ms`,
        recommendation: '检查网络延迟、广播效率，考虑优化消息大小和频率',
      });
    } else if (latency.p99 > THRESHOLDS.messageLatency.warning) {
      issues.push({
        type: 'network',
        severity: 'warning',
        message: `消息延迟偏高: P99=${latency.p99.toFixed(2)}ms`,
        recommendation: '检查广播路径和网络状况',
      });
    }
  }

  // 分析结算尖峰（Phase 4）
  if (report.settlement) {
    const settlement = report.settlement;
    if (settlement.actualDuration > settlement.spikeWindow * 2) {
      issues.push({
        type: 'settlement',
        severity: 'critical',
        message: `结算耗时过长: ${settlement.actualDuration.toFixed(2)}ms (窗口: ${settlement.spikeWindow}ms)`,
        recommendation: '优化结算逻辑（O(N) 操作），考虑批量 Redis 操作或异步处理',
      });
    }
  }

  // 分析重连风暴（Phase 5）
  if (report.reconnect) {
    const reconnect = report.reconnect;
    if (parseFloat(reconnect.reconnectSuccessRate) < 90) {
      issues.push({
        type: 'reconnect',
        severity: 'critical',
        message: `重连成功率过低: ${reconnect.reconnectSuccessRate}%`,
        recommendation: '优化 join/getRoomState 热路径，考虑缓存和批量操作',
      });
    }
  }

  // 生成总体建议
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  if (criticalIssues.length > 0) {
    recommendations.push('🔴 发现严重瓶颈，建议优先处理：');
    criticalIssues.forEach((issue, i) => {
      recommendations.push(`  ${i + 1}. ${issue.message}`);
      recommendations.push(`     建议: ${issue.recommendation}`);
    });
  }

  if (warningIssues.length > 0) {
    recommendations.push('\n⚠️  发现潜在问题：');
    warningIssues.forEach((issue, i) => {
      recommendations.push(`  ${i + 1}. ${issue.message}`);
      recommendations.push(`     建议: ${issue.recommendation}`);
    });
  }

  // 瓶颈类型汇总
  const bottleneckTypes = {
    cpu: issues.filter(i => i.type === 'cpu').length,
    redis: issues.filter(i => i.type === 'redis').length,
    memory: issues.filter(i => i.type === 'memory').length,
    network: issues.filter(i => i.type === 'network').length,
    connection: issues.filter(i => i.type === 'connection').length,
    settlement: issues.filter(i => i.type === 'settlement').length,
    reconnect: issues.filter(i => i.type === 'reconnect').length,
  };

  // 判断主要瓶颈
  let primaryBottleneck = 'none';
  const maxCount = Math.max(...Object.values(bottleneckTypes));
  if (maxCount > 0) {
    primaryBottleneck = Object.entries(bottleneckTypes)
      .find(([_, count]) => count === maxCount)[0];
  }

  return {
    phase: report.phase,
    issues,
    recommendations: recommendations.join('\n'),
    bottleneckTypes,
    primaryBottleneck,
    summary: {
      totalIssues: issues.length,
      critical: criticalIssues.length,
      warnings: warningIssues.length,
    },
  };
}

function analyzeReportFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const report = JSON.parse(content);
    return analyzeBottleneck(report);
  } catch (error) {
    console.error(`❌ 无法读取报告文件 ${filePath}:`, error.message);
    return null;
  }
}

function analyzeAllReports(resultsDir = 'results') {
  if (!fs.existsSync(resultsDir)) {
    console.error(`❌ 结果目录不存在: ${resultsDir}`);
    return;
  }

  const files = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('results-') && f.endsWith('.json'))
    .map(f => path.join(resultsDir, f));

  if (files.length === 0) {
    console.error(`❌ 在 ${resultsDir} 中未找到报告文件`);
    return;
  }

  console.log(`📊 分析 ${files.length} 个报告文件...\n`);

  const analyses = [];
  files.forEach((file) => {
    const analysis = analyzeReportFile(file);
    if (analysis) {
      analyses.push(analysis);
    }
  });

  // 打印分析结果
  analyses.forEach((analysis) => {
    console.log('='.repeat(60));
    console.log(`阶段: ${analysis.phase}`);
    console.log('='.repeat(60));
    console.log(`\n主要瓶颈: ${analysis.primaryBottleneck}`);
    console.log(`问题总数: ${analysis.summary.totalIssues} (严重: ${analysis.summary.critical}, 警告: ${analysis.summary.warnings})`);
    
    if (analysis.issues.length > 0) {
      console.log('\n问题详情:');
      analysis.issues.forEach((issue, i) => {
        const icon = issue.severity === 'critical' ? '🔴' : '⚠️';
        console.log(`\n${icon} ${i + 1}. ${issue.message}`);
        console.log(`   类型: ${issue.type}`);
        console.log(`   建议: ${issue.recommendation}`);
      });
    } else {
      console.log('\n✅ 未发现明显瓶颈');
    }

    if (analysis.recommendations) {
      console.log('\n' + analysis.recommendations);
    }

    console.log('\n');
  });

  // 生成汇总分析
  const allIssues = analyses.flatMap(a => a.issues);
  const criticalIssues = allIssues.filter(i => i.severity === 'critical');
  const warningIssues = allIssues.filter(i => i.severity === 'warning');

  console.log('='.repeat(60));
  console.log('总体分析');
  console.log('='.repeat(60));
  console.log(`\n总问题数: ${allIssues.length} (严重: ${criticalIssues.length}, 警告: ${warningIssues.length})`);

  // 瓶颈类型统计
  const typeCounts = {};
  allIssues.forEach(issue => {
    typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
  });

  if (Object.keys(typeCounts).length > 0) {
    console.log('\n瓶颈类型分布:');
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
  }

  // 保存分析结果
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const analysisFile = path.join(resultsDir, `analysis-${timestamp}.json`);
  fs.writeFileSync(analysisFile, JSON.stringify({ analyses, summary: { totalIssues: allIssues.length, criticalIssues: criticalIssues.length, warningIssues: warningIssues.length } }, null, 2));
  console.log(`\n📄 分析结果已保存到: ${analysisFile}\n`);
}

// 主函数
if (require.main === module) {
  const resultsDir = process.argv[2] || 'results';
  analyzeAllReports(resultsDir);
}

module.exports = { analyzeBottleneck, analyzeReportFile, analyzeAllReports };
