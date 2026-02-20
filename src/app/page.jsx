'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

import Navbar from '../components/Navbar';
import HeroSection from '../components/HeroSection';
import Dashboard from '../components/Dashboard';
import Leaderboard from '../components/Leaderboard';
import Graveyard from '../components/Graveyard';
import AdminPanel from '../components/AdminPanel';
import Footer from '../components/Footer';
import MarqueeStrip from '../components/MarqueeStrip';
import HackerRankLinkModal from '../components/HackerRankLinkModal';
import ContestStatus from '../components/ContestStatus';
import { CircleSymbol, TriangleSymbol, SquareSymbol } from '../components/SquidSymbols';

const ParticleBackground = dynamic(() => import('../components/ParticleBackground'), { ssr: false });

export default function SquidGameArena() {
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportingEliminated, setExportingEliminated] = useState(false);
  const [showArena, setShowArena] = useState(false);
  const [user, setUser] = useState(null);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const arenaRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN';

  // ── Check auth on mount ──────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/verify');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
            // Show link prompt if not linked and not admin
            if (!data.user.hackerrank_id && data.user.role !== 'ADMIN') {
              setShowLinkPrompt(true);
            }
          }
        }
      } catch (err) { }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) { }
  };

  // ── Data fetching ────────────────────────────────────────
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/db/players');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/db/stats');
      if (res.ok) setStats(await res.json());
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchStats();
    const interval = setInterval(() => { fetchPlayers(); fetchStats(); }, 10000);
    return () => clearInterval(interval);
  }, [fetchPlayers, fetchStats]);

  // ── Computed values ─────────────────────────────────────────────
  const survivors = players.filter(p => !p.eliminated);
  const eliminated = players.filter(p => p.eliminated);

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
      if (lines.length < 2) throw new Error('CSV file is empty');
      const header = lines[0].toLowerCase();
      const dataLines = lines.slice(1);
      const isHR = header.includes('hacker') && header.includes('score');
      const parsedPlayers = [];
      const parsedScores = [];

      for (const line of dataLines) {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        if (isHR) {
          const hacker = cols[1] || '';
          const score = parseFloat(cols[2]) || 0;
          if (!hacker) continue;
          parsedPlayers.push({ name: hacker.toUpperCase(), hackerrank_id: hacker });
          parsedScores.push({ hackerrank_id: hacker, score });
        } else {
          const name = cols[1] || '', hr_id = cols[4] || '';
          if (!name || !hr_id) continue;
          parsedPlayers.push({
            name: name.toUpperCase(), hackerrank_id: hr_id,
            enroll_no: cols[5] || '', batch: cols[2] || '',
            year: cols[3] || '', experience: cols[6] || '', email: cols[8] || '',
          });
        }
      }

      const uploadRes = await fetch('/api/db/players/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: parsedPlayers }),
      });
      const uploadResult = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadResult.error);

      let scoreMsg = '';
      if (isHR && parsedScores.length > 0) {
        const dayNumber = (stats.daysCompleted || 0) + 1;
        const scoreRes = await fetch('/api/db/scores/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ day_number: dayNumber, scores: parsedScores }),
        });
        const scoreResult = await scoreRes.json();
        if (scoreRes.ok) scoreMsg = ` Day ${dayNumber}: ${scoreResult.processed} processed, ${scoreResult.new_eliminations} eliminated.`;
      }

      alert(`${uploadResult.message}${scoreMsg}`);
      fetchPlayers(); fetchStats();
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/players');
      if (!res.ok) throw new Error('Failed to fetch from Google Sheets');
      const sheetPlayers = await res.json();
      if (!sheetPlayers.length) throw new Error('No players found');
      const uploadRes = await fetch('/api/db/players/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: sheetPlayers.map(p => ({
            name: p.name || '', hackerrank_id: p.hr_id || p.id || '',
            enroll_no: p.enroll_no || '', batch: p.batch || '',
            year: p.year || '', experience: p.experience || '', email: p.email || '',
          })),
        }),
      });
      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.error);
      alert(`Synced! ${result.message}`);
      fetchPlayers(); fetchStats();
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally { setSyncing(false); }
  };

  const handleSimulate = async () => {
    if (!confirm('Simulate a contest day with random scores?')) return;
    try {
      const res = await fetch('/api/db/admin/simulate', { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        alert(`Day ${result.day_number} simulated! ${result.players_processed} players, ${result.new_eliminations} eliminated.`);
        fetchPlayers(); fetchStats();
      } else alert('Failed: ' + result.error);
    } catch (error) { alert('Failed: ' + error.message); }
  };

  const handleReset = async () => {
    if (!confirm('\u26A0\uFE0F DELETE ALL DATA and seed demo players?')) return;
    if (!confirm('Last warning \u2014 this is irreversible!')) return;
    try {
      const res = await fetch('/api/db/admin/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: true }),
      });
      const result = await res.json();
      if (res.ok) { alert(result.message); fetchPlayers(); fetchStats(); }
      else alert('Failed: ' + result.error);
    } catch (error) { alert('Failed: ' + error.message); }
  };

  const handleExport = async () => {
  };

  const handleExportEliminated = async () => {
    setExportingEliminated(true);
    try {
      const res = await fetch('/api/admin/export/eliminated');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `squidgame-eliminated-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setExportingEliminated(false);
    }
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `squidgame-export-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  // ── Loading screen ───────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-squid-black flex flex-col items-center justify-center gap-8">
        <motion.div className="flex gap-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {[0, 0.2, 0.4].map((delay, i) => {
            const Symbol = [CircleSymbol, TriangleSymbol, SquareSymbol][i];
            return (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay }}
              >
                <Symbol size={36} glowing />
              </motion.div>
            );
          })}
        </motion.div>
        <motion.p
          className="text-gray-600 font-mono text-xs tracking-[0.3em]"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          INITIALIZING ARENA
        </motion.p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-squid-black relative">
      <ParticleBackground count={18} />
      <Navbar user={user} onLogout={handleLogout} onEnableNotifications={() => setShowLinkPrompt(true)} />

      {/* Optional HackerRank ID linking prompt */}
      {showLinkPrompt && (
        <HackerRankLinkModal
          user={user}
          onLinked={(updatedUser) => { setUser(updatedUser); setShowLinkPrompt(false); }}
          onDismiss={() => setShowLinkPrompt(false)}
        />
      )}

      {/* Hero */}
      <HeroSection
        survivorCount={survivors.length}
        eliminatedCount={eliminated.length}
        totalPlayers={players.length}
      />

      {/* Arena content */}
      <div ref={arenaRef}>
        <AnimatePresence>
          {(showArena || players.length >= 0) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Contest Status Banner */}
              <div className="max-w-7xl mx-auto px-6 py-12">
                <ContestStatus />
              </div>

              {/* Mid-marquee separator */}
              <MarqueeStrip
                items={['CONTROL ROOM', 'LIVE STATUS', 'ARENA OVERVIEW', 'REAL-TIME DATA']}
                separator="\u2014"
                variant="subtle"
                speed={45}
                reverse
              />

              <Dashboard players={players} stats={stats} />

              <MarqueeStrip
                items={['RANKINGS', 'LEADERBOARD', 'TOP SURVIVORS', 'SCORE TRACKER']}
                separator="\u2014"
                variant="subtle"
                speed={40}
              />

              <Leaderboard
                players={players}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />

              <Graveyard eliminatedPlayers={eliminated} />

              {isAdmin && (
                <AdminPanel
                  onSync={handleSync}
                  onSimulate={handleSimulate}
                  onReset={handleReset}
                  onCsvUpload={handleCsvUpload}
                  onExport={handleExport}
                  onExportEliminated={handleExportEliminated}
                  syncing={syncing}
                  uploading={uploading}
                  exporting={exporting}
                  exportingEliminated={exportingEliminated}
                />
              )}
              <Footer />
            </motion.div>
          )}
        </AnimatePresence>
      </div>


    </div>
  );
}
