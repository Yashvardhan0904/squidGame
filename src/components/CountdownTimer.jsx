'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const blocks = [
    { label: 'DAYS', value: timeLeft.days },
    { label: 'HRS', value: timeLeft.hours },
    { label: 'MIN', value: timeLeft.minutes },
    { label: 'SEC', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-3 md:gap-4 justify-center">
      {blocks.map(({ label, value }, i) => (
        <div key={label} className="flex flex-col items-center">
          <div className="relative bg-squid-card border border-squid-border/60 rounded-lg px-3 py-2.5 md:px-5 md:py-3 min-w-[56px] md:min-w-[72px]">
            <AnimatePresence mode="wait">
              <motion.span
                key={value}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-xl md:text-3xl font-display font-bold text-white tabular-nums block text-center"
              >
                {String(value).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="text-[9px] md:text-[10px] text-gray-600 mt-2 font-mono tracking-[0.2em]">{label}</span>
          {i < blocks.length - 1 && (
            <span className="absolute hidden">:</span>
          )}
        </div>
      ))}
    </div>
  );
}
