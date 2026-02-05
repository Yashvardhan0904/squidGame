'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Skull, Info, X, Circle, Triangle, Square, 
  AlertTriangle, RefreshCw, Terminal, Shield, Plus, Minus, 
  Trophy, Target, Radiation, Database, Lock, Save, Trash2, Search
} from 'lucide-react';

export default function App() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [isFlickering, setIsFlickering] = useState(true);
  const [view, setView] = useState('arena'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuth, setIsAuth] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [error, setError] = useState(null);
  
  // UI States for 200+ Scalability
  const [searchQuery, setSearchQuery] = useState('');

  // --- PERSISTENCE & SYNC LOGIC ---
  const fetchFromSheet = async (overrideUrl) => {
    const customUrl = overrideUrl || sheetUrl || localStorage.getItem('acm_sheet_url');
    setLoading(true);
    setError(null);

    try {
      const headers = customUrl ? { 'x-sheet-url': customUrl } : {};
      const response = await fetch('/api/players', { headers });
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);
      
      // Apply the persistent "Removed" filter (Blacklist)
      const blacklist = JSON.parse(localStorage.getItem('acm_terminated_ids') || '[]');
      const filtered = data.filter(p => !blacklist.includes(p.id));
      
      setPlayers(filtered);
      if (overrideUrl) {
        localStorage.setItem('acm_sheet_url', overrideUrl);
        setSheetUrl(overrideUrl);
      } else if (customUrl) {
        // Store custom URL in state for display
        setSheetUrl(customUrl);
      }
    } catch (err) {
      setError("SYNC_ERROR: Ensure Sheet is Published to Web as CSV.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFromSheet();
    setTimeout(() => setIsFlickering(false), 2000);
  }, []);

  // --- ADMIN ACTIONS ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === 'admin123') {
      setIsAuth(true);
      setError(null);
    } else {
      setError("ACCESS_DENIED: INVALID_CLEARANCE");
    }
  };

  const updateStrikesLocally = (id, delta) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === id) {
        const newStrikes = Math.max(0, Math.min(3, p.strikes + delta));
        return { 
          ...p, 
          strikes: newStrikes, 
          isEliminated: newStrikes >= 3 
        };
      }
      return p;
    }));
  };

  const removePlayerForever = (id) => {
    if (window.confirm("PERMANENT TERMINATION: Remove contestant from Arena cycle?")) {
      // 1. Update local blacklist
      const blacklist = JSON.parse(localStorage.getItem('acm_terminated_ids') || '[]');
      const newBlacklist = [...new Set([...blacklist, id])];
      localStorage.setItem('acm_terminated_ids', JSON.stringify(newBlacklist));
      
      // 2. Update current state immediately
      setPlayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const resetBlacklist = () => {
    if (window.confirm("RESET ARENA: Restore all terminated participants?")) {
      localStorage.removeItem('acm_terminated_ids');
      localStorage.removeItem('acm_sheet_url'); // Also clear custom sheet URL
      setSheetUrl('');
      fetchFromSheet();
    }
  };

  // --- DERIVED STATE (Optimized for 200+) ---
  const filteredPlayers = useMemo(() => {
    return players.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.hr_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const stats = useMemo(() => ({
    total: players.length,
    active: players.filter(p => p.strikes < 3).length
  }), [players]);

  const leaderboard = useMemo(() => {
    return [...players]
      .filter(p => p.strikes < 3)
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, 5);
  }, [players]);

  const atRisk = useMemo(() => players.filter(p => p.strikes === 2), [players]);

  // --- LOGIN VIEW ---
  if (view === 'admin' && !isAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 font-mono text-white">
        <div className="max-w-md w-full border-2 border-[#ff007f] p-8 bg-[#111] shadow-[0_0_30px_rgba(255,0,127,0.2)]">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#ff007f] uppercase italic tracking-tighter">Front Man Entrance</h2>
            <button onClick={() => setView('arena')}><X className="text-gray-500 hover:text-white" /></button>
          </div>
          <form onSubmit={handleAdminLogin} className="space-y-6">
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-black border border-white/10 p-3 text-white focus:border-[#ff007f] outline-none transition-all"
              placeholder="ENTER_PASSKEY"
              autoFocus
            />
            {error && <p className="text-red-500 text-[10px] uppercase font-bold animate-pulse">{error}</p>}
            <button type="submit" className="w-full bg-[#ff007f] text-black font-black py-4 uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(255,0,127,0.4)]">Authorize</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono selection:bg-[#ff007f] relative overflow-x-hidden">
      {/* Visual Overlay: CRT effect */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {view === 'arena' ? (
          <>
            {/* Header section optimized for mobile/desktop */}
            <header className="mb-12 border-b border-[#ff007f]/30 pb-8 flex flex-col lg:flex-row justify-between items-center gap-8">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-2 uppercase italic leading-none">
                  ACM_SQUID_GAME<br />
                  <span className="text-[#ff007f] text-2xl md:text-4xl font-mono tracking-tight">DSA_CHALLENGE</span>
                </h1>
                <div className="flex items-center gap-4 mt-4 justify-center lg:justify-start">
                  <span className="bg-[#ff007f] text-black px-3 py-1 text-sm font-bold uppercase tracking-widest">Global Arena</span>
                  <button onClick={() => setShowRules(true)} className="flex items-center gap-2 text-[#ff007f] hover:underline text-sm uppercase font-bold"><Info size={16} /> Rules</button>
                </div>
              </div>
              <div className="bg-[#111] border-2 border-[#ff007f] p-6 text-center min-w-[240px] shadow-[0_0_20px_rgba(255,0,127,0.1)] relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#ff007f]/20"></div>
                <div className="text-xs uppercase text-[#ff007f] mb-2 tracking-[0.3em]">Survivors Left</div>
                <div className="text-6xl font-black text-white tabular-nums">{loading ? "--" : stats.active.toString().padStart(3, '0')}</div>
                <div className="text-[10px] uppercase text-gray-500 mt-2">of {stats.total} total contestants</div>
              </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-16">
              {/* Leaderboard with custom icons */}
              <section className="bg-[#111] border border-[#00ff9f]/30 p-6 rounded shadow-[0_0_30px_rgba(0,255,159,0.05)]">
                <h2 className="text-xl font-bold flex items-center gap-3 mb-6 text-[#00ff9f] uppercase tracking-tighter italic">
                  <Trophy size={20} /> Arena Leaderboard
                </h2>
                <div className="space-y-3">
                  {leaderboard.map((p, idx) => (
                    <div key={p.id} className="bg-black/40 border border-white/5 p-3 flex justify-between items-center group hover:border-[#00ff9f]/50 transition-all">
                      <div className="flex items-center gap-4">
                        <span className="text-[#00ff9f] font-bold text-sm">#{idx + 1}</span>
                        <div>
                          <div className="text-sm font-bold uppercase">{p.name} <span className="text-gray-600 text-[10px] ml-2">[{p.batch || 'N/A'}]</span></div>
                          <div className="text-[10px] text-gray-500 font-mono">ID_{p.hr_id} • {p.year || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <StrikeIcon type="circle" active={p.strikes >= 1} />
                         <StrikeIcon type="triangle" active={p.strikes >= 2} />
                         <StrikeIcon type="square" active={p.strikes >= 3} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* High Risk Section */}
              <section className="bg-[#111] border border-yellow-500/30 p-6 rounded shadow-[0_0_30px_rgba(234,179,8,0.05)]">
                <h2 className="text-xl font-bold flex items-center gap-3 mb-6 text-yellow-500 uppercase tracking-tighter italic animate-pulse">
                  <AlertTriangle size={20} /> High Risk Zone
                </h2>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                  {atRisk.map(p => (
                    <div key={p.id} className="bg-yellow-500/5 border border-yellow-500/20 p-3 flex justify-between items-center animate-pulse">
                      <div>
                        <div className="text-sm font-bold text-yellow-500 uppercase">{p.name}</div>
                        <div className="text-[9px] text-gray-600 font-mono mt-0.5">@{p.hr_id} • {p.batch || 'N/A'}</div>
                      </div>
                      <div className="text-[10px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded">STRIKE_02</div>
                    </div>
                  ))}
                  {atRisk.length === 0 && !loading && <div className="text-center py-10 text-gray-700 text-xs italic uppercase tracking-widest">Sector Clear</div>}
                </div>
              </section>
            </div>

            {/* Scale-friendly Participant Wall */}
            <section className="mb-20">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-l-4 border-[#ff007f] pl-4">
                <h2 className="text-2xl font-bold text-white uppercase tracking-tighter italic shrink-0">
                  <Users className="text-[#ff007f] inline mr-3" /> Arena Registry
                </h2>
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="SCAN_NAME_OR_ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111] border border-white/10 p-2.5 pl-10 text-xs focus:border-[#ff007f] outline-none text-[#ff007f] font-black tracking-widest uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {filteredPlayers.sort((a,b) => (a.strikes >= 3 ? 1 : -1)).map(p => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            </section>

            <section className="border-t border-white/10 pt-12">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-red-600 opacity-80 uppercase tracking-tighter italic"><Skull /> Termination Logs</h2>
              <div className="overflow-x-auto bg-[#111]/50 border border-white/5 p-4 rounded shadow-inner backdrop-blur-sm max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-500 text-xs uppercase tracking-widest font-normal">
                      <th className="py-4 px-4">Contestant</th>
                      <th className="py-4 px-4 text-right">Arena ID</th>
                      <th className="py-4 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs uppercase">
                    {players.filter(p => p.strikes >= 3).map(p => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-red-900/10 transition-colors">
                        <td className="py-4 px-4 font-bold text-gray-300">{p.name}</td>
                        <td className="py-4 px-4 text-right text-gray-500 font-mono">@{p.hr_id}</td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-red-600 font-black border border-red-600/30 px-2 py-1">PURGED</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          /* --- ADMIN DASHBOARD --- */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex justify-between items-end border-b-2 border-[#ff007f] pb-6 mb-8">
              <div>
                <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Front Man Control</h2>
                <p className="text-xs text-[#ff007f] font-bold mt-1 tracking-widest">CLEARANCE_LEVEL: ADMIN</p>
              </div>
              <button onClick={() => setView('arena')} className="border border-white/20 px-6 py-2 text-xs font-black uppercase hover:bg-white hover:text-black transition-all">Close Dashboard</button>
            </header>

            <section className="bg-[#111] p-8 border border-white/10 space-y-6">
              <div className="flex items-center gap-4 text-[#00ff9f]"><Database size={24} /><h3 className="text-xl font-bold uppercase tracking-tighter">Database Link</h3></div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">System uses default Google Sheet. Override with custom URL below:</p>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="CUSTOM_SHEET_CSV_URL..."
                  className="flex-1 bg-black border border-white/10 p-4 text-sm font-mono outline-none focus:border-[#00ff9f]"
                />
                <button onClick={() => fetchFromSheet(sheetUrl)} className="bg-[#00ff9f] text-black px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,159,0.3)]">Sync Sheets</button>
              </div>
              <div className="flex gap-4">
                <button onClick={resetBlacklist} className="text-[10px] text-gray-500 hover:text-[#00ff9f] underline uppercase tracking-widest">Restore All Terminated Data</button>
                {sheetUrl && <button onClick={() => { setSheetUrl(''); localStorage.removeItem('acm_sheet_url'); fetchFromSheet(); }} className="text-[10px] text-gray-500 hover:text-yellow-500 underline uppercase tracking-widest">Reset to Default Sheet</button>}
              </div>
            </section>

            <div className="bg-[#111] p-6 border border-white/5 h-[600px] flex flex-col">
              <h3 className="text-lg font-black mb-6 uppercase tracking-tighter text-[#00ff9f] flex items-center gap-3"><Users size={18} /> Modify Registry</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                {players.map(p => (
                  <div key={p.id} className="bg-black/60 p-3 flex justify-between items-center border border-white/5 text-xs group">
                    <div className="flex items-center gap-4">
                       <span className={`w-2 h-2 rounded-full ${p.strikes >= 3 ? 'bg-red-600' : 'bg-[#00ff9f]'}`}></span>
                       <div>
                         <div className="font-bold">{p.name} <span className="text-gray-700 ml-2">[{p.batch || 'N/A'}]</span></div>
                         <div className="text-gray-600">@{p.hr_id} • {p.year || 'N/A'} {p.email && `• ${p.email}`}</div>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateStrikesLocally(p.id, -1)} className="hover:text-[#00ff9f] transition-colors"><Minus size={14} /></button>
                        <span className="font-bold text-[#ff007f] min-w-[12px] text-center">{p.strikes}</span>
                        <button onClick={() => updateStrikesLocally(p.id, 1)} className="hover:text-red-600 transition-colors"><Plus size={14} /></button>
                      </div>
                      <button onClick={() => removePlayerForever(p.id)} className="text-gray-700 hover:text-red-600 ml-4 p-1" title="PURGE_USER"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- HIDDEN ADMIN BUTTON --- */}
        <footer className="mt-20 pt-12 border-t border-white/5 text-center flex flex-col items-center">
          <button 
            onClick={() => setView('admin')}
            className="text-[10px] text-white/5 hover:text-[#ff007f] transition-all cursor-default font-black uppercase tracking-[0.5em] mb-4"
          >
            ACM_SYSTEM_CORE_V2.0
          </button>
          <div className="flex gap-4 opacity-10">
            <Circle size={10} className="text-[#ff007f]" /> 
            <Triangle size={10} className="#ff007f" /> 
            <Square size={10} className="#ff007f" />
          </div>
        </footer>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.01); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 0, 127, 0.2); border-radius: 10px; }
        @keyframes pulse-yellow {
          0% { border-color: rgba(234, 179, 8, 0.4); }
          50% { border-color: rgba(234, 179, 8, 1); box-shadow: 0 0 10px rgba(234, 179, 8, 0.2); }
          100% { border-color: rgba(234, 179, 8, 0.4); }
        }
        .pulse-at-risk { animation: pulse-yellow 2s infinite ease-in-out; border-width: 2px; }
      `}} />
    </div>
  );
}

function StrikeIcon({ type, active }) {
  const icons = { 
    circle: <Circle size={12} strokeWidth={3} />, 
    triangle: <Triangle size={12} strokeWidth={3} />, 
    square: <Square size={12} strokeWidth={3} /> 
  };
  return <div className={active ? 'text-red-600 drop-shadow-[0_0_5px_rgba(220,38,38,1)]' : 'text-white/5'}>{icons[type]}</div>;
}

function PlayerCard({ player }) {
  const isEliminated = player.strikes >= 3;
  const isAtRisk = player.strikes === 2;
  return (
    <div className={`relative bg-[#161616] border transition-all duration-500 overflow-hidden ${isEliminated ? 'border-transparent opacity-30 grayscale' : 'border-white/10 hover:border-[#ff007f]/50'} ${isAtRisk && !isEliminated ? 'pulse-at-risk' : ''}`}>
      {isEliminated && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="text-red-600 font-black text-xl rotate-[-15deg] border-2 border-red-600 px-2 py-1 uppercase tracking-tighter">ELIMINATED</div>
        </div>
      )}
      <div className="p-4 flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full mb-3 flex items-center justify-center border-2 transition-all duration-700 ${isEliminated ? 'border-gray-800 bg-gray-900' : 'border-[#00ff9f] bg-[#00ff9f]/10 text-[#00ff9f] shadow-[0_0_15px_rgba(0,255,159,0.3)]'}`}><span className="text-[10px] font-black leading-none uppercase">ACM</span></div>
        <h3 className="font-bold text-[9px] truncate w-full text-center mb-1 uppercase tracking-tighter text-white/90 leading-tight">{player.name}</h3>
        <p className="text-[8px] text-gray-600 font-mono mb-1 italic truncate w-full text-center">ID_{player.hr_id}</p>
        <p className="text-[7px] text-gray-700 mb-3 truncate w-full text-center">{player.batch || 'N/A'} • {player.year || 'N/A'}</p>
        <div className="flex gap-2">
           <StrikeIcon type="circle" active={player.strikes >= 1} />
           <StrikeIcon type="triangle" active={player.strikes >= 2} />
           <StrikeIcon type="square" active={player.strikes >= 3} />
        </div>
      </div>
      {isAtRisk && !isEliminated && <div className="absolute top-2 right-2 text-yellow-500 animate-pulse"><AlertTriangle size={12} /></div>}
    </div>
  );
}

function RulesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl font-mono">
      <div className="bg-[#111] border-2 border-[#ff007f] max-w-2xl w-full p-10 relative shadow-[0_0_70px_rgba(255,0,127,0.4)]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
        <h3 className="text-4xl font-black mb-8 text-[#ff007f] flex items-center gap-4 uppercase tracking-tighter italic leading-none underline underline-offset-8 decoration-white/20"><Terminal size={32} /> SURVIVAL_PROTOCOL.pdf</h3>
        <div className="space-y-8 text-gray-300 leading-relaxed border-l-2 border-[#ff007f]/20 pl-6">
          <p className="italic text-xl text-white font-black tracking-tight uppercase">"Players, your survival depends on your algorithmic efficiency."</p>
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white/5 p-6 border-r border-[#ff007f]/30"><h4 className="text-[#00ff9f] font-black uppercase text-xs mb-3">01. Strike Policy</h4><p className="text-xs opacity-70">Scores of 0 result in a Penalty Mark.</p></div>
            <div className="bg-white/5 p-6 border-r border-red-600/30"><h4 className="text-red-600 font-black uppercase text-xs mb-3">02. Permanent termination</h4><p className="text-xs opacity-70">3 marks lead to permanent purging.</p></div>
          </div>
        </div>
        <button onClick={onClose} className="mt-10 w-full py-5 bg-[#ff007f] text-black font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-lg text-sm">I Accept the conditions</button>
      </div>
    </div>
  );
}