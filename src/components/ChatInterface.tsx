import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Database, Loader2, Code } from 'lucide-react';

export default function ChatInterface({ credentials, schemaContext }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          credentials,
          schemaContext,
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch response');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          sql: data.sql,
          data: data.data,
        },
      ]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message}`, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-white font-semibold">MySQL Assistant</h1>
            <p className="text-xs text-zinc-400">Connected to {credentials.database}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Bot className="w-12 h-12 opacity-50" />
            <p className="text-sm">Ask me anything about your database!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
              msg.role === 'user' ? 'bg-indigo-500' : 'bg-emerald-500'
            }`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-indigo-500 text-white rounded-tr-none' 
                  : msg.isError
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20 rounded-tl-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
              
              {msg.sql && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 w-full overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                    <Code className="w-3 h-3" />
                    Executed SQL
                  </div>
                  <pre className="text-xs text-emerald-400 font-mono overflow-x-auto pb-2">
                    {msg.sql}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-sm text-zinc-400">Querying database...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-zinc-900 border-t border-zinc-800">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="E.g., Show me the top 5 most recent cases where status is open..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
