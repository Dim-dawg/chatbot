import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  FileCheck,
  ClipboardList,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  User,
  History,
  X,
  FileText,
  Search,
  ArrowRight,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  Sector,
} from 'recharts';

interface DashboardProps {
  credentials: any;
  initialCaseNumber?: string | null;
  onCaseCleared?: () => void;
}

export default function Dashboard({ credentials, initialCaseNumber, onCaseCleared }: DashboardProps) {
  const [summary, setSummary] = useState<any>(null);
  const [hearings, setHearings] = useState<any[]>([]);
  const [judgments, setJudgments] = useState<any[]>([]);
  const [outcomeMix, setOutcomeMix] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [casesNeedingAction, setCasesNeedingAction] = useState<any[]>([]);
  const [overdueCases, setOverdueCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedCase, setSelectedCase] = useState<string | null>(initialCaseNumber || null);
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingFinalize, setLoadingFinalize] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<any>({ caseTypes: [], judges: [], jurisdictions: [] });
  const [activeFilters, setActiveFilters] = useState<any>({ caseType: '', judgeName: '', jurisdiction: '' });
  const [timeWindowDays, setTimeWindowDays] = useState<string>('90');

  useEffect(() => {
    if (initialCaseNumber) {
      fetchCaseDetail(initialCaseNumber);
    }
  }, [initialCaseNumber]);

  useEffect(() => {
    fetchFilterOptions();
    fetchDashboardData();
  }, [credentials, activeFilters.caseType, activeFilters.judgeName, activeFilters.jurisdiction, timeWindowDays]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.trim().length > 2) handleSearch();
      else setSearchResults([]);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const unwrap = async (r: Response) => {
    const payload = await r.json();
    return payload?.data ?? payload;
  };

  const toArray = (value: any) => (Array.isArray(value) ? value : []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, hearingsRes, judgmentsRes, outcomeMixRes, trendRes, actionRes, overdueRes] = await Promise.all([
        fetch('/api/dashboard/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: { ...activeFilters, days: timeWindowDays } }),
        }),
        fetch('/api/dashboard/upcoming-hearings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: activeFilters }),
        }),
        fetch('/api/dashboard/recent-judgments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: activeFilters }),
        }),
        fetch('/api/dashboard/outcome-mix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: { ...activeFilters, days: timeWindowDays } }),
        }),
        fetch(`/api/dashboard/monthly-case-counts?days=${encodeURIComponent(timeWindowDays)}`),
        fetch('/api/dashboard/cases-needing-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: activeFilters }),
        }),
        fetch('/api/dashboard/overdue-cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentials, filters: activeFilters }),
        }),
      ]);

      if (!summaryRes.ok || !hearingsRes.ok || !judgmentsRes.ok || !outcomeMixRes.ok || !trendRes.ok) {
        throw new Error('Failed to load dashboard data.');
      }

      const [summaryData, hearingsData, judgmentsData, outcomeMixData, trendJson] = await Promise.all([
        unwrap(summaryRes),
        unwrap(hearingsRes),
        unwrap(judgmentsRes),
        unwrap(outcomeMixRes),
        unwrap(trendRes),
      ]);
      const actionData = actionRes.ok ? await unwrap(actionRes) : [];
      const overdueData = overdueRes.ok ? await unwrap(overdueRes) : [];

      setSummary(summaryData || {});
      setHearings(toArray(hearingsData));
      setJudgments(toArray(judgmentsData));
      setOutcomeMix(toArray(outcomeMixData));
      setTrendData(toArray(trendJson));
      setCasesNeedingAction(toArray(actionData));
      setOverdueCases(toArray(overdueData));

      if (!actionRes.ok || !overdueRes.ok) {
        setError('Some optional dashboard tables are unavailable, but core charts and summary are loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Dashboard failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const res = await fetch('/api/dashboard/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      });
      if (!res.ok) return;
      const data = await unwrap(res);
      setFilterOptions({
        caseTypes: data.caseTypes || [],
        judges: data.judges || [],
        jurisdictions: data.jurisdictions || [],
      });
    } catch {
      setFilterOptions({ caseTypes: [], judges: [], jurisdictions: [] });
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/cases/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), credentials }),
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await unwrap(res);
      setSearchResults(toArray(data));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchCaseDetail = async (claim_number: string) => {
    setSelectedCase(claim_number);
    setLoadingDetail(true);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const res = await fetch('/api/cases/detail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_number, credentials }),
      });
      if (!res.ok) throw new Error('Failed to load case detail');
      const data = await unwrap(res);
      setCaseDetail(data || null);
    } catch (err: any) {
      setCaseDetail(null);
      setSelectedCase(null);
      setError(err.message || 'Case detail failed');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeCaseFile = () => {
    setSelectedCase(null);
    setCaseDetail(null);
    if (onCaseCleared) onCaseCleared();
  };

  const handleFinalize = async (claim_number: string) => {
    const outcome = prompt(`Enter outcome for case ${claim_number}:`, 'Resolved');
    if (!outcome) return;
    setLoadingFinalize(claim_number);
    try {
      const res = await fetch('/api/cases/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_number, outcome, credentials }),
      });
      if (!res.ok) throw new Error('Finalize failed');
      await fetchDashboardData();
    } catch (err: any) {
      setError(err.message || 'Finalize failed');
    } finally {
      setLoadingFinalize(null);
    }
  };

  const caseSummary = useMemo(() => {
    const info = caseDetail?.info;
    if (!info) return '';
    if (info.CaseSummary && String(info.CaseSummary).trim()) return String(info.CaseSummary);
    return `${info.CaseName || 'This case'} is currently ${info.claim_status || 'in progress'}.`;
  }, [caseDetail]);

  const caseloadPieData = useMemo(
    () => [
      { name: 'Open', value: Number(summary?.open || 0) },
      { name: 'Pending', value: Number(summary?.pending || 0) },
      { name: 'Closed', value: Number(summary?.closed || 0) },
    ].filter((x) => x.value > 0),
    [summary]
  );

  const outcomesPieData = useMemo(
    () => toArray(outcomeMix).map((x: any) => ({ name: x.name || 'Unknown', value: Number(x.value || 0) })).filter((x: any) => x.value > 0),
    [outcomeMix]
  );

  const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#71717a', '#06b6d4', '#ef4444'];
  const [activeCaseloadIndex, setActiveCaseloadIndex] = useState(0);
  const [activeOutcomeIndex, setActiveOutcomeIndex] = useState(0);
  const caseloadTotal = caseloadPieData.reduce((a, b) => a + b.value, 0);
  const outcomesTotal = outcomesPieData.reduce((a, b) => a + b.value, 0);
  const activeCaseload = caseloadPieData[activeCaseloadIndex] || null;
  const activeOutcome = outcomesPieData[activeOutcomeIndex] || null;
  const caseloadBreakdown = caseloadPieData.map((item) => ({
    ...item,
    pct: caseloadTotal ? Math.round((item.value / caseloadTotal) * 100) : 0,
  }));
  const outcomesBreakdown = outcomesPieData.map((item) => ({
    ...item,
    pct: outcomesTotal ? Math.round((item.value / outcomesTotal) * 100) : 0,
  }));

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
        <p className="text-zinc-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden flex relative">
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-10">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search case name or claim number..."
            className="block w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            </div>
          )}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-30"
              >
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => fetchCaseDetail(r.claim_number)}
                    className="w-full text-left p-4 hover:bg-zinc-800 transition-colors flex justify-between items-center group border-b last:border-b-0 border-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{r.CaseName}</p>
                      <p className="text-xs text-zinc-500 font-mono">{r.claim_number}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mr-2 py-1.5 px-3 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
          </div>
          <FilterSelect label="Case Type" value={activeFilters.caseType} options={filterOptions.caseTypes} onChange={(v) => setActiveFilters((p: any) => ({ ...p, caseType: v }))} />
          <FilterSelect label="Judge" value={activeFilters.judgeName} options={filterOptions.judges} onChange={(v) => setActiveFilters((p: any) => ({ ...p, judgeName: v }))} />
          <FilterSelect label="Jurisdiction" value={activeFilters.jurisdiction} options={filterOptions.jurisdictions} onChange={(v) => setActiveFilters((p: any) => ({ ...p, jurisdiction: v }))} />
          {(activeFilters.caseType || activeFilters.judgeName || activeFilters.jurisdiction) && (
            <button
              onClick={() => setActiveFilters({ caseType: '', judgeName: '', jurisdiction: '' })}
              className="text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition-colors ml-2 tracking-widest"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <LayoutDashboard className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Judicial Dashboard</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Live court operations and case workload</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeWindowDays}
              onChange={(e) => setTimeWindowDays(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] font-bold text-zinc-300 uppercase tracking-widest"
              title="Time window for trend and pie charts"
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="180">Last 180 Days</option>
              <option value="365">Last 365 Days</option>
              <option value="all">All Time</option>
            </select>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-[10px] font-bold text-zinc-300 transition-all flex items-center gap-2 uppercase tracking-widest"
            >
              <BarChart3 className="w-3 h-3" />
              Sync Data
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Records" value={summary?.total} icon={<ClipboardList />} color="emerald" />
          <SummaryCard label="Active Cases" value={summary?.open} icon={<TrendingUp />} color="blue" />
          <SummaryCard label="Pending Decisions" value={summary?.pending} icon={<Calendar />} color="amber" />
          <SummaryCard label="Finalized" value={summary?.closed} icon={<FileCheck />} color="zinc" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Monthly Inflow Trend</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-[320px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="month" stroke="#71717a" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fill="url(#trendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Recent Closures</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden max-h-[320px] overflow-y-auto custom-scrollbar">
              {judgments.length === 0 ? (
                <div className="p-12 text-center text-zinc-600 text-xs italic">No recent closures.</div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {judgments.map((j, i) => (
                    <button key={i} onClick={() => fetchCaseDetail(j.claim_number)} className="w-full text-left p-4 hover:bg-zinc-800 transition-colors">
                      <h4 className="font-bold text-zinc-100 text-sm truncate">{j.CaseName}</h4>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] text-zinc-500 font-mono">{j.claim_number}</span>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 uppercase">{j.case_outcome}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Caseload Split</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-[300px]">
              {caseloadPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">No pie data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                  <PieChart>
                    <Pie
                      data={caseloadPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={2}
                      activeIndex={activeCaseloadIndex}
                      activeShape={(props: any) => <Sector {...props} outerRadius={(props.outerRadius || 0) + 6} />}
                      onMouseEnter={(_, index) => setActiveCaseloadIndex(index)}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    >
                      {caseloadPieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [Number(v).toLocaleString(), String(n)]}
                      itemStyle={{ color: '#e4e4e7' }}
                      labelStyle={{ color: '#a1a1aa' }}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                    />
                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 text-[10px] uppercase tracking-wider">Total</text>
                    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-100 text-[18px] font-bold">
                      {caseloadTotal.toLocaleString()}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {activeCaseload && (
              <div className="text-xs text-zinc-300 px-1">
                <span className="font-bold text-zinc-100">{activeCaseload.name}</span>: {activeCaseload.value.toLocaleString()} ({caseloadTotal ? Math.round((activeCaseload.value / caseloadTotal) * 100) : 0}%)
              </div>
            )}
            {caseloadBreakdown.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 space-y-2">
                {caseloadBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                      <span className="text-zinc-300 truncate">{item.name}</span>
                    </div>
                    <span className="text-zinc-100 font-semibold">{item.value.toLocaleString()} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Outcome Mix</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-[300px]">
              {outcomesPieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">No outcome data.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                  <PieChart>
                    <Pie
                      data={outcomesPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={92}
                      paddingAngle={2}
                      activeIndex={activeOutcomeIndex}
                      activeShape={(props: any) => <Sector {...props} outerRadius={(props.outerRadius || 0) + 6} />}
                      onMouseEnter={(_, index) => setActiveOutcomeIndex(index)}
                      stroke="#0a0a0a"
                      strokeWidth={2}
                    >
                      {outcomesPieData.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any) => [Number(v).toLocaleString(), String(n)]}
                      itemStyle={{ color: '#e4e4e7' }}
                      labelStyle={{ color: '#a1a1aa' }}
                      contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12, color: '#e4e4e7' }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                    />
                    <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 text-[10px] uppercase tracking-wider">Outcomes</text>
                    <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-100 text-[18px] font-bold">
                      {outcomesTotal.toLocaleString()}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {activeOutcome && (
              <div className="text-xs text-zinc-300 px-1">
                <span className="font-bold text-zinc-100">{activeOutcome.name}</span>: {activeOutcome.value.toLocaleString()} ({outcomesTotal ? Math.round((activeOutcome.value / outcomesTotal) * 100) : 0}%)
              </div>
            )}
            {outcomesBreakdown.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 space-y-2">
                {outcomesBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                      <span className="text-zinc-300 truncate">{item.name}</span>
                    </div>
                    <span className="text-zinc-100 font-semibold">{item.value.toLocaleString()} ({item.pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Upcoming Hearings</h3>
          </div>
          <TableBlock
            rows={hearings.slice(0, 20)}
            emptyText="No hearings found."
            headers={['Case', 'Procedure', 'Scheduled', 'Judge', 'Action']}
            renderRow={(h: any, i: number) => (
              <tr key={i} className="hover:bg-emerald-500/5 transition-colors group">
                <td className="px-6 py-4 max-w-[300px] cursor-pointer" onClick={() => fetchCaseDetail(h.claim_number)}>
                  <div className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors text-sm truncate">{h.casename}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{h.claim_number}</div>
                </td>
                <td className="px-6 py-4"><span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg border border-zinc-700 uppercase">{h.hearing_type}</span></td>
                <td className="px-6 py-4 text-center"><div className="text-sm text-zinc-200 font-bold">{new Date(h.assigned_start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div><div className="text-[10px] text-zinc-500">{h.start_time}</div></td>
                <td className="px-6 py-4 text-emerald-400 text-xs font-bold uppercase">{h.judge_name || 'UNASSIGNED'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleFinalize(h.claim_number)} disabled={loadingFinalize === h.claim_number} className="px-4 py-2 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-bold rounded-xl transition-all disabled:opacity-50 uppercase tracking-widest">
                    {loadingFinalize === h.claim_number ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Finalize'}
                  </button>
                </td>
              </tr>
            )}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Cases Needing Action</h3>
            </div>
            <TableBlock
              rows={casesNeedingAction.slice(0, 10)}
              emptyText="No flagged cases."
              headers={['Case', 'Reason', 'Judge']}
              renderRow={(c: any, i: number) => (
                <tr key={i} className="hover:bg-zinc-800/40 cursor-pointer" onClick={() => fetchCaseDetail(c.claim_number)}>
                  <td className="px-4 py-3"><div className="text-sm font-bold text-zinc-100 truncate">{c.CaseName || c.claim_number}</div><div className="text-[10px] text-zinc-500 font-mono">{c.claim_number}</div></td>
                  <td className="px-4 py-3 text-[11px] text-amber-300">{c.action_reason}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-300">{c.judge_name || 'Unassigned'}</td>
                </tr>
              )}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-70">Overdue Cases</h3>
            </div>
            <TableBlock
              rows={overdueCases.slice(0, 10)}
              emptyText="No overdue cases."
              headers={['Case', 'Age (days)', 'Idle (days)']}
              renderRow={(c: any, i: number) => (
                <tr key={i} className="hover:bg-zinc-800/40 cursor-pointer" onClick={() => fetchCaseDetail(c.claim_number)}>
                  <td className="px-4 py-3"><div className="text-sm font-bold text-zinc-100 truncate">{c.CaseName || c.claim_number}</div><div className="text-[10px] text-zinc-500 font-mono">{c.claim_number}</div></td>
                  <td className="px-4 py-3 text-[11px] text-zinc-300">{c.case_age_days}</td>
                  <td className="px-4 py-3 text-[11px] text-zinc-300">{c.days_since_last_listing}</td>
                </tr>
              )}
            />
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedCase && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCaseFile} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-[500px] bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
                <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/10 rounded-xl"><FileText className="w-5 h-5 text-emerald-400" /></div><h2 className="font-bold text-white tracking-tight text-lg uppercase">Case File</h2></div>
                <button onClick={closeCaseFile} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              {loadingDetail ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-10 h-10 text-emerald-400 animate-spin" /><p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Loading case file...</p></div>
              ) : caseDetail ? (
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <section className="space-y-3">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em]">Case Overview</h3>
                    <div className="bg-zinc-950/50 border border-zinc-800 p-5 rounded-2xl space-y-3">
                      <h1 className="text-xl font-bold text-white leading-tight">{caseDetail.info?.CaseName}</h1>
                      <p className="text-sm text-zinc-300 leading-relaxed">{caseSummary}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs text-zinc-400">
                        <div>Claim: <span className="text-zinc-200 font-mono">{caseDetail.info?.claim_number}</span></div>
                        <div>Status: <span className="text-zinc-200">{caseDetail.info?.claim_status}</span></div>
                        <div className="col-span-2 border-t border-zinc-800/50 pt-2">Presiding: <span className="text-emerald-400 font-bold uppercase tracking-tight">{caseDetail.info?.judge_name || 'UNASSIGNED'}</span></div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2"><User className="w-4 h-4" /> Involved Parties</h3>
                    <div className="space-y-3">
                      {toArray(caseDetail.parties).map((p: any, i: number) => (
                        <div key={i} className="bg-zinc-900 border border-zinc-800/50 p-4 rounded-xl space-y-1 hover:border-zinc-700 transition-colors">
                          <p className="text-sm font-bold text-zinc-100">{p.entity_name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">{p.role}</p>
                          {p.attorneys ? (
                            <div className="pt-2 border-t border-zinc-800/30 mt-2">
                              <p className="text-[9px] text-zinc-500 uppercase font-black mb-0.5">Counsel</p>
                              <p className="text-xs font-bold text-emerald-400 uppercase tracking-tight">{p.attorneys}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-600 italic pt-1 uppercase">Pro Se / No Counsel</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-2"><History className="w-4 h-4" /> Procedural History</h3>
                    <div className="space-y-3">
                      {toArray(caseDetail.history).map((h: any, i: number) => (
                        <div key={i} className="bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/60">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{new Date(h.assigned_start_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                          <p className="text-xs font-bold text-zinc-200 mt-1">{h.hearing_type}</p>
                          <p className="text-[11px] text-zinc-500 mt-1">{h.comments || 'No notes.'}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: any) {
  const themes: any = {
    emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/5 border-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/5 border-amber-500/10 text-amber-400',
    zinc: 'bg-zinc-500/5 border-zinc-500/10 text-zinc-400',
  };
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between h-32 hover:border-emerald-500/30 transition-all group cursor-default">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
        <div className={`p-2 rounded-xl border ${themes[color]}`}>{React.cloneElement(icon, { size: 14 })}</div>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tighter">{value?.toLocaleString() ?? 0}</div>
    </div>
  );
}

function TableBlock({ rows, emptyText, headers, renderRow }: { rows: any[]; emptyText: string; headers: string[]; renderRow: (row: any, i: number) => React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
      {rows.length === 0 ? (
        <div className="p-12 text-center text-zinc-600 text-sm italic">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-950/50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-800">
              <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">{rows.map((r, i) => renderRow(r, i))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (val: string) => void }) {
  return (
    <div className="relative group min-w-[140px]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-[10px] font-bold text-zinc-300 hover:border-zinc-700 transition-all outline-none cursor-pointer uppercase tracking-widest"
      >
        <option value="">All {label}s</option>
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none group-hover:text-zinc-400 transition-colors" />
    </div>
  );
}
