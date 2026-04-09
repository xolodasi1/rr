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
}

interface World {
  id: string;
  name: string;
}

const players = new Map<string, Player>();
const worlds = new Map<string, World>();

// Default world
worlds.set('floor-1', { id: 'floor-1', name: 'Aincrad - Floor 1' });

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
      worlds.set(id, { id, name });
      io.emit("worldsList", getWorldsList());
    });

    socket.on("joinWorld", (data: { name: string, worldId: string }) => {
      const { name, worldId } = data;
      if (!worlds.has(worldId) || players.has(socket.id)) return;

      socket.join(worldId);

      const newPlayer: Player = {
        id: socket.id,
        worldId,
        name: name || `Player_${Math.floor(Math.random() * 1000)}`,
        x: Math.floor(Math.random() * 800) + 100,
        y: Math.floor(Math.random() * 600) + 100,
        level: 1,
        hp: 100,
        maxHp: 100,
        direction: 'down',
        isAttacking: false,
      };
      players.set(socket.id, newPlayer);
      
      // Send current state to the new player (only players in this world)
      const worldPlayers = Array.from(players.values()).filter(p => p.worldId === worldId);
      socket.emit("init", worldPlayers);
      
      // Broadcast new player to others in the world
      socket.to(worldId).emit("playerJoined", newPlayer);
      
      // System chat message
      io.to(worldId).emit("chatMessage", { sender: "System", text: `${newPlayer.name} has linked to ${worlds.get(worldId)?.name}.`, isSystem: true });
      
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

        for (const [targetId, target] of players.entries()) {
          if (targetId !== socket.id && target.worldId === attacker.worldId) {
            const dx = target.x - attacker.x;
            const dy = target.y - attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Simple directional check
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
                
                // Notify target of respawn/death
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
  });

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
