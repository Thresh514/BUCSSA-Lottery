const http = require('http');
const { performance } = require('perf_hooks');

// 测试配置
const CONFIG = {
  target: '198.23.211.34',
  port: 4000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 游戏配置
  gameConfig: {
    question: '你更喜欢哪种编程语言？',
    optionA: 'JavaScript',
    optionB: 'Python'
  },
  // 压力测试配置
  concurrentUsers: 100,
  testDuration: 60, // 秒
  answerInterval: 200 // 毫秒
};

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let responseTimes = [];
let startTime = performance.now();
let gameStarted = false;
let connectedUsers = [];

// 生成随机用户邮箱
function generateEmail() {
  const uuid = Math.random().toString(36).substring(2, 10);
  return `user_${uuid}@gmail.com`;
}

// 生成随机答案
function generateAnswer() {
  return Math.random() < 0.5 ? 'A' : 'B';
}

// 发送 HTTP 请求的通用函数
function sendHttpRequest(path, method, data) {
  return new Promise((resolve) => {
    const requestStartTime = performance.now();
    const postData = data ? JSON.stringify(data) : '';
    
    const options = {
      hostname: CONFIG.target,
      port: CONFIG.port,
      path: path,
      method: method,
      headers: {
        ...CONFIG.headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const requestEndTime = performance.now();
        const responseTime = requestEndTime - requestStartTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          data: responseData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const requestEndTime = performance.now();
      const responseTime = requestEndTime - requestStartTime;
      
      resolve({
        statusCode: 0,
        responseTime,
        data: error.message,
        success: false,
        error: error.message
      });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        statusCode: 0,
        responseTime: 10000,
        data: 'timeout',
        success: false,
        error: 'timeout'
      });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 发送单个 HTTP 请求
function sendRequest() {
  return new Promise((resolve) => {
    const requestStartTime = performance.now();
    const email = generateEmail();
    const answer = generateAnswer();
    
    const postData = JSON.stringify({
      userEmail: email,
      answer: answer
    });

    const options = {
      hostname: CONFIG.target,
      port: CONFIG.port,
      path: CONFIG.path,
      method: CONFIG.method,
      headers: {
        ...CONFIG.headers,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const requestEndTime = performance.now();
        const responseTime = requestEndTime - requestStartTime;
        
        totalRequests++;
        responseTimes.push(responseTime);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          successfulRequests++;
          console.log(`✅ 请求 ${totalRequests}: ${res.statusCode} - ${responseTime.toFixed(2)}ms - ${email} -> ${answer}`);
        } else {
          failedRequests++;
          console.log(`❌ 请求 ${totalRequests}: ${res.statusCode} - ${responseTime.toFixed(2)}ms - ${email} -> ${answer} - ${data}`);
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const requestEndTime = performance.now();
      const responseTime = requestEndTime - requestStartTime;
      
      totalRequests++;
      failedRequests++;
      responseTimes.push(responseTime);
      
      console.log(`💥 请求 ${totalRequests}: ERROR - ${responseTime.toFixed(2)}ms - ${email} -> ${answer} - ${error.message}`);
      
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: error.message
      });
    });

    req.setTimeout(10000, () => {
      const requestEndTime = performance.now();
      const responseTime = requestEndTime - requestStartTime;
      
      totalRequests++;
      failedRequests++;
      responseTimes.push(responseTime);
      
      console.log(`⏰ 请求 ${totalRequests}: TIMEOUT - ${responseTime.toFixed(2)}ms - ${email} -> ${answer}`);
      
      req.destroy();
      resolve({
        statusCode: 0,
        responseTime,
        success: false,
        error: 'timeout'
      });
    });

    req.write(postData);
    req.end();
  });
}

// 打印统计信息
function printStats() {
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n--- 📊 HTTP 压力测试结果 ---');
  console.log(`目标: http://${CONFIG.target}:${CONFIG.port}${CONFIG.path}`);
  console.log(`测试时长: ${duration.toFixed(2)} 秒`);
  console.log(`总请求数: ${totalRequests}`);
  console.log(`成功请求: ${successfulRequests}`);
  console.log(`失败请求: ${failedRequests}`);
  console.log(`成功率: ${((successfulRequests / totalRequests) * 100).toFixed(2)}%`);
  console.log(`平均请求率: ${(totalRequests / duration).toFixed(2)} 请求/秒`);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // 计算百分位数
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`最快响应时间: ${minResponseTime.toFixed(2)}ms`);
    console.log(`最慢响应时间: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`P50 响应时间: ${p50.toFixed(2)}ms`);
    console.log(`P90 响应时间: ${p90.toFixed(2)}ms`);
    console.log(`P95 响应时间: ${p95.toFixed(2)}ms`);
    console.log(`P99 响应时间: ${p99.toFixed(2)}ms`);
  }
}

// 运行压力测试
async function runLoadTest() {
  console.log('🚀 开始 HTTP 压力测试...');
  console.log(`目标: http://${CONFIG.target}:${CONFIG.port}${CONFIG.path}`);
  console.log(`并发请求数: ${CONFIG.concurrentRequests}`);
  console.log(`测试时长: ${CONFIG.testDuration} 秒`);
  console.log(`请求间隔: ${CONFIG.requestInterval}ms`);
  console.log('---');

  const requests = [];
  
  // 定期打印进度
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(`⏱️  ${elapsed.toFixed(1)}s - 总请求: ${totalRequests}, 成功: ${successfulRequests}, 失败: ${failedRequests}`);
  }, 5000);

  // 发送请求
  const requestInterval = setInterval(() => {
    if (requests.length < CONFIG.concurrentRequests) {
      const requestPromise = sendRequest();
      requests.push(requestPromise);
      
      // 请求完成后从数组中移除
      requestPromise.finally(() => {
        const index = requests.indexOf(requestPromise);
        if (index > -1) {
          requests.splice(index, 1);
        }
      });
    }
  }, CONFIG.requestInterval);

  // 运行指定时间
  setTimeout(() => {
    clearInterval(requestInterval);
    clearInterval(progressInterval);
    
    // 等待所有请求完成
    Promise.all(requests).then(() => {
      printStats();
      console.log('\n🔚 测试完成');
    });
  }, CONFIG.testDuration * 1000);
}

// 运行测试
runLoadTest();
