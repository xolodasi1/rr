import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;

  // Connect using websocket only to prevent polling ghost connections
  socket = io({ transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('Connected to server');
    useGameStore.getState().setConnected(true);
    useGameStore.getState().setMyId(socket!.id as string);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    useGameStore.getState().setConnected(false);
  });

  socket.on('worldsList', (worlds) => {
    useGameStore.getState().setWorlds(worlds);
  });

  socket.on('environment', (env) => {
    useGameStore.getState().setEnvironment(env);
  });

  socket.on('init', (players) => {
    useGameStore.getState().initPlayers(players);
  });

  socket.on('playerJoined', (player) => {
    useGameStore.getState().addPlayer(player);
  });

  socket.on('playerLeft', (id) => {
    useGameStore.getState().removePlayer(id);
  });

  socket.on('playerMoved', (data) => {
    useGameStore.getState().updatePlayer(data.id, { 
      x: data.x, 
      y: data.y, 
      direction: data.direction 
    });
  });

  socket.on('playerAttacked', (data) => {
    useGameStore.getState().updatePlayer(data.id, { isAttacking: true });
    setTimeout(() => {
      useGameStore.getState().updatePlayer(data.id, { isAttacking: false });
    }, 300);
  });

  socket.on('playerHit', (data) => {
    useGameStore.getState().updatePlayer(data.id, { hp: data.hp });
  });

  socket.on('playerDied', (data) => {
    useGameStore.getState().updatePlayer(data.id, { hp: data.hp, x: data.x, y: data.y });
  });

  socket.on('chatMessage', (msg) => {
    useGameStore.getState().addChatMessage(msg);
  });

  socket.on('topPlayers', (players) => {
    useGameStore.getState().setTopPlayers(players);
  });

  return socket;
};

export const joinWorld = (name: string, worldId: string) => {
  if (socket) {
    socket.emit('joinWorld', { name, worldId });
  }
};

export const createWorld = (name: string) => {
  if (socket) {
    socket.emit('createWorld', name);
  }
};

export const leaveWorld = () => {
  if (socket) {
    socket.emit('leaveWorld');
    useGameStore.getState().leaveWorld();
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
