import React from 'react';
import { useGameStore } from '../store/gameStore';

export const HUD: React.FC = () => {
  const myId = useGameStore(state => state.myId);
  const playersMap = useGameStore(state => state.players);
  const isConnected = useGameStore(state => state.isConnected);
  const currentWorld = useGameStore(state => state.currentWorld);

  const players = Array.from(playersMap.values());
  const me = myId ? playersMap.get(myId) : null;

  if (!me) return null;

  return (
    <div className="absolute top-4 left-4 pointer-events-none flex flex-col md:flex-row gap-2 md:gap-4 z-40">
      <div className="bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg p-3 md:p-4 w-48 md:w-64 font-mono">
        <div className="flex justify-between items-center mb-2">
          <span className="text-cyan-400 font-bold uppercase tracking-wider text-sm md:text-base">{me.name}</span>
          <span className="text-[10px] md:text-xs text-cyan-600">Lv.{me.level}</span>
        </div>
        
        {/* HP Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[8px] md:text-[10px] text-gray-400 mb-1">
            <span>HP</span>
            <span>{me.hp} / {me.maxHp}</span>
          </div>
          <div className="h-1.5 md:h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div 
              className="h-full bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all duration-300"
              style={{ width: `${(me.hp / me.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-2 text-[8px] md:text-[10px] uppercase tracking-widest mt-2 md:mt-4">
          <div className={`px-2 py-1 rounded border ${isConnected ? 'border-cyan-500/50 text-cyan-400' : 'border-red-500/50 text-red-400'}`}>
            {isConnected ? 'LINK START' : 'OFFLINE'}
          </div>
          <div className="px-2 py-1 rounded border border-gray-700 text-gray-400 truncate max-w-[80px] md:max-w-[120px]">
            {currentWorld?.name || 'UNKNOWN ZONE'}
          </div>
        </div>
      </div>
      
      {/* Online Players List - Hidden on very small screens to save space */}
      <div className="bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg p-3 md:p-4 w-48 font-mono h-fit hidden sm:block">
        <div className="text-cyan-500 text-[10px] uppercase tracking-widest mb-2 border-b border-cyan-900/50 pb-1">
          Online Players ({players.length})
        </div>
        <div className="space-y-1">
          {players.map(p => (
            <div key={p.id} className={`text-xs ${p.id === myId ? 'text-cyan-400 font-bold' : 'text-gray-400'}`}>
              {p.name} <span className="text-[9px] text-gray-600">Lv.{p.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
