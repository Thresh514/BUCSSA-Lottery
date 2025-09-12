'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BattleEffectProps {
  isActive: boolean;
  duration?: number;
}

const BattleEffect: React.FC<BattleEffectProps> = ({ isActive, duration = 3000 }) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {/* 主要爆炸中心 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {Array.from({ length: 2 }).map((_, i) => (
          <motion.div
            key={`main-explosion-${i}`}
            className="absolute w-20 h-20 bg-red-600 rounded-full"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 8, 12, 0],
              opacity: [1, 0.8, 0.4, 0]
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* 爆炸碎片 */}
      <div className="absolute inset-0">
        {Array.from({ length: 80 }).map((_, i) => (
          <motion.div
            key={`debris-${i}`}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: '50%',
              top: '50%',
            }}
            initial={{ 
              scale: 0, 
              opacity: 1,
              x: 0,
              y: 0
            }}
            animate={{ 
              scale: [0, 1, 0.5, 0],
              opacity: [1, 0.9, 0.6, 0],
              x: (Math.random() - 0.5) * 400,
              y: (Math.random() - 0.5) * 400
            }}
            transition={{
              duration: 2.5,
              delay: Math.random() * 0.3,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* 火焰爆炸 */}
      <div className="absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <motion.div
            key={`fire-${i}`}
            className="absolute w-2 h-2 bg-orange-500 rounded-full"
            style={{
              left: `${50 + (Math.random() - 0.5) * 20}%`,
              top: `${50 + (Math.random() - 0.5) * 20}%`,
            }}
            initial={{ 
              scale: 0, 
              opacity: 1,
              y: 0
            }}
            animate={{ 
              scale: [0, 2, 1, 0],
              opacity: [1, 0.8, 0.4, 0],
              y: (Math.random() - 0.5) * 300,
              x: (Math.random() - 0.5) * 300
            }}
            transition={{
              duration: 2,
              delay: Math.random() * 0.4,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* 烟雾效果 */}
      <div className="absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <motion.div
            key={`smoke-${i}`}
            className="absolute w-3 h-3 bg-gray-600 rounded-full opacity-60"
            style={{
              left: `${50 + (Math.random() - 0.5) * 30}%`,
              top: `${50 + (Math.random() - 0.5) * 30}%`,
            }}
            initial={{ 
              scale: 0, 
              opacity: 0.6,
              y: 0
            }}
            animate={{ 
              scale: [0, 3, 5, 0],
              opacity: [0.6, 0.4, 0.2, 0],
              y: -200 - Math.random() * 100,
              x: (Math.random() - 0.5) * 200
            }}
            transition={{
              duration: 3,
              delay: Math.random() * 0.5,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* 多层冲击波 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.div
          key={`shockwave-${i}`}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ 
            duration: 1.5, 
            delay: i * 0.3,
            ease: "easeOut" 
          }}
        >
          <div className={`w-32 h-32 border-2 border-red-500 rounded-full opacity-${80 - i * 15}`} />
        </motion.div>
      ))}

      {/* 火炮轰炸背景 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-red-900/30 via-orange-900/20 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* 屏幕震动效果 */}
      <motion.div
        className="absolute inset-0 bg-red-500/10"
        animate={{
          x: [0, -2, 2, -1, 1, 0],
          y: [0, -1, 1, -2, 2, 0]
        }}
        transition={{
          duration: 0.5,
          repeat: 3,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default BattleEffect;