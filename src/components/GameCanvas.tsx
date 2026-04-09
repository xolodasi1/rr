import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Local state for smooth movement
  const keys = useRef<{ [key: string]: boolean }>({});
  const isSprinting = useRef(false);
  
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
      if (e.key === 'shift') isSprinting.current = true;
      if (e.key === ' ') {
        e.preventDefault(); // Prevent scrolling
        handleAttack();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
      if (e.key === 'shift') isSprinting.current = false;
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
      const env = state.environment;
      
      // 1. Update local player position & stamina
      if (myId && socket && me) {
        let dx = 0;
        let dy = 0;
        let newDir = me.direction;
        
        let speed = 3;
        let currentStamina = state.myStamina;

        if (isSprinting.current && currentStamina > 0) {
          speed = 6;
          currentStamina = Math.max(0, currentStamina - 0.5);
        } else {
          currentStamina = Math.min(state.maxStamina, currentStamina + 0.2);
        }
        
        if (currentStamina !== state.myStamina) {
          state.setStamina(currentStamina);
        }

        if (keys.current['w'] || keys.current['arrowup']) { dy -= speed; newDir = 'up'; }
        if (keys.current['s'] || keys.current['arrowdown']) { dy += speed; newDir = 'down'; }
        if (keys.current['a'] || keys.current['arrowleft']) { dx -= speed; newDir = 'left'; }
        if (keys.current['d'] || keys.current['arrowright']) { dx += speed; newDir = 'right'; }

        if (dx !== 0 || dy !== 0 || newDir !== me.direction) {
          // Normalize diagonal movement
          if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / length) * speed;
            dy = (dy / length) * speed;
          }

          let newX = me.x + dx;
          let newY = me.y + dy;
          
          // Collision detection with environment
          const PLAYER_RADIUS = 15;
          let canMoveX = true;
          let canMoveY = true;

          for (const obj of env) {
            if (obj.type === 'altar') continue; // Can walk on altar
            
            // Check X axis
            const distXX = newX - obj.x;
            const distXY = me.y - obj.y;
            if (Math.hypot(distXX, distXY) < PLAYER_RADIUS + obj.radius) canMoveX = false;

            // Check Y axis
            const distYX = me.x - obj.x;
            const distYY = newY - obj.y;
            if (Math.hypot(distYX, distYY) < PLAYER_RADIUS + obj.radius) canMoveY = false;
          }

          if (canMoveX) me.x = newX;
          if (canMoveY) me.y = newY;
          me.direction = newDir;
          
          useGameStore.getState().updatePlayer(myId, { x: me.x, y: me.y, direction: me.direction });
          
          // Throttle emissions to ~30fps
          if (time - lastEmitTime > 30) {
            socket.emit('move', { x: me.x, y: me.y, direction: me.direction });
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

      // 3. Draw Parallax Background (Deep Forest Layers)
      const startX = Math.floor(cameraX / 100) * 100;
      const startY = Math.floor(cameraY / 100) * 100;
      
      // Faint grid for digital feel
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = startX; x < startX + canvas.width + 100; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, cameraY); ctx.lineTo(x, cameraY + canvas.height); ctx.stroke();
      }
      for (let y = startY; y < startY + canvas.height + 100; y += 100) {
        ctx.beginPath(); ctx.moveTo(cameraX, y); ctx.lineTo(cameraX + canvas.width, y); ctx.stroke();
      }

      // 4. Draw Environment
      for (const obj of env) {
        // Only draw if roughly on screen
        if (me && (Math.abs(obj.x - me.x) > 800 || Math.abs(obj.y - me.y) > 600)) continue;

        if (obj.type === 'altar') {
          // Altar base
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Inner circle
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius - 10, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
          ctx.setLineDash([5, 5]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (obj.type === 'tree') {
          // Sci-fi Tree (Hexagon/Polygon)
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const px = obj.x + Math.cos(angle) * obj.radius;
            const py = obj.y + Math.sin(angle) * obj.radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(5, 20, 25, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(0, 255, 150, 0.4)'; // Neon green outline
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Inner detail
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius / 3, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
          ctx.stroke();
        } else if (obj.type === 'rock') {
          // Sci-fi Rock (Triangle/Diamond)
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y - obj.radius);
          ctx.lineTo(obj.x + obj.radius, obj.y + obj.radius / 2);
          ctx.lineTo(obj.x - obj.radius, obj.y + obj.radius / 2);
          ctx.closePath();
          ctx.fillStyle = 'rgba(10, 15, 20, 0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)'; // Blue outline
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (obj.type === 'bush') {
          // Sci-fi Bush (Small circles)
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(5, 25, 15, 0.8)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(50, 255, 100, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // 5. Draw players
      const players = Array.from(state.players.values());
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

      // 6. Draw Fog Overlay (Radial Gradient centered on player)
      if (me) {
        const gradient = ctx.createRadialGradient(me.x, me.y, 100, me.x, me.y, 800);
        gradient.addColorStop(0, 'rgba(2, 2, 5, 0)');
        gradient.addColorStop(1, 'rgba(2, 2, 5, 0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(cameraX, cameraY, canvas.width, canvas.height);
      }

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

        {/* Action Buttons */}
        <div className="absolute bottom-12 right-6 pointer-events-auto opacity-70 flex gap-4">
          <button 
            onPointerDown={() => isSprinting.current = true} 
            onPointerUp={() => isSprinting.current = false}
            onPointerLeave={() => isSprinting.current = false}
            className="w-16 h-16 bg-blue-900/40 rounded-full border-2 border-blue-500/50 flex items-center justify-center text-blue-500 font-bold active:bg-blue-500/80 active:text-white shadow-[0_0_15px_rgba(0,0,255,0.3)] touch-none mt-4"
          >
            RUN
          </button>
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
