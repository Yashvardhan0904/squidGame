'use client';

import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { StrikeIndicator, SectionHeader } from './SquidSymbols';

function RankBadge({ rank }) {
  if (rank === 1) return (
    <motion.div
      className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-display font-black text-base text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity }}
    >{rank}</motion.div>
  );
  if (rank === 2) return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center font-display font-black text-base text-black shadow-[0_0_10px_rgba(156,163,175,0.3)]">{rank}</div>
  );
  if (rank === 3) return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center font-display font-black text-base text-white shadow-[0_0_10px_rgba(180,83,9,0.3)]">{rank}</div>
  );
  return (
    <div className="w-10 h-10 rounded-full bg-squid-gray border border-squid-border/50 flex items-center justify-center font-mono text-sm text-gray-500">
      {rank}
    </div>
  );
}

function StatusBadge({ strikes }) {
  if (strikes >= 2) {
    return <span className="text-[10px] bg-squid-red/10 text-squid-red border border-squid-red/20 px-2.5 py-1 rounded-full font-mono tracking-wider">DANGER</span>;
  }
  if (strikes === 1) {
    return <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/15 px-2.5 py-1 rounded-full font-mono tracking-wider">WARNING</span>;
  }
  return <span className="text-[10px] bg-squid-mint/10 text-squid-mint border border-squid-mint/15 px-2.5 py-1 rounded-full font-mono tracking-wider">SAFE</span>;
}

export default function Leaderboard({ players = [], searchTerm = '', onSearchChange }) {
  const survivors = players
    .filter(p => !p.eliminated)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  const filtered = searchTerm
    ? survivors.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.hackerrank_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.enroll_no?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : survivors;

  return (
    <section className="py-20 md:py-28 px-6 relative" id="leaderboard">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          number="02 — LIVE RANKINGS"
          title="Leaderboard"
          subtitle="Every pixel tells a story. Every rank is earned through code, persistence, and survival."
        />

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 max-w-lg"
        >
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search players..."
              className="w-full bg-squid-card border border-squid-border/50 text-white pl-11 pr-4 py-3.5 rounded-xl
                font-mono text-sm placeholder:text-gray-600 focus:border-squid-pink/40 focus:outline-none
                transition-all duration-300"
            />
          </div>
        </motion.div>

        {/* Top 3 podium */}
        {!searchTerm && filtered.length >= 3 && (
          <motion.div
            className="grid grid-cols-3 gap-3 md:gap-6 mb-14 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {[1, 0, 2].map((idx) => {
              const player = filtered[idx];
              if (!player) return null;
              const rank = idx + 1;
              const isFirst = rank === 1;
              return (
                <motion.div
                  key={player.id}
                  className={`relative bg-squid-card border rounded-2xl p-5 text-center group overflow-hidden
                    hover:border-squid-pink/30 transition-all duration-500
                    ${isFirst
                      ? 'border-yellow-500/30 -mt-4 md:-mt-6'
                      : rank === 2
                        ? 'border-squid-border/50 mt-2 md:mt-6'
                        : 'border-squid-border/50 mt-4 md:mt-10'
                    }`}
                  style={{ order: rank === 1 ? 1 : rank === 2 ? 0 : 2 }}
                  whileHover={{ y: -5, transition: { duration: 0.25 } }}
                >
                  {/* Top glow line */}
                  {isFirst && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />
                  )}

                  <div className="flex justify-center mb-3">
                    <RankBadge rank={rank} />
                  </div>
                  <h3 className={`font-bold truncate ${isFirst ? 'text-yellow-400 text-base' : 'text-gray-300 text-sm'}`}>
                    {player.name}
                  </h3>
                  <p className="text-gray-600 text-[10px] font-mono mt-1 truncate">@{player.hackerrank_id}</p>
                  <div className={`text-2xl md:text-3xl font-display font-black mt-3 ${isFirst ? 'text-yellow-400' : 'text-white'}`}>
                    {player.totalScore || 0}
                  </div>
                  <div className="flex justify-center mt-3">
                    <StrikeIndicator strikes={player.strike_count ?? 0} size={14} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-squid-card border border-squid-border/50 rounded-2xl overflow-hidden"
        >
          {/* Table header */}
          <div className="grid grid-cols-[48px_1fr_90px_70px_80px] md:grid-cols-[60px_1fr_140px_100px_100px] gap-2 px-5 py-3.5
            bg-squid-gray/40 border-b border-squid-border/30 text-[10px] font-mono text-gray-600 uppercase tracking-[0.15em]">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-center">Strikes</span>
            <span className="text-right">Score</span>
            <span className="text-right hidden md:block">Status</span>
          </div>

          {/* Rows */}
          <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
            {filtered.map((player, index) => {
              const rank = index + 1;
              const strikes = player.strike_count ?? 0;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.4) }}
                  className={`grid grid-cols-[48px_1fr_90px_70px_80px] md:grid-cols-[60px_1fr_140px_100px_100px] gap-2 px-5 py-3.5
                    border-b border-squid-border/20 items-center transition-colors duration-300
                    hover:bg-squid-pink/[0.03] group
                    ${strikes >= 2 ? 'bg-squid-red/[0.02]' : ''}`}
                >
                  <div className="flex justify-center">
                    <RankBadge rank={rank} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-sm font-medium truncate group-hover:text-squid-pink transition-colors duration-300">
                      {player.name}
                    </div>
                    <div className="text-gray-600 text-[10px] font-mono truncate">@{player.hackerrank_id}</div>
                  </div>
                  <div className="flex justify-center">
                    <StrikeIndicator strikes={strikes} size={14} />
                  </div>
                  <div className="text-right">
                    <span className="text-white font-display font-bold text-lg">{player.totalScore || 0}</span>
                  </div>
                  <div className="text-right hidden md:block">
                    <StatusBadge strikes={strikes} />
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-600 font-mono text-sm">
                {searchTerm ? 'No matching players found' : 'No survivors in the arena yet'}
              </div>
            )}
          </div>
        </motion.div>

        {/* Player count */}
        <div className="mt-4 text-right">
          <span className="font-mono text-[10px] text-gray-600 tracking-wider">
            {filtered.length} player{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </div>
      </div>
    </section>
  );
}
