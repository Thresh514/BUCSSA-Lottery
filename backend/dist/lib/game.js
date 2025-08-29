import { redis, RedisKeys } from './redis.js';
import { getSocketIO } from './socket.js';
export class GameManager {
    constructor(roomId = process.env.DEFAULT_ROOM_ID) {
        this.roomId = roomId;
        this.io = getSocketIO();
    }
    // 初始化游戏
    async initializeGame() {
        await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
        await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
        await redis.set(RedisKeys.currentRound(this.roomId), '0');
        // 清空存活和淘汰列表
        await redis.del(RedisKeys.roomSurvivors(this.roomId));
        await redis.del(RedisKeys.roomEliminated(this.roomId));
    }
    // 添加用户到游戏
    async addPlayer(userEmail) {
        await redis.sAdd(RedisKeys.roomSurvivors(this.roomId), userEmail);
        await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'true');
        await redis.hSet(RedisKeys.userSession(userEmail), 'joinedAt', new Date().toISOString());
    }
    // 开始新一轮 - 管理员发布新题目
    async startNewRound(question) {
        const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
        const newRound = parseInt(currentRound || '0') + 1;
        // 更新当前轮次
        await redis.set(RedisKeys.currentRound(this.roomId), newRound.toString());
        // 保存当前题目
        await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'id', question.id);
        await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'question', question.question);
        await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'optionA', question.optionA);
        await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'optionB', question.optionB);
        await redis.hSet(RedisKeys.currentQuestion(this.roomId), 'startTime', question.startTime);
        // 设置游戏状态
        await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'playing');
        await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '30'); // 30秒答题时间
        // 广播新题目给所有存活用户
        if (this.io) {
            const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId));
            this.io.to(this.roomId).emit('new_question', {
                question: {
                    id: question.id,
                    question: question.question,
                    optionA: question.optionA,
                    optionB: question.optionB,
                },
                round: newRound,
                timeLeft: 30,
                survivorsCount,
            });
        }
        // 启动倒计时
        this.startCountdown();
    }
    // 用户提交答案
    async submitAnswer(userEmail, answer) {
        const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
        const currentQuestion = await redis.hGet(RedisKeys.currentQuestion(this.roomId), 'id');
        if (!currentRound || !currentQuestion) {
            throw new Error('没有进行中的游戏');
        }
        // 检查用户是否还在游戏中
        const isAlive = await redis.sIsMember(RedisKeys.roomSurvivors(this.roomId), userEmail);
        if (!isAlive) {
            throw new Error('您已被淘汰'); // catch these types of errors
        }
        // 记录用户答案
        await redis.set(RedisKeys.userAnswer(userEmail, currentQuestion.toString()), answer);
    }
    // 结束当前轮次并处理少数派晋级
    async endRound() {
        const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId));
        if (!currentQuestion || !currentQuestion.id)
            return;
        const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId));
        if (!survivors)
            return;
        const answers = { A: 0, B: 0 };
        // 统计答案
        for (const userEmail of survivors) {
            const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
            if (answer && (answer === 'A' || answer === 'B')) {
                answers[answer]++;
            }
        }
        // 找出少数派
        const minorityAnswer = answers.A <= answers.B ? 'A' : 'B';
        const majorityAnswer = answers.A <= answers.B ? 'B' : 'A';
        // 淘汰多数派，保留少数派
        for (const userEmail of survivors) {
            const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
            if (answer === majorityAnswer) {
                // 淘汰用户
                await redis.sRem(RedisKeys.roomSurvivors(this.roomId), userEmail);
                await redis.sAdd(RedisKeys.roomEliminated(this.roomId), userEmail);
                await redis.hSet(RedisKeys.userSession(userEmail), 'isAlive', 'false');
                await redis.hSet(RedisKeys.userSession(userEmail), 'eliminatedAt', new Date().toISOString());
            }
        }
        // 检查游戏是否结束
        const remainingSurvivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId));
        if (!remainingSurvivors)
            return;
        if (remainingSurvivors.length <= 1) {
            // 游戏结束
            const winner = remainingSurvivors.length === 1 ? remainingSurvivors[0] : null;
            await this.endGame(winner);
        }
        else {
            // 继续下一轮
            await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'waiting');
            await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
        }
        // 广播结果
        if (this.io) {
            this.io.to(this.roomId).emit('round_result', {
                minorityAnswer,
                majorityAnswer,
                answers,
                survivorsCount: remainingSurvivors.length,
                eliminatedCount: await redis.sCard(RedisKeys.roomEliminated(this.roomId)),
            });
        }
    }
    // 结束游戏
    async endGame(winner) {
        await redis.hSet(RedisKeys.gameState(this.roomId), 'status', 'ended');
        await redis.hSet(RedisKeys.gameState(this.roomId), 'timeLeft', '0');
        if (winner) {
            await redis.set(RedisKeys.gameWinner(this.roomId), winner);
        }
        // 广播游戏结束
        if (this.io) {
            this.io.to(this.roomId).emit('game_end', { winner });
        }
    }
    // 倒计时处理
    startCountdown() {
        let timeLeft = 30;
        const countdown = setInterval(async () => {
            timeLeft--;
            if (this.io) {
                this.io.to(this.roomId).emit('time_update', { timeLeft });
            }
            // better way to do the countdown?
            if (timeLeft <= 0) {
                clearInterval(countdown);
                await this.endRound();
            }
        }, 1000);
    }
    // 获取游戏统计
    async getGameStats() {
        const survivorsCount = await redis.sCard(RedisKeys.roomSurvivors(this.roomId));
        const eliminatedCount = await redis.sCard(RedisKeys.roomEliminated(this.roomId));
        const currentRound = await redis.get(RedisKeys.currentRound(this.roomId));
        const gameState = await redis.hGetAll(RedisKeys.gameState(this.roomId));
        return {
            totalPlayers: (survivorsCount || 0) + (eliminatedCount || 0),
            survivorsCount: survivorsCount || 0,
            eliminatedCount: eliminatedCount || 0,
            currentRound: parseInt(currentRound || '0'),
            status: gameState?.status || 'waiting',
            timeLeft: parseInt(gameState?.timeLeft || '0'),
        };
    }
    // 获取当前轮次统计
    async getRoundStats() {
        const currentQuestion = await redis.hGetAll(RedisKeys.currentQuestion(this.roomId));
        if (!currentQuestion || !currentQuestion.id)
            return null;
        const survivors = await redis.sMembers(RedisKeys.roomSurvivors(this.roomId));
        if (!survivors)
            return null;
        const answers = { A: 0, B: 0 };
        for (const userEmail of survivors) {
            const answer = await redis.get(RedisKeys.userAnswer(userEmail, currentQuestion.id.toString()));
            if (answer && (answer === 'A' || answer === 'B')) {
                answers[answer]++;
            }
        }
        return {
            question: currentQuestion,
            answers,
            totalAnswers: answers.A + answers.B,
            survivorsCount: survivors.length,
        };
    }
    // 重置游戏
    async resetGame() {
        const keys = [
            RedisKeys.gameState(this.roomId),
            RedisKeys.currentQuestion(this.roomId),
            RedisKeys.currentRound(this.roomId),
            RedisKeys.roomSurvivors(this.roomId),
            RedisKeys.roomEliminated(this.roomId),
            RedisKeys.gameWinner(this.roomId),
        ];
        for (const key of keys) {
            await redis.del(key);
        }
        // 重新初始化游戏
        await this.initializeGame();
    }
}
//# sourceMappingURL=game.js.map