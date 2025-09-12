'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedBarChartProps {
  data: {
    label: string;
    value: number;
    color: string;
    bgColor: string;
    borderColor: string;
  }[];
  maxValue?: number;
  duration?: number;
}

// 使用 react-spring 的数字动画组件
const AnimatedNumber: React.FC<{ value: number; delay: number }> = ({ value, delay }) => {
  const { number } = useSpring({
    from: { number: 0 },
    to: { number: value },
    delay: delay * 1000,
    config: { duration: 2000, tension: 120, friction: 14 }
  });

  return (
    <animated.span>
      {number.to(n => Math.round(n))}
    </animated.span>
  );
};

// 每一条柱子组件
const BarItem: React.FC<{
  item: { label: string; value: number; color: string; bgColor: string; borderColor: string };
  index: number;
  max: number;
  isVisible: boolean;
}> = ({ item, index, max, isVisible }) => {
  const safeValue = Math.max(0, item.value || 0);

  // ✅ 在子组件顶层调用 useSpring
  const barAnimation = useSpring({
    from: { width: '0%' },
    to: { width: isVisible ? `${(safeValue / max) * 100}%` : '0%' },
    delay: index * 300,
    config: { duration: 2000, tension: 120, friction: 14 }
  });

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.2, duration: 0.5 }}
    >
      {/* 标签和数值 */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold" style={{ color: item.color }}>
          {item.label}
        </span>
        <div className="text-3xl font-bold" style={{ color: item.color }}>
          <AnimatedNumber value={safeValue} delay={index * 0.3} />
        </div>
      </div>

      {/* 柱状图容器 */}
      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
        <animated.div
          className="h-full rounded-full flex items-center justify-end pr-4"
          style={{
            backgroundColor: item.bgColor,
            border: `2px solid ${item.borderColor}`,
            ...barAnimation
          }}
        >
          <span className="text-sm font-bold" style={{ color: item.color }}>
            {safeValue}
          </span>
        </animated.div>
      </div>
    </motion.div>
  );
};

const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({ 
  data, 
  maxValue, 
  duration = 2 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // 确保数据有效并过滤掉无效值
  const validData = data.filter(item => 
    item && 
    typeof item.value === 'number' && 
    !isNaN(item.value) && 
    isFinite(item.value)
  );

  const max = maxValue || Math.max(...validData.map(item => item.value)) || 1;

  // 如果没有有效数据，显示空状态
  if (validData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        暂无数据
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {validData.map((item, index) => (
        <BarItem
          key={item.label}
          item={item}
          index={index}
          max={max}
          isVisible={isVisible}
        />
      ))}
    </div>
  );
};

export default AnimatedBarChart;