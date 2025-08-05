'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import RainbowGlowText from '@/components/RainbowGlowText';

const FloatingElements = () => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // 在客户端设置初始尺寸
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

    // 监听窗口大小变化
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const elements = [
    // 随机生成一些奖品
    ...Array.from({ length: 13 }).map((_, i) => {
      // 奖品列表
      const prizes = [
        'iPad Air',
        'AirPods Pro',
        '京东卡 ¥100',
        '星巴克券',
        '小米手环',
        '乐事薯片',
        '定制马克杯',
        '小米充电宝',
        '天猫精灵',
        '电影票',
        'Kindle',
        '蓝牙音箱',
        '神秘福袋'
      ];
      // 随机选一个奖品
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      return {
        text: randomPrize,
        delay: i * 0.7
      };
    }),
  ];

  if (dimensions.width === 0) return null; // 在获取到尺寸之前不渲染

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {elements.map((element, index) => (
        <motion.div
          key={index}
          className="absolute"
          initial={{
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            opacity: 0,
            scale: 0
          }}
          animate={{
            x: [
              Math.random() * dimensions.width,
              Math.random() * dimensions.width,
              Math.random() * dimensions.width
            ],
            y: [
              Math.random() * dimensions.height,
              Math.random() * dimensions.height,
              Math.random() * dimensions.height
            ],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 10,
            delay: element.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear"
          }}
        >
          <RainbowGlowText>{element.text}</RainbowGlowText>
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingElements; 