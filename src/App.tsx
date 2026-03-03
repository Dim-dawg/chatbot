import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import CalendarPage from './components/CalendarPage';
import { Database, Loader2, AlertCircle, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getPageCapabilities(page: 'dashboard' | 'calendar') {
  if (page === 'calendar') {
    return {
      page: 'calendar',
      title: 'Schedule Calendar',
      canDo: [
        'View hearings grouped by date',
        'Set start and end date filters',
        'Load schedules for selected date range',
      ],
      dataViews: ['Daily schedule list with case, hearing type, time, and judge'],
      actions: ['Change date range', 'Refresh schedules'],
    };
  }

  return {
    page: 'dashboard',
    title: 'Judicial Dashboard',
    canDo: [
      'See summary cards (total, active, pending, finalized)',
      'Search cases by name or claim number',
      'Filter by case type, judge, and jurisdiction',
      'Open case detail drawer with overview, parties, and history',
      'Finalize a case from hearing rows',
      'Review cases needing action and overdue cases',
    ],
    dataViews: ['Monthly trend chart', 'Caseload pie', 'Outcome mix pie', 'Hearings and case tables'],
    actions: ['Sync dashboard data', 'Open case file', 'Apply/Clear filters', 'Finalize case'],
  };
}

export default function App() {
  const [credentials, setCredentials] = useState<any>(null);
  const [schemaContext, setSchemaContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePage, setActivePage] = useState<'dashboard' | 'calendar'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const handleSelectCase = (claimNumber: string) => {
    setSelectedCase(claimNumber);
    setActivePage('dashboard');
  };

  useEffect(() => {
    const attemptAutoConnection = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Connection failed.');
        setCredentials({ status: 'connected', database: data.database || 'Connected' });
        setSchemaContext(data.schema);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    attemptAutoConnection();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
          <p className="text-zinc-400 animate-pulse">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center p-8 bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">System Error</h1>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all">Retry Connection</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col relative">
      {/* Top Global Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-black text-lg tracking-tighter uppercase">Judicial Workspace</h1>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button onClick={() => setActivePage('dashboard')} className={`px-2 py-1 rounded text-[10px] ${activePage === 'dashboard' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Dashboard</button>
            <button onClick={() => setActivePage('calendar')} className={`px-2 py-1 rounded text-[10px] ${activePage === 'calendar' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Calendar</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Live Records
          </div>
          <div className="h-4 w-[1px] bg-zinc-800"></div>
          <span>Live Context</span>
        </div>
      </header>

      {/* Main Content: Full Screen Dashboard */}
      <main className="flex-1 overflow-hidden p-6 relative">
        {activePage === 'dashboard' ? (
          <Dashboard credentials={credentials} initialCaseNumber={selectedCase} onCaseCleared={() => setSelectedCase(null)} />
        ) : (
          <CalendarPage credentials={credentials} onSelectCase={handleSelectCase} />
        )}
      </main>

      {/* Floating Chat Interface */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-[450px] h-[600px] bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Assistant Chat</h2>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatInterface
                  credentials={credentials}
                  schemaContext={schemaContext}
                  uiContext={{
                    activePage,
                    chatOpen: isChatOpen,
                    navigation: ['dashboard', 'calendar'],
                    pageCapabilities: getPageCapabilities(activePage),
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Bubble Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
            isChatOpen ? 'bg-zinc-800 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-400'
          }`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </motion.button>
      </div>
    </div>
  );
}
