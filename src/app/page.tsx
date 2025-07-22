'use client';

import { useRouter } from 'next/navigation';
import HeroSection from '@/components/game/HeroSection';
import Navbar from '@/components/game/Navbar';

export default function Home() {
  const router = useRouter();

  const handleStartGame = () => {
    router.push('/login');
  };

  return (
    <>
      <Navbar />
      <HeroSection
        currentPrize={'Apple MacBook Pro 14" 或 5000美刀现金'}
        playerCount={498}
        timeRemaining={30}
        onStartGame={handleStartGame}
      />
    </>
  );
}
