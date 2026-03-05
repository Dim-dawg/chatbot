import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import CalendarPage from './components/CalendarPage';
import AdminDashboard from './components/AdminDashboard';
import { Database, Loader2, AlertCircle, MessageSquare, X, Lock, LogOut, ShieldCheck } from 'lucide-react';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('clerk');
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [credentials, setCredentials] = useState<any>(null);
  const [schemaContext, setSchemaContext] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePage, setActivePage] = useState<'dashboard' | 'calendar' | 'admin'>('dashboard');
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const handleSelectCase = (claimNumber: string) => {
    setSelectedCase(claimNumber);
    setActivePage('dashboard');
  };

  const loadSchema = async () => {
    setAuthLoading(true);
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

  useEffect(() => {
    const init = async () => {
      setAuthLoading(true);
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          setIsAuthenticated(false);
          return;
        }
        const authData = await authRes.json();
        if (!authData?.authenticated) {
          setIsAuthenticated(false);
          return;
        }
        setIsAuthenticated(true);
        setAuthUser(String(authData?.user?.username || ''));
        setUserRole(String(authData?.user?.role || 'clerk'));
        await loadSchema();
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };
    init();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      setIsAuthenticated(true);
      setAuthUser(data?.user?.username || loginForm.username);
      setUserRole(data?.user?.role || 'clerk');
      setLoginForm({ username: '', password: '' });
      setIsLoading(true);
      const schemaRes = await fetch('/api/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const schemaData = await schemaRes.json();
      if (!schemaRes.ok) throw new Error(schemaData.error || 'Connection failed.');
      setCredentials({ status: 'connected', database: schemaData.database || 'Connected' });
      setSchemaContext(schemaData.schema);
      setIsLoading(false);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setAuthUser('');
    setCredentials(null);
    setSchemaContext(null);
  };

  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [signupForm, setSignupForm] = useState({ username: '', password: '', role: 'clerk' });
  const [resetForm, setResetForm] = useState({ username: '', token: '', newPassword: '' });
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed.');
      setAuthSuccess('Account created! You can now sign in.');
      setAuthMode('login');
      setSignupForm({ username: '', password: '', role: 'clerk' });
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed.');
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetForm.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed.');
      setAuthSuccess('If account exists, check logs for reset token.');
    } catch (err: any) {
      setAuthError(err.message || 'Request failed.');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetForm.token, new_password: resetForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed.');
      setAuthSuccess('Password updated successfully.');
      setAuthMode('login');
      setResetForm({ username: '', token: '', newPassword: '' });
    } catch (err: any) {
      setAuthError(err.message || 'Reset failed.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
          <p className="text-zinc-400 animate-pulse text-xs uppercase tracking-widest font-bold">System initializing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-700" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm p-8 rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none uppercase">LexiVault</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">Judicial Data Sovereign</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'login' && (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin} 
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Identity Handle</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Access Key</label>
                    <button 
                      type="button" 
                      onClick={() => setAuthMode('forgot')}
                      className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-zinc-700"
                    required
                  />
                </div>
                {authError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{authError}</p>}
                {authSuccess && <p className="text-xs text-emerald-400 bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">{authSuccess}</p>}
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20">
                  Authenticate
                </button>
                <p className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-6">
                  New operator? <button type="button" onClick={() => setAuthMode('signup')} className="text-emerald-400 hover:underline">Enroll Here</button>
                </p>
              </motion.form>
            )}

            {authMode === 'signup' && (
              <motion.form 
                key="signup"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSignup} 
                className="space-y-4"
              >
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">New Identity Handle</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Access Key (Min 8 Chars)</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Jurisdictional Role</label>
                  <select
                    value={signupForm.role}
                    onChange={(e) => setSignupForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  >
                    <option value="clerk">Legal Clerk</option>
                    <option value="judge">Presiding Judge</option>
                    <option value="staff">Administrative Staff</option>
                  </select>
                </div>
                {authError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{authError}</p>}
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20">
                  Register Account
                </button>
                <button type="button" onClick={() => setAuthMode('login')} className="w-full text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors">
                  Return to Sign In
                </button>
              </motion.form>
            )}

            {authMode === 'forgot' && (
              <motion.div 
                key="forgot"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Account Handle</label>
                    <input
                      type="text"
                      placeholder="Username"
                      value={resetForm.username}
                      onChange={(e) => setResetForm(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-xs transition-all">
                    Generate Reset Token
                  </button>
                </form>

                <div className="h-[1px] bg-zinc-800 w-full" />

                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Reset Token</label>
                    <input
                      type="text"
                      placeholder="Check logs for token"
                      value={resetForm.token}
                      onChange={(e) => setResetForm(prev => ({ ...prev, token: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">New Access Key</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={resetForm.newPassword}
                      onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      required
                    />
                  </div>
                  {authError && <p className="text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{authError}</p>}
                  {authSuccess && <p className="text-xs text-emerald-400 bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">{authSuccess}</p>}
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 font-bold uppercase tracking-widest text-xs transition-all">
                    Reset Access Key
                  </button>
                  <button type="button" onClick={() => setAuthMode('login')} className="w-full text-[10px] text-zinc-500 font-bold uppercase tracking-widest hover:text-zinc-300 transition-colors">
                    Return to Sign In
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em]">Secure Jurisdictional Environment • Belize Senior Courts</p>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-col items-end leading-none">
            <span className="text-zinc-100 normal-case text-xs tracking-normal mb-0.5">{authUser}</span>
            <span className="text-emerald-500 text-[8px] uppercase tracking-[0.2em] font-black">{userRole}</span>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button onClick={() => setActivePage('dashboard')} className={`px-2 py-1 rounded text-[10px] ${activePage === 'dashboard' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Dashboard</button>
            <button onClick={() => setActivePage('calendar')} className={`px-2 py-1 rounded text-[10px] ${activePage === 'calendar' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400'}`}>Calendar</button>
            {userRole === 'admin' && (
              <button onClick={() => setActivePage('admin')} className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${activePage === 'admin' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-100'}`}>
                <ShieldCheck className="w-3 h-3" /> Admin
              </button>
            )}
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
        ) : activePage === 'calendar' ? (
          <CalendarPage credentials={credentials} onSelectCase={handleSelectCase} />
        ) : (
          <AdminDashboard credentials={credentials} onRefreshSchema={loadSchema} />
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
