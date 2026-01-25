const http = require('http');
const { io } = require('socket.io-client');
require('dotenv').config();

const CONFIG = {
  httpTarget: process.env.HTTP_TARGET || 'http://localhost:4000',
  wsTarget: process.env.WS_TARGET || 'ws://localhost:4000',
};

async function checkServer() {
  console.log('🔍 检查后端服务状态...\n');
  console.log(`HTTP 目标: ${CONFIG.httpTarget}`);
  console.log(`WebSocket 目标: ${CONFIG.wsTarget}\n`);

  // 检查 HTTP 健康端点
  console.log('1. 检查 HTTP 健康端点...');
  return new Promise((resolve) => {
    const url = new URL(CONFIG.httpTarget);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? require('https') : require('http');
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/health',
      method: 'GET',
      timeout: 5000,
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('   ✅ HTTP 服务正常');
          console.log(`   响应: ${data}\n`);
        } else {
          console.log(`   ⚠️  HTTP 服务返回状态码: ${res.statusCode}\n`);
        }
        checkWebSocket();
      });
    });

    req.on('error', (error) => {
      console.error(`   ❌ HTTP 服务无法访问: ${error.message}`);
      console.error(`   💡 请确保后端服务已启动: cd backend && npm run dev\n`);
      checkWebSocket();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('   ❌ HTTP 服务连接超时');
      console.error(`   💡 请确保后端服务已启动: cd backend && npm run dev\n`);
      checkWebSocket();
    });

    req.end();
  });

  function checkWebSocket() {
    console.log('2. 检查 WebSocket 连接...');
    const socket = io(CONFIG.wsTarget, {
      auth: { email: 'test@example.com' },
      timeout: 5000,
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      console.error('   ❌ WebSocket 连接超时');
      console.error(`   💡 请确保后端服务已启动并监听 ${CONFIG.wsTarget}\n`);
      console.log('📋 启动后端服务的步骤:');
      console.log('   1. cd backend');
      console.log('   2. npm run dev');
      console.log('   3. 等待看到 "🚀 Minority Game Backend is running" 消息\n');
      process.exit(1);
    }, 6000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log('   ✅ WebSocket 连接成功');
      console.log(`   Socket ID: ${socket.id}\n`);
      socket.disconnect();
      console.log('✅ 所有检查通过！后端服务正常运行。\n');
      process.exit(0);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.error(`   ❌ WebSocket 连接失败: ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('   💡 连接被拒绝，后端服务可能未启动');
      } else if (error.message.includes('timeout')) {
        console.error('   💡 连接超时，后端服务可能未响应');
      }
      console.error(`\n📋 启动后端服务的步骤:`);
      console.error('   1. cd backend');
      console.error('   2. npm run dev');
      console.error('   3. 等待看到 "🚀 Minority Game Backend is running" 消息\n');
      process.exit(1);
    });
  }
}

checkServer();
