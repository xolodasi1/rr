import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { joinWorld, createWorld } from '../services/socketService';

export const MainMenu: React.FC = () => {
  const [step, setStep] = useState<'NAME' | 'WORLDS'>('NAME');
  const [name, setName] = useState('');
  const [newWorldName, setNewWorldName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const worlds = useGameStore(state => state.worlds);
  const isConnected = useGameStore(state => state.isConnected);
  const topPlayers = useGameStore(state => state.topPlayers);

  useEffect(() => {
    const savedName = localStorage.getItem('aincrad_player_name');
    if (savedName) {
      setName(savedName);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('aincrad_player_name', name.trim());
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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 bg-[#a3c995] flex items-center justify-center z-50 font-sans">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-white/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-green-400/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative flex flex-col md:flex-row gap-6 w-full max-w-4xl px-4 items-start justify-center">
        
        {/* Main Menu Panel */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-2xl w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-widest drop-shadow-sm">
              AINCRAD ONLINE
            </h1>
            <p className="text-gray-600 text-xs font-bold uppercase tracking-[0.3em]">Virtual Reality MMORPG</p>
          </div>

          {!isConnected && (
            <div className="text-center text-orange-500 font-bold text-xs uppercase tracking-widest mb-4 animate-pulse">
              Connecting to master server...
            </div>
          )}

          {step === 'NAME' && (
            <form onSubmit={handleNameSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-bold text-[10px] uppercase tracking-widest mb-2">
                  Character Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 rounded-lg px-4 py-3 text-gray-800 font-bold outline-none focus:border-green-400 focus:bg-white/70 transition-all placeholder-gray-500"
                  placeholder="Enter your name..."
                  maxLength={16}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!name.trim() || !isConnected}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(76,175,80,0.4)] hover:shadow-[0_6px_20px_rgba(76,175,80,0.6)]"
              >
                Link Start
              </button>
            </form>
          )}

          {step === 'WORLDS' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700 font-bold text-[10px] uppercase tracking-widest">Select World</span>
                <button 
                  onClick={() => setIsCreating(!isCreating)}
                  className="text-green-600 font-bold text-[10px] uppercase tracking-widest hover:text-green-800 transition-colors"
                >
                  {isCreating ? 'Cancel' : '+ Create World'}
                </button>
              </div>

              {isCreating && (
                <form onSubmit={handleCreateWorld} className="mb-6 p-4 border border-white/60 rounded-lg bg-white/40">
                  <input
                    type="text"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    className="w-full bg-white/60 border border-white/80 rounded px-3 py-2 text-gray-800 font-bold outline-none focus:border-green-400 text-sm mb-3 placeholder-gray-500"
                    placeholder="World Name..."
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!newWorldName.trim()}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-xs uppercase tracking-widest py-2 rounded transition-all disabled:opacity-50"
                  >
                    Confirm Creation
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 pr-2">
                {worlds.length === 0 ? (
                  <div className="text-center text-gray-500 font-bold text-xs py-4">No worlds found. Create one!</div>
                ) : (
                  worlds.map(world => (
                    <button
                      key={world.id}
                      onClick={() => handleJoinWorld(world.id, world.name)}
                      className="w-full flex items-center justify-between p-4 border border-white/50 bg-white/30 rounded-lg hover:bg-white/60 hover:border-green-400/50 transition-all group text-left shadow-sm"
                    >
                      <div>
                        <div className="text-gray-800 font-bold group-hover:text-green-700 transition-colors">{world.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">ID: {world.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-600 font-bold text-xs">{world.playerCount} Players</div>
                        <div className="text-[9px] text-green-700 font-bold uppercase tracking-widest mt-1 group-hover:text-green-800">Join &rarr;</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setStep('NAME')}
                className="w-full border border-white/60 hover:bg-white/50 text-gray-600 font-bold text-xs uppercase tracking-widest py-2 rounded-lg transition-all mt-4"
              >
                &larr; Back
              </button>
            </div>
          )}
        </div>

        {/* Top Players Panel */}
        <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-2xl w-full md:w-64 shadow-[0_10px_40px_rgba(0,0,0,0.1)] hidden md:block">
          <h2 className="text-gray-800 font-bold text-sm uppercase tracking-widest mb-4 border-b border-white/60 pb-2">
            Top Survivors
          </h2>
          <div className="space-y-3">
            {topPlayers.length === 0 ? (
              <div className="text-gray-500 text-xs italic">No players online</div>
            ) : (
              topPlayers.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-gray-800 font-bold truncate max-w-[120px]">
                    {i + 1}. {p.name}
                  </span>
                  <span className="text-green-700 font-bold">
                    {formatTime(p.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
