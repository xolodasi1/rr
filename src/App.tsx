import React, { useEffect } from 'react';
import { MainMenu } from './components/MainMenu';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Chat } from './components/Chat';
import { initSocket, disconnectSocket } from './services/socketService';
import { useGameStore } from './store/gameStore';

export default function App() {
  const currentWorld = useGameStore(state => state.currentWorld);

  useEffect(() => {
    // Initialize socket immediately to fetch server list
    initSocket();
    
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      {!currentWorld ? (
        <MainMenu />
      ) : (
        <div className="relative w-full h-full">
          <GameCanvas />
          <HUD />
          <div className="absolute top-32 left-4 md:top-auto md:bottom-4 md:left-4 z-40 pointer-events-auto hidden sm:block">
            <Chat />
          </div>
          
          {/* Controls hint */}
          <div className="absolute bottom-4 right-4 text-right font-mono text-[10px] text-cyan-800/60 uppercase tracking-widest pointer-events-none hidden md:block">
            <p>WASD / Arrows to Move</p>
            <p>Space to Attack</p>
          </div>
        </div>
      )}
    </div>
  );
}
