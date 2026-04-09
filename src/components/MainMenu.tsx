import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { joinWorld, createWorld } from '../services/socketService';

export const MainMenu: React.FC = () => {
  const [step, setStep] = useState<'NAME' | 'WORLDS'>('NAME');
  const [name, setName] = useState('');
  const [newWorldName, setNewWorldName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const worlds = useGameStore(state => state.worlds);
  const isConnected = useGameStore(state => state.isConnected);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep('WORLDS');
    }
  };

  const handleJoinWorld = (worldId: string, worldName: string) => {
    if (!isConnected) return;
    joinWorld(name.trim(), worldId);
    useGameStore.getState().setCurrentWorld({ id: worldId, name: worldName, playerCount: 0 });
  };

  const handleCreateWorld = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWorldName.trim() && isConnected) {
      createWorld(newWorldName.trim());
      setNewWorldName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#050508] flex items-center justify-center z-50 font-mono">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative bg-black/40 backdrop-blur-xl border border-cyan-500/30 p-8 rounded-2xl w-[450px] shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2 tracking-tighter">
            PROJECT: AINCRAD
          </h1>
          <p className="text-cyan-600/80 text-xs uppercase tracking-[0.3em]">Virtual Reality MMORPG</p>
        </div>

        {!isConnected && (
          <div className="text-center text-red-400 text-xs uppercase tracking-widest mb-4 animate-pulse">
            Connecting to master server...
          </div>
        )}

        {step === 'NAME' && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
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
              disabled={!name.trim() || !isConnected}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]"
            >
              Authenticate
            </button>
          </form>
        )}

        {step === 'WORLDS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-cyan-500/80 text-[10px] uppercase tracking-widest">Select World</span>
              <button 
                onClick={() => setIsCreating(!isCreating)}
                className="text-cyan-400 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
              >
                {isCreating ? 'Cancel' : '+ Create World'}
              </button>
            </div>

            {isCreating && (
              <form onSubmit={handleCreateWorld} className="mb-6 p-4 border border-cyan-800/50 rounded-lg bg-cyan-950/20">
                <input
                  type="text"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  className="w-full bg-black/50 border border-cyan-800/50 rounded px-3 py-2 text-cyan-100 outline-none focus:border-cyan-400 text-sm mb-3"
                  placeholder="World Name..."
                  maxLength={20}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newWorldName.trim()}
                  className="w-full bg-cyan-800 hover:bg-cyan-600 text-white text-xs uppercase tracking-widest py-2 rounded transition-all disabled:opacity-50"
                >
                  Confirm Creation
                </button>
              </form>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900 pr-2">
              {worlds.length === 0 ? (
                <div className="text-center text-gray-500 text-xs py-4">No worlds found. Create one!</div>
              ) : (
                worlds.map(world => (
                  <button
                    key={world.id}
                    onClick={() => handleJoinWorld(world.id, world.name)}
                    className="w-full flex items-center justify-between p-4 border border-cyan-900/50 rounded-lg hover:bg-cyan-900/30 hover:border-cyan-500/50 transition-all group text-left"
                  >
                    <div>
                      <div className="text-cyan-100 font-bold group-hover:text-white transition-colors">{world.name}</div>
                      <div className="text-[10px] text-cyan-700 uppercase tracking-widest mt-1">ID: {world.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 text-xs">{world.playerCount} Players</div>
                      <div className="text-[9px] text-cyan-600 uppercase tracking-widest mt-1 group-hover:text-cyan-400">Join &rarr;</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <button
              onClick={() => setStep('NAME')}
              className="w-full border border-cyan-900/50 hover:bg-cyan-900/20 text-cyan-500 text-xs uppercase tracking-widest py-2 rounded-lg transition-all mt-4"
            >
              &larr; Back
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-[10px] text-cyan-800/60 uppercase tracking-widest">
          Warning: Logout sequence disabled
        </div>
      </div>
    </div>
  );
};
