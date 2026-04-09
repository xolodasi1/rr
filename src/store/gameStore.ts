import { create } from 'zustand';

export interface Player {
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

export interface ChatMessage {
  sender: string;
  text: string;
  isSystem: boolean;
}

interface GameState {
  players: Map<string, Player>;
  myId: string | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  setMyId: (id: string) => void;
  setConnected: (status: boolean) => void;
  initPlayers: (playersList: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  addChatMessage: (msg: ChatMessage) => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: new Map(),
  myId: null,
  chatMessages: [],
  isConnected: false,
  
  setMyId: (id) => set({ myId: id }),
  setConnected: (status) => set({ isConnected: status }),
  
  initPlayers: (playersList) => set((state) => {
    const newMap = new Map();
    playersList.forEach(p => newMap.set(p.id, p));
    return { players: newMap };
  }),
  
  addPlayer: (player) => set((state) => {
    const newMap = new Map(state.players);
    newMap.set(player.id, player);
    return { players: newMap };
  }),
  
  removePlayer: (id) => set((state) => {
    const newMap = new Map(state.players);
    newMap.delete(id);
    return { players: newMap };
  }),
  
  updatePlayer: (id, data) => set((state) => {
    const newMap = new Map(state.players);
    const player = newMap.get(id);
    if (player) {
      newMap.set(id, { ...player, ...data });
    }
    return { players: newMap };
  }),
  
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages.slice(-49), msg] // Keep last 50 messages
  })),
}));
