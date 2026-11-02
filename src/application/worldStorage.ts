import { findSpawn, createInitialSnapshot, parseSeed, WORLD_FORMAT_VERSION } from '../domain/world';
import type {
  Difficulty,
  GameMode,
  StoredWorld,
  WorldManifest,
  WorldSnapshot
} from '../domain/world';

const STORAGE_KEY = 'voxelworld.worlds.v1';

export interface NewWorldOptions {
  name: string;
  seed: string;
  mode: GameMode;
  difficulty: Difficulty;
  structures: boolean;
}

function assertWorldName(name: string): string {
  const normalized = name.trim();
  if (normalized.length < 1 || normalized.length > 32) {
    throw new Error('O nome do mundo deve ter entre 1 e 32 caracteres.');
  }
  return normalized;
}

function localWorlds(): StoredWorld[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('A lista de mundos locais está corrompida.');
  }
  if (!Array.isArray(value)) throw new Error('A lista de mundos locais tem um formato inválido.');
  return value as StoredWorld[];
}

function saveLocalWorlds(worlds: StoredWorld[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
}

export async function listWorlds(): Promise<WorldManifest[]> {
  if (window.gameApi) return window.gameApi.listWorlds();
  return localWorlds()
    .map(({ manifest }) => manifest)
    .sort((first, second) => second.lastPlayedAt - first.lastPlayedAt);
}

export async function createWorld(options: NewWorldOptions): Promise<WorldManifest> {
  const name = assertWorldName(options.name);
  const now = Date.now();
  const seed = options.seed.trim() || Math.floor(Math.random() * 1_000_000_000).toString();
  const spawn = findSpawn(parseSeed(seed));
  const manifest: WorldManifest = {
    id: crypto.randomUUID(),
    name,
    seed,
    mode: options.mode,
    difficulty: options.difficulty,
    structures: options.structures,
    version: WORLD_FORMAT_VERSION,
    createdAt: now,
    lastPlayedAt: now,
    spawn
  };
  const snapshot = createInitialSnapshot(spawn);
  if (window.gameApi) return window.gameApi.createWorld({ manifest, snapshot });
  saveLocalWorlds([...localWorlds(), { manifest, snapshot }]);
  return manifest;
}

export async function loadWorld(id: string): Promise<StoredWorld> {
  if (window.gameApi) return window.gameApi.loadWorld(id);
  const world = localWorlds().find((entry) => entry.manifest.id === id);
  if (!world) throw new Error('Este mundo não foi encontrado.');
  return world;
}

export async function saveWorld(id: string, snapshot: WorldSnapshot): Promise<void> {
  if (window.gameApi) {
    await window.gameApi.saveWorld(id, snapshot);
    return;
  }
  const worlds = localWorlds();
  const index = worlds.findIndex((entry) => entry.manifest.id === id);
  if (index < 0) throw new Error('Este mundo não foi encontrado para salvar.');
  worlds[index] = {
    ...worlds[index],
    manifest: { ...worlds[index].manifest, lastPlayedAt: Date.now() },
    snapshot
  };
  saveLocalWorlds(worlds);
}

export async function renameWorld(id: string, name: string): Promise<void> {
  const normalized = assertWorldName(name);
  if (window.gameApi) {
    await window.gameApi.renameWorld(id, normalized);
    return;
  }
  const worlds = localWorlds();
  const world = worlds.find((entry) => entry.manifest.id === id);
  if (!world) throw new Error('Este mundo não foi encontrado.');
  world.manifest.name = normalized;
  saveLocalWorlds(worlds);
}

export async function deleteWorld(id: string): Promise<void> {
  if (window.gameApi) {
    await window.gameApi.deleteWorld(id);
    return;
  }
  const worlds = localWorlds().filter((entry) => entry.manifest.id !== id);
  saveLocalWorlds(worlds);
}
