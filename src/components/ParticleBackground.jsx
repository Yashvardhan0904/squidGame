'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ParticleBackground({ count = 20 }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 25 + 20,
      delay: Math.random() * 20,
      opacity: Math.random() * 0.15 + 0.03,
      type: ['circle', 'triangle', 'square'][Math.floor(Math.random() * 3)],
    }));

    // Defer state update to avoid cascading renders lint error
    const timer = setTimeout(() => {
      setParticles(generated);
    }, 0);

    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{ left: `${p.x}%`, bottom: '-20px' }}
          animate={{
            y: [0, -(typeof window !== 'undefined' ? window.innerHeight + 100 : 1200)],
            rotate: [0, 360],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {p.type === 'circle' && (
            <div className="rounded-full border border-squid-pink/20" style={{ width: p.size * 3, height: p.size * 3 }} />
          )}
          {p.type === 'triangle' && (
            <svg width={p.size * 4} height={p.size * 4} viewBox="0 0 20 20">
              <polygon points="10,2 18,18 2,18" fill="none" stroke="rgba(255,46,136,0.15)" strokeWidth="1" />
            </svg>
          )}
          {p.type === 'square' && (
            <div className="border border-squid-pink/10 rotate-45" style={{ width: p.size * 3, height: p.size * 3 }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
