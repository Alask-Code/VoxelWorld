import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameAction = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sneak' | 'sprint' | 'inventory' | 'drop';

interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  effectsVolume: number;
  renderDistance: number;
  uiScale: number;
  reducedMotion: boolean;
  controls: Record<GameAction, string>;
  setNumber: (setting: 'masterVolume' | 'musicVolume' | 'effectsVolume' | 'uiScale', value: number) => void;
  setRenderDistance: (value: number) => void;
  setReducedMotion: (value: boolean) => void;
  setControl: (action: GameAction, key: string) => void;
}

const defaultControls: Record<GameAction, string> = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  sneak: 'ShiftLeft',
  sprint: 'ControlLeft',
  inventory: 'KeyE',
  drop: 'KeyQ'
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      masterVolume: 0.8,
      musicVolume: 0.6,
      effectsVolume: 0.8,
      renderDistance: 2,
      uiScale: 1,
      reducedMotion: false,
      controls: defaultControls,
      setNumber: (setting, value) => set({ [setting]: Math.max(0, Math.min(1, value)) }),
      setRenderDistance: (value) => set({ renderDistance: Math.max(2, Math.min(5, Math.round(value))) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setControl: (action, key) => set((state) => ({ controls: { ...state.controls, [action]: key } }))
    }),
    { name: 'voxelworld.settings.v1' }
  )
);
