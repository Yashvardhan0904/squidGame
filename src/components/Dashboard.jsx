'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Users, Skull, AlertTriangle, TrendingUp, Calendar, Zap } from 'lucide-react';
import { StrikeIndicator, SectionHeader } from './SquidSymbols';

function StatCard({ icon: Icon, label, value, accentColor, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative bg-squid-card border border-squid-border/50 rounded-2xl p-6 overflow-hidden
        hover:border-squid-pink/30 transition-colors duration-500"
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-squid-pink/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2.5 rounded-xl bg-squid-gray border border-squid-border/50`}>
            <Icon size={18} className={accentColor} />
          </div>
          <Zap size={14} className="text-squid-border opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <motion.div
          className="text-4xl md:text-5xl font-display font-black text-white mb-1"
          key={value}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {value}
        </motion.div>
        <span className="text-gray-500 font-mono text-[11px] tracking-[0.15em] uppercase">{label}</span>
      </div>
    </motion.div>
  );
}

export default function Dashboard({ players = [], stats = {} }) {
  const survivors = players.filter(p => !p.eliminated);
  const eliminated = players.filter(p => p.eliminated);
  const highRisk = survivors.filter(p => (p.strike_count ?? 0) === 2);
  const daysCompleted = stats.daysCompleted ?? 0;
  const daysRemaining = 25 - daysCompleted;
  const progressPct = (daysCompleted / 25) * 100;

  return (
    <section className="py-20 md:py-28 px-6 relative" id="dashboard">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          number="01 — CONTROL ROOM"
          title="Arena Status"
          subtitle="Real-time overview of the survival arena. Every number tells a story of persistence — or elimination."
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
          <StatCard icon={Users} label="Total Players" value={players.length} accentColor="text-squid-pink" delay={0} />
          <StatCard icon={TrendingUp} label="Survivors" value={survivors.length} accentColor="text-squid-mint" delay={0.1} />
          <StatCard icon={Skull} label="Eliminated" value={eliminated.length} accentColor="text-squid-red" delay={0.2} />
          <StatCard icon={AlertTriangle} label="High Risk" value={highRisk.length} accentColor="text-squid-yellow" delay={0.3} />
        </div>

        {/* Progress bar */}
        <motion.div
          className="bg-squid-card border border-squid-border/50 rounded-2xl p-6 md:p-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-squid-gray border border-squid-border/50">
                <Calendar size={14} className="text-squid-pink" />
              </div>
              <span className="font-mono text-xs text-gray-500 tracking-wider uppercase">Challenge Progress</span>
            </div>
            <span className="font-display text-squid-pink font-bold text-sm">
              Day {daysCompleted} <span className="text-gray-600 font-normal">/ 25</span>
            </span>
          </div>

          <div className="relative h-3 bg-squid-gray rounded-full overflow-hidden border border-squid-border/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-squid-pink to-squid-red"
              initial={{ width: 0 }}
              whileInView={{ width: `${progressPct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              style={{ boxShadow: '0 0 20px rgba(255,46,136,0.4)' }}
            />
          </div>

          <div className="flex justify-between mt-3 text-[10px] font-mono text-gray-600 tracking-wider">
            <span>DAY 1</span>
            <span>{daysRemaining > 0 ? `${daysRemaining} days remaining` : 'CHALLENGE COMPLETE'}</span>
            <span>DAY 25</span>
          </div>
        </motion.div>

        {/* High risk warning zone */}
        <AnimatePresence>
          {highRisk.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-squid-card border border-squid-red/20 rounded-2xl p-6 md:p-8 relative overflow-hidden"
            >
              {/* Danger glow */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-squid-red/50 to-transparent" />

              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-2 rounded-lg bg-squid-red/10 border border-squid-red/20"
                >
                  <AlertTriangle className="text-squid-red" size={18} />
                </motion.div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">
                    HIGH RISK ZONE
                  </h3>
                  <p className="text-squid-red/70 font-mono text-[11px] tracking-wider">
                    {highRisk.length} player{highRisk.length > 1 ? 's' : ''} at 2 strikes — next miss eliminates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {highRisk.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-squid-gray/50 border border-squid-border/30 rounded-xl p-3
                      hover:border-squid-red/30 transition-colors duration-300"
                  >
                    <StrikeIndicator strikes={2} size={12} />
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-medium truncate">{player.name}</div>
                      <div className="text-gray-600 text-[10px] font-mono truncate">@{player.hackerrank_id}</div>
                    </div>
                    <span className="text-squid-pink font-display font-bold text-sm">{player.totalScore || 0}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
