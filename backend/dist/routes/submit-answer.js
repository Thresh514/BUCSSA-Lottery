import express from 'express';
import { GameManager } from '../lib/game.js';
const router = express.Router();
router.post('/', async (req, res) => {
    try {
        const { answer, userEmail } = req.body;
        // 验证用户邮箱
        if (!userEmail) {
            return res.status(401).json({ error: '请先登录' });
        }
        // 验证答案格式
        if (!answer || !['A', 'B'].includes(answer)) {
            return res.status(400).json({ error: '请选择A或B选项' });
        }
        const gameManager = new GameManager();
        // 提交答案
        await gameManager.submitAnswer(userEmail, answer);
        return res.status(200).json({
            message: '答案已提交',
            answer
        });
    }
    catch (error) {
        console.error('提交答案错误:', error);
        if (error.message === '没有进行中的游戏') {
            return res.status(400).json({ error: '当前没有进行中的游戏' });
        }
        if (error.message === '您已被淘汰') {
            return res.status(400).json({ error: '您已被淘汰，无法继续答题' });
        }
        return res.status(500).json({ error: '服务器内部错误' });
    }
});
export default router;
//# sourceMappingURL=submit-answer.js.map