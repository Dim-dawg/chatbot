import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  AlertTriangle, 
  Loader2, 
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface ManagementDashboardProps {
  credentials: any;
}

export default function ManagementDashboard({ credentials }: ManagementDashboardProps) {
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkDays, setBulkDays] = useState(365);
  const [bulkOutcome, setBulkOutcome] = useState('Closed by Administrative Order');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/workload');
      if (!res.ok) throw new Error('Failed to fetch workload data');
      const data = await res.json();
      setWorkload(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBulkClose = async () => {
    if (!confirm(`Are you sure you want to bulk close cases older than ${bulkDays} days? This action is permanent.`)) return;
    
    setIsProcessing(true);
    setSuccessMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/cases/bulk-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days_old: bulkDays, outcome: bulkOutcome })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Bulk close failed');
      }
      setSuccessMessage('Bulk closure operation completed successfully.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <p className="text-zinc-400 animate-pulse text-xs uppercase tracking-widest font-bold">Aggregating Oversight Data...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-emerald-500" />
          Management Oversight
        </h2>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Chief Justice & Registrar General Command Center</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Judge Workload Monitor */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Judge Workload Monitor</h3>
            </div>
            <button 
              onClick={fetchData}
              className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
            >
              Refresh Stats
            </button>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50">
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Judge</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Hearings Today</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Open Caseload</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Total Assigned</th>
                  <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Load Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {workload.map((j, i) => {
                  const loadFactor = j.hearings_today > 5 ? 'critical' : j.hearings_today > 3 ? 'high' : 'normal';
                  return (
                    <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-100 text-sm uppercase">{j.judge_name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">CODE: {j.judge_code}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-sm font-black ${j.hearings_today > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {j.hearings_today}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-zinc-300">{j.open_cases_assigned || 0}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{j.total_cases_assigned}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest ${
                          loadFactor === 'critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          loadFactor === 'high' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                          'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {loadFactor}
                        </span>
                      </td></tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stale Case Resolution Tool */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Stale Case Resolution</h3>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Use this tool to administratively close cases that have had no activity for a specified duration. This triggers the <code className="text-emerald-400">sp_bulk_close_stale_cases</code> procedure.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Threshold (Days Idle)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="30" 
                    max="1000" 
                    step="30" 
                    value={bulkDays} 
                    onChange={(e) => setBulkDays(Number(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-sm font-black text-emerald-400 min-w-[3rem] text-right">{bulkDays}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Resolution Outcome</label>
                <input 
                  type="text" 
                  value={bulkOutcome}
                  onChange={(e) => setBulkOutcome(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-zinc-200"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleBulkClose}
                  disabled={isProcessing}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black rounded-xl py-4 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  Execute Bulk Closure
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase">System Impact</span>
              </div>
              <p className="text-[10px] text-zinc-600 font-medium">
                Closing cases will update <code className="text-zinc-500">claim_status</code> to 'Closed' and record an entry in the audit log. Semantic search indices are not affected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
