import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

// --- Game State ---
interface Player {
  id: string;
  worldId: string;
  x: number;
  y: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isAttacking: boolean;
  connectedAt: number;
}

interface EnvironmentObject {
  id: string;
  type: 'tree' | 'rock' | 'bush' | 'altar' | 'river' | 'house' | 'path' | 'npc';
  x: number;
  y: number;
  radius: number;
  points?: {x: number, y: number}[];
}

interface Mob {
  id: string;
  worldId: string;
  type: 'villager' | 'knight' | 'monster';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  targetX?: number;
  targetY?: number;
  isDead?: boolean;
  targetPlayerId?: string;
  isFleeing?: boolean;
  lastAttackTime?: number;
}

interface World {
  id: string;
  name: string;
  environment: EnvironmentObject[];
}

const players = new Map<string, Player>();
const worlds = new Map<string, World>();
const mobs = new Map<string, Mob>();

function generateEnvironment(): EnvironmentObject[] {
  const env: EnvironmentObject[] = [];
  
  // Generate Village Area (Center)
  // Village Paths
  env.push({ id: 'path_main', type: 'path', x: 1000, y: 1000, radius: 250 });
  env.push({ id: 'path_branch1', type: 'path', x: 800, y: 1000, radius: 100 });
  env.push({ id: 'path_branch2', type: 'path', x: 1200, y: 1000, radius: 100 });
  
  // Altar in the center of the village
  env.push({ id: 'altar_1', type: 'altar', x: 1000, y: 1000, radius: 40 });
  
  // Houses around the village
  env.push({ id: 'house_1', type: 'house', x: 850, y: 850, radius: 60 });
  env.push({ id: 'house_2', type: 'house', x: 1150, y: 850, radius: 60 });
  env.push({ id: 'house_3', type: 'house', x: 850, y: 1150, radius: 60 });
  env.push({ id: 'house_4', type: 'house', x: 1150, y: 1150, radius: 60 });
  env.push({ id: 'house_5', type: 'house', x: 1000, y: 750, radius: 70 });

  // Generate Rivers
  for (let r = 0; r < 2; r++) {
    const riverPoints = [];
    let currentX = Math.random() * 2000;
    let currentY = Math.random() * 2000;
    
    // Random direction for the river
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    for (let i = 0; i < 15; i++) {
      riverPoints.push({ x: currentX, y: currentY });
      currentX += dx * 150 + (Math.random() - 0.5) * 100;
      currentY += dy * 150 + (Math.random() - 0.5) * 100;
    }
    env.push({ id: `river_${r}`, type: 'river', x: 0, y: 0, radius: 30 + Math.random() * 20, points: riverPoints });
  }

  // Generate trees and rocks (Forest outside village)
  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 2000;
    const y = Math.random() * 2000;
    
    // Don't spawn inside the village radius
    if (Math.hypot(x - 1000, y - 1000) < 350) continue;
    
    const type = Math.random() > 0.85 ? 'rock' : (Math.random() > 0.4 ? 'tree' : 'bush');
    const radius = type === 'tree' ? 35 : (type === 'rock' ? 20 : 15);
    env.push({ id: `env_${i}`, type, x, y, radius });
  }
  return env;
}

function generateMobs(worldId: string) {
  // Villagers in village
  for (let i = 0; i < 5; i++) {
    const id = `villager_${worldId}_${i}`;
    mobs.set(id, {
      id, worldId, type: 'villager',
      x: 900 + Math.random() * 200,
      y: 900 + Math.random() * 200,
      hp: 100, maxHp: 100,
      isDead: false
    });
  }
  // Knights (Guards) in village
  for (let i = 0; i < 3; i++) {
    const id = `knight_${worldId}_${i}`;
    mobs.set(id, {
      id, worldId, type: 'knight',
      x: 950 + Math.random() * 100,
      y: 950 + Math.random() * 100,
      hp: 200, maxHp: 200,
      isDead: false
    });
  }
  // Monsters in forest
  for (let i = 0; i < 15; i++) {
    const id = `monster_${worldId}_${i}`;
    let x = Math.random() * 2000;
    let y = Math.random() * 2000;
    if (Math.hypot(x - 1000, y - 1000) < 400) {
      x += 500; // push out of village
    }
    mobs.set(id, {
      id, worldId, type: 'monster',
      x, y,
      hp: 50, maxHp: 50,
      isDead: false
    });
  }
}

