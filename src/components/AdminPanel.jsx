'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, Play, Trash2, Upload, Database, Shield, Settings, Download,
  Calendar, Users, Mail, FileText, Archive, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import { SectionHeader } from './SquidSymbols';

export default function AdminPanel({ onSync, onSimulate, onReset, onCsvUpload, onExport, onExportEliminated, syncing, uploading, exporting, exportingEliminated }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [contests, setContests] = useState([]);
  const [emails, setEmails] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateContest, setShowCreateContest] = useState(false);
  const [contestForm, setContestForm] = useState({
    dayNumber: '',
    contestSlug: '',
    problemName: '',
    contestUrl: ''
  });

  // Fetch dashboard stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        console.log('Stats data:', data);
        setStats(data.stats);
        setAuditLogs(data.recentAuditLogs || []);
      } else {
        const error = await res.json();
        console.error('Stats fetch failed:', error);
        alert(`Failed to load stats: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      alert(`Failed to load stats: ${error.message}`);
    }
  };

  const fetchContests = async () => {
    try {
      const res = await fetch('/api/admin/contests');
      if (res.ok) {
        const data = await res.json();
        console.log('Contests data:', data);
        setContests(data.contests || []);
      } else {
        const error = await res.json();
        console.error('Contests fetch failed:', error);
      }
    } catch (error) {
      console.error('Failed to fetch contests:', error);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/admin/emails?limit=20');
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) onCsvUpload(e);
  };

  const handleScrape = async (dayNumber) => {
    if (!confirm(`Scrape leaderboard for Day ${dayNumber}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Scraped ${data.count} participants for Day ${dayNumber}`);
        fetchContests();
      } else {
        alert(`Scrape failed: ${data.error}`);
      }
    } catch (error) {
      alert('Scrape failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (dayNumber) => {
    if (!confirm(`Process strikes for Day ${dayNumber}?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Processed Day ${dayNumber}\nSolved: ${data.solved}\nStrikes: ${data.strikes}\nEliminations: ${data.eliminations}`);
        fetchStats();
        fetchContests();
      } else {
        alert(`Processing failed: ${data.error}`);
      }
    } catch (error) {
      alert('Processing failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async (dayNumber) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayNumber })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Backup generated: ${data.data.filename}`);
      } else {
        alert(`Backup failed: ${data.error}`);
      }
    } catch (error) {
      alert('Backup failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAudit = async () => {
    try {
      const res = await fetch('/api/admin/export-audit');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      }
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  const handleCreateContest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/contests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayNumber: parseInt(contestForm.dayNumber),
          contestSlug: contestForm.contestSlug,
          problemName: contestForm.problemName,
          contestUrl: contestForm.contestUrl
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Contest created for Day ${contestForm.dayNumber}`);
        setShowCreateContest(false);
        setContestForm({ dayNumber: '', contestSlug: '', problemName: '', contestUrl: '' });
        fetchContests();
      } else {
        alert(`Failed to create contest: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to create contest: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="admin" className="relative py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6">
        <SectionHeader number="05" title="ADMIN PANEL" subtitle="Control Room — Manage the Arena" />

        {/* Tab Navigation */}
        <div className="mt-12 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: Database },
            { id: 'contests', label: 'Contests', icon: Calendar },
            { id: 'emails', label: 'Emails', icon: Mail },
            { id: 'audit', label: 'Audit Logs', icon: FileText },
            { id: 'actions', label: 'Actions', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'contests') fetchContests();
                if (tab.id === 'emails') fetchEmails();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs transition-all
                ${activeTab === tab.id
                  ? 'bg-squid-pink/20 text-squid-pink border border-squid-pink/40'
                  : 'bg-squid-card border border-squid-border/30 text-gray-400 hover:text-white'
                }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} onRefresh={fetchStats} />
          )}
          {activeTab === 'contests' && (
            <ContestsTab 
              contests={contests} 
              onScrape={handleScrape}
              onProcess={handleProcess}
              onBackup={handleBackup}
              loading={loading}
            />
          )}
          {activeTab === 'emails' && (
            <EmailsTab emails={emails} onRefresh={fetchEmails} />
          )}
          {activeTab === 'audit' && (
            <AuditTab logs={auditLogs} onExport={handleExportAudit} />
          )}
          {activeTab === 'actions' && (
            <ActionsTab
              onSync={onSync}
              onSimulate={onSimulate}
              onReset={onReset}
              onCsvUpload={handleFileChange}
              onExport={onExport}
              onExportEliminated={onExportEliminated}
              onStartCompetition={handleStartCompetition}
              syncing={syncing}
              uploading={uploading}
              exporting={exporting}
              exportingEliminated={exportingEliminated}
              showCreateContest={showCreateContest}
              setShowCreateContest={setShowCreateContest}
              contestForm={contestForm}
              setContestForm={setContestForm}
              onCreateContest={handleCreateContest}
              loading={loading}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// Overview Tab Component
function OverviewTab({ stats, onRefresh }) {
  if (!stats) {
    return <div className="text-center text-gray-500 py-12">Loading stats...</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <StatCard
        icon={Users}
        label="Total Users"
        value={stats.totalUsers}
        color="blue"
      />
      <StatCard
        icon={CheckCircle}
        label="Active Users"
        value={stats.activeUsers}
        subtitle={`${stats.survivalRate}% survival rate`}
        color="mint"
      />
      <StatCard
        icon={AlertCircle}
        label="Eliminated"
        value={stats.eliminatedUsers}
        color="red"
      />
      <StatCard
        icon={Calendar}
        label="Processed Days"
        value={stats.processedDays}
        subtitle="out of 25 days"
        color="yellow"
      />
      <StatCard
        icon={Mail}
        label="Pending Emails"
        value={stats.pendingEmails}
        color="pink"
      />
      <StatCard
        icon={RefreshCw}
        label="Refresh Stats"
        value=""
        onClick={onRefresh}
        color="blue"
        isButton
      />
    </div>
  );
}

// Contests Tab Component
function ContestsTab({ contests, onScrape, onProcess, onBackup, loading }) {
  return (
    <div className="space-y-4">
      {contests.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No contests found. Create contests from Actions tab.
        </div>
      ) : (
        contests.map(contest => (
          <motion.div
            key={contest.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-squid-card border border-squid-border/30 rounded-xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-display font-bold">Day {contest.day_number}</h3>
                <p className="text-gray-500 text-sm font-mono mt-1">{contest.problem_name || 'No problem name'}</p>
                <p className="text-gray-600 text-xs font-mono mt-2">{contest.contest_slug}</p>
              </div>
              <div className="flex gap-2">
                {!contest.is_scraped && (
                  <button
                    onClick={() => onScrape(contest.day_number)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-mono hover:bg-blue-500/20 transition-all disabled:opacity-50"
                  >
                    Scrape
                  </button>
                )}
                {contest.is_scraped && !contest.is_processed && (
                  <button
                    onClick={() => onProcess(contest.day_number)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-squid-mint/10 text-squid-mint border border-squid-mint/20 rounded-lg text-xs font-mono hover:bg-squid-mint/20 transition-all disabled:opacity-50"
                  >
                    Process
                  </button>
                )}
                {contest.is_processed && (
                  <button
                    onClick={() => onBackup(contest.day_number)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-squid-yellow/10 text-squid-yellow border border-squid-yellow/20 rounded-lg text-xs font-mono hover:bg-squid-yellow/20 transition-all disabled:opacity-50"
                  >
                    Backup
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-xs font-mono">
              <span className={`${contest.is_scraped ? 'text-squid-mint' : 'text-gray-600'}`}>
                {contest.is_scraped ? '✓ Scraped' : '○ Not Scraped'}
              </span>
              <span className={`${contest.is_processed ? 'text-squid-mint' : 'text-gray-600'}`}>
                {contest.is_processed ? '✓ Processed' : '○ Not Processed'}
              </span>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

// Emails Tab Component
function EmailsTab({ emails, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-display">Email Queue</h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-squid-pink/10 text-squid-pink border border-squid-pink/20 rounded-lg text-xs font-mono hover:bg-squid-pink/20 transition-all"
        >
          Refresh
        </button>
      </div>
      {emails.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No emails in queue</div>
      ) : (
        emails.map(email => (
          <div
            key={email.id}
            className="bg-squid-card border border-squid-border/30 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white text-sm">{email.to_email}</p>
                <p className="text-gray-500 text-xs font-mono mt-1">{email.template_type}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-mono ${
                email.status === 'sent' ? 'bg-squid-mint/10 text-squid-mint' :
                email.status === 'failed' ? 'bg-squid-red/10 text-squid-red' :
                'bg-squid-yellow/10 text-squid-yellow'
              }`}>
                {email.status}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Audit Tab Component
function AuditTab({ logs, onExport }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-display">Recent Audit Logs</h3>
        <button
          onClick={onExport}
          className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-mono hover:bg-blue-500/20 transition-all"
        >
          Export CSV
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No audit logs</div>
      ) : (
        logs.map(log => (
          <div
            key={log.id}
            className="bg-squid-card border border-squid-border/30 rounded-xl p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white text-sm font-mono">{log.action}</p>
                <p className="text-gray-500 text-xs mt-1">{log.reason || 'No reason provided'}</p>
              </div>
              <span className="text-gray-600 text-xs font-mono">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Actions Tab Component
function ActionsTab({ onSync, onSimulate, onReset, onCsvUpload, onExport, onExportEliminated, onStartCompetition, syncing, uploading, exporting, exportingEliminated, showCreateContest, setShowCreateContest, contestForm, setContestForm, onCreateContest, loading }) {
  return (
    <div className="space-y-6">
      {/* Create Contest Form */}
      {showCreateContest && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-squid-card border border-squid-pink/30 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-display font-bold">Create New Contest</h3>
            <button
              onClick={() => setShowCreateContest(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <form onSubmit={onCreateContest} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-mono block mb-2">Day Number (1-25)</label>
              <input
                type="number"
                min="1"
                max="25"
                required
                value={contestForm.dayNumber}
                onChange={(e) => setContestForm({...contestForm, dayNumber: e.target.value})}
                className="w-full bg-squid-bg border border-squid-border/30 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-squid-pink/40 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-mono block mb-2">Contest Slug</label>
              <input
                type="text"
                required
                value={contestForm.contestSlug}
                onChange={(e) => setContestForm({...contestForm, contestSlug: e.target.value})}
                className="w-full bg-squid-bg border border-squid-border/30 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-squid-pink/40 focus:outline-none"
                placeholder="acm-squid-game-day-1"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-mono block mb-2">Problem Name</label>
              <input
                type="text"
                required
                value={contestForm.problemName}
                onChange={(e) => setContestForm({...contestForm, problemName: e.target.value})}
                className="w-full bg-squid-bg border border-squid-border/30 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-squid-pink/40 focus:outline-none"
                placeholder="Two Sum"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs font-mono block mb-2">Contest URL</label>
              <input
                type="url"
                required
                value={contestForm.contestUrl}
                onChange={(e) => setContestForm({...contestForm, contestUrl: e.target.value})}
                className="w-full bg-squid-bg border border-squid-border/30 rounded-lg px-4 py-2 text-white font-mono text-sm focus:border-squid-pink/40 focus:outline-none"
                placeholder="https://www.hackerrank.com/contests/..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-squid-pink/10 text-squid-pink border border-squid-pink/20 rounded-lg text-xs font-mono hover:bg-squid-pink/20 transition-all disabled:opacity-50"
              >
                {loading ? 'CREATING...' : 'CREATE CONTEST'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateContest(false)}
                className="px-4 py-3 bg-squid-card border border-squid-border/30 text-gray-400 rounded-lg text-xs font-mono hover:text-white transition-all"
              >
                CANCEL
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* CSV Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-squid-card border border-squid-border/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Database size={16} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white">Import Data</h3>
              <p className="text-gray-600 font-mono text-[10px]">Upload CSV files</p>
            </div>
          </div>

          <label className={`flex items-center justify-center gap-2.5 cursor-pointer w-full py-3.5 rounded-xl
            font-mono text-xs border border-dashed transition-all duration-300
            ${uploading
              ? 'border-gray-700 text-gray-600 cursor-wait'
              : 'border-squid-border/50 text-gray-400 hover:border-squid-pink/40 hover:text-squid-pink hover:bg-squid-pink/[0.03]'
            }`}
          >
            <Upload size={14} />
            {uploading ? 'UPLOADING...' : 'CHOOSE CSV FILE'}
            <input type="file" accept=".csv" onChange={onCsvUpload} disabled={uploading} className="hidden" />
          </label>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-squid-card border border-squid-border/30 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-squid-pink/10 rounded-xl border border-squid-pink/20">
              <Settings size={16} className="text-squid-pink" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-white">Quick Actions</h3>
              <p className="text-gray-600 font-mono text-[10px]">Manage game state</p>
            </div>
          </div>

          <div className="space-y-3">
            <ActionButton
              icon={Play}
              label="START COMPETITION"
              onClick={onStartCompetition}
              color="pink"
            />
            <ActionButton
              icon={Calendar}
              label="CREATE CONTEST"
              onClick={() => setShowCreateContest(true)}
              color="pink"
            />
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
              label={exporting ? 'EXPORTING...' : 'EXPORT ALL USERS'}
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
        </motion.div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtitle, color = 'blue', onClick, isButton = false }) {
  const colors = {
    mint: 'border-squid-mint/20 bg-squid-mint/5',
    yellow: 'border-squid-yellow/20 bg-squid-yellow/5',
    red: 'border-squid-red/20 bg-squid-red/5',
    pink: 'border-squid-pink/20 bg-squid-pink/5',
    blue: 'border-blue-400/20 bg-blue-400/5',
  };

  const iconColors = {
    mint: 'text-squid-mint',
    yellow: 'text-squid-yellow',
    red: 'text-squid-red',
    pink: 'text-squid-pink',
    blue: 'text-blue-400',
  };

  const Component = isButton ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`${colors[color]} border rounded-xl p-6 ${isButton ? 'cursor-pointer hover:opacity-80 transition-all' : ''}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <Icon size={20} className={iconColors[color]} />
        <span className="text-gray-400 text-xs font-mono uppercase tracking-wider">{label}</span>
      </div>
      {!isButton && (
        <>
          <div className="text-3xl font-display font-bold text-white">{value}</div>
          {subtitle && <div className="text-gray-500 text-xs font-mono mt-2">{subtitle}</div>}
        </>
      )}
    </Component>
  );
}

// Action Button Component
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
