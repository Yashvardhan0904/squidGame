'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Calendar, ExternalLink, AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function ContestStatus() {
  const [contestInfo, setContestInfo] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [status, setStatus] = useState('loading'); // loading, live, upcoming, ended, no-contest

  useEffect(() => {
    fetchContestInfo();
    const interval = setInterval(fetchContestInfo, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!contestInfo) return;
    
    const timer = setInterval(() => {
      updateTimeLeft();
    }, 1000);
    
    return () => clearInterval(timer);
  }, [contestInfo]);

  const fetchContestInfo = async () => {
    try {
      const res = await fetch('/api/contest/current');
      const data = await res.json();
      
      // Check if there's an error in the response
      if (data.error) {
        setStatus('no-contest');
        setContestInfo(null);
        return;
      }
      
      setContestInfo(data);
      updateTimeLeft(data);
    } catch (error) {
      console.error('Failed to fetch contest info:', error);
      setStatus('no-contest');
    }
  };

  const updateTimeLeft = (data = contestInfo) => {
    if (!data) return;

    const now = new Date();
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (now < startTime) {
      setStatus('upcoming');
      setTimeLeft(calculateTimeLeft(now, startTime));
    } else if (now >= startTime && now <= endTime) {
      setStatus('live');
      setTimeLeft(calculateTimeLeft(now, endTime));
    } else {
      setStatus('ended');
      setTimeLeft(null);
    }
  };

  const calculateTimeLeft = (from, to) => {
    const diff = to - from;
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  };

  if (status === 'loading') {
    return (
      <div className="bg-squid-card/50 border border-squid-border/30 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader size={16} className="animate-spin" />
          <span className="text-xs font-mono">Loading contest info...</span>
        </div>
      </div>
    );
  }

  if (status === 'no-contest') {
    return (
      <div className="bg-squid-card/50 border border-squid-border/30 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle size={16} />
          <span className="text-xs font-mono">No active contest</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-squid-card/80 border border-squid-border/40 rounded-2xl p-6 backdrop-blur-md shadow-xl"
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono ${
            status === 'live' 
              ? 'bg-squid-mint/10 text-squid-mint border border-squid-mint/20' 
              : status === 'upcoming'
              ? 'bg-squid-yellow/10 text-squid-yellow border border-squid-yellow/20'
              : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
          }`}>
            {status === 'live' && (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-squid-mint opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-squid-mint"></span>
                </span>
                LIVE NOW
              </>
            )}
            {status === 'upcoming' && (
              <>
                <Clock size={12} />
                STARTS SOON
              </>
            )}
            {status === 'ended' && (
              <>
                <CheckCircle size={12} />
                ENDED
              </>
            )}
          </div>
          
          <div className="text-gray-400 text-xs font-mono">
            DAY {contestInfo?.dayNumber || '?'} / 25
          </div>
        </div>

        {contestInfo?.contestUrl && (
          <a
            href={contestInfo.contestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-squid-pink/10 text-squid-pink border border-squid-pink/20 rounded-lg text-xs font-mono hover:bg-squid-pink/20 transition-all"
          >
            <span>ENTER ARENA</span>
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Contest Info */}
      <div className="space-y-3">
        <div>
          <h3 className="text-white font-display font-bold text-lg">
            {contestInfo?.problemName || 'Contest Problem'}
          </h3>
          <p className="text-gray-500 text-xs font-mono mt-1">
            {contestInfo?.contestSlug || 'No slug'}
          </p>
        </div>

        {/* Timer */}
        {timeLeft && (
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
              <Clock size={14} />
              <span>{status === 'live' ? 'Closes in' : 'Opens in'}</span>
            </div>
            <div className="flex gap-2">
              <TimeUnit value={timeLeft.hours} label="HRS" />
              <span className="text-gray-600">:</span>
              <TimeUnit value={timeLeft.minutes} label="MIN" />
              <span className="text-gray-600">:</span>
              <TimeUnit value={timeLeft.seconds} label="SEC" />
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="flex items-center gap-2 text-gray-500 text-xs font-mono pt-2 border-t border-squid-border/20">
          <Calendar size={12} />
          <span>Daily: 9:00 AM - 11:59 PM IST</span>
        </div>
      </div>
    </motion.div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-squid-bg border border-squid-border/30 rounded-lg px-2 py-1 min-w-[40px] text-center">
        <span className="text-white font-mono text-sm font-bold">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-gray-600 text-[10px] font-mono mt-1">{label}</span>
    </div>
  );
}
