'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Play, Trash2, Upload, Database, Shield, Settings, Download } from 'lucide-react';
import { SectionHeader } from './SquidSymbols';

export default function AdminPanel({ onSync, onSimulate, onReset, onCsvUpload, onExport, onExportEliminated, syncing, uploading, exporting, exportingEliminated }) {
  const handleFileChange = (e) => {
    if (e.target.files[0]) onCsvUpload(e);
  };

  return (
    <section id="admin" className="relative py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <SectionHeader number="05" title="ADMIN PANEL" subtitle="Control Room — Manage the Arena" />

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {/* DB Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-squid-card border border-squid-border/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Database size={16} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white">Database</h3>
                <p className="text-gray-600 font-mono text-[10px]">PostgreSQL on Railway</p>
              </div>
              <span className="ml-auto relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
              </span>
            </div>

            {/* CSV Upload */}
            <h4 className="text-[10px] font-mono text-gray-500 mb-3 tracking-[0.2em] uppercase">Import Data</h4>
            <p className="text-[10px] text-gray-600 font-mono mb-3 leading-relaxed">
              Upload HackerRank leaderboard CSV to sync players and scores.
            </p>
            <label className={`flex items-center justify-center gap-2.5 cursor-pointer w-full py-3.5 rounded-xl
              font-mono text-xs border border-dashed transition-all duration-300
              ${uploading
                ? 'border-gray-700 text-gray-600 cursor-wait'
                : 'border-squid-border/50 text-gray-400 hover:border-squid-pink/40 hover:text-squid-pink hover:bg-squid-pink/[0.03]'
              }`}
            >
              <Upload size={14} />
              {uploading ? 'UPLOADING...' : 'CHOOSE CSV FILE'}
              <input type="file" accept=".csv" onChange={handleFileChange} disabled={uploading} className="hidden" />
            </label>
          </motion.div>

          {/* Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-squid-card border border-squid-border/30 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-squid-pink/10 rounded-xl border border-squid-pink/20">
                <Settings size={16} className="text-squid-pink" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-white">Actions</h3>
                <p className="text-gray-600 font-mono text-[10px]">Manage game state</p>
              </div>
            </div>

            <div className="space-y-3">
              <ActionButton
                icon={RefreshCw}
                label={syncing ? 'SYNCING...' : 'SYNC FROM SHEETS'}
                onClick={onSync}
                disabled={syncing}
                loading={syncing}
                color="mint"
              />
              <ActionButton
                icon={Play}
                label="SIMULATE DAY"
                onClick={onSimulate}
                color="yellow"
              />
              <ActionButton
                icon={Download}
                label={exporting ? 'EXPORTING...' : 'EXPORT DATA'}
                onClick={onExport}
                disabled={exporting}
                loading={exporting}
                color="blue"
              />
              <ActionButton
                icon={Download}
                label={exportingEliminated ? 'EXPORTING...' : 'EXPORT ELIMINATED'}
                onClick={onExportEliminated}
                disabled={exportingEliminated}
                loading={exportingEliminated}
                color="red"
              />
              <ActionButton
                icon={Trash2}
                label="RESET DATABASE"
                onClick={onReset}
                color="red"
              />
            </div>

            {/* Guide */}
            <div className="mt-6 pt-4 border-t border-squid-border/20 text-[10px] text-gray-600 font-mono space-y-1.5 leading-relaxed">
              <p className="text-gray-500 tracking-wider uppercase mb-2">Quick Guide</p>
              <p>1. Upload HackerRank CSV to import players</p>
              <p>2. Use &quot;Simulate Day&quot; for testing</p>
              <p>3. Reset seeds demo data for preview</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled = false, loading = false, color = 'pink' }) {
  const colors = {
    mint: 'border-squid-mint/20 text-squid-mint hover:bg-squid-mint/5 hover:border-squid-mint/40',
    yellow: 'border-squid-yellow/20 text-squid-yellow hover:bg-squid-yellow/5 hover:border-squid-yellow/40',
    red: 'border-squid-red/20 text-squid-red hover:bg-squid-red/5 hover:border-squid-red/40',
    pink: 'border-squid-pink/20 text-squid-pink hover:bg-squid-pink/5 hover:border-squid-pink/40',
    blue: 'border-blue-400/20 text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/40',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border font-mono text-xs tracking-wider
        transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <Icon size={15} />
      )}
      {label}
    </button>
  );
}
