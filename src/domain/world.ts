import {
  BLOCK_TEXTURE_COLUMNS,
  BLOCK_TEXTURE_IDS,
  BLOCK_TEXTURE_SIZE,
  textureIndexForBlockFace
} from './blockTextures';

export type GameMode = 'survival' | 'creative';
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';

export interface WorldManifest {
  id: string;
  name: string;
  seed: string;
  mode: GameMode;
  difficulty: Difficulty;
  structures: boolean;
  version: 1;
  createdAt: number;
  lastPlayedAt: number;
  spawn: [number, number, number];
}

export interface ItemStack {
  itemId: string;
  count: number;
  damage?: number;
}

export interface ChunkGeometryData {
  positions: number[];
  colors: number[];
  normals: number[];
  uvs: number[];
  waterPositions: number[];
  waterColors: number[];
  waterNormals: number[];
  waterUvs: number[];
}

export interface PlayerSnapshot {
  position: [number, number, number];
  health: number;
  hunger: number;
  experience: number;
  level: number;
  armor: [ItemStack | null, ItemStack | null, ItemStack | null, ItemStack | null];
  offhand: ItemStack | null;
}

export interface DroppedItemSnapshot extends ItemStack {
  id: string;
  position: [number, number, number];
  pickupAfterTick: number;
  velocity?: [number, number, number];
}

export interface WorldSnapshot {
  player: PlayerSnapshot;
  inventory: Array<ItemStack | null>;
  blockEdits: Record<string, string>;
  timeTicks: number;
  droppedItems?: DroppedItemSnapshot[];
}

export interface StoredWorld {
  manifest: WorldManifest;
  snapshot: WorldSnapshot;
}

export const WORLD_FORMAT_VERSION = 1;
export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 40;
export const SEA_LEVEL = 13;

export function createInitialSnapshot(spawn: [number, number, number]): WorldSnapshot {
  const inventory: Array<ItemStack | null> = Array.from({ length: 36 }, () => null);
  inventory[0] = { itemId: 'wooden_pickaxe', count: 1, damage: 0 };
  inventory[1] = { itemId: 'dirt', count: 24 };
  inventory[2] = { itemId: 'stone', count: 16 };
  inventory[3] = { itemId: 'oak_log', count: 8 };
  inventory[4] = { itemId: 'oak_planks', count: 16 };

  return {
    player: {
      position: [...spawn],
      health: 20,
      hunger: 20,
      experience: 0,
      level: 0,
      armor: [null, null, null, null],
      offhand: null
    },
    inventory,
    blockEdits: {},
    timeTicks: 0,
    droppedItems: []
  };
}

