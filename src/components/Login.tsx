import React, { useState } from 'react';

interface LoginProps {
  onLogin: (name: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050508] flex items-center justify-center z-50 font-mono">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative bg-black/40 backdrop-blur-xl border border-cyan-500/30 p-8 rounded-2xl w-96 shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 tracking-tighter">
            PROJECT: AINCRAD
          </h1>
          <p className="text-cyan-600/80 text-xs uppercase tracking-[0.3em]">Virtual Reality MMORPG</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-cyan-500/80 text-[10px] uppercase tracking-widest mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-cyan-950/20 border border-cyan-800/50 rounded-lg px-4 py-3 text-cyan-100 outline-none focus:border-cyan-400 focus:bg-cyan-950/40 transition-all"
              placeholder="Enter your name..."
              maxLength={16}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]"
          >
            Link Start
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-cyan-800/60 uppercase tracking-widest">
          Warning: Logout sequence disabled
        </div>
      </div>
    </div>
  );
};
