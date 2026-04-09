import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../services/socketService';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Local state for smooth movement
  const keys = useRef<{ [key: string]: boolean }>({});
  const isSprinting = useRef(false);
  
  // Particles for atmosphere
  const particlesRef = useRef(Array.from({length: 80}, () => ({
    x: Math.random() * 2000,
    y: Math.random() * 2000,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5 - 0.2,
    size: Math.random() * 2 + 1,
    life: Math.random() * Math.PI * 2
  })));
  
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
            if (obj.type === 'altar' || obj.type === 'path' || obj.type === 'river') continue; // Can walk on these
            
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

      // Clear canvas (Soft Anime Grass Base)
      ctx.fillStyle = '#9ad182'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Parallax Background (Distant Hills/Forest)
      ctx.save();
      // Move slower than camera
      ctx.translate(-cameraX * 0.3, -cameraY * 0.3);
      
      // Distant hills
      ctx.fillStyle = '#8bc273';
      ctx.beginPath(); ctx.arc(500, 500, 1200, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(1500, 800, 1000, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(-200, 1200, 1400, 0, Math.PI*2); ctx.fill();
      
      ctx.restore();

      // Main World Translation
      ctx.save();
      ctx.translate(-cameraX, -cameraY);

      // 4. Draw Environment (Ground Layers First)
      for (const obj of env) {
        if (me && (Math.abs(obj.x - me.x) > 1000 || Math.abs(obj.y - me.y) > 800)) continue;

        if (obj.type === 'path') {
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#d4c4a1'; // Soft dirt path
          ctx.fill();
        } else if (obj.type === 'river' && obj.points) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            const xc = (obj.points[i].x + obj.points[i - 1].x) / 2;
            const yc = (obj.points[i].y + obj.points[i - 1].y) / 2;
            ctx.quadraticCurveTo(obj.points[i - 1].x, obj.points[i - 1].y, xc, yc);
          }
          ctx.lineTo(obj.points[obj.points.length - 1].x, obj.points[obj.points.length - 1].y);
          
          // River water (Soft blue)
          ctx.strokeStyle = '#7bc6e8';
          ctx.lineWidth = obj.radius;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          
          // River highlights
          ctx.strokeStyle = '#aee2f5';
          ctx.lineWidth = obj.radius * 0.3;
          ctx.stroke();
        } else if (obj.type === 'altar') {
          // Altar base
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
          ctx.fillStyle = '#e0e6ed';
          ctx.fill();
          ctx.strokeStyle = '#b0bec5';
          ctx.lineWidth = 4;
          ctx.stroke();
          
          // Inner circle
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius - 15, 0, Math.PI * 2);
          ctx.strokeStyle = '#81d4fa';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 5. Sort Depth Layers (Players, Trees, Houses, NPCs)
      const players = Array.from(state.players.values());
      const depthObjects = [
        ...env.filter(e => e.type !== 'path' && e.type !== 'river' && e.type !== 'altar').map(e => ({ ...e, isPlayer: false })),
        ...players.map(p => ({ ...p, isPlayer: true }))
      ];
      
      depthObjects.sort((a, b) => a.y - b.y);

      // Draw Depth Layers
      for (const obj of depthObjects) {
        if (me && (Math.abs(obj.x - me.x) > 1000 || Math.abs(obj.y - me.y) > 800)) continue;

        if (obj.isPlayer) {
          const player = obj as any;
          const isMe = player.id === myId;
          const color = isMe ? '#4caf50' : '#ff9800'; // Green for me, Orange for others
          
          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.beginPath();
          ctx.ellipse(player.x, player.y + 12, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Attack slash
          if (player.isAttacking) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            
            let angle = 0;
            if (player.direction === 'right') angle = 0;
            if (player.direction === 'down') angle = Math.PI / 2;
            if (player.direction === 'left') angle = Math.PI;
            if (player.direction === 'up') angle = -Math.PI / 2;
            
            ctx.arc(player.x, player.y, 25, angle - Math.PI/3, angle + Math.PI/3);
            ctx.stroke();
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Anime Player Body
          ctx.beginPath();
          ctx.arc(player.x, player.y - 5, 10, 0, Math.PI * 2); // Body
          ctx.fillStyle = '#f5f5f5'; // White shirt/armor
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#cfcfcf';
          ctx.stroke();

          // Head
          ctx.beginPath();
          ctx.arc(player.x, player.y - 18, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ffe0bd'; // Skin tone
          ctx.fill();

          // Hair
          ctx.beginPath();
          ctx.arc(player.x, player.y - 20, 9, Math.PI, 0);
          ctx.fillStyle = isMe ? '#333' : '#6b4c9a';
          ctx.fill();

          // Direction Indicator (Weapon/Hand)
          ctx.beginPath();
          let px = player.x;
          let py = player.y - 5;
          const offset = 12;
          if (player.direction === 'up') py -= offset;
          if (player.direction === 'down') py += offset;
          if (player.direction === 'left') px -= offset;
          if (player.direction === 'right') px += offset;
          
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#b0bec5'; // Sword/Hand color
          ctx.fill();

          // Nameplate
          ctx.fillStyle = '#555';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(player.name, player.x, player.y - 35);

          // HP bar
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(player.x - 15, player.y - 30, 30, 3);
          ctx.fillStyle = '#8bc34a';
          ctx.fillRect(player.x - 15, player.y - 30, 30 * (player.hp / player.maxHp), 3);

        } else {
          // Environment Objects
          if (obj.type === 'tree') {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath(); ctx.ellipse(obj.x, obj.y + obj.radius*0.8, obj.radius*0.8, obj.radius*0.3, 0, 0, Math.PI * 2); ctx.fill();
            
            // Trunk
            ctx.fillStyle = '#7a5c43';
            ctx.fillRect(obj.x - obj.radius*0.15, obj.y, obj.radius*0.3, obj.radius);
            
            // Leaves (Soft overlapping circles)
            ctx.fillStyle = '#6ebd52';
            ctx.beginPath(); ctx.arc(obj.x, obj.y - obj.radius*0.2, obj.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#7cb369';
            ctx.beginPath(); ctx.arc(obj.x - obj.radius*0.4, obj.y - obj.radius*0.5, obj.radius*0.8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#8bd175';
            ctx.beginPath(); ctx.arc(obj.x + obj.radius*0.4, obj.y - obj.radius*0.6, obj.radius*0.7, 0, Math.PI*2); ctx.fill();
            
          } else if (obj.type === 'rock') {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath(); ctx.ellipse(obj.x, obj.y + obj.radius*0.5, obj.radius, obj.radius*0.4, 0, 0, Math.PI * 2); ctx.fill();
            
            // Rock body
            ctx.fillStyle = '#a8b0b5';
            ctx.beginPath();
            ctx.moveTo(obj.x - obj.radius, obj.y + obj.radius*0.5);
            ctx.lineTo(obj.x - obj.radius*0.5, obj.y - obj.radius);
            ctx.lineTo(obj.x + obj.radius*0.8, obj.y - obj.radius*0.5);
            ctx.lineTo(obj.x + obj.radius, obj.y + obj.radius*0.5);
            ctx.closePath();
            ctx.fill();
            
            // Highlight
            ctx.fillStyle = '#c5ccd1';
            ctx.beginPath();
            ctx.moveTo(obj.x - obj.radius*0.8, obj.y + obj.radius*0.3);
            ctx.lineTo(obj.x - obj.radius*0.4, obj.y - obj.radius*0.8);
            ctx.lineTo(obj.x + obj.radius*0.2, obj.y - obj.radius*0.2);
            ctx.closePath();
            ctx.fill();

          } else if (obj.type === 'bush') {
            ctx.fillStyle = '#5c9e47';
            ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#6ebd52';
            ctx.beginPath(); ctx.arc(obj.x - obj.radius*0.2, obj.y - obj.radius*0.2, obj.radius*0.6, 0, Math.PI * 2); ctx.fill();

          } else if (obj.type === 'house') {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.fillRect(obj.x - obj.radius, obj.y - obj.radius*0.2, obj.radius*2, obj.radius*1.2);
            
            // Walls
            ctx.fillStyle = '#fdfdfd';
            ctx.fillRect(obj.x - obj.radius, obj.y - obj.radius, obj.radius*2, obj.radius*2);
            
            // Door
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(obj.x - 10, obj.y + obj.radius - 30, 20, 30);
            
            // Roof
            ctx.fillStyle = '#d35400'; // Orange/Brown roof
            ctx.beginPath();
            ctx.moveTo(obj.x - obj.radius - 10, obj.y - obj.radius);
            ctx.lineTo(obj.x, obj.y - obj.radius - 40);
            ctx.lineTo(obj.x + obj.radius + 10, obj.y - obj.radius);
            ctx.closePath();
            ctx.fill();
            
          } else if (obj.type === 'npc') {
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
            ctx.beginPath(); ctx.ellipse(obj.x, obj.y + 12, 10, 4, 0, 0, Math.PI * 2); ctx.fill();

            // NPC Body
            ctx.beginPath(); ctx.arc(obj.x, obj.y - 5, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#e1bee7'; // Purple-ish clothes
            ctx.fill();

            // Head
            ctx.beginPath(); ctx.arc(obj.x, obj.y - 18, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffe0bd';
            ctx.fill();

            // Hair
            ctx.beginPath(); ctx.arc(obj.x, obj.y - 20, 9, Math.PI, 0);
            ctx.fillStyle = '#ff9800'; // Orange hair
            ctx.fill();
            
            // Nameplate
            ctx.fillStyle = '#777';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Villager', obj.x, obj.y - 32);
          }
        }
      }

      // 6. Atmosphere & Lighting (Particles)
      ctx.globalCompositeOperation = 'screen';
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.life += 0.05;
        
        // Wrap around
        if (p.x < cameraX) p.x = cameraX + canvas.width;
        if (p.x > cameraX + canvas.width) p.x = cameraX;
        if (p.y < cameraY) p.y = cameraY + canvas.height;
        if (p.y > cameraY + canvas.height) p.y = cameraY;

        const alpha = (Math.sin(p.life) + 1) / 2 * 0.8; // Pulsing effect
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 255, 200, ${alpha * 0.5})`;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#aaffaa';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalCompositeOperation = 'source-over';

      // Add soft bloom/flare effect over the whole screen
      ctx.globalCompositeOperation = 'screen';
      const screenGradient = ctx.createRadialGradient(
        cameraX + canvas.width / 2, cameraY + canvas.height / 2, 0,
        cameraX + canvas.width / 2, cameraY + canvas.height / 2, canvas.width
      );
      screenGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      screenGradient.addColorStop(1, 'rgba(150, 255, 150, 0.15)');
      ctx.fillStyle = screenGradient;
      ctx.fillRect(cameraX, cameraY, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      // 7. Light Rays (Sunlight through trees)
      ctx.globalCompositeOperation = 'screen';
      const rayGradient = ctx.createLinearGradient(cameraX, cameraY, cameraX + 300, cameraY + canvas.height);
      rayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      rayGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = rayGradient;
      ctx.beginPath();
      ctx.moveTo(cameraX + 100, cameraY);
      ctx.lineTo(cameraX + 400, cameraY);
      ctx.lineTo(cameraX + 200, cameraY + canvas.height);
      ctx.lineTo(cameraX - 100, cameraY + canvas.height);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(cameraX + 600, cameraY);
      ctx.lineTo(cameraX + 800, cameraY);
      ctx.lineTo(cameraX + 500, cameraY + canvas.height);
      ctx.lineTo(cameraX + 300, cameraY + canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      ctx.restore();
      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#9ad182] overflow-hidden touch-none">
      <canvas 
        ref={canvasRef} 
        width={1024} 
        height={768}
        className="w-full h-full object-cover"
      />

      {/* Mobile Controls Overlay */}
      <div className="absolute inset-0 pointer-events-none md:hidden z-50">
        {/* D-Pad */}
        <div className="absolute bottom-10 left-6 w-32 h-32 pointer-events-auto opacity-60">
          <div className="relative w-full h-full bg-white/30 rounded-full border border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <button 
              onPointerDown={() => keys.current['w'] = true} 
              onPointerUp={() => keys.current['w'] = false}
              onPointerLeave={() => keys.current['w'] = false}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-white/40 rounded-t-full active:bg-white/70 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['s'] = true} 
              onPointerUp={() => keys.current['s'] = false}
              onPointerLeave={() => keys.current['s'] = false}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-white/40 rounded-b-full active:bg-white/70 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['a'] = true} 
              onPointerUp={() => keys.current['a'] = false}
              onPointerLeave={() => keys.current['a'] = false}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/40 rounded-l-full active:bg-white/70 touch-none" 
            />
            <button 
              onPointerDown={() => keys.current['d'] = true} 
              onPointerUp={() => keys.current['d'] = false}
              onPointerLeave={() => keys.current['d'] = false}
              className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/40 rounded-r-full active:bg-white/70 touch-none" 
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/80 rounded-full pointer-events-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-12 right-6 pointer-events-auto opacity-70 flex gap-4">
          <button 
            onPointerDown={() => isSprinting.current = true} 
            onPointerUp={() => isSprinting.current = false}
            onPointerLeave={() => isSprinting.current = false}
            className="w-16 h-16 bg-blue-400/40 rounded-full border-2 border-blue-300/60 flex items-center justify-center text-blue-700 font-bold active:bg-blue-400/80 active:text-white shadow-[0_0_15px_rgba(100,150,255,0.4)] touch-none mt-4"
          >
            RUN
          </button>
          <button 
            onPointerDown={handleAttack} 
            className="w-20 h-20 bg-green-400/40 rounded-full border-2 border-green-300/60 flex items-center justify-center text-green-700 font-bold active:bg-green-400/80 active:text-white shadow-[0_0_15px_rgba(100,255,100,0.4)] touch-none"
          >
            ATK
          </button>
        </div>
      </div>
    </div>
  );
};
