import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('light');
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      className={`relative w-[38px] h-[38px] rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 ${className}`}
      style={{
        background: isDark
          ? 'linear-gradient(145deg, hsla(222, 12%, 20%, 0.6), hsla(222, 12%, 14%, 0.6))'
          : 'linear-gradient(145deg, hsla(220, 20%, 92%, 0.8), hsla(220, 15%, 96%, 0.9))',
        border: isDark
          ? '1px solid hsla(210, 20%, 50%, 0.12)'
          : '1px solid hsla(220, 15%, 80%, 0.5)',
        boxShadow: isDark
          ? '0 0 0 0.5px hsla(210, 20%, 100%, 0.06) inset, 0 4px 12px -2px hsla(225, 30%, 3%, 0.5)'
          : '0 2px 8px -2px hsla(220, 30%, 50%, 0.15), 0 0 0 0.5px hsla(220, 20%, 100%, 0.8) inset',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <Moon className="w-[16px] h-[16px] text-muted-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <Sun className="w-[16px] h-[16px] text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