export function blockKey(x: number, y: number, z: number): string {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

export function parseSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hash2d(x: number, z: number, seed: number): number {
  let value = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(seed, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function valueNoise(x: number, z: number, seed: number, scale: number): number {
  const sampleX = x / scale;
  const sampleZ = z / scale;
  const x0 = Math.floor(sampleX);
  const z0 = Math.floor(sampleZ);
  const tx = smoothstep(sampleX - x0);
  const tz = smoothstep(sampleZ - z0);
  const north = hash2d(x0, z0, seed) * (1 - tx) + hash2d(x0 + 1, z0, seed) * tx;
  const south = hash2d(x0, z0 + 1, seed) * (1 - tx) + hash2d(x0 + 1, z0 + 1, seed) * tx;
  return north * (1 - tz) + south * tz;
}

export interface TerrainPoint {
  height: number;
  surface: 'grass' | 'sand' | 'snow';
}

export function terrainAt(x: number, z: number, seed: number): TerrainPoint {
  const broad = valueNoise(x, z, seed, 78);
  const detail = valueNoise(x, z, seed ^ 0x5f356495, 23);
  const temperature = valueNoise(x, z, seed ^ 0x2c1b3c6d, 170);
  const moisture = valueNoise(x, z, seed ^ 0x13579bdf, 115);
  const height = Math.max(4, Math.min(WORLD_HEIGHT - 3, Math.round(8 + broad * 13 + detail * 4)));
  const surface =
    height <= SEA_LEVEL + 1 || (temperature > 0.62 && moisture < 0.42) ? 'sand' : temperature < 0.24 ? 'snow' : 'grass';
  return { height, surface };
}

function treeBlockAt(x: number, y: number, z: number, seed: number): string | null {
  for (let treeZ = z - 2; treeZ <= z + 2; treeZ += 1) {
    for (let treeX = x - 2; treeX <= x + 2; treeX += 1) {
      const terrain = terrainAt(treeX, treeZ, seed);
      if (terrain.surface !== 'grass' || hash2d(treeX, treeZ, seed ^ 0x7f4a7c15) < 0.992) continue;
      const height = 3 + Math.floor(hash2d(treeX, treeZ, seed ^ 0x165667b1) * 3);
      const offsetX = Math.abs(x - treeX);
      const offsetZ = Math.abs(z - treeZ);
      if (offsetX === 0 && offsetZ === 0 && y > terrain.height && y <= terrain.height + height) return 'oak_log';
      const canopyBase = terrain.height + height;
      if (
        y >= canopyBase &&
        y <= canopyBase + 2 &&
        offsetX <= (y === canopyBase + 2 ? 1 : 2) &&
        offsetZ <= (y === canopyBase + 2 ? 1 : 2) &&
        !(offsetX === 0 && offsetZ === 0 && y < canopyBase + 1)
      ) {
        return 'leaves';
      }
    }
  }
  return null;
}

export function generatedBlockAt(x: number, y: number, z: number, seed: number, structures = true): string {
  if (y < 0 || y >= WORLD_HEIGHT) return 'air';
  const terrain = terrainAt(x, z, seed);
  if (y === 0) return 'bedrock';
  if (y <= terrain.height - 4) {
    if (y < 28 && hash2d(x + y * 11, z - y * 7, seed ^ 0x3c6ef372) > 0.994) return 'coal_ore';
    return 'stone';
  }
  if (y < terrain.height) {
    return terrain.surface === 'sand' ? 'sand' : 'dirt';
  }
  if (y === terrain.height) return terrain.surface;
  if (structures) {
    const treeBlock = treeBlockAt(x, y, z, seed);
    if (treeBlock) return treeBlock;
  }
  if (y <= SEA_LEVEL) return 'water';
  return 'air';
}

export function getBlockAt(
  x: number,
  y: number,
  z: number,
  seed: number,
  edits: Record<string, string>,
  structures = true
): string {
  return edits[blockKey(x, y, z)] ?? generatedBlockAt(x, y, z, seed, structures);
}

export function findSpawn(seed: number): [number, number, number] {
  const terrain = terrainAt(0, 0, seed);
  return [0.5, terrain.height + 1.02, 0.5];
}

export function createChunkGeometryData(
  chunkX: number,
  chunkZ: number,
  seed: number,
  edits: Record<string, string>,
  structures = true
): ChunkGeometryData {
  const width = CHUNK_SIZE + 2;
  const volume = width * width * WORLD_HEIGHT;
  const blocks = new Array<string>(volume).fill('air');
  const indexOf = (x: number, y: number, z: number) => (y * width + z) * width + x;
  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;

  for (let localZ = -1; localZ <= CHUNK_SIZE; localZ += 1) {
    for (let localX = -1; localX <= CHUNK_SIZE; localX += 1) {
      const worldX = originX + localX;
      const worldZ = originZ + localZ;
      const { height, surface } = terrainAt(worldX, worldZ, seed);
      for (let y = 0; y <= height; y += 1) {
        let block =
          y === 0
            ? 'bedrock'
            : y <= height - 4
            ? 'stone'
            : y < height
            ? surface === 'sand'
              ? 'sand'
              : 'dirt'
            : surface;
        if (block === 'stone' && y < 28 && hash2d(worldX + y * 11, worldZ - y * 7, seed ^ 0x3c6ef372) > 0.994) {
          block = 'coal_ore';
        }
        blocks[indexOf(localX + 1, y, localZ + 1)] = edits[blockKey(worldX, y, worldZ)] ?? block;
      }
      for (let y = height + 1; y <= SEA_LEVEL; y += 1) {
        const index = indexOf(localX + 1, y, localZ + 1);
        if (blocks[index] === 'air') blocks[index] = 'water';
      }
    }
  }

  if (structures) {
    for (let localZ = -2; localZ <= CHUNK_SIZE + 1; localZ += 1) {
      for (let localX = -2; localX <= CHUNK_SIZE + 1; localX += 1) {
        const worldX = originX + localX;
        const worldZ = originZ + localZ;
        const terrain = terrainAt(worldX, worldZ, seed);
        if (terrain.surface !== 'grass' || hash2d(worldX, worldZ, seed ^ 0x7f4a7c15) < 0.992) continue;
        const treeHeight = 3 + Math.floor(hash2d(worldX, worldZ, seed ^ 0x165667b1) * 3);
        const treeY = terrain.height + 1;
        for (let y = treeY; y <= treeY + treeHeight; y += 1) {
          const x = localX + 1;
          const z = localZ + 1;
          if (x >= 0 && x < width && z >= 0 && z < width && y < WORLD_HEIGHT) {
            blocks[indexOf(x, y, z)] = 'oak_log';
          }
        }
        const canopyBase = terrain.height + treeHeight;
        for (let y = canopyBase; y <= canopyBase + 2; y += 1) {
          const radius = y === canopyBase + 2 ? 1 : 2;
          for (let offsetZ = -radius; offsetZ <= radius; offsetZ += 1) {
            for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
              const x = localX + offsetX + 1;
              const z = localZ + offsetZ + 1;
              if (x < 0 || x >= width || z < 0 || z >= width || y >= WORLD_HEIGHT) continue;
              if (offsetX === 0 && offsetZ === 0 && y <= canopyBase) continue;
              const index = indexOf(x, y, z);
              if (blocks[index] === 'air' || blocks[index] === 'water') blocks[index] = 'leaves';
            }
          }
        }
      }
    }
  }

  for (const [key, block] of Object.entries(edits)) {
    const [worldX, y, worldZ] = key.split(',').map(Number);
    const localX = worldX - originX;
    const localZ = worldZ - originZ;
    if (
      Number.isInteger(worldX) &&
      Number.isInteger(worldZ) &&
      Number.isInteger(y) &&
      localX >= -1 &&
      localX <= CHUNK_SIZE &&
      localZ >= -1 &&
      localZ <= CHUNK_SIZE &&
      y >= 0 &&
      y < WORLD_HEIGHT
    ) {
      blocks[indexOf(localX + 1, y, localZ + 1)] = block;
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const waterPositions: number[] = [];
  const waterColors: number[] = [];
  const waterNormals: number[] = [];
  const waterUvs: number[] = [];
  const faces = [
    {
      neighbor: [1, 0, 0],
      normal: [1, 0, 0],
      vertices: [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 0, 1]
      ],
      uvs: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ]
    },
    {
      neighbor: [-1, 0, 0],
      normal: [-1, 0, 0],
      vertices: [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
        [0, 0, 0]
      ],
      uvs: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ]
    },
    {
      neighbor: [0, 1, 0],
      normal: [0, 1, 0],
      vertices: [
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
        [0, 1, 0]
      ],
      uvs: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ]
    },
    {
      neighbor: [0, -1, 0],
      normal: [0, -1, 0],
      vertices: [
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
        [0, 0, 1]
      ],
      uvs: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ]
    },
    {
      neighbor: [0, 0, 1],
      normal: [0, 0, 1],
      vertices: [
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
        [0, 0, 1]
      ],
      uvs: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ]
    },
    {
      neighbor: [0, 0, -1],
      normal: [0, 0, -1],
      vertices: [
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [1, 0, 0]
      ],
      uvs: [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0]
      ]
    }
  ];
  const triangles = [0, 1, 2, 0, 2, 3];
  const faceBrightness = [0.82, 0.68, 1, 0.52, 0.9, 0.74];
  const atlasRows = Math.ceil(BLOCK_TEXTURE_IDS.length / BLOCK_TEXTURE_COLUMNS);

  for (let y = 0; y < WORLD_HEIGHT; y += 1) {
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const block = blocks[indexOf(localX + 1, y, localZ + 1)];
        if (block === 'air') continue;
        for (let faceIndex = 0; faceIndex < faces.length; faceIndex += 1) {
          const face = faces[faceIndex];
          const adjacent =
            blocks[indexOf(localX + 1 + face.neighbor[0], y + face.neighbor[1], localZ + 1 + face.neighbor[2])] ??
            'air';
          if (block === 'water' ? adjacent !== 'air' : adjacent !== 'air' && adjacent !== 'water') continue;
          const facePositions = block === 'water' ? waterPositions : positions;
          const faceNormals = block === 'water' ? waterNormals : normals;
          const faceColors = block === 'water' ? waterColors : colors;
          const faceUvs = block === 'water' ? waterUvs : uvs;
          const textureIndex = textureIndexForBlockFace(block, faceIndex);
          const tileX = textureIndex % BLOCK_TEXTURE_COLUMNS;
          const tileY = Math.floor(textureIndex / BLOCK_TEXTURE_COLUMNS);
          for (const triangleIndex of triangles) {
            const vertex = face.vertices[triangleIndex];
            facePositions.push(originX + localX + vertex[0], y + vertex[1], originZ + localZ + vertex[2]);
            faceNormals.push(face.normal[0], face.normal[1], face.normal[2]);
            const brightness = faceBrightness[faceIndex];
            faceColors.push(brightness, brightness, brightness);
            const uv = face.uvs[triangleIndex];
            faceUvs.push(
              (tileX * BLOCK_TEXTURE_SIZE + 0.5 + uv[0] * (BLOCK_TEXTURE_SIZE - 1)) /
                (BLOCK_TEXTURE_COLUMNS * BLOCK_TEXTURE_SIZE),
              (tileY * BLOCK_TEXTURE_SIZE + 0.5 + (1 - uv[1]) * (BLOCK_TEXTURE_SIZE - 1)) /
                (atlasRows * BLOCK_TEXTURE_SIZE)
            );
          }
        }
      }
    }
  }

  return {
    positions,
    colors,
    normals,
    uvs,
    waterPositions,
    waterColors,
    waterNormals,
    waterUvs
  };
}
