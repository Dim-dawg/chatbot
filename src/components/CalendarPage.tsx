import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, FileText, ChevronRight, Clock, MapPin, User2, Search, X } from 'lucide-react';

export default function CalendarPage({ credentials, onSelectCase }: any) {
  const today = new Date().toISOString().slice(0, 10);
  const plus14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(plus14);
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calendar/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials, startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load calendar schedules');
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [credentials]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r => 
      (r.casename || '').toLowerCase().includes(q) ||
      (r.claim_number || '').toLowerCase().includes(q) ||
      (r.party_names || '').toLowerCase().includes(q) ||
      (r.judge_name || '').toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of filteredRows) {
      const d = new Date(r.assigned_start_date).toISOString().slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    }
    return map;
  }, [filteredRows]);

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-8">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <CalendarDays className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Judicial Calendar</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em]">Scheduled Hearings & Mentions</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Search Bar */}
          <div className="relative group w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
            <input 
              type="text"
              placeholder="Filter by name, claim, or party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-200 outline-none focus:border-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800 w-full md:w-auto">
            <div className="flex flex-col">
              <label className="text-[9px] text-zinc-500 uppercase font-black px-2 mb-1">From</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs px-2 outline-none" 
              />
            </div>
            <div className="w-px h-8 bg-zinc-800"></div>
            <div className="flex flex-col">
              <label className="text-[9px] text-zinc-500 uppercase font-black px-2 mb-1">To</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs px-2 outline-none" 
              />
            </div>
            <button 
              onClick={fetchSchedules} 
              className="ml-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-zinc-500">
        Selected range: <span className="text-zinc-300">{startDate}</span> to <span className="text-zinc-300">{endDate}</span>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-bold uppercase tracking-widest">Synchronizing Schedule...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          {error}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 space-y-2">
          <Search className="w-12 h-12 opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">{searchQuery ? 'No matching hearings found.' : 'No hearings scheduled for this period.'}</p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mt-2">Clear Search</button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.keys(grouped).sort().map((dateKey) => (
            <section key={dateKey} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 px-4 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
                  {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {grouped[dateKey].map((r, i) => (
                  <div key={i} className="group bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/50 hover:border-emerald-500/50 p-5 rounded-2xl transition-all duration-300">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-tighter">
                            {r.hearing_type}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono tracking-tighter">
                            {r.claim_number}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 truncate group-hover:text-white transition-colors">
                          {r.casename || 'Unnamed Case'}
                        </h4>
                      </div>
                      <button 
                        onClick={() => onSelectCase(r.claim_number)}
                        className="p-2 bg-zinc-800 hover:bg-emerald-500 text-zinc-400 hover:text-white rounded-xl transition-all shrink-0"
                        title="View Case File"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[11px] font-bold">{r.start_time || '--'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[11px] font-bold truncate">{r.court_code || 'Chambers'}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2 text-zinc-400">
                        <User2 className="w-3.5 h-3.5 text-zinc-600" />
                        <span className="text-[11px] font-black uppercase text-zinc-300 tracking-tight">{r.judge_name || 'UNASSIGNED'}</span>
                      </div>
                    </div>

                    {r.party_names && (
                      <div className="pt-3 border-t border-zinc-800/50">
                        <p className="text-[9px] text-zinc-600 uppercase font-black mb-1.5 tracking-widest">Involved Entities</p>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                          {r.party_names}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                       <button 
                        onClick={() => onSelectCase(r.claim_number)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-widest"
                       >
                         Open Detailed Record <ChevronRight className="w-3 h-3" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
