'use client';

import { useRouter } from 'next/navigation';
import HeroSection from '@/components/game/HeroSection';
import Navbar from '@/components/game/Navbar';
import BackgroundImage from '@/components/game/BackgroundImage';

export default function Home() {
  const router = useRouter();

  const handleStartGame = () => {
    router.push('/login');
  };

  return (
    <>
      {/* 背景图片 */}
      <BackgroundImage 
        imageUrl="background.jpeg"  // 在这里设置你的背景图片路径
        overlayOpacity={0.2}               // 遮罩透明度，0-1之间
      />
      
      {/* 导航栏 */}
      <Navbar />
      
      {/* 主要内容 */}
      <HeroSection
        currentPrize={'Apple MacBook Pro 14" 或 5000美刀现金'}
        playerCount={498}
        timeRemaining={30}
        onStartGame={handleStartGame}
      />
    </>
  );
}
