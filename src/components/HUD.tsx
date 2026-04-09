import React from 'react';
import { useGameStore } from '../store/gameStore';

export const HUD: React.FC = () => {
  const myId = useGameStore(state => state.myId);
  const me = useGameStore(state => myId ? state.players.get(myId) : null);
  const isConnected = useGameStore(state => state.isConnected);

  if (!me) return null;

  return (
    <div className="absolute top-4 left-4 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border border-cyan-900/50 rounded-lg p-4 w-64 font-mono">
        <div className="flex justify-between items-center mb-2">
          <span className="text-cyan-400 font-bold uppercase tracking-wider">{me.name}</span>
          <span className="text-xs text-cyan-600">Lv.{me.level}</span>
        </div>
        
        {/* HP Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>HP</span>
            <span>{me.hp} / {me.maxHp}</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
            <div 
              className="h-full bg-green-500 shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-all duration-300"
              style={{ width: `${(me.hp / me.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-2 text-[10px] uppercase tracking-widest mt-4">
          <div className={`px-2 py-1 rounded border ${isConnected ? 'border-cyan-500/50 text-cyan-400' : 'border-red-500/50 text-red-400'}`}>
            {isConnected ? 'LINK START' : 'OFFLINE'}
          </div>
          <div className="px-2 py-1 rounded border border-gray-700 text-gray-400">
            SAFE ZONE
          </div>
        </div>
      </div>
    </div>
  );
};
