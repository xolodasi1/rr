import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

const SPEED = 5;

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Local state for smooth movement
  const keys = useRef<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
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
      // 1. Update local player position
      const state = useGameStore.getState();
      const myId = state.myId;
      const socket = getSocket();
      
      if (myId && socket) {
        const me = state.players.get(myId);
        if (me) {
          let dx = 0;
          let dy = 0;
          let newDir = me.direction;

          if (keys.current['w'] || keys.current['arrowup']) { dy -= SPEED; newDir = 'up'; }
          if (keys.current['s'] || keys.current['arrowdown']) { dy += SPEED; newDir = 'down'; }
          if (keys.current['a'] || keys.current['arrowleft']) { dx -= SPEED; newDir = 'left'; }
          if (keys.current['d'] || keys.current['arrowright']) { dx += SPEED; newDir = 'right'; }

          if (dx !== 0 || dy !== 0 || newDir !== me.direction) {
            const newX = Math.max(20, Math.min(canvas.width - 20, me.x + dx));
            const newY = Math.max(20, Math.min(canvas.height - 20, me.y + dy));
            
            useGameStore.getState().updatePlayer(myId, { x: newX, y: newY, direction: newDir });
            
            // Throttle emissions to ~20fps
            if (time - lastEmitTime > 50) {
              socket.emit('move', { x: newX, y: newY, direction: newDir });
              lastEmitTime = time;
            }
          }
        }
      }

      // 2. Clear canvas
      ctx.fillStyle = '#0a0a12'; // Dark sci-fi background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
      }

      // 3. Draw players
      const players = Array.from(useGameStore.getState().players.values());
      
      // Sort by Y so players lower on screen are drawn on top
      players.sort((a, b) => a.y - b.y);

      players.forEach(player => {
        const isMe = player.id === myId;
        
        // Draw attack effect
        if (player.isAttacking) {
          ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
          ctx.beginPath();
          if (player.direction === 'up') ctx.arc(player.x, player.y - 30, 25, 0, Math.PI * 2);
          if (player.direction === 'down') ctx.arc(player.x, player.y + 30, 25, 0, Math.PI * 2);
          if (player.direction === 'left') ctx.arc(player.x - 30, player.y, 25, 0, Math.PI * 2);
          if (player.direction === 'right') ctx.arc(player.x + 30, player.y, 25, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 20, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw character body
        ctx.fillStyle = isMe ? '#00ffff' : '#ff0055'; // Cyan for me, neon pink for others
        
        // Glitch effect for others occasionally
        if (!isMe && Math.random() > 0.98) {
          ctx.fillStyle = Math.random() > 0.5 ? '#00ffff' : '#ffffff';
          ctx.fillRect(player.x - 15 + (Math.random()*10-5), player.y - 20, 30, 40);
        } else {
          ctx.fillRect(player.x - 15, player.y - 20, 30, 40);
        }

        // Draw direction indicator (visor)
        ctx.fillStyle = '#ffffff';
        if (player.direction === 'up') ctx.fillRect(player.x - 10, player.y - 15, 20, 5);
        if (player.direction === 'down') ctx.fillRect(player.x - 10, player.y - 10, 20, 5);
        if (player.direction === 'left') ctx.fillRect(player.x - 15, player.y - 10, 5, 20);
        if (player.direction === 'right') ctx.fillRect(player.x + 10, player.y - 10, 5, 20);

        // Draw nameplate
        ctx.fillStyle = isMe ? '#00ffff' : '#ffffff';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${player.level} ${player.name}`, player.x, player.y - 30);

        // Draw HP bar
        ctx.fillStyle = '#333';
        ctx.fillRect(player.x - 20, player.y - 45, 40, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(player.x - 20, player.y - 45, 40 * (player.hp / player.maxHp), 4);
      });

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#050508] border border-cyan-900/50 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.1)]">
      <canvas 
        ref={canvasRef} 
        width={1024} 
        height={768}
        className="w-full h-full object-contain"
      />
      
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]" />
    </div>
  );
};
