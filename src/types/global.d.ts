import type { Difficulty, GameMode, StoredWorld, WorldManifest, WorldSnapshot } from '../domain/world';

export interface GameWorldApi {
  listWorlds: () => Promise<WorldManifest[]>;
  createWorld: (world: StoredWorld) => Promise<WorldManifest>;
  loadWorld: (id: string) => Promise<StoredWorld>;
  saveWorld: (id: string, snapshot: WorldSnapshot) => Promise<void>;
  renameWorld: (id: string, name: string) => Promise<void>;
  deleteWorld: (id: string) => Promise<void>;
  closeApp: () => Promise<void>;
}

declare global {
  interface Window {
    gameApi?: GameWorldApi;
  }
}

export type WorldOptions = {
  name: string;
  seed: string;
  mode: GameMode;
  difficulty: Difficulty;
  structures: boolean;
};
