import React from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveWorld } from '../services/socketService';

export const HUD: React.FC = () => {
  const myId = useGameStore(state => state.myId);
  const playersMap = useGameStore(state => state.players);
  const isConnected = useGameStore(state => state.isConnected);
  const currentWorld = useGameStore(state => state.currentWorld);
  const myStamina = useGameStore(state => state.myStamina);
  const maxStamina = useGameStore(state => state.maxStamina);

  const players = Array.from(playersMap.values());
  const me = myId ? playersMap.get(myId) : null;

  if (!me) return null;

  return (
    <div className="absolute top-4 left-4 pointer-events-none flex flex-col md:flex-row gap-2 md:gap-4 z-40">
      <div className="bg-white/30 backdrop-blur-md border border-white/50 rounded-lg p-3 md:p-4 w-48 md:w-64 font-sans shadow-[0_4px_15px_rgba(0,0,0,0.1)] pointer-events-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-800 font-bold uppercase tracking-wider text-sm md:text-base">{me.name}</span>
          <span className="text-[10px] md:text-xs text-gray-600 font-bold">Lv.{me.level}</span>
        </div>
        
        {/* HP Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[8px] md:text-[10px] text-gray-600 mb-1 font-bold">
            <span>HP</span>
            <span>{me.hp} / {me.maxHp}</span>
          </div>
          <div className="h-1.5 md:h-2 bg-gray-300/50 rounded-full overflow-hidden border border-white/50">
            <div 
              className="h-full bg-[#8bc34a] shadow-[0_0_8px_rgba(139,195,74,0.6)] transition-all duration-300"
              style={{ width: `${(me.hp / me.maxHp) * 100}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[8px] md:text-[10px] text-gray-600 mb-1 font-bold">
            <span>SP</span>
            <span>{Math.floor(myStamina)} / {maxStamina}</span>
          </div>
          <div className="h-1.5 md:h-2 bg-gray-300/50 rounded-full overflow-hidden border border-white/50">
            <div 
              className="h-full bg-[#ffb74d] shadow-[0_0_8px_rgba(255,183,77,0.6)] transition-all duration-100"
              style={{ width: `${(myStamina / maxStamina) * 100}%` }}
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex gap-2 text-[8px] md:text-[10px] uppercase tracking-widest mt-2 md:mt-4 font-bold">
          <div className={`px-2 py-1 rounded border bg-white/50 ${isConnected ? 'border-green-400/50 text-green-600' : 'border-red-400/50 text-red-600'}`}>
            {isConnected ? 'LINK START' : 'OFFLINE'}
          </div>
          <div className="px-2 py-1 rounded border border-gray-300 bg-white/50 text-gray-600 truncate max-w-[80px] md:max-w-[120px]">
            {currentWorld?.name || 'UNKNOWN ZONE'}
          </div>
        </div>

        {/* Leave Server Button */}
        <button 
          onClick={leaveWorld}
          className="mt-3 w-full bg-red-500/80 hover:bg-red-600 text-white font-bold text-[10px] md:text-xs uppercase tracking-widest py-1.5 rounded-lg transition-all shadow-[0_4px_15px_rgba(244,67,54,0.4)]"
        >
          Log Out
        </button>
      </div>
      
      {/* Online Players List - Hidden on very small screens to save space */}
      <div className="bg-white/30 backdrop-blur-md border border-white/50 rounded-lg p-3 md:p-4 w-48 font-sans h-fit hidden sm:block shadow-[0_4px_15px_rgba(0,0,0,0.1)]">
        <div className="text-gray-700 font-bold text-[10px] uppercase tracking-widest mb-2 border-b border-white/50 pb-1">
          Online Players ({players.length})
        </div>
        <div className="space-y-1">
          {players.map(p => (
            <div key={p.id} className={`text-xs ${p.id === myId ? 'text-green-600 font-bold' : 'text-gray-600 font-medium'}`}>
              {p.name} <span className="text-[9px] text-gray-500">Lv.{p.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
