'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Link2, Loader2, CheckCircle2, X, Bell } from 'lucide-react';

export default function HackerRankLinkModal({ user, onLinked, onDismiss }) {
    const [hackerrankId, setHackerrankId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hackerrankId.trim()) {
            setError('Please enter your HackerRank ID');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/link-hackerrank', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hackerrank_id: hackerrankId.trim() }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Failed to link HackerRank ID');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                onLinked(data.user);
            }, 1000);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-squid-black/80 backdrop-blur-xl flex items-center justify-center px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-sm"
            >
                <div className="bg-squid-card border border-squid-border/50 rounded-2xl p-7 shadow-2xl shadow-black/50">
                    {/* Close / Skip button */}
                    <button
                        onClick={onDismiss}
                        className="absolute top-4 right-4 text-gray-600 hover:text-gray-400 transition-colors"
                        title="Skip for now"
                    >
                        <X size={18} />
                    </button>

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="flex justify-center mb-3">
                            <div className="w-12 h-12 rounded-xl bg-squid-pink/10 border border-squid-pink/20 flex items-center justify-center">
                                <Bell size={22} className="text-squid-pink" />
                            </div>
                        </div>
                        <h1 className="text-xl font-display font-bold text-white mb-1">Enable Notifications</h1>
                        <p className="text-gray-500 text-sm">
                            Link your HackerRank ID to get strike & elimination alerts at <span className="text-white font-medium">{user?.email}</span>
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 px-3 py-2.5 bg-squid-red/10 border border-squid-red/20 rounded-xl mb-4"
                        >
                            <AlertCircle size={13} className="text-squid-red flex-shrink-0" />
                            <span className="text-squid-red font-mono text-xs">{error}</span>
                        </motion.div>
                    )}

                    {/* Success */}
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 px-3 py-2.5 bg-squid-mint/10 border border-squid-mint/20 rounded-xl mb-4"
                        >
                            <CheckCircle2 size={13} className="text-squid-mint flex-shrink-0" />
                            <span className="text-squid-mint font-mono text-xs">Linked! You will now receive notifications.</span>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-mono text-gray-500 tracking-[0.15em] uppercase mb-1.5">
                                HackerRank Username
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={hackerrankId}
                                    onChange={(e) => setHackerrankId(e.target.value)}
                                    placeholder="e.g., yashvardhansin56"
                                    required
                                    disabled={success}
                                    className="w-full bg-squid-gray border border-squid-border/50 text-white pl-10 pr-4 py-3 rounded-xl
                    font-mono text-sm focus:border-squid-pink/40 focus:outline-none transition-all placeholder:text-gray-700
                    disabled:opacity-50"
                                />
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-sm">@</span>
                            </div>
                            <p className="text-gray-700 font-mono text-[10px] mt-1.5">
                                Find it on your <a href="https://www.hackerrank.com/settings" target="_blank" rel="noopener noreferrer" className="text-squid-pink/60 hover:text-squid-pink underline">HackerRank profile</a>
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || success}
                            className="w-full bg-squid-pink text-black font-display font-bold text-sm py-3.5 rounded-xl
                hover:shadow-[0_0_25px_rgba(255,46,136,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Loader2 size={16} className="animate-spin" /> VERIFYING...
                                </span>
                            ) : success ? (
                                <span className="flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} /> LINKED!
                                </span>
                            ) : (
                                'LINK & ENABLE NOTIFICATIONS'
                            )}
                        </button>
                    </form>

                    <button
                        onClick={onDismiss}
                        className="w-full text-center text-gray-600 hover:text-gray-400 font-mono text-[11px] mt-4 transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
