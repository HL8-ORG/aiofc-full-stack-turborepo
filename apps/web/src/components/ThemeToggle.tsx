"use client";

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  // 从ThemeContext获取主题状态和切换函数
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 切换按钮点击处理器
  const handleToggleTheme = () => {
    console.log('当前主题:', theme); // 用于调试
    toggleTheme();
  };

  return (
    <button
      onClick={handleToggleTheme}
      className={`
        rounded-full flex items-center justify-center p-2
        transition-colors duration-200
        ${className}
      `}
      aria-label={`主题切换: ${theme === 'light' ? '暗色' : '亮色'}模式`}
    >
      {/* 根据当前主题显示不同图标 */}
      {theme === 'light' ? (
        <Moon className="cursor-pointer text-customgreys-dirtyGrey w-5 h-5 sm:w-6 sm:h-6 hover:text-white-50" />
      ) : (
        <Sun className="cursor-pointer text-customgreys-dirtyGrey w-5 h-5 sm:w-6 sm:h-6 hover:text-white-50" />
      )}
    </button>
  );
};

export default ThemeToggle;