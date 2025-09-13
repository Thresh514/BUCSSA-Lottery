const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs');

// 测试配置
const CONFIG = {
  target: '198.23.211.34',
  port: 4000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 压力测试配置
  concurrentRequests: 50,
  testDuration: 30, // 秒
  requestInterval: 100 // 毫秒
};

let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let responseTimes = [];
let startTime = performance.now();
let connectedUsers = [];

// 加载已连接的用户
function loadConnectedUsers() {
  try {
    if (fs.existsSync('connected-users.json')) {
      const data = fs.readFileSync('connected-users.json', 'utf8');
      connectedUsers = JSON.parse(data);
      console.log(`📂 加载了 ${connectedUsers.length} 个已连接用户`);
    } else {
      console.log('⚠️  未找到 connected-users.json，将生成随机用户');
      // 生成一些随机用户作为备选
      for (let i = 0; i < 100; i++) {
        const uuid = Math.random().toString(36).substring(2, 10);
        connectedUsers.push(`user_${uuid}@gmail.com`);
      }
    }
  } catch (error) {
    console.log('❌ 加载用户文件失败，将生成随机用户');
    for (let i = 0; i < 100; i++) {
      const uuid = Math.random().toString(36).substring(2, 10);
      connectedUsers.push(`user_${uuid}@gmail.com`);
    }
  }
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

// 发布题目
async function publishQuestion() {
  console.log('📝 正在发布题目...');
  
  const questionData = {
    question: '你更喜欢哪种编程语言？',
    optionA: 'JavaScript',
    optionB: 'Python'
  };
  
  const response = await sendHttpRequest('/api/admin/next-question', 'POST', questionData);
  
  if (response.success) {
    console.log('✅ 题目发布成功！');
    console.log(`题目: ${questionData.question}`);
    console.log(`选项A: ${questionData.optionA}`);
    console.log(`选项B: ${questionData.optionB}`);
    return true;
  } else {
    console.log('❌ 题目发布失败:', response.data);
    return false;
  }
}

// 测试提交答案
async function testSubmitAnswer() {
  if (connectedUsers.length === 0) {
    console.log('❌ 没有可用的用户邮箱');
    return;
  }
  
  const email = connectedUsers[Math.floor(Math.random() * connectedUsers.length)];
  const answer = generateAnswer();
  
  const response = await sendHttpRequest('/api/submit-answer', 'POST', {
    userEmail: email,
    answer: answer
  });
  
  totalRequests++;
  responseTimes.push(response.responseTime);
  
  if (response.success) {
    successfulRequests++;
    console.log(`✅ 用户 ${email} 提交答案 ${answer} 成功 - ${response.responseTime.toFixed(2)}ms`);
  } else {
    failedRequests++;
    console.log(`❌ 用户 ${email} 提交答案 ${answer} 失败 - ${response.responseTime.toFixed(2)}ms - ${response.data}`);
  }
  
  return response;
}

// 打印统计信息
function printStats() {
  const endTime = performance.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n--- 📊 提交答案压力测试结果 ---');
  console.log(`目标: http://${CONFIG.target}:${CONFIG.port}/api/submit-answer`);
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

// 运行提交答案压力测试
async function runSubmitAnswerTest() {
  console.log('🚀 开始提交答案压力测试...');
  console.log(`目标: http://${CONFIG.target}:${CONFIG.port}/api/submit-answer`);
  console.log(`并发请求数: ${CONFIG.concurrentRequests}`);
  console.log(`测试时长: ${CONFIG.testDuration} 秒`);
  console.log(`请求间隔: ${CONFIG.requestInterval}ms`);
  console.log('---');

  // 加载已连接用户
  loadConnectedUsers();
  
  // 先发布题目
  const questionPublished = await publishQuestion();
  if (!questionPublished) {
    console.log('❌ 无法发布题目，测试终止');
    return;
  }
  
  console.log('⏳ 等待 3 秒后开始提交答案...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const requests = [];
  
  // 定期打印进度
  const progressInterval = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(`⏱️  ${elapsed.toFixed(1)}s - 总请求: ${totalRequests}, 成功: ${successfulRequests}, 失败: ${failedRequests}`);
  }, 5000);

  // 发送请求
  const requestInterval = setInterval(() => {
    if (requests.length < CONFIG.concurrentRequests) {
      const requestPromise = testSubmitAnswer();
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
      console.log('\n🔚 提交答案测试完成');
    });
  }, CONFIG.testDuration * 1000);
}

// 运行测试
runSubmitAnswerTest();
