import express from 'express';
import { GameManager } from '../lib/game.js';
const router = express.Router();
// 获取游戏统计
router.get('/game-stats', async (req, res) => {
    try {
        const gameManager = new GameManager();
        // 获取游戏统计信息
        const gameStats = await gameManager.getGameStats();
        // 获取当前轮次统计（如果有进行中的轮次）
        const roundStats = await gameManager.getRoundStats();
        const allStats = {
            ...gameStats,
            roundStats,
        };
        return res.status(200).json(allStats);
    }
    catch (error) {
        console.error('获取游戏统计错误:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});
// 发布下一题
router.post('/next-question', async (req, res) => {
    try {
        const { question, optionA, optionB } = req.body;
        // 验证必要字段
        if (!question || !optionA || !optionB) {
            return res.status(400).json({ error: '请提供题目内容和两个选项' });
        }
        const gameManager = new GameManager();
        // 创建少数派题目
        const minorityQuestion = {
            id: `q_${Date.now()}`,
            question,
            optionA,
            optionB,
            startTime: new Date().toISOString()
        };
        // 开始新一轮
        await gameManager.startNewRound(minorityQuestion);
        return res.status(200).json({
            message: '新题目已发布',
            question: minorityQuestion
        });
    }
    catch (error) {
        console.error('发布新题目错误:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});
// 重置游戏
router.post('/reset-game', async (req, res) => {
    try {
        const gameManager = new GameManager();
        await gameManager.resetGame();
        return res.status(200).json({ message: '游戏已重置' });
    }
    catch (error) {
        console.error('重置游戏错误:', error);
        return res.status(500).json({ error: '服务器内部错误' });
    }
});
export default router;
//# sourceMappingURL=admin.js.map