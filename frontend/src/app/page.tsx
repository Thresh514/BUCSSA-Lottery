'use client';

import { useRouter } from 'next/navigation';
import HeroSection from '@/components/game/HeroSection';
import Navbar from '@/components/game/Navbar';
import BackgroundImage from '@/components/game/BackgroundImage';

export default function Home() {
  const router = useRouter();

  const handleStartGame = (): void => {
    router.push('/login');
  };

  return (
    <>
      {/* 背景图片 */}
      <BackgroundImage 
        imageUrl="bgup.webp"  // 在这里设置你的背景图片路径
        overlayOpacity={0.05}        // 整体遮罩透明度，0-1之间
        centerMask={true}           // 启用中间渐变蒙版
        maskWidth={90}              // 中间蒙版宽度，80%的屏幕宽度
      />
      
      {/* 导航栏 */}
      <Navbar />
      
      {/* 主要内容 */}
      <HeroSection
        currentPrize={'Apple MacBook Pro 14'}
        playerCount={250}
        onStartGame={handleStartGame}
      />
    </>
  );
}

