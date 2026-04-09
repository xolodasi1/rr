import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

const SPEED = 5;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Local state for smooth movement
  const keys = useRef<{ [key: string]: boolean }>({});
  
  const handleAttack = () => {
    const socket = getSocket();
    if (socket) {
      socket.emit('attack');
      const myId = useGameStore.getState().myId;
      if (myId) {
        useGameStore.getState().updatePlayer(myId, { isAttacking: true });
        setTimeout(() => {
          useGameStore.getState().updatePlayer(myId, { isAttacking: false });
        }, 300);
      }
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
        handleAttack();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastEmitTime = 0;

    const render = (time: number) => {
      const state = useGameStore.getState();
      const myId = state.myId;
      const socket = getSocket();
      const me = myId ? state.players.get(myId) : undefined;
      
      // 1. Update local player position
      if (myId && socket && me) {
        let dx = 0;
        let dy = 0;
        let newDir = me.direction;

        if (keys.current['w'] || keys.current['arrowup']) { dy -= SPEED; newDir = 'up'; }
        if (keys.current['s'] || keys.current['arrowdown']) { dy += SPEED; newDir = 'down'; }
        if (keys.current['a'] || keys.current['arrowleft']) { dx -= SPEED; newDir = 'left'; }
        if (keys.current['d'] || keys.current['arrowright']) { dx += SPEED; newDir = 'right'; }

        if (dx !== 0 || dy !== 0 || newDir !== me.direction) {
          // Removed hard screen boundaries so player can explore infinite grid
          const newX = me.x + dx;
          const newY = me.y + dy;
          
          useGameStore.getState().updatePlayer(myId, { x: newX, y: newY, direction: newDir });
          
          // Throttle emissions to ~20fps
          if (time - lastEmitTime > 50) {
            socket.emit('move', { x: newX, y: newY, direction: newDir });
            lastEmitTime = time;
          }
        }
      }

      // 2. Camera setup
      let cameraX = 0;
      let cameraY = 0;
      if (me) {
        // Center camera on player
        cameraX = me.x - canvas.width / 2;
        cameraY = me.y - canvas.height / 2;
      }

      // Clear canvas
      ctx.fillStyle = '#020205'; // Deep space black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // 3. Draw infinite grid
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 2;
      const gridSize = 100;
      const startX = Math.floor(cameraX / gridSize) * gridSize;
      const startY = Math.floor(cameraY / gridSize) * gridSize;
      
      ctx.beginPath();
      for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        ctx.moveTo(x, cameraY);
        ctx.lineTo(x, cameraY + canvas.height);
      }
      for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        ctx.moveTo(cameraX, y);
        ctx.lineTo(cameraX + canvas.width, y);
      }
      ctx.stroke();

      // 4. Draw players
      const players = Array.from(useGameStore.getState().players.values());
      players.sort((a, b) => a.y - b.y);

      players.forEach(player => {
        const isMe = player.id === myId;
        const color = isMe ? '#00ffff' : '#ff0055';
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 15, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw attack slash
        if (player.isAttacking) {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          
          let angle = 0;
          if (player.direction === 'right') angle = 0;
          if (player.direction === 'down') angle = Math.PI / 2;
          if (player.direction === 'left') angle = Math.PI;
          if (player.direction === 'up') angle = -Math.PI / 2;
          
          ctx.arc(player.x, player.y, 35, angle - Math.PI/3, angle + Math.PI/3);
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = color;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Draw Sci-Fi Player Body (Glowing Ring)
        ctx.beginPath();
        ctx.arc(player.x, player.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#050508';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw Direction Pointer (Inner Core)
        ctx.beginPath();
        let px = player.x;
        let py = player.y;
        const offset = 8;
        if (player.direction === 'up') py -= offset;
        if (player.direction === 'down') py += offset;
        if (player.direction === 'left') px -= offset;
        if (player.direction === 'right') px += offset;
        
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw nameplate
        ctx.fillStyle = isMe ? '#00ffff' : '#ffffff';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${player.level} ${player.name}`, player.x, player.y - 30);

        // Draw HP bar
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(player.x - 20, player.y - 22, 40, 4);
        ctx.fillStyle = color;
        ctx.fillRect(player.x - 20, player.y - 22, 40 * (player.hp / player.maxHp), 4);
      });

      ctx.restore();
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050508] border border-cyan-900/50 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.1)] touch-none">
      <canvas 
        ref={canvasRef} 
        width={1024} 
        height={768}
        className="w-full h-full object-cover"
      />
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />

      {/* Mobile Controls Overlay */}
      <div className="absolute inset-0 pointer-events-none md:hidden z-50">
        {/* D-Pad */}
        <div className="absolute bottom-10 left-6 w-32 h-32 pointer-events-auto opacity-70">
          <div className="relative w-full h-full bg-cyan-900/20 rounded-full border border-cyan-500/30">
            <button 
              onPointerDown={() => keys.current['w'] = true} 
              onPointerUp={() => keys.current['w'] = false}
              onPointerLeave={() => keys.current['w'] = false}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-cyan-800/50 rounded-t-full active:bg-cyan-500/80 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['s'] = true} 
              onPointerUp={() => keys.current['s'] = false}
              onPointerLeave={() => keys.current['s'] = false}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-cyan-800/50 rounded-b-full active:bg-cyan-500/80 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['a'] = true} 
              onPointerUp={() => keys.current['a'] = false}
              onPointerLeave={() => keys.current['a'] = false}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-cyan-800/50 rounded-l-full active:bg-cyan-500/80 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['d'] = true} 
              onPointerUp={() => keys.current['d'] = false}
              onPointerLeave={() => keys.current['d'] = false}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-cyan-800/50 rounded-r-full active:bg-cyan-500/80 touch-none" 
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-500/50 rounded-full pointer-events-none" />
          </div>
        </div>

        {/* Attack Button */}
        <div className="absolute bottom-12 right-6 pointer-events-auto opacity-70">
          <button 
            onPointerDown={handleAttack} 
            className="w-20 h-20 bg-red-900/40 rounded-full border-2 border-red-500/50 flex items-center justify-center text-red-500 font-bold active:bg-red-500/80 active:text-white shadow-[0_0_15px_rgba(255,0,0,0.3)] touch-none"
          >
            ATK
          </button>
        </div>
      </div>
    </div>
  );
};
