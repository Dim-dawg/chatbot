import React, { useState } from 'react';
import { Database, Server, User, Key, Save } from 'lucide-react';

export default function ConnectionSettings({ onSave, initialCredentials }: any) {
  const [credentials, setCredentials] = useState(initialCredentials || {
    host: '',
    port: '3306',
    user: '',
    password: '',
    database: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(credentials);
  };

  return (
    <div className="bg-zinc-900 p-6 rounded-2xl shadow-lg border border-zinc-800 w-full max-w-md">
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Database className="w-5 h-5 text-emerald-400" />
        MySQL Connection
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Host</label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              name="host"
              value={credentials.host}
              onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="localhost"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Port</label>
          <input
            type="text"
            name="port"
            value={credentials.port}
            onChange={handleChange}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
            placeholder="3306"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">User</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              name="user"
              value={credentials.user}
              onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="root"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Database</label>
          <div className="relative">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              name="database"
              value={credentials.database}
              onChange={handleChange}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              placeholder="casemanager"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-6"
        >
          <Save className="w-4 h-4" />
          Save & Connect
        </button>
        <button
          type="button"
          onClick={() => onSave(null)}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
        >
          Skip Connection (Generate SQL Only)
        </button>
      </form>
    </div>
  );
}
