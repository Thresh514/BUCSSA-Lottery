const fs = require('fs');

fs.readFile('gameState.json', 'utf8', (err, data) => {
  if (err) {
    console.error('无法读取 gameState.json:', err);
    return;
  }

  try {
    const gameData = JSON.parse(data);
    analyzeGameData(gameData);
  } catch (parseErr) {
    console.error('解析 JSON 失败:', parseErr);
  }
});

function analyzeGameData(gameData) {
  console.log('🔍 检查异常淘汰情况...');

  const rounds = Object.keys(gameData)
  const finalRound = Math.max(...rounds.filter(r => !isNaN(r)).map(r => parseInt(r)));

  for (let round = 1; round < finalRound; round++) {
    const roundData = gameData[round];
    if (!roundData) {
      console.warn(`第 ${round} 轮数据缺失`);
      continue;
    }


    for (const user of roundData.eliminated) {
      const userSubmittedAnswer = roundData.userAnswers[user];
      const noAnswersSet = new Set(roundData.noAnswers);
      const userNoAnswer = noAnswersSet.has(user);
      const eliminatedAnswer = roundData.eliminatedAnswer;

      if (!userSubmittedAnswer && !userNoAnswer) {
        console.warn(`用户 ${user} 在第 ${round} 轮未提交答案`);
        continue;
      }

      if (userSubmittedAnswer && userSubmittedAnswer !== eliminatedAnswer) {
        console.warn(`用户 ${user} 在第 ${round} 轮提交的答案与淘汰答案不符`);
        return;
      }
    }
  }

  console.log('✅ 未发现异常淘汰情况');
}