'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut, Shield, User, Bell, BellOff, ChevronDown, Mail, Link2 } from 'lucide-react';
import { CircleSymbol, TriangleSymbol, SquareSymbol } from './SquidSymbols';

const navLinks = [
  { label: '01 ARENA', href: '#hero' },
  { label: '02 CONTROL ROOM', href: '#dashboard' },
  { label: '03 RANKINGS', href: '#leaderboard' },
  { label: '04 GRAVEYARD', href: '#graveyard' },
];

export default function Navbar({ user, onLogout, onEnableNotifications }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('#hero');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = ['graveyard', 'leaderboard', 'dashboard', 'hero'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(`#${id}`);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const scrollTo = (href) => {
    setMobileOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled
          ? 'bg-squid-black/80 backdrop-blur-xl border-b border-squid-border/50 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
          : 'bg-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.button
            onClick={() => scrollTo('#hero')}
            className="flex items-center gap-3 group"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1.5">
              <CircleSymbol size={16} glowing />
              <TriangleSymbol size={16} glowing />
              <SquareSymbol size={16} glowing />
            </div>
            <span className="font-display text-sm font-bold text-white tracking-wider hidden sm:block">
              ACM <span className="text-squid-pink">SQUID</span> GAME
            </span>
          </motion.button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`relative px-4 py-2 font-mono text-xs tracking-wider transition-colors duration-300 rounded-md ${activeSection === link.href
                  ? 'text-squid-pink'
                  : 'text-gray-500 hover:text-white'
                  }`}
              >
                {link.label}
                {activeSection === link.href && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute bottom-0 left-2 right-2 h-px bg-squid-pink"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Right side: LIVE + Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live indicator */}
            <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-full border border-squid-border/50 bg-squid-gray/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-squid-mint opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-squid-mint" />
              </span>
              <span className="font-mono text-[10px] text-squid-mint tracking-wider">LIVE</span>
            </div>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                {user.role === 'ADMIN' && (
                  <span className="absolute -top-1 -left-8 flex items-center gap-1 px-2 py-0.5 rounded-full bg-squid-pink/10 border border-squid-pink/20">
                    <Shield size={8} className="text-squid-pink" />
                    <span className="text-squid-pink font-mono text-[8px] tracking-wider">ADMIN</span>
                  </span>
                )}
                {/* Profile button */}
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${profileOpen
                    ? 'border-squid-pink/40 bg-squid-gray/50'
                    : 'border-squid-border/50 bg-squid-gray/30 hover:border-squid-border'
                    }`}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-squid-pink to-purple-600 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="font-mono text-[11px] text-gray-300 max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown size={12} className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-squid-card border border-squid-border/50 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
                    >
                      {/* User info */}
                      <div className="px-4 py-4 border-b border-squid-border/30">
                        <div className="flex items-center gap-3">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-squid-pink to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-display text-sm font-semibold truncate">{user.name}</p>
                            <p className="text-gray-500 font-mono text-[10px] truncate">{user.email}</p>
                          </div>
                        </div>
                        {user.hackerrank_id && (
                          <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-squid-mint/5 border border-squid-mint/15 rounded-lg">
                            <Link2 size={10} className="text-squid-mint" />
                            <span className="font-mono text-[10px] text-squid-mint">@{user.hackerrank_id}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="py-1">
                        {/* Notifications toggle */}
                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => {
                              setProfileOpen(false);
                              if (!user.hackerrank_id && onEnableNotifications) {
                                onEnableNotifications();
                              }
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-squid-gray/50 transition-colors group"
                          >
                            {user.hackerrank_id ? (
                              <>
                                <Bell size={14} className="text-squid-mint" />
                                <span className="font-mono text-[11px] text-squid-mint">Notifications Enabled</span>
                              </>
                            ) : (
                              <>
                                <BellOff size={14} className="text-gray-500 group-hover:text-squid-pink" />
                                <div className="text-left">
                                  <span className="font-mono text-[11px] text-gray-400 group-hover:text-white block">Enable Notifications</span>
                                  <span className="font-mono text-[9px] text-gray-700">Link HackerRank ID</span>
                                </div>
                              </>
                            )}
                          </button>
                        )}

                        {/* Email info */}
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <Mail size={14} className="text-gray-600" />
                          <span className="font-mono text-[11px] text-gray-500 truncate">{user.email}</span>
                        </div>

                        {/* Divider */}
                        <div className="mx-3 border-t border-squid-border/20" />

                        {/* Logout */}
                        <button
                          onClick={() => { setProfileOpen(false); onLogout?.(); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-squid-red/5 transition-colors group"
                        >
                          <LogOut size={14} className="text-gray-600 group-hover:text-squid-red" />
                          <span className="font-mono text-[11px] text-gray-500 group-hover:text-squid-red">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <a href="/login"
                  className="font-mono text-[11px] tracking-wider text-gray-400 hover:text-white transition-all"
                >
                  LOGIN
                </a>
                <a href="/register"
                  className="px-4 py-1.5 rounded-full font-mono text-[11px] tracking-wider bg-squid-pink text-black font-bold hover:shadow-[0_0_15px_rgba(255,46,136,0.3)] transition-all"
                >
                  SIGN UP
                </a>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-squid-pink transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-squid-black/95 backdrop-blur-xl pt-20 px-6"
          >
            <div className="space-y-2">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => scrollTo(link.href)}
                  className={`block w-full text-left py-4 px-4 font-mono text-lg tracking-wider border-b border-squid-border/20 transition-colors ${activeSection === link.href ? 'text-squid-pink' : 'text-gray-400'
                    }`}
                >
                  {link.label}
                </motion.button>
              ))}

              {/* Mobile auth */}
              <div className="pt-4 space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-squid-pink to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{user.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-mono text-sm">{user.name}</p>
                        <p className="text-gray-600 font-mono text-[10px]">{user.email}</p>
                      </div>
                      {user.role === 'ADMIN' && (
                        <span className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-squid-pink/10 border border-squid-pink/20">
                          <Shield size={10} className="text-squid-pink" />
                          <span className="text-squid-pink font-mono text-[9px]">ADMIN</span>
                        </span>
                      )}
                    </div>
                    {user.hackerrank_id && (
                      <div className="mx-4 flex items-center gap-2 px-3 py-2 bg-squid-mint/5 border border-squid-mint/15 rounded-lg">
                        <Link2 size={12} className="text-squid-mint" />
                        <span className="font-mono text-xs text-squid-mint">@{user.hackerrank_id}</span>
                      </div>
                    )}
                    {user.role !== 'ADMIN' && !user.hackerrank_id && (
                      <button
                        onClick={() => { setMobileOpen(false); onEnableNotifications?.(); }}
                        className="w-full text-left px-4 py-3 font-mono text-sm text-gray-400 hover:text-squid-pink transition-colors flex items-center gap-2"
                      >
                        <BellOff size={14} />
                        ENABLE NOTIFICATIONS
                      </button>
                    )}
                    <button onClick={() => { onLogout?.(); setMobileOpen(false); }}
                      className="w-full text-left px-4 py-3 font-mono text-sm text-gray-500 hover:text-squid-pink transition-colors"
                    >
                      LOGOUT
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3 px-4">
                    <a href="/login"
                      className="flex-1 text-center py-3 font-mono text-sm text-gray-400 hover:text-white transition-all"
                    >
                      LOGIN
                    </a>
                    <a href="/register"
                      className="flex-1 text-center py-3 rounded-xl font-mono text-sm bg-squid-pink text-black font-bold"
                    >
                      SIGN UP
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

