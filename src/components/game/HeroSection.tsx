import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import FloatingElements from './FloatingElements';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  currentPrize: string;
  playerCount: number;
  timeRemaining: number;
  isEliminated?: boolean;
  onStartGame?: () => void;
}

const HeroSection = ({
  currentPrize,
  playerCount,
  timeRemaining,
  isEliminated = false,
  onStartGame
}: HeroSectionProps) => {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setMinutes(Math.floor(timeRemaining / 60));
    setSeconds(timeRemaining % 60);
  }, [timeRemaining]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#0b0f1e] to-[#05060d]">
      {/* 粒子背景效果 */}
      <ParticleBackground />
      
      {/* 浮动元素 */}
      <FloatingElements />

      {/* 主要内容区域 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
        {/* 标题区域 */}
        <motion.h1 
          className="mb-8 text-4xl font-bold md:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="bg-gradient-to-r from-[#ffd700] to-[#ff9900] bg-clip-text text-transparent">
            答题闯关 赢取一等奖
          </span>
        </motion.h1>

        {/* 奖品展示 */}
        <motion.div
          className="mb-12 text-2xl font-medium text-white md:text-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {currentPrize}
        </motion.div>

        {/* 倒计时区域 */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="mb-4 text-lg text-gray-300">本轮答题倒计时</p>
          <div className="flex gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-b from-[#28a7ff] to-[#0066ff] text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
              {String(minutes).padStart(2, '0')}
            </div>
            <div className="flex items-center justify-center text-3xl font-bold text-white">:</div>
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gradient-to-b from-[#28a7ff] to-[#0066ff] text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
              {String(seconds).padStart(2, '0')}
            </div>
          </div>
        </motion.div>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {isEliminated ? (
            <div className="rounded-lg bg-red-500 px-8 py-4 text-lg font-medium text-white opacity-80">
              你已被淘汰
            </div>
          ) : (
            <Button variant="outline" size="xl" onClick={onStartGame}>
              开始答题
            </Button>
          )}
        </motion.div>

        {/* 统计数据 */}
        <motion.div
          className="mt-16 flex gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{playerCount}</div>
            <div className="text-sm text-gray-400">当前参赛人数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">10</div>
            <div className="text-sm text-gray-400">题目数量</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection; 