import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

let socket: Socket | null = null;

export const initSocket = (playerName: string) => {
  if (socket) return socket;

  // In development, connect to the same host
  socket = io();

  socket.on('connect', () => {
    console.log('Connected to server');
    useGameStore.getState().setConnected(true);
    useGameStore.getState().setMyId(socket!.id as string);
    socket!.emit('join', playerName);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    useGameStore.getState().setConnected(false);
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

  socket.on('chatMessage', (msg) => {
    useGameStore.getState().addChatMessage(msg);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
