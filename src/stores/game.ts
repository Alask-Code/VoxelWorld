import { create } from 'zustand';
import type { StoredWorld, WorldSnapshot } from '../domain/world';

export type GameOverlay = 'none' | 'inventory' | 'crafting' | 'pause' | 'dead';

interface GameState {
  world: StoredWorld | null;
  snapshot: WorldSnapshot | null;
  overlay: GameOverlay;
  selectedSlot: number;
  oxygenTicks: number;
  submerged: boolean;
  miningProgress: number;
  setWorld: (world: StoredWorld) => void;
  setSnapshot: (snapshot: WorldSnapshot) => void;
  setOverlay: (overlay: GameOverlay) => void;
  setBreath: (oxygenTicks: number, submerged: boolean) => void;
  setMiningProgress: (progress: number) => void;
  selectSlot: (slot: number) => void;
  clearWorld: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  world: null,
  snapshot: null,
  overlay: 'none',
  selectedSlot: 0,
  oxygenTicks: 300,
  submerged: false,
  miningProgress: 0,
  setWorld: (world) => set({
    world,
    snapshot: world.snapshot,
    overlay: 'none',
    oxygenTicks: 300,
    submerged: false,
    miningProgress: 0
  }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setOverlay: (overlay) => set({ overlay }),
  setBreath: (oxygenTicks, submerged) => set({ oxygenTicks, submerged }),
  setMiningProgress: (progress) => {
    const miningProgress = Math.max(0, Math.min(1, progress));
    set((state) => state.miningProgress === miningProgress ? state : { miningProgress });
  },
  selectSlot: (slot) => set({ selectedSlot: Math.max(0, Math.min(8, slot)) }),
  clearWorld: () => set({
    world: null,
    snapshot: null,
    overlay: 'none',
    selectedSlot: 0,
    oxygenTicks: 300,
    submerged: false,
    miningProgress: 0
  })
}));
