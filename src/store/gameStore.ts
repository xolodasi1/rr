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

export interface WorldInfo {
  id: string;
  name: string;
  playerCount: number;
}

export interface EnvironmentObject {
  id: string;
  type: 'tree' | 'rock' | 'bush' | 'altar' | 'river' | 'house' | 'path' | 'npc';
  x: number;
  y: number;
  radius: number;
  points?: {x: number, y: number}[];
}

export interface Mob {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

interface GameState {
  players: Map<string, Player>;
  myId: string | null;
  chatMessages: ChatMessage[];
  isConnected: boolean;
  worlds: WorldInfo[];
  currentWorld: WorldInfo | null;
  isChatOpen: boolean;
  myStamina: number;
  maxStamina: number;
  environment: EnvironmentObject[];
  mobs: Map<string, Mob>;
  
  setMyId: (id: string) => void;
  setConnected: (status: boolean) => void;
  setWorlds: (worlds: WorldInfo[]) => void;
  setCurrentWorld: (world: WorldInfo | null) => void;
  toggleChat: () => void;
  setStamina: (stamina: number) => void;
  setEnvironment: (env: EnvironmentObject[]) => void;
  
  initPlayers: (playersList: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  
  initMobs: (mobsList: Mob[]) => void;
  updateMob: (id: string, data: Partial<Mob>) => void;
  removeMob: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: new Map(),
  myId: null,
  chatMessages: [],
  isConnected: false,
  worlds: [],
  currentWorld: null,
  isChatOpen: true,
  myStamina: 100,
  maxStamina: 100,
  environment: [],
  mobs: new Map(),
  
  setMyId: (id) => set({ myId: id }),
  setConnected: (status) => set({ isConnected: status }),
  setWorlds: (worlds) => set({ worlds }),
  setCurrentWorld: (world) => set({ currentWorld: world }),
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  setStamina: (stamina) => set({ myStamina: stamina }),
  setEnvironment: (env) => set({ environment: env }),
  
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

  initMobs: (mobsList) => set((state) => {
    const newMap = new Map();
    mobsList.forEach(m => newMap.set(m.id, m));
    return { mobs: newMap };
  }),

  updateMob: (id, data) => set((state) => {
    const newMap = new Map(state.mobs);
    const mob = newMap.get(id);
    if (mob) {
      newMap.set(id, { ...mob, ...data });
    }
    return { mobs: newMap };
  }),

  removeMob: (id) => set((state) => {
    const newMap = new Map(state.mobs);
    newMap.delete(id);
    return { mobs: newMap };
  })
}));
