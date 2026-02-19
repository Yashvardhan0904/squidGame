'use client';

import { motion } from 'framer-motion';
import { Skull, Calendar } from 'lucide-react';
import { SectionHeader } from './SquidSymbols';

export default function Graveyard({ eliminatedPlayers = [] }) {
  if (eliminatedPlayers.length === 0) return null;

  return (
    <section className="py-20 md:py-28 px-6 relative" id="graveyard">
      {/* Red atmospheric overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-squid-red/[0.02] to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <SectionHeader
          number="03 — THE GRAVEYARD"
          title="Eliminated"
          subtitle="Those who fell in the arena. Three strikes marked their fate — their journey ends here."
        />

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {eliminatedPlayers.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5 }}
              className="group relative bg-squid-card border border-squid-border/30 rounded-2xl p-5 overflow-hidden
                hover:border-squid-red/20 transition-all duration-500"
            >
              {/* Red top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-squid-red/30 to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Cracked glass on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background: `
                    linear-gradient(45deg, transparent 48%, rgba(177,18,38,0.06) 49%, rgba(177,18,38,0.06) 51%, transparent 52%),
                    linear-gradient(-30deg, transparent 48%, rgba(177,18,38,0.04) 49%, rgba(177,18,38,0.04) 51%, transparent 52%)
                  `,
                }}
              />

              <div className="relative flex items-start gap-4">
                {/* Skull */}
                <div className="flex-shrink-0 p-2.5 bg-squid-red/5 rounded-xl border border-squid-red/10
                  group-hover:bg-squid-red/10 transition-colors duration-500">
                  <Skull size={20} className="text-squid-red/60 group-hover:text-squid-red/90 transition-colors duration-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-gray-300 font-medium text-sm line-through decoration-squid-red/30 truncate">
                    {player.name}
                  </h3>
                  <p className="text-gray-600 text-[10px] font-mono mt-0.5 truncate">
                    @{player.hackerrank_id}
                  </p>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-[10px] text-gray-600 font-mono">
                      Score: <span className="text-squid-red/60">{player.totalScore || 0}</span>
                    </span>
                    {player.eliminated_on && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                        <Calendar size={9} />
                        Day {player.eliminated_on}
                      </span>
                    )}
                  </div>

                  {/* Three strike marks */}
                  <div className="flex gap-1.5 mt-3">
                    <div className="w-5 h-5 rounded-md bg-squid-red/10 border border-squid-red/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#b11226" opacity="0.7" /></svg>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-squid-red/10 border border-squid-red/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12"><polygon points="6,1 11,11 1,11" fill="#b11226" opacity="0.7" /></svg>
                    </div>
                    <div className="w-5 h-5 rounded-md bg-squid-red/10 border border-squid-red/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" fill="#b11226" opacity="0.7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <span className="font-mono text-[10px] text-gray-600 tracking-[0.2em]">
            {eliminatedPlayers.length} PLAYER{eliminatedPlayers.length !== 1 ? 'S' : ''} ELIMINATED
          </span>
        </motion.div>
      </div>
    </section>
  );
}
