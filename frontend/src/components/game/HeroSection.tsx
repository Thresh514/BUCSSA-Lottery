import { motion } from 'framer-motion';
import ParticleBackground from './ParticleBackground';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  currentPrize: string;
  playerCount: number;
  isEliminated?: boolean;
  onStartGame?: () => void;
}

const HeroSection = ({ currentPrize, playerCount, isEliminated = false, onStartGame}: HeroSectionProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent">
      {/* 粒子背景效果 */}
      <ParticleBackground />

      {/* 主要内容区域 - 移动端优化布局 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12 text-center translate-y-4 sm:translate-y-8">
        {/* 标题区域 - 移动端字体大小调整 */}
        <motion.h1 
          className="mb-6 sm:mb-8 text-5xl md:text-7xl font-bold font-sans px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <span 
            className="bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#ffb347] bg-clip-text tracking-wide sm:tracking-wider text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] animate-gradient-flow"
            style={{
              backgroundSize: '200% 100%'
            }}
          >
            国庆晚会抽奖
          </span>
        </motion.h1>

        {/* 奖品展示 - 移动端优化 */}
        <motion.div
          className="mb-8 md:mb-12 text-lg md:text-2xl font-medium text-white font-semibold px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/30">
            狂赢 {currentPrize} 大奖！
          </div>
        </motion.div>

        {/* 实时人数显示 - 移动端优化 */}
        <motion.div
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="px-4 md:px-6 py-4 sm:py-6">
            <div className="text-center">
              <div
                className="text-4xl md:text-5xl font-bold text-white mb-2 animate-bounce"
                style={{ animationDuration: '1.5s' }}
              >
                {playerCount}
              </div>
              <div className="text-md md:text-lg text-white/90 font-medium">当前参赛人数</div>
            </div>
          </div>
        </motion.div>

        {/* 操作按钮 - 移动端优化 */}
        <motion.div
          className="w-full max-w-sm sm:max-w-md mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {isEliminated ? (
            <div className="rounded-lg bg-red-500/90 backdrop-blur-sm px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white border border-red-400/50 text-center">
              你已被淘汰了哦，请耐心等待一等奖得主的诞生吧！
            </div>
          ) : (
              <Button 
                variant="outline" 
                size="xl" 
                onClick={onStartGame}
              >
                开始答题，豪取大奖吧！
              </Button>
          )}
        </motion.div>

        {/* 规则栏目 - 移动端优化 */}
        <motion.div
          className="mt-16 md:mt-20 w-full max-w-xs md:max-w-sm mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-md">
            <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-center tracking-wide md:tracking-wider">游戏规则</h3>
            <div className="flex flex-col gap-2">
                <div className="text-white font-medium text-sm md:text-base leading-relaxed">
                  每轮限时答题，选择人数较少的选项将淘汰其参与者，坚持到最后即可获胜。
                </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection; 