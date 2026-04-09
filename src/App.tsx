import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Chat } from './components/Chat';
import { initSocket, disconnectSocket } from './services/socketService';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const handleLogin = (name: string) => {
    setPlayerName(name);
    setIsLoggedIn(true);
  };

  useEffect(() => {
    if (isLoggedIn && playerName) {
      initSocket(playerName);
    }
    return () => {
      if (isLoggedIn) {
        disconnectSocket();
      }
    };
  }, [isLoggedIn, playerName]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white font-sans selection:bg-cyan-500/30">
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className="relative w-full h-full">
          <GameCanvas />
          <HUD />
          <div className="absolute bottom-4 left-4">
            <Chat />
          </div>
          
          {/* Controls hint */}
          <div className="absolute bottom-4 right-4 text-right font-mono text-[10px] text-cyan-800/60 uppercase tracking-widest pointer-events-none">
            <p>WASD / Arrows to Move</p>
            <p>Space to Attack</p>
          </div>
        </div>
      )}
    </div>
  );
}
