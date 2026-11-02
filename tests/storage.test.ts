import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWorldStorage } from '../electron/worldStorage';
import { createInitialSnapshot, findSpawn } from '../src/domain/world';
import type { StoredWorld } from '../src/domain/world';

export default async function testWorldStorage() {
  const root = await mkdtemp(join(tmpdir(), 'voxel-world-test-'));
  const storage = createWorldStorage(root);
  const id = 'a4d5c1e0-8b2f-4f3a-a0b1-345678901234';
  const now = Date.now();
  const world: StoredWorld = {
    manifest: {
      id,
      name: 'Teste local',
      seed: 'test-seed',
      mode: 'survival',
      difficulty: 'normal',
      structures: true,
      version: 1,
      createdAt: now,
      lastPlayedAt: now,
      spawn: findSpawn(123)
    },
    snapshot: createInitialSnapshot(findSpawn(123))
  };

  try {
    await storage.create(world);
    assert.equal((await storage.list()).length, 1);
    await storage.rename(id, 'Mundo renomeado');
    const updatedSnapshot = {
      ...world.snapshot,
      timeTicks: 80,
      droppedItems: [
        {
          id: 'drop-test-1',
          itemId: 'dirt',
          count: 1,
          position: [1, 2, 3] as [number, number, number],
          pickupAfterTick: 100,
          velocity: [0, 2.5, 0] as [number, number, number]
        }
      ]
    };
    await storage.save(id, updatedSnapshot);
    const loaded = await storage.load(id);
    assert.equal(loaded.manifest.name, 'Mundo renomeado');
    assert.equal(loaded.snapshot.timeTicks, 80);
    assert.equal(loaded.snapshot.droppedItems?.[0]?.itemId, 'dirt');
    assert.deepEqual(loaded.snapshot.droppedItems?.[0]?.velocity, [0, 2.5, 0]);

    const backup = await readFile(join(root, id, 'world.json.bak'), 'utf8');
    assert.equal(JSON.parse(backup).snapshot.timeTicks, 0);
    await assert.rejects(storage.load('../fora-do-mundo'));
    await writeFile(join(root, id, 'world.json'), '{corrompido');
    const recovered = await storage.load(id);
    assert.equal(recovered.manifest.name, 'Mundo renomeado');
    assert.equal(recovered.snapshot.timeTicks, 0);
    assert.deepEqual(recovered.snapshot.droppedItems, []);
    await storage.save(id, recovered.snapshot);
    assert.equal((await storage.load(id)).snapshot.timeTicks, 0);

    await storage.remove(id);
    assert.equal((await storage.list()).length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
