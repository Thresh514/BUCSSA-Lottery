const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor(outputDir = 'results') {
    this.outputDir = outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  // 生成单个测试的文本报告
  generateTextReport(report) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push(`测试阶段: ${report.phase}`);
    lines.push(`时间戳: ${report.timestamp}`);
    lines.push(`持续时间: ${report.duration.seconds.toFixed(2)} 秒`);
    lines.push('='.repeat(60));
    lines.push('');

    // 连接统计
    lines.push('--- 连接统计 ---');
    lines.push(`总尝试: ${report.connections.totalAttempts}`);
    lines.push(`成功: ${report.connections.successful}`);
    lines.push(`失败: ${report.connections.failed}`);
    lines.push(`成功率: ${report.connections.successRate.toFixed(2)}%`);
    lines.push(`当前活跃: ${report.connections.currentActive}`);
    
    if (report.connections.connectTime) {
      lines.push('');
      lines.push('连接时间:');
      lines.push(`  P50: ${report.connections.connectTime.p50.toFixed(2)}ms`);
      lines.push(`  P95: ${report.connections.connectTime.p95.toFixed(2)}ms`);
      lines.push(`  P99: ${report.connections.connectTime.p99.toFixed(2)}ms`);
      lines.push(`  平均: ${report.connections.connectTime.avg.toFixed(2)}ms`);
      lines.push(`  最小: ${report.connections.connectTime.min.toFixed(2)}ms`);
      lines.push(`  最大: ${report.connections.connectTime.max.toFixed(2)}ms`);
    }
    lines.push('');

    // 消息统计
    lines.push('--- 消息统计 ---');
    lines.push(`总数: ${report.messages.total}`);
    lines.push(`每秒: ${report.messages.perSecond.toFixed(2)} msg/s`);
    
    if (Object.keys(report.messages.byEvent).length > 0) {
      lines.push('');
      lines.push('按事件类型:');
      Object.entries(report.messages.byEvent).forEach(([event, count]) => {
        lines.push(`  ${event}: ${count}`);
      });
    }
    
    if (report.messages.latency) {
      lines.push('');
      lines.push('消息延迟:');
      lines.push(`  P50: ${report.messages.latency.p50.toFixed(2)}ms`);
      lines.push(`  P95: ${report.messages.latency.p95.toFixed(2)}ms`);
      lines.push(`  P99: ${report.messages.latency.p99.toFixed(2)}ms`);
      lines.push(`  平均: ${report.messages.latency.avg.toFixed(2)}ms`);
    }
    lines.push('');

    // 错误统计
    if (report.errors.total > 0) {
      lines.push('--- 错误统计 ---');
      lines.push(`总数: ${report.errors.total}`);
      Object.entries(report.errors.byType).forEach(([type, count]) => {
        lines.push(`  ${type}: ${count}`);
      });
      lines.push('');
    }

    // 服务端指标
    if (report.metrics) {
      lines.push('--- 服务端指标 ---');
      
      if (report.metrics.eventLoopLag) {
        lines.push('Event Loop Lag:');
        lines.push(`  P99: ${report.metrics.eventLoopLag.p99.toFixed(2)}ms`);
        lines.push(`  最大: ${report.metrics.eventLoopLag.max.toFixed(2)}ms`);
        lines.push(`  平均: ${report.metrics.eventLoopLag.avg.toFixed(2)}ms`);
        lines.push('');
      }
      
      if (report.metrics.cpu) {
        lines.push(`CPU 使用率: ${report.metrics.cpu.avg.toFixed(1)}% (最大: ${report.metrics.cpu.max.toFixed(1)}%)`);
        lines.push('');
      }
      
      if (report.metrics.memory) {
        lines.push(`内存: ${report.metrics.memory.avgMB}MB (最大: ${report.metrics.memory.maxMB}MB)`);
        lines.push('');
      }
      
      if (report.metrics.redis) {
        lines.push('Redis:');
        lines.push(`  Ops/s: ${report.metrics.redis.avgOpsPerSecond.toFixed(0)} (最大: ${report.metrics.redis.maxOpsPerSecond})`);
        if (report.metrics.redis.avgLatency) {
          lines.push(`  延迟: ${report.metrics.redis.avgLatency.toFixed(2)}ms (最大: ${report.metrics.redis.maxLatency.toFixed(2)}ms)`);
        }
        lines.push('');
      }
      
      if (report.metrics.connections) {
        lines.push(`连接数: ${report.metrics.connections.avg.toFixed(0)} (最大: ${report.metrics.connections.max})`);
        lines.push('');
      }
    }

    // 特定阶段的额外信息
    if (report.settlement) {
      lines.push('--- 结算尖峰统计 ---');
      lines.push(`尖峰窗口: ${report.settlement.spikeWindow}ms`);
      lines.push(`实际耗时: ${report.settlement.actualDuration.toFixed(2)}ms`);
      lines.push(`提交速率: ${report.settlement.submissionsPerSecond} 提交/秒`);
      lines.push('');
    }

    if (report.reconnect) {
      lines.push('--- 重连风暴统计 ---');
      lines.push(`断开连接数: ${report.reconnect.disconnectCount}`);
      lines.push(`重连耗时: ${report.reconnect.reconnectDuration.toFixed(2)}ms`);
      lines.push(`重连成功率: ${report.reconnect.reconnectSuccessRate}%`);
      lines.push(`断开前活跃: ${report.reconnect.beforeDisconnect}`);
      lines.push(`断开后活跃: ${report.reconnect.afterDisconnect}`);
      lines.push(`重连后活跃: ${report.reconnect.afterReconnect}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  // 保存文本报告
  saveTextReport(report, filename = null) {
    const text = this.generateTextReport(report);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = filename || `report-${report.phase}-${timestamp}.txt`;
    const filepath = path.join(this.outputDir, name);
    
    fs.writeFileSync(filepath, text);
    return filepath;
  }

  // 生成汇总报告（多个阶段的汇总）
  generateSummaryReport(reports) {
    const summary = {
      timestamp: new Date().toISOString(),
      totalPhases: reports.length,
      phases: reports.map(r => r.phase),
      overall: {
        totalDuration: reports.reduce((sum, r) => sum + r.duration.seconds, 0),
        totalConnections: reports.reduce((sum, r) => sum + r.connections.totalAttempts, 0),
        totalMessages: reports.reduce((sum, r) => sum + r.messages.total, 0),
        totalErrors: reports.reduce((sum, r) => sum + r.errors.total, 0),
      },
      byPhase: {},
    };

    reports.forEach((report) => {
      summary.byPhase[report.phase] = {
        duration: report.duration.seconds,
        connections: {
          successful: report.connections.successful,
          successRate: report.connections.successRate,
        },
        messages: {
          total: report.messages.total,
          perSecond: report.messages.perSecond,
        },
        errors: {
          total: report.errors.total,
        },
        metrics: report.metrics || null,
      };
    });

    return summary;
  }

  // 生成汇总文本报告
  generateSummaryTextReport(summary) {
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push('压测汇总报告');
    lines.push(`时间戳: ${summary.timestamp}`);
    lines.push(`总阶段数: ${summary.totalPhases}`);
    lines.push('='.repeat(60));
    lines.push('');

    lines.push('--- 总体统计 ---');
    lines.push(`总持续时间: ${summary.overall.totalDuration.toFixed(2)} 秒`);
    lines.push(`总连接尝试: ${summary.overall.totalConnections}`);
    lines.push(`总消息数: ${summary.overall.totalMessages}`);
    lines.push(`总错误数: ${summary.overall.totalErrors}`);
    lines.push('');

    lines.push('--- 各阶段详情 ---');
    Object.entries(summary.byPhase).forEach(([phase, data]) => {
      lines.push('');
      lines.push(`阶段: ${phase}`);
      lines.push(`  持续时间: ${data.duration.toFixed(2)} 秒`);
      lines.push(`  连接成功率: ${data.connections.successRate.toFixed(2)}%`);
      lines.push(`  消息速率: ${data.messages.perSecond.toFixed(2)} msg/s`);
      lines.push(`  错误数: ${data.errors.total}`);
    });

    return lines.join('\n');
  }

  // 保存汇总报告
  saveSummaryReport(summary, filename = null) {
    const json = JSON.stringify(summary, null, 2);
    const text = this.generateSummaryTextReport(summary);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonName = filename || `summary-${timestamp}.json`;
    const txtName = filename ? filename.replace('.json', '.txt') : `summary-${timestamp}.txt`;
    
    const jsonPath = path.join(this.outputDir, jsonName);
    const txtPath = path.join(this.outputDir, txtName);
    
    fs.writeFileSync(jsonPath, json);
    fs.writeFileSync(txtPath, text);
    
    return { json: jsonPath, text: txtPath };
  }
}

module.exports = { ReportGenerator };
