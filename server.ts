import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

// --- Game State ---
interface Player {
  id: string;
  x: number;
  y: number;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  direction: 'up' | 'down' | 'left' | 'right';
  isAttacking: boolean;
}

const players = new Map<string, Player>();

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
    console.log(`Player connected: ${socket.id}`);

    socket.on("join", (name: string) => {
      const newPlayer: Player = {
        id: socket.id,
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
      
      // Send current state to the new player
      socket.emit("init", Array.from(players.values()));
      
      // Broadcast new player to others
      socket.broadcast.emit("playerJoined", newPlayer);
      
      // System chat message
      io.emit("chatMessage", { sender: "System", text: `${newPlayer.name} has entered the simulation.`, isSystem: true });
    });

    socket.on("move", (data: { x: number, y: number, direction: 'up' | 'down' | 'left' | 'right' }) => {
      const player = players.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.direction = data.direction;
        // Broadcast movement to others
        socket.broadcast.emit("playerMoved", { id: socket.id, x: data.x, y: data.y, direction: data.direction });
      }
    });

    socket.on("attack", () => {
      const player = players.get(socket.id);
      if (player) {
        player.isAttacking = true;
        socket.broadcast.emit("playerAttacked", { id: socket.id });
        
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
        io.emit("chatMessage", { sender: player.name, text, isSystem: false });
      }
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);
      const player = players.get(socket.id);
      if (player) {
        io.emit("chatMessage", { sender: "System", text: `${player.name} has disconnected.`, isSystem: true });
        players.delete(socket.id);
        io.emit("playerLeft", socket.id);
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
