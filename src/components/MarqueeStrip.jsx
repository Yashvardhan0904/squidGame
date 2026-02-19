'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function MarqueeStrip({
  items = ['SQUID GAME', 'DSA SURVIVAL', '25 DAYS', 'ELIMINATE OR BE ELIMINATED', 'THREE STRIKES', 'SOLVE OR DIE'],
  speed = 30,
  separator = '•',
  variant = 'default', // 'default' | 'accent' | 'subtle'
  reverse = false,
  className = '',
}) {
  const variants = {
    default: 'bg-squid-gray/50 border-y border-squid-border/30 text-gray-500',
    accent: 'bg-squid-pink/5 border-y border-squid-pink/20 text-squid-pink',
    subtle: 'bg-transparent border-y border-squid-border/10 text-gray-600',
  };

  // Create the repeating string
  const content = items.map(item => `${item} ${separator} `).join('');
  // Repeat it enough for seamless loop
  const repeated = content.repeat(6);

  return (
    <div className={`overflow-hidden py-3 ${variants[variant]} ${className}`}>
      <motion.div
        className="flex whitespace-nowrap font-mono text-xs tracking-[0.25em] uppercase"
        animate={{ x: reverse ? ['0%', '-16.666%'] : ['-16.666%', '0%'] }}
        transition={{
          x: {
            duration: speed,
            repeat: Infinity,
            ease: 'linear',
          },
        }}
      >
        <span className="inline-block">{repeated}</span>
      </motion.div>
    </div>
  );
}

// Variant: Tech stack marquee
export function TechMarquee({ className = '' }) {
  return (
    <MarqueeStrip
      items={['NEXT.JS', 'REACT', 'POSTGRESQL', 'PRISMA', 'TAILWIND CSS', 'FRAMER MOTION', 'NODE.JS', 'RAILWAY']}
      separator='—'
      variant="subtle"
      speed={40}
      className={className}
    />
  );
}
