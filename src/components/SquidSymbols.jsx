'use client';

import { motion } from 'framer-motion';

// Triangle symbol
export function TriangleSymbol({ size = 40, className = '', filled = false, glowing = false }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 12px rgba(255, 46, 136, 0.8))' }}
    >
      <polygon
        points="20,4 36,36 4,36"
        fill={filled ? '#ff2e88' : 'none'}
        stroke="#ff2e88"
        strokeWidth="1.5"
        style={glowing ? { filter: 'drop-shadow(0 0 6px rgba(255, 46, 136, 0.5))' } : {}}
      />
    </motion.svg>
  );
}

// Circle symbol
export function CircleSymbol({ size = 40, className = '', filled = false, glowing = false }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 12px rgba(255, 46, 136, 0.8))' }}
    >
      <circle
        cx="20"
        cy="20"
        r="16"
        fill={filled ? '#ff2e88' : 'none'}
        stroke="#ff2e88"
        strokeWidth="1.5"
        style={glowing ? { filter: 'drop-shadow(0 0 6px rgba(255, 46, 136, 0.5))' } : {}}
      />
    </motion.svg>
  );
}

// Square symbol
export function SquareSymbol({ size = 40, className = '', filled = false, glowing = false }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      whileHover={{ scale: 1.15, filter: 'drop-shadow(0 0 12px rgba(255, 46, 136, 0.8))' }}
    >
      <rect
        x="4"
        y="4"
        width="32"
        height="32"
        fill={filled ? '#ff2e88' : 'none'}
        stroke="#ff2e88"
        strokeWidth="1.5"
        style={glowing ? { filter: 'drop-shadow(0 0 6px rgba(255, 46, 136, 0.5))' } : {}}
      />
    </motion.svg>
  );
}

// Strike indicator — shows 3 symbols filled based on strikes
export function StrikeIndicator({ strikes = 0, size = 20 }) {
  const symbols = [CircleSymbol, TriangleSymbol, SquareSymbol];
  return (
    <div className="flex gap-1.5 items-center">
      {symbols.map((Symbol, i) => (
        <Symbol
          key={i}
          size={size}
          filled={i < strikes}
          glowing={i < strikes}
          className={i < strikes ? 'opacity-100' : 'opacity-20'}
        />
      ))}
    </div>
  );
}

// Section header — USAR-inspired with number
export function SectionHeader({ number, title, subtitle, align = 'left', className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`mb-12 ${align === 'center' ? 'text-center' : ''} ${className}`}
    >
      {number && (
        <span className="font-mono text-[11px] text-squid-pink/60 tracking-[0.3em] block mb-3">
          {number}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-white tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-gray-500 font-mono text-sm max-w-lg leading-relaxed">
          {subtitle}
        </p>
      )}
      <motion.div
        className={`mt-4 h-px bg-gradient-to-r from-squid-pink/60 to-transparent ${align === 'center' ? 'mx-auto max-w-[120px] from-transparent via-squid-pink/60 to-transparent' : 'max-w-[80px]'}`}
        initial={{ width: 0 }}
        whileInView={{ width: align === 'center' ? 120 : 80 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
      />
    </motion.div>
  );
}

// Decorative divider
export function SymbolDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-4 my-4">
      <div className="h-px flex-1 max-w-[200px] bg-gradient-to-r from-transparent to-squid-border/40" />
      <CircleSymbol size={14} />
      <TriangleSymbol size={14} />
      <SquareSymbol size={14} />
      <div className="h-px flex-1 max-w-[200px] bg-gradient-to-l from-transparent to-squid-border/40" />
    </div>
  );
}
