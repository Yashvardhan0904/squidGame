'use client';

import { useEffect, useState } from 'react';
import { Circle, Triangle, Square, Skull, Trophy, AlertTriangle, Users, Lock, Unlock, RefreshCw, Trash2, Play } from 'lucide-react';
import { db, onSnapshot, collection, doc, setDoc, getDocs, writeBatch } from '../../firebase';

export default function SquidGameArena() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [contestUrl, setContestUrl] = useState('');
  const [csvUrl, setCsvUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Real-time Firestore listener
  useEffect(() => {
    const playersRef = collection(db, 'artifacts', 'acm-squid-arena', 'public', 'data', 'players');
    
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const playerData = [];
      snapshot.forEach((doc) => {
        playerData.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(playerData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching players:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate strikes from previous_scores
  const calculateStrikes = (previousScores) => {
    if (!previousScores || previousScores.length === 0) return 0;
    return previousScores.filter(score => score === 0).length;
  };

  // Sorting logic: Survivors first, then by strikes (asc), then by total score (desc)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    const strikesA = calculateStrikes(a.previous_scores);
    const strikesB = calculateStrikes(b.previous_scores);
    if (strikesA !== strikesB) return strikesA - strikesB;
    return (b.totalScore || 0) - (a.totalScore || 0);
  });

  const survivors = sortedPlayers.filter(p => !p.eliminated);
  const highRiskPlayers = survivors.filter(p => calculateStrikes(p.previous_scores) === 2);
  const eliminatedPlayers = sortedPlayers.filter(p => p.eliminated);

  // Admin functions
  const handleAdminLogin = () => {
    if (password === 'admin123') {
      setAdminMode(true);
      setShowPasswordPrompt(false);
      setPassword('');
    } else {
      alert('Incorrect password!');
    }
  };

  const handleSyncArena = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestUrl, csvUrl })
      });
      
      const result = await response.json();
      if (response.ok) {
        alert('Arena synced successfully! ' + (result.message || ''));
      } else {
        alert('Sync failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSimulateDay = async () => {
    if (!confirm('This will add random scores for testing. Continue?')) return;
    
    try {
      const playersRef = collection(db, 'artifacts', 'acm-squid-arena', 'public', 'data', 'players');
      const snapshot = await getDocs(playersRef);
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap) => {
        const player = docSnap.data();
        if (player.eliminated) return;
        
        const newScore = Math.random() > 0.3 ? Math.floor(Math.random() * 100) : 0;
        const updatedScores = [...(player.previous_scores || []), newScore].slice(-3);
        const eliminated = updatedScores.length === 3 && updatedScores.every(s => s === 0);
        
        batch.update(docSnap.ref, {
          previous_scores: updatedScores,
          totalScore: (player.totalScore || 0) + newScore,
          eliminated,
          last_updated: new Date()
        });
      });
      
      await batch.commit();
      alert('Day simulated successfully!');
    } catch (error) {
      alert('Simulation failed: ' + error.message);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('⚠️ This will DELETE ALL player data! Are you absolutely sure?')) return;
    if (!confirm('Last warning! This action cannot be undone!')) return;
    
    try {
      const playersRef = collection(db, 'artifacts', 'acm-squid-arena', 'public', 'data', 'players');
      const snapshot = await getDocs(playersRef);
      const batch = writeBatch(db);
      
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      
      // Seed with demo players
      const demoPlayers = [
        { name: 'Alice Johnson', hackerrank_id: 'alice_j', enroll_no: 'ACM001', previous_scores: [100, 85, 90], eliminated: false, totalScore: 275 },
        { name: 'Bob Smith', hackerrank_id: 'bob_s', enroll_no: 'ACM002', previous_scores: [0, 0, 100], eliminated: false, totalScore: 100 },
        { name: 'Charlie Brown', hackerrank_id: 'charlie_b', enroll_no: 'ACM003', previous_scores: [50, 75, 0], eliminated: false, totalScore: 125 },
        { name: 'Diana Prince', hackerrank_id: 'diana_p', enroll_no: 'ACM004', previous_scores: [0, 0, 0], eliminated: true, totalScore: 0 },
      ];
      
      const newBatch = writeBatch(db);
      demoPlayers.forEach(player => {
        const docRef = doc(db, 'artifacts', 'acm-squid-arena', 'public', 'data', 'players', player.hackerrank_id);
        newBatch.set(docRef, { ...player, last_updated: new Date() });
      });
      
      await newBatch.commit();
      alert('Database reset and seeded with demo data!');
    } catch (error) {
      alert('Reset failed: ' + error.message);
    }
  };

  // Render strike icons
  const StrikeIcons = ({ strikes }) => {
    const icons = [Circle, Triangle, Square];
    return (
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => {
          const Icon = icons[i];
          const isActive = i < strikes;
          return (
            <Icon
              key={i}
              size={16}
              className={isActive ? 'text-squid-pink fill-squid-pink' : 'text-gray-600'}
            />
          );
        })}
      </div>
    );
  };

  // Filter players for search
  const filteredActivePlayers = survivors.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.hackerrank_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.enroll_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-squid-black flex items-center justify-center">
        <div className="text-squid-pink text-2xl font-mono animate-flicker">
          INITIALIZING ARENA...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-squid-black text-white p-4 md:p-8">
      {/* Header */}
      <header className="border-b-2 border-squid-pink pb-4 mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-squid-pink animate-flicker mb-2">
          ⬛ ACM SQUID GAME ⬛
        </h1>
        <p className="text-squid-mint font-mono">DSA SURVIVAL ARENA // LIVE TRACKING</p>
        <div className="mt-4 flex gap-4 text-sm font-mono">
          <span className="text-squid-mint">👥 ACTIVE: {survivors.length}</span>
          <span className="text-squid-pink">💀 ELIMINATED: {eliminatedPlayers.length}</span>
          <span className="text-squid-yellow">⚠️ HIGH RISK: {highRiskPlayers.length}</span>
        </div>
      </header>

      {/* Admin Mode Toggle */}
      {!adminMode && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setShowPasswordPrompt(true)}
            className="bg-squid-gray border border-squid-pink text-squid-pink px-4 py-2 rounded font-mono text-sm hover:bg-squid-pink hover:text-black transition"
          >
            <Lock size={16} className="inline mr-2" />
            ADMIN
          </button>
        </div>
      )}

      {/* Password Prompt */}
      {showPasswordPrompt && !adminMode && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-squid-gray border-2 border-squid-pink p-8 rounded max-w-md w-full">
            <h2 className="text-2xl text-squid-pink font-mono mb-4">ADMIN ACCESS</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Enter password..."
              className="w-full bg-black border border-squid-mint text-squid-mint px-4 py-2 rounded font-mono mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdminLogin}
                className="flex-1 bg-squid-pink text-black px-4 py-2 rounded font-mono hover:bg-squid-mint transition"
              >
                LOGIN
              </button>
              <button
                onClick={() => { setShowPasswordPrompt(false); setPassword(''); }}
                className="flex-1 bg-squid-gray border border-squid-pink text-squid-pink px-4 py-2 rounded font-mono hover:bg-squid-pink hover:text-black transition"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      {adminMode && (
        <div className="bg-squid-gray border-2 border-squid-pink p-6 rounded mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl text-squid-pink font-mono flex items-center gap-2">
              <Unlock size={24} />
              ADMIN CONTROL PANEL
            </h2>
            <button
              onClick={() => setAdminMode(false)}
              className="text-squid-pink hover:text-squid-mint transition"
            >
              [EXIT]
            </button>
          </div>
          
          <div className="grid gap-4 mb-4">
            <div>
              <label className="text-squid-mint font-mono text-sm block mb-2">
                HackerRank Contest URL (Optional):
              </label>
              <input
                type="text"
                value={contestUrl}
                onChange={(e) => setContestUrl(e.target.value)}
                placeholder="https://www.hackerrank.com/acmsquidgame08022026"
                className="w-full bg-black border border-squid-mint text-white px-4 py-2 rounded font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-squid-mint font-mono text-sm block mb-2">
                CSV/Sheet URL (Optional):
              </label>
              <input
                type="text"
                value={csvUrl}
                onChange={(e) => setCsvUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                className="w-full bg-black border border-squid-mint text-white px-4 py-2 rounded font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleSyncArena}
              disabled={syncing}
              className="bg-squid-pink text-black px-6 py-3 rounded font-mono hover:bg-squid-mint transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'SYNCING...' : 'SYNC ARENA'}
            </button>
            
            <button
              onClick={handleSimulateDay}
              className="bg-squid-yellow text-black px-6 py-3 rounded font-mono hover:bg-squid-mint transition flex items-center justify-center gap-2"
            >
              <Play size={18} />
              SIMULATE DAY
            </button>
            
            <button
              onClick={handleResetDatabase}
              className="bg-red-600 text-white px-6 py-3 rounded font-mono hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <Trash2 size={18} />
              RESET DATABASE
            </button>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Leaderboard */}
        <div className="lg:col-span-2 space-y-8">
          {/* Top 5 Leaderboard */}
          <section className="bg-squid-gray border-2 border-squid-mint p-6 rounded">
            <h2 className="text-2xl text-squid-mint font-mono mb-4 flex items-center gap-2">
              <Trophy className="text-squid-yellow" />
              TOP SURVIVORS
            </h2>
            <div className="space-y-3">
              {survivors.slice(0, 5).map((player, index) => {
                const strikes = calculateStrikes(player.previous_scores);
                return (
                  <div
                    key={player.id}
                    className="bg-black border border-squid-mint p-4 rounded hover:border-squid-pink transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl text-squid-yellow font-bold">#{index + 1}</span>
                        <div>
                          <div className="text-lg text-squid-mint">{player.name}</div>
                          <div className="text-sm text-gray-400 font-mono">
                            @{player.hackerrank_id} • {player.enroll_no}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl text-squid-pink font-bold">{player.totalScore || 0}</div>
                        <StrikeIcons strikes={strikes} />
                      </div>
                    </div>
                    {player.previous_scores && player.previous_scores.length > 0 && (
                      <div className="mt-2 flex gap-2 text-sm font-mono">
                        <span className="text-gray-500">Last 3:</span>
                        {player.previous_scores.map((score, i) => (
                          <span key={i} className={score === 0 ? 'text-squid-pink' : 'text-squid-mint'}>
                            {score}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* High Risk Zone */}
          {highRiskPlayers.length > 0 && (
            <section className="bg-squid-gray border-2 border-squid-yellow p-6 rounded animate-pulse-glow">
              <h2 className="text-2xl text-squid-yellow font-mono mb-4 flex items-center gap-2">
                <AlertTriangle />
                HIGH RISK ZONE (2 STRIKES)
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {highRiskPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-black border-2 border-squid-yellow p-3 rounded hover:border-squid-pink transition"
                  >
                    <div className="text-squid-yellow font-bold">{player.name}</div>
                    <div className="text-sm text-gray-400">@{player.hackerrank_id}</div>
                    <div className="text-squid-pink font-mono mt-1">Score: {player.totalScore || 0}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Participant Registry */}
          <section className="bg-squid-gray border-2 border-squid-pink p-6 rounded">
            <h2 className="text-2xl text-squid-pink font-mono mb-4 flex items-center gap-2">
              <Users />
              PARTICIPANT REGISTRY
            </h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, or enrollment..."
              className="w-full bg-black border border-squid-mint text-squid-mint px-4 py-2 rounded font-mono mb-4"
            />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
              {filteredActivePlayers.map((player) => {
                const strikes = calculateStrikes(player.previous_scores);
                return (
                  <div
                    key={player.id}
                    className={`bg-black border p-2 rounded text-xs hover:scale-105 transition ${
                      strikes === 2 ? 'border-squid-yellow' : strikes === 1 ? 'border-orange-500' : 'border-squid-mint'
                    }`}
                  >
                    <div className="text-squid-mint truncate font-bold">{player.name}</div>
                    <div className="text-gray-500 truncate">@{player.hackerrank_id}</div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-squid-pink">{player.totalScore || 0}</span>
                      <StrikeIcons strikes={strikes} />
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredActivePlayers.length === 0 && (
              <div className="text-center text-gray-500 py-8">No players found</div>
            )}
          </section>
        </div>

        {/* Right Column - Termination Logs */}
        <div className="lg:col-span-1">
          <section className="bg-squid-gray border-2 border-squid-pink p-6 rounded sticky top-4">
            <h2 className="text-2xl text-squid-pink font-mono mb-4 flex items-center gap-2">
              <Skull />
              TERMINATION LOGS
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {eliminatedPlayers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No eliminations yet</div>
              ) : (
                eliminatedPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-black border border-red-600 p-3 rounded hover:border-squid-pink transition"
                  >
                    <div className="text-red-500 font-bold flex items-center gap-2">
                      <Skull size={16} />
                      {player.name}
                    </div>
                    <div className="text-sm text-gray-500">@{player.hackerrank_id}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Final Score: {player.totalScore || 0}
                    </div>
                    <div className="text-xs text-red-700 mt-1 font-mono">
                      ⬛ ⬛ ⬛ THREE STRIKES
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t-2 border-squid-pink pt-4 text-center text-sm text-gray-500 font-mono">
        <p>ACM SQUID GAME © 2026 • DSA SURVIVAL ARENA</p>
        <p className="text-squid-pink mt-2">⬛ Three strikes and you&apos;re out ⬛</p>
      </footer>
    </div>
  );
}