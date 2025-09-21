import { motion } from "framer-motion";
import ParticleBackground from "./ParticleBackground";
import { Button } from "@/components/ui/button";
import { Box } from "../ui/box";
import { GlassText } from "../ui/glass-text";
import Image from "next/image";

interface HeroSectionProps {
  currentPrize: string;
  playerCount: number;
  isEliminated?: boolean;
  onStartGame?: () => void;
}

const HeroSection = ({
  currentPrize,
  playerCount,
  isEliminated = false,
  onStartGame,
}: HeroSectionProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-transparent">
      {/* 粒子背景效果 */}
      <ParticleBackground />

      {/* 主要内容区域 - 移动端优化布局 */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12 text-center translate-y-4 sm:translate-y-8 space-y-24 md:space-y-24">
        <div className="fixed top-12 left-1/2 -translate-x-1/2 block md:hidden">
          <Image src="/bucssalogo.png" alt="logo" width={150} height={150} />
        </div>
        {/* 标题区域 - 移动端字体大小调整 */}
        {/* <motion.h1
          className="mb-6 sm:mb-8 text-5xl md:text-7xl font-lightest px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <GlassText
            className="text-5xl md:text-7xl tracking-wide md:tracking-wider font-normal"
            variant="primary"
          >
            国庆晚会抽奖
          </GlassText>
        </motion.h1> */}



        {/* 操作按钮 - 移动端优化 */}
        <motion.div
          className="w-full px-4 space-y-12 md:space-y-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <GlassText
            className="text-5xl md:text-8xl tracking-wide md:tracking-wider font-normal"
            variant="primary"
          >
            文化节抽奖
          </GlassText>
          <Button variant="outline" size="xl" onClick={onStartGame}>
            开始答题, 豪取大奖吧！
          </Button>
          
        </motion.div>

        {/* 规则栏目 - 移动端优化 */}
        <motion.div
          className="w-full max-w-xs md:max-w-sm mx-auto px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="p-3 md:p-4 bg-white/10 backdrop-blur-sm rounded-md">
            <h3 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4 text-center tracking-wide md:tracking-wider">
              游戏规则
            </h3>
            <div className="flex flex-col gap-2">
              <div className="text-white font-medium text-sm md:text-base leading-relaxed">
                每轮限时答题，选择人数较少的选项将晋级下一轮，坚持到最后即可获胜。
              </div>
            </div>
          </div>
        </motion.div>

                {/* 奖品展示 - 移动端优化 */}
        {/* <motion.div
          className="mb-8 md:mb-12 text-lg md:text-2xl font-medium text-white font-semibold px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="inline-block px-4 md:px-6 py-2 md:py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/30">
            狂赢 {currentPrize} 大奖！
          </div>
        </motion.div> */}

        {/* 实时人数显示 - 移动端优化 */}
        {/* <motion.div
          className="mb-8 md:mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box className="px-4 md:px-6 py-4 sm:py-6">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                {playerCount}
              </div>
              <div className="text-xl md:text-xl text-white/90 font-medium">当前参赛人数</div>
            </div>
          </Box>
        </motion.div> */}

      </div>
    </div>
  );
};

export default HeroSection;
