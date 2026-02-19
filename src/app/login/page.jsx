'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Eye, EyeOff, ArrowLeft, AlertCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const router = useRouter();
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setGoogleLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Google sign-in failed'); return; }
      router.push('/');
    } catch { setError('Network error'); }
    finally { setGoogleLoading(false); }
  }, [router]);

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
        ux_mode: 'popup',
      });
      // Render the official Google button into a hidden container
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          width: '100%',
        });
      }
      setGoogleReady(true);
    };
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch { } };
  }, [googleClientId, handleGoogleResponse]);

  const handleGoogleClick = () => {
    // Click the real hidden Google button to trigger sign-in
    if (googleReady && googleBtnRef.current) {
      const realBtn = googleBtnRef.current.querySelector('div[role="button"]');
      if (realBtn) { realBtn.click(); return; }
    }
    // Fallback to prompt
    if (window.google) {
      window.google.accounts.id.prompt();
    } else {
      setError('Google sign-in is not configured yet. Please use email login.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      router.push('/');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-squid-black flex items-center justify-center relative overflow-hidden px-4">
      {/* Grid bg */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,46,136,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,46,136,0.4) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Back */}
        <motion.a href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-white text-xs font-mono tracking-wider mb-6 transition-colors"
          whileHover={{ x: -3 }}
        >
          <ArrowLeft size={14} /> BACK TO ARENA
        </motion.a>

        <div className="bg-squid-card border border-squid-border/50 rounded-2xl p-7 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-display font-bold text-white mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your account</p>
          </div>



          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2.5 bg-squid-red/10 border border-squid-red/20 rounded-xl mb-4"
            >
              <AlertCircle size={13} className="text-squid-red flex-shrink-0" />
              <span className="text-squid-red font-mono text-xs">{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-500 tracking-[0.15em] uppercase mb-1.5">Email</label>
              <div className="relative">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full bg-squid-gray border border-squid-border/50 text-white pl-10 pr-4 py-3 rounded-xl
                    font-mono text-sm focus:border-squid-pink/40 focus:outline-none transition-all placeholder:text-gray-700"
                />
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-gray-500 tracking-[0.15em] uppercase mb-1.5">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full bg-squid-gray border border-squid-border/50 text-white pl-10 pr-12 py-3 rounded-xl
                    font-mono text-sm focus:border-squid-pink/40 focus:outline-none transition-all placeholder:text-gray-700"
                />
                <LogIn size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-squid-pink text-black font-display font-bold text-sm py-3.5 rounded-xl
                hover:shadow-[0_0_25px_rgba(255,46,136,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  SIGNING IN...
                </span>
              ) : 'SIGN IN'}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-squid-border/40" />
            <span className="text-gray-600 text-[10px] font-mono tracking-widest">OR</span>
            <div className="flex-1 h-px bg-squid-border/40" />
          </div>

          {/* Hidden Google rendered button */}
          <div ref={googleBtnRef} className="hidden" />

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-squid-border/50 bg-squid-gray hover:bg-squid-gray/80 transition-all disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-mono text-sm text-gray-300 tracking-wider">
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </span>
          </button>

          {/* Register link */}
          <div className="text-center mt-5">
            <p className="text-gray-600 text-sm">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-squid-pink hover:underline font-medium">Sign Up</a>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-800 font-mono text-[10px] mt-4 tracking-wider">
          ACM SQUID GAME ARENA
        </p>
      </motion.div>
    </div>
  );
}
