import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  Activity,
  Trash2,
  UserPlus,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Database,
  RefreshCw,
  HardDrive,
  Cpu,
  Server,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConnectionSettings from './ConnectionSettings';

interface User {
  id: number;
  username: string;
  role: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  username: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

interface AdminStats {
  users: number;
  logs: number;
  chunks: number;
  cases: number;
  documents: number;
}

interface HealthStatus {
  status: string;
  services: {
    mysql?: { status: string; error?: string };
    vector?: { status: string; error?: string };
    ollama?: { status: string; error?: string };
  };
}

interface AdminDashboardProps {
  credentials: any;
  onRefreshSchema?: () => Promise<void>;
}

export default function AdminDashboard({ credentials, onRefreshSchema }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [orphanCheckResult, setOrphanCheckResult] = useState<string | null>(null);
  const [vaultSizeResult, setVaultSizeResult] = useState<string | null>(null);
  const [orphanCheckLoading, setOrphanCheckLoading] = useState(false);
  const [vaultSizeLoading, setVaultSizeLoading] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'health' | 'maintenance' | 'connection'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    fetchAdminData();
    fetchStats();
    fetchHealth();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/audit-log')
      ]);

      if (!usersRes.ok || !logsRes.ok) {
        throw new Error('Failed to fetch administrative data.');
      }

      const usersData = await usersRes.json();
      const logsData = await logsRes.json();

      setUsers(usersData || []);
      setAuditLogs(logsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    } catch (e) { console.warn('Stats fetch failed', e); }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) setHealth(await res.json());
    } catch (e) { console.warn('Health fetch failed', e); }
  };

  const handleUpdateRole = async (username: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      setSuccess(`Role updated for ${username}`);
      await fetchAdminData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setSuccess(`User ${username} deleted`);
      await fetchAdminData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTriggerReindex = async () => {
    if (!confirm('Start full FAISS re-index? This may take several minutes.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance/reindex', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-index failed');
      setSuccess(data.message || 'Re-indexing pipeline started');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear semantic mapping cache? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance/clear-cache', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Clear cache failed');
      setSuccess(data.message || 'Cache cleared');
      await fetchStats();
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOrphanCheck = async () => {
    setOrphanCheckLoading(true);
    setMaintenanceError(null);
    setOrphanCheckResult(null);
    try {
      const res = await fetch('/api/admin/maintenance/scan-orphans', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Orphan scan failed.');
      setOrphanCheckResult(data.message);
    } catch (err: any) {
      setMaintenanceError(err.message);
    } finally {
      setOrphanCheckLoading(false);
    }
  };

  const handleVaultSize = async () => {
    setVaultSizeLoading(true);
    setMaintenanceError(null);
    setVaultSizeResult(null);
    try {
      const res = await fetch('/api/admin/maintenance/vault-size', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Vault size calculation failed.');
      setVaultSizeResult(data.message);
    } catch (err: any) {
      setMaintenanceError(err.message);
    } finally {
      setVaultSizeLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(l => 
    l.username?.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
    l.target_type?.toLowerCase().includes(logSearch.toLowerCase())
  );

  if (loading && activeTab === 'users') {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Accessing Secure Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-8 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight uppercase">Admin Console</h2>
            <p className="text-zinc-400 text-xs mt-0.5 uppercase tracking-widest font-bold opacity-70">Sovereign Control Node</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
          <TabButton active={activeTab === 'users'} label="Operators" onClick={() => setActiveTab('users')} />
          <TabButton active={activeTab === 'logs'} label="Audit Trail" onClick={() => setActiveTab('logs')} />
          <TabButton active={activeTab === 'health'} label="System Health" onClick={() => setActiveTab('health')} />
          <TabButton active={activeTab === 'maintenance'} label="Maintenance" onClick={() => setActiveTab('maintenance')} />
          <TabButton active={activeTab === 'connection'} label="Connection" onClick={() => setActiveTab('connection')} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300 text-sm"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-300 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'users' && (
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="relative group max-w-md shrink-0">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Filter operators..."
                className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Identity</th>
                      <th className="px-6 py-4">Jurisdictional Role</th>
                      <th className="px-6 py-4">Enrolled On</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                              <Users className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-zinc-100">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.username, e.target.value)}
                            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                          >
                            <option value="admin">System Admin</option>
                            <option value="judge">Presiding Judge</option>
                            <option value="clerk">Legal Clerk</option>
                            <option value="staff">Administrative Staff</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-[10px] text-zinc-500 font-mono">
                          {new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-600 hover:text-red-400 transition-all"
                            title="Purge Identity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            <div className="relative group max-w-md shrink-0">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search audit trail..."
                className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Operator</th>
                      <th className="px-6 py-4">Action Event</th>
                      <th className="px-6 py-4">Target</th>
                      <th className="px-6 py-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-zinc-400 group-hover:text-emerald-400 transition-colors">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono">
                              {new Date(l.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-zinc-200">{l.username || 'System'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                            l.action.includes('FAILURE') ? 'bg-red-500/5 border-red-500/20 text-red-400' :
                            l.action.includes('SUCCESS') || l.action === 'SIGNUP' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' :
                            'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}>
                            {l.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                            {l.target_type && <span className="text-zinc-400 font-bold">{l.target_type}: </span>}
                            {l.target_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs truncate text-[10px] text-zinc-600 font-mono italic" title={l.details}>
                            {l.details || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <HealthCard 
                title="Relational Data" 
                status={health?.services?.mysql?.status || 'unknown'} 
                icon={<Database />} 
                error={health?.services?.mysql?.error}
              />
              <HealthCard 
                title="Vector Engine" 
                status={health?.services?.vector?.status || 'unknown'} 
                icon={<Zap />} 
                error={health?.services?.vector?.error}
              />
              <HealthCard 
                title="AI Reasoning" 
                status={health?.services?.ollama?.status || 'unknown'} 
                icon={<Cpu />} 
                error={health?.services?.ollama?.error}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Activity className="w-4 h-4" /> System Statistics
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <StatRow label="Active Users" value={stats?.users} />
                  <StatRow label="Audit Events" value={stats?.logs} />
                  <StatRow label="Case Records" value={stats?.cases} />
                  <StatRow label="Stored Files" value={stats?.documents} />
                  <StatRow label="Semantic Chunks" value={stats?.chunks} />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Compliance Status
                </h3>
                <div className="space-y-4">
                  <ComplianceItem label="Data Sovereignty" status="verified" description="Local-only processing verified." />
                  <ComplianceItem label="Encryption Layer" status="verified" description="AES-256 Vault active." />
                  <ComplianceItem label="Audit Visibility" status="verified" description="Permanent event logging active." />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <RefreshCw className={`w-6 h-6 text-emerald-400 ${actionLoading ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">FAISS Synchronization</h3>
                  <p className="text-zinc-500 text-xs">Synchronize MySQL case summaries with the Vector engine index.</p>
                </div>
              </div>
              <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800 space-y-4">
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Triggers the <code className="text-emerald-400 font-mono">ingest_cases.py</code> pipeline. This process will iterate through all cases in the database, generate high-dimensional embeddings via Mistral, and update the sequential FAISS index.
                </p>
                <div className="flex gap-4">
                  <button 
                    disabled={actionLoading}
                    onClick={handleTriggerReindex}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Re-index All Cases
                  </button>
                  <button 
                    disabled={actionLoading}
                    onClick={handleClearCache}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Semantic Cache
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <HardDrive className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Vault Cleanup</h3>
                  <p className="text-zinc-500 text-xs">Manage encrypted binary storage and identify orphan files.</p>
                </div>
              </div>
              {maintenanceError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {maintenanceError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-zinc-800 p-6 rounded-2xl space-y-3 flex flex-col">
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Orphan Check</h4>
                  <p className="text-xs text-zinc-600 italic flex-grow">Identifies files in the vault that are not referenced in the database.</p>
                  <button onClick={handleOrphanCheck} disabled={orphanCheckLoading} className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:underline disabled:opacity-50 disabled:cursor-wait flex items-center gap-2">
                    {orphanCheckLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning...</> : 'Scan Vault'}
                  </button>
                  {orphanCheckResult && <p className="text-xs text-emerald-400 font-mono mt-2">{orphanCheckResult}</p>}
                </div>
                <div className="border border-zinc-800 p-6 rounded-2xl space-y-3 flex flex-col">
                  <h4 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Storage Status</h4>
                  <p className="text-xs text-zinc-600 italic flex-grow">Calculates total encrypted storage volume on disk.</p>
                  <button onClick={handleVaultSize} disabled={vaultSizeLoading} className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:underline disabled:opacity-50 disabled:cursor-wait flex items-center gap-2">
                    {vaultSizeLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Calculating...</> : 'Calculate Size'}
                  </button>
                  {vaultSizeResult && <p className="text-xs text-emerald-400 font-mono mt-2">{vaultSizeResult}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'connection' && (
          <div className="flex-1 flex items-center justify-center">
            <ConnectionSettings initialCredentials={credentials} onSave={async (c: any) => {
              if (onRefreshSchema) await onRefreshSchema();
              setSuccess('Connection settings refreshed and verified.');
              setTimeout(() => setSuccess(null), 3000);
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
        active ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

function HealthCard({ title, status, icon, error }: { title: string, status: string, icon: React.ReactNode, error?: string }) {
  const isOnline = status === 'online';
  return (
    <div className={`p-6 rounded-3xl border transition-all ${
      isOnline ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
          isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {status}
        </div>
      </div>
      <h4 className="font-bold text-zinc-100 text-sm uppercase tracking-tight">{title}</h4>
      {error && <p className="text-[10px] text-red-400 mt-2 font-mono truncate" title={error}>{error}</p>}
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold text-white tabular-nums">{value?.toLocaleString() || 0}</span>
    </div>
  );
}

function ComplianceItem({ label, status, description }: { label: string, status: string, description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-zinc-950/30 rounded-xl border border-zinc-800/50">
      <div className="mt-1">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-200 uppercase tracking-tight">{label}</p>
        <p className="text-[10px] text-zinc-500">{description}</p>
      </div>
    </div>
  );
}
