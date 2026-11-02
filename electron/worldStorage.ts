import { copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StoredWorld, WorldManifest, WorldSnapshot } from '../src/domain/world';

const MAX_WORLD_BYTES = 32 * 1024 * 1024;
const WORLD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ITEM_ID_PATTERN = /^[a-z0-9_]{1,64}$/;

class InvalidWorldFileError extends Error {}

function assertWorldId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !WORLD_ID_PATTERN.test(id)) throw new Error('Identificador de mundo inválido.');
}

function assertWorldName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 32) {
    throw new Error('Nome de mundo inválido.');
  }
}

function validateWorld(value: unknown): StoredWorld {
  if (!value || typeof value !== 'object') throw new Error('Save de mundo inválido.');
  const world = value as StoredWorld;
  assertWorldId(world.manifest?.id);
  assertWorldName(world.manifest?.name);
  if (
    world.manifest.version !== 1 ||
    typeof world.manifest.seed !== 'string' ||
    world.manifest.seed.length > 128 ||
    !['survival', 'creative'].includes(world.manifest.mode) ||
    !['peaceful', 'easy', 'normal', 'hard'].includes(world.manifest.difficulty) ||
    typeof world.manifest.structures !== 'boolean'
  ) {
    throw new Error('O save usa dados de mundo incompatíveis.');
  }
  const snapshot = world.snapshot as WorldSnapshot | undefined;
  if (
    !snapshot ||
    !snapshot.player ||
    !Array.isArray(snapshot.player.position) ||
    snapshot.player.position.length !== 3 ||
    !snapshot.player.position.every((coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= 10_000_000) ||
    !Number.isFinite(snapshot.player.health) ||
    snapshot.player.health < 0 ||
    snapshot.player.health > 20 ||
    !Number.isFinite(snapshot.player.hunger) ||
    snapshot.player.hunger < 0 ||
    snapshot.player.hunger > 20 ||
    !Number.isFinite(snapshot.player.experience) ||
    snapshot.player.experience < 0 ||
    !Number.isFinite(snapshot.player.level) ||
    snapshot.player.level < 0 ||
    !Array.isArray(snapshot.inventory) ||
    snapshot.inventory.length !== 36 ||
    !Array.isArray(snapshot.player.armor) ||
    snapshot.player.armor.length !== 4 ||
    !Number.isInteger(snapshot.timeTicks) ||
    snapshot.timeTicks < 0 ||
    !snapshot.blockEdits ||
    typeof snapshot.blockEdits !== 'object' ||
    Array.isArray(snapshot.blockEdits) ||
    Object.keys(snapshot.blockEdits).length > 500_000
  ) {
    throw new Error('O save contém dados de jogador ou chunks inválidos.');
  }
  const droppedItems = snapshot.droppedItems === undefined ? [] : snapshot.droppedItems;
  if (
    !Array.isArray(droppedItems) ||
    droppedItems.length > 10_000 ||
    droppedItems.some((drop) =>
      !drop ||
      typeof drop.id !== 'string' ||
      drop.id.length < 1 ||
      drop.id.length > 128 ||
      !ITEM_ID_PATTERN.test(drop.itemId) ||
      !Number.isInteger(drop.count) ||
      drop.count < 1 ||
      drop.count > 64 ||
      !Array.isArray(drop.position) ||
      drop.position.length !== 3 ||
      !drop.position.every((coordinate) => Number.isFinite(coordinate) && Math.abs(coordinate) <= 10_000_000) ||
      (drop.velocity !== undefined &&
        (!Array.isArray(drop.velocity) ||
          drop.velocity.length !== 3 ||
          !drop.velocity.every((component) => Number.isFinite(component) && Math.abs(component) <= 100))) ||
      !Number.isInteger(drop.pickupAfterTick) ||
      drop.pickupAfterTick < 0
    )
  ) {
    throw new Error('O save contém um item dropado inválido.');
  }
  const stacks = [...snapshot.inventory, ...snapshot.player.armor, snapshot.player.offhand, ...droppedItems];
  if (stacks.some((stack) => stack !== null && (
    !stack ||
    !ITEM_ID_PATTERN.test(stack.itemId) ||
    !Number.isInteger(stack.count) ||
    stack.count < 1 ||
    stack.count > 64 ||
    (stack.damage !== undefined && (!Number.isFinite(stack.damage) || stack.damage < 0))
  ))) {
    throw new Error('O save contém uma pilha de item inválida.');
  }
  for (const [key, block] of Object.entries(snapshot.blockEdits)) {
    const [x, y, z] = key.split(',').map(Number);
    if (
      !/^-?\d+,-?\d+,-?\d+$/.test(key) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !Number.isInteger(z) ||
      Math.abs(x) > 10_000_000 ||
      y < 0 ||
      y >= 40 ||
      Math.abs(z) > 10_000_000 ||
      typeof block !== 'string' ||
      !ITEM_ID_PATTERN.test(block)
    ) {
      throw new Error('O save contém uma alteração de bloco inválida.');
    }
  }
  return { ...world, snapshot: { ...snapshot, droppedItems } };
}

function worldDirectory(root: string, id: string): string {
  assertWorldId(id);
  return join(root, id);
}

async function readWorldFile(file: string, id: string): Promise<StoredWorld> {
  const contents = await readFile(file);
  if (contents.byteLength > MAX_WORLD_BYTES) throw new InvalidWorldFileError('O save excede o limite permitido.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents.toString('utf8'));
  } catch {
    throw new InvalidWorldFileError('O arquivo deste mundo está corrompido.');
  }
  let world: StoredWorld;
  try {
    world = validateWorld(parsed);
  } catch (error) {
    throw new InvalidWorldFileError(error instanceof Error ? error.message : 'O save contém dados inválidos.');
  }
  if (world.manifest.id !== id) throw new InvalidWorldFileError('O identificador do save não corresponde à pasta.');
  return world;
}

async function readWorld(root: string, id: string): Promise<StoredWorld> {
  const directory = worldDirectory(root, id);
  try {
    return await readWorldFile(join(directory, 'world.json'), id);
  } catch (primaryError) {
    try {
      const backup = await readWorldFile(join(directory, 'world.json.bak'), id);
      console.warn(`[world-storage] Recovered world ${id} from its last valid backup.`);
      return backup;
    } catch (backupError) {
      if ((backupError as NodeJS.ErrnoException).code === 'ENOENT') throw primaryError;
      if (backupError instanceof InvalidWorldFileError) {
        throw new Error(`O save principal e o backup deste mundo estão inválidos: ${backupError.message}`);
      }
      throw backupError;
    }
  }
}

async function atomicSave(directory: string, world: StoredWorld): Promise<void> {
  const target = join(directory, 'world.json');
  const backup = join(directory, 'world.json.bak');
  const temporary = join(directory, `world.${process.pid}.${Date.now()}.tmp`);
  const serialized = JSON.stringify(world);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_WORLD_BYTES) throw new Error('O mundo excede o limite de save.');
  await writeFile(temporary, serialized, { encoding: 'utf8', flag: 'wx' });
  try {
    try {
      await readWorldFile(target, world.manifest.id);
      await copyFile(target, backup);
    } catch (error) {
      if (error instanceof InvalidWorldFileError) {
        console.warn(`[world-storage] Keeping the last valid backup for world ${world.manifest.id}.`);
      } else if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export function createWorldStorage(root: string) {
  const writeQueues = new Map<string, Promise<void>>();
  const enqueueWrite = (id: string, operation: () => Promise<void>): Promise<void> => {
    const previous = writeQueues.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    writeQueues.set(id, next);
    return next.finally(() => {
      if (writeQueues.get(id) === next) writeQueues.delete(id);
    });
  };

  return {
    async list(): Promise<WorldManifest[]> {
      await mkdir(root, { recursive: true });
      const directories = await readdir(root, { withFileTypes: true });
      const worlds: WorldManifest[] = [];
      for (const entry of directories) {
        if (!entry.isDirectory() || !WORLD_ID_PATTERN.test(entry.name)) continue;
        try {
          worlds.push((await readWorld(root, entry.name)).manifest);
        } catch (error) {
          console.error(`[world-storage] Ignoring unreadable world ${entry.name}:`, error);
        }
      }
      return worlds.sort((first, second) => second.lastPlayedAt - first.lastPlayedAt);
    },
    async create(world: StoredWorld): Promise<WorldManifest> {
      const validated = validateWorld(world);
      await mkdir(root, { recursive: true });
      const directory = worldDirectory(root, validated.manifest.id);
      await mkdir(directory, { recursive: false });
      try {
        await atomicSave(directory, validated);
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
      return validated.manifest;
    },
    async load(id: string): Promise<StoredWorld> {
      return readWorld(root, id);
    },
    async save(id: string, snapshot: WorldSnapshot): Promise<void> {
      assertWorldId(id);
      return enqueueWrite(id, async () => {
        const world = await readWorld(root, id);
        const updated = validateWorld({
          ...world,
          manifest: { ...world.manifest, lastPlayedAt: Date.now() },
          snapshot
        });
        await atomicSave(worldDirectory(root, id), updated);
      });
    },
    async rename(id: string, name: string): Promise<void> {
      assertWorldId(id);
      assertWorldName(name);
      return enqueueWrite(id, async () => {
        const world = await readWorld(root, id);
        await atomicSave(worldDirectory(root, id), {
          ...world,
          manifest: { ...world.manifest, name: name.trim() }
        });
      });
    },
    async remove(id: string): Promise<void> {
      await rm(worldDirectory(root, id), { recursive: true, force: false });
    }
  };
}
