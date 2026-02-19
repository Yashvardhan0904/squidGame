'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { ChevronDown, ArrowDown } from 'lucide-react';
import GlitchText from './GlitchText';
import CountdownTimer from './CountdownTimer';
import { CircleSymbol, TriangleSymbol, SquareSymbol } from './SquidSymbols';
import MarqueeStrip from './MarqueeStrip';

export default function HeroSection({ survivorCount = 0, eliminatedCount = 0, totalPlayers = 0 }) {
  const challengeEndDate = '2026-03-12T23:59:59';
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);

  const stats = [
    { label: 'SURVIVORS', value: survivorCount, color: 'text-squid-mint' },
    { label: 'ELIMINATED', value: eliminatedCount, color: 'text-squid-red' },
    { label: 'TOTAL', value: totalPlayers, color: 'text-squid-pink' },
  ];

  return (
    <section ref={containerRef} className="relative min-h-[100svh] flex flex-col overflow-hidden" id="hero">
      {/* Background */}
      <div className="absolute inset-0 bg-squid-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,46,136,0.06)_0%,transparent_50%)]" />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,46,136,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,46,136,0.5) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Side text */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 z-10">
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-squid-pink/30 to-transparent" />
        <span className="font-mono text-[10px] text-gray-600 tracking-[0.3em]"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
          SCROLL TO EXPLORE
        </span>
        <div className="w-px h-20 bg-gradient-to-b from-transparent via-squid-pink/30 to-transparent" />
      </div>

      {/* Content */}
      <motion.div style={{ opacity, y }} className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20">
        {/* Overline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="h-px w-12 bg-squid-pink/40" />
          <span className="font-mono text-[11px] text-squid-pink/70 tracking-[0.4em] uppercase">ACM Presents</span>
          <div className="h-px w-12 bg-squid-pink/40" />
        </motion.div>

        {/* Symbols */}
        <motion.div
          className="flex items-center gap-5 mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <CircleSymbol size={32} glowing />
          <TriangleSymbol size={32} glowing />
          <SquareSymbol size={32} glowing />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <GlitchText
            text="SQUID"
            className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-display font-black text-white leading-[0.9] tracking-tight"
          />
          <div className="relative">
            <GlitchText
              text="GAME"
              className="text-6xl sm:text-8xl md:text-9xl lg:text-[10rem] font-display font-black text-white leading-[0.9] tracking-tight"
            />
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 bg-squid-pink rounded-full"
              initial={{ width: 0 }}
              animate={{ width: '60%' }}
              transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-8 text-gray-400 font-mono text-sm md:text-base text-center max-w-xl leading-relaxed"
        >
          25 days. One challenge per day. Score zero and earn a strike.
          <span className="text-squid-pink font-semibold"> Three strikes — eliminated.</span>
        </motion.p>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="flex items-center gap-8 md:gap-16 mt-12"
        >
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center">
              <motion.div
                className={`text-3xl md:text-5xl font-display font-black ${stat.color}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.15, type: 'spring', stiffness: 200 }}
              >
                {stat.value}
              </motion.div>
              <span className="text-gray-600 font-mono text-[10px] tracking-[0.2em] mt-1 block">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Countdown */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="mt-12">
          <p className="text-gray-600 font-mono text-[10px] tracking-[0.3em] text-center mb-4 uppercase">Arena Closes In</p>
          <CountdownTimer targetDate={challengeEndDate} />
        </motion.div>

        {/* CTA */}
        <motion.a
          href="https://www.hackerrank.com/contests" 
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="mt-12 group relative px-10 py-4 bg-squid-pink text-black font-display font-bold text-sm tracking-wider
            overflow-hidden transition-all duration-300 shadow-[0_0_30px_rgba(255,46,136,0.3)] hover:shadow-[0_0_50px_rgba(255,46,136,0.5)] cursor-pointer"
        >
          <span className="relative z-10 flex items-center gap-2">
            ENTER THE ARENA
            <ArrowDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
          </span>
        </motion.a>

        {/* Scroll indicator */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="font-mono text-[9px] text-gray-600 tracking-[0.3em]">SCROLL</span>
          <ChevronDown size={16} className="text-squid-pink/40" />
        </motion.div>
      </motion.div>

      {/* Bottom marquee */}
      <div className="relative z-10">
        <MarqueeStrip
          items={['SQUID GAME', 'DSA SURVIVAL', '25 DAYS OF CODE', 'ELIMINATE OR BE ELIMINATED', 'THREE STRIKES', 'SOLVE OR DIE']}
          variant="accent"
          speed={35}
        />
      </div>
    </section>
  );
}
