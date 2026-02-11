import React, { useState, useEffect } from 'react';
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };
  return { isDark, toggleTheme };
}