// Default world
worlds.set('floor-1', { id: 'floor-1', name: 'Aincrad - Floor 1', environment: generateEnvironment() });
generateMobs('floor-1');

function getWorldsList() {
  const list = [];
  for (const world of worlds.values()) {
    let count = 0;
    for (const p of players.values()) {
      if (p.worldId === world.id) count++;
    }
    list.push({ ...world, playerCount: count });
  }
  return list;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // API routes
  app.use(express.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial worlds list
    socket.emit("worldsList", getWorldsList());

    socket.on("createWorld", (name: string) => {
      const id = 'world_' + Math.random().toString(36).substring(2, 9);
      worlds.set(id, { id, name, environment: generateEnvironment() });
      generateMobs(id);
      io.emit("worldsList", getWorldsList());
    });

    socket.on("joinWorld", (data: { name: string, worldId: string }) => {
      const { name, worldId } = data;
      const world = worlds.get(worldId);
      if (!world || players.has(socket.id)) return;

      socket.join(worldId);

      const newPlayer: Player = {
        id: socket.id,
        worldId,
        name: name || `Player_${Math.floor(Math.random() * 1000)}`,
        x: 1000, // Spawn near altar
        y: 1100,
        level: 1,
        hp: 100,
        maxHp: 100,
        direction: 'up',
        isAttacking: false,
        connectedAt: Date.now(),
      };
      players.set(socket.id, newPlayer);
      
      // Send current state to the new player
      const worldPlayers = Array.from(players.values()).filter(p => p.worldId === worldId);
      const worldMobs = Array.from(mobs.values()).filter(m => m.worldId === worldId && !m.isDead);
      socket.emit("init", worldPlayers);
      socket.emit("environment", world.environment);
      socket.emit("mobsInit", worldMobs);
      
      // Broadcast new player to others in the world
      socket.to(worldId).emit("playerJoined", newPlayer);
      
      // System chat message
      io.to(worldId).emit("chatMessage", { sender: "System", text: `${newPlayer.name} has linked to ${world.name}.`, isSystem: true });
      
      // Update world counts for everyone
      io.emit("worldsList", getWorldsList());
    });

    socket.on("move", (data: { x: number, y: number, direction: 'up' | 'down' | 'left' | 'right' }) => {
      const player = players.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        // Broadcast movement to others in the same world
        socket.to(player.worldId).emit("playerMoved", { id: socket.id, x: data.x, y: data.y, direction: data.direction });
      }
    });

    socket.on("attack", () => {
      const attacker = players.get(socket.id);
      if (attacker && !attacker.isAttacking) {
        attacker.isAttacking = true;
        socket.to(attacker.worldId).emit("playerAttacked", { id: socket.id });
        
        // Calculate damage
        const ATTACK_RANGE = 60;
        const DAMAGE = 15;

        // Check players
        for (const [targetId, target] of players.entries()) {
          if (targetId !== socket.id && target.worldId === attacker.worldId) {
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let isFacing = false;
            if (attacker.direction === 'up' && dy < 0 && Math.abs(dx) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'down' && dy > 0 && Math.abs(dx) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'left' && dx < 0 && Math.abs(dy) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'right' && dx > 0 && Math.abs(dy) < ATTACK_RANGE) isFacing = true;

            if (distance < ATTACK_RANGE && isFacing) {
              target.hp -= DAMAGE;
              if (target.hp <= 0) {
                target.hp = target.maxHp; // Respawn
                target.x = Math.floor(Math.random() * 800) + 100;
                target.y = Math.floor(Math.random() * 600) + 100;
                
                io.to(attacker.worldId).emit("chatMessage", { 
                  sender: "System", 
                  text: `${target.name} was defeated by ${attacker.name}.`, 
                  isSystem: true 
                });
                
                io.to(attacker.worldId).emit("playerDied", { 
                  id: targetId, 
                  hp: target.hp, 
                  x: target.x, 
                  y: target.y 
                });
              } else {
                io.to(attacker.worldId).emit("playerHit", { 
                  id: targetId, 
                  hp: target.hp 
                });
              }
            }
          }
        }

        // Check mobs
        for (const [mobId, mob] of mobs.entries()) {
          if (mob.worldId === attacker.worldId && !mob.isDead) {
            const dx = mob.x - attacker.x;
            const dy = mob.y - attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let isFacing = false;
            if (attacker.direction === 'up' && dy < 0 && Math.abs(dx) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'down' && dy > 0 && Math.abs(dx) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'left' && dx < 0 && Math.abs(dy) < ATTACK_RANGE) isFacing = true;
            if (attacker.direction === 'right' && dx > 0 && Math.abs(dy) < ATTACK_RANGE) isFacing = true;

            if (distance < ATTACK_RANGE && isFacing) {
              mob.hp -= DAMAGE;
              
              if (mob.hp > 0) {
                if (mob.type === 'villager') {
                  mob.isFleeing = true;
                  mob.targetPlayerId = socket.id;
                  // Alert nearby knights
                  for (const guard of mobs.values()) {
                    if (guard.worldId === attacker.worldId && guard.type === 'knight' && !guard.isDead) {
                      if (Math.hypot(guard.x - mob.x, guard.y - mob.y) < 500) {
                        guard.targetPlayerId = socket.id;
                      }
                    }
                  }
                } else if (mob.type === 'knight' || mob.type === 'monster') {
                  mob.targetPlayerId = socket.id;
                }
                io.to(attacker.worldId).emit("mobHit", { id: mobId, hp: mob.hp });
              }

              if (mob.hp <= 0) {
                mob.isDead = true;
                mob.targetPlayerId = undefined;
                mob.isFleeing = false;
                io.to(attacker.worldId).emit("mobDied", mobId);
                
                // Respawn logic
                setTimeout(() => {
                  mob.hp = mob.maxHp;
                  mob.isDead = false;
                  // Try spawning inside village for village mobs
                  if (mob.type === 'villager' || mob.type === 'knight') {
                    mob.x = 800 + Math.random() * 400;
                    mob.y = 800 + Math.random() * 400;
                  } else {
                    mob.x = Math.random() * 2000;
                    mob.y = Math.random() * 2000;
                  }
                  io.to(mob.worldId).emit("mobRespawned", mob);
                }, 10000);
              }
            }
          }
        }

        // Reset attack state after a short delay
        setTimeout(() => {
          if (players.has(socket.id)) {
            players.get(socket.id)!.isAttacking = false;
          }
        }, 300);
      }
    });

    socket.on("chatMessage", (text: string) => {
      const player = players.get(socket.id);
      if (player) {
        io.to(player.worldId).emit("chatMessage", { sender: player.name, text, isSystem: false });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      const player = players.get(socket.id);
      if (player) {
        io.to(player.worldId).emit("chatMessage", { sender: "System", text: `${player.name} has disconnected.`, isSystem: true });
        players.delete(socket.id);
        io.to(player.worldId).emit("playerLeft", socket.id);
        io.emit("worldsList", getWorldsList()); // Update counts
      }
    });

    socket.on("leaveWorld", () => {
      const player = players.get(socket.id);
      if (player) {
        io.to(player.worldId).emit("chatMessage", { sender: "System", text: `${player.name} has disconnected.`, isSystem: true });
        players.delete(socket.id);
        socket.leave(player.worldId);
        io.to(player.worldId).emit("playerLeft", socket.id);
        io.emit("worldsList", getWorldsList());
      }
    });
  });

  // Broadcast top players every 5 seconds
  setInterval(() => {
    const allPlayers = Array.from(players.values());
    const top = allPlayers.map(p => ({
      name: p.name,
      time: Math.floor((Date.now() - p.connectedAt) / 1000)
    })).sort((a, b) => b.time - a.time).slice(0, 10);
    
    io.emit('topPlayers', top);
  }, 5000);

  // Mob AI Loop
  setInterval(() => {
    const updatesByWorld = new Map<string, any[]>();

    for (const mob of mobs.values()) {
      if (mob.isDead) continue;

      let speed = mob.type === 'villager' ? 0.8 : (mob.type === 'knight' ? 1.4 : 1.2);
      let dx = 0, dy = 0, dist = 0;

      if (mob.targetPlayerId) {
        const target = players.get(mob.targetPlayerId);
        if (!target || target.worldId !== mob.worldId || target.hp <= 0) {
          mob.targetPlayerId = undefined;
          mob.isFleeing = false;
        } else {
          dx = target.x - mob.x;
          dy = target.y - mob.y;
          dist = Math.hypot(dx, dy);

          if (mob.type === 'villager') {
            if (dist > 600) {
              mob.targetPlayerId = undefined;
              mob.isFleeing = false;
            } else {
              // Run AWAY
              speed = 1.8;
              mob.targetX = mob.x - dx;
              mob.targetY = mob.y - dy;
              // Keep in bounds
              mob.targetX = Math.max(100, Math.min(1900, mob.targetX));
              mob.targetY = Math.max(100, Math.min(1900, mob.targetY));
            }
          } else {
            // Knight or Monster
            if (dist > 800) {
              mob.targetPlayerId = undefined;
            } else if (dist < 40) {
              // ATTACK
              speed = 0;
              const now = Date.now();
              if (!mob.lastAttackTime || now - mob.lastAttackTime > 1500) {
                mob.lastAttackTime = now;
                const damageDealt = mob.type === 'knight' ? 30 : 15;
                target.hp -= damageDealt;
                
                if (target.hp <= 0) {
                  target.hp = target.maxHp;
                  target.x = 1000; target.y = 1000; // Return to altar
                  io.to(mob.worldId).emit("chatMessage", { sender: "System", text: `${target.name} was slain by a ${mob.type}.`, isSystem: true });
                  io.to(mob.worldId).emit("playerDied", { id: target.id, hp: target.hp, x: target.x, y: target.y });
                  mob.targetPlayerId = undefined;
                } else {
                  io.to(mob.worldId).emit("playerHit", { id: target.id, hp: target.hp });
                }
              }
            } else {
              // Chase
              speed = mob.type === 'knight' ? 2.0 : 1.6;
              mob.targetX = target.x;
              mob.targetY = target.y;
            }
          }
        }
      }

      // Random Roaming
      if (!mob.targetPlayerId && (!mob.targetX || Math.random() < 0.02)) {
        mob.targetX = mob.x + (Math.random() - 0.5) * 300;
        mob.targetY = mob.y + (Math.random() - 0.5) * 300;
        mob.targetX = Math.max(100, Math.min(1900, mob.targetX));
        mob.targetY = Math.max(100, Math.min(1900, mob.targetY));
      }

      // Apply movement
      if (mob.targetX && mob.targetY) {
        dx = mob.targetX - mob.x;
        dy = mob.targetY - mob.y;
        dist = Math.hypot(dx, dy);
        
        if (dist > 5) {
          mob.x += (dx / dist) * speed;
          mob.y += (dy / dist) * speed;
          
          if (!updatesByWorld.has(mob.worldId)) updatesByWorld.set(mob.worldId, []);
          updatesByWorld.get(mob.worldId)!.push({ id: mob.id, x: mob.x, y: mob.y });
        } else if (!mob.targetPlayerId) {
          mob.targetX = undefined;
          mob.targetY = undefined;
        }
      }
    }

    // Broadcast updates per world
    for (const [worldId, updates] of updatesByWorld.entries()) {
      if (updates.length > 0) {
        io.to(worldId).emit("mobsUpdate", updates);
      }
    }
  }, 100);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
