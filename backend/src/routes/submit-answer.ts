import express from 'express';
import { getGameManager } from '../lib/game.js';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/index.js';

const router = express.Router();


router.post('/', async (req, res) => {
  try {
    const { answer } = req.body;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload : null;

    const userEmail = decoded?.email;
    const isAdmin = decoded?.isAdmin;
    const isDisplay = decoded?.isDisplay;

    console.log('提交答案请求:', { userEmail, isAdmin, isDisplay, answer });

    // 验证用户邮箱
    if (!userEmail) {
      return res.status(401).json({ error: '请先登录' });
    }

    // 验证用户身份
    if (isAdmin || isDisplay) {
      return res.status(401).json({ error: '无权访问' });
    }

    // 验证答案格式
    if (!answer || !['A', 'B'].includes(answer)) {
      return res.status(400).json({ error: '请选择A或B选项' });
    }

    const gameManager = getGameManager();
    
    // 提交答案
    await gameManager.submitAnswer(userEmail, answer);

    return res.status(200).json({ 
      message: '答案已提交',
      answer
    });
  } catch (error: any) {
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