import assert from 'node:assert/strict';
import { NearestFilter } from 'three';
import { textureForBlockFace } from '../src/domain/blockTextures';
import { createBlockTextureAtlas } from '../src/engine/blockTextureAtlas';
import { playerCollidesWithBlocks } from '../src/engine/playerMovement';
import { blockById } from '../src/domain/content';
import {
  blockKey,
  createChunkGeometryData,
  findSpawn,
  generatedBlockAt,
  parseSeed,
  terrainAt
} from '../src/domain/world';

export default function testWorldGeneration() {
  const seed = parseSeed('seed-reproducivel');
  assert.deepEqual(terrainAt(-18, 42, seed), terrainAt(-18, 42, seed));
  assert.equal(generatedBlockAt(4, 0, 7, seed), 'bedrock');
  const treeX = -100;
  const treeZ = -93;
  const treeGround = terrainAt(treeX, treeZ, seed).height;
  assert.equal(generatedBlockAt(treeX, treeGround + 4, treeZ, seed), 'leaves');
  assert.equal(
    playerCollidesWithBlocks([treeX + 0.5, treeGround + 1, treeZ + 0.5], (blockX, blockY, blockZ) => {
      const block = generatedBlockAt(blockX, blockY, blockZ, seed);
      return Boolean(blockById.get(block)?.solid);
    }),
    false,
    'o jogador deve passar em dois blocos de altura sob a copa de uma árvore'
  );
  const spawn = findSpawn(seed);
  assert.equal(spawn[0], 0.5);
  assert.equal(spawn[2], 0.5);

  const { height } = terrainAt(0, 0, seed);
  const editY = Math.min(39, height + 3);
  const untouched = createChunkGeometryData(0, 0, seed, {}, false);
  const edited = createChunkGeometryData(0, 0, seed, { [blockKey(0, editY, 0)]: 'oak_planks' }, false);
  const { positions: untouchedPositions } = untouched;
  const { positions } = edited;
  assert.ok(untouchedPositions.length > 0);
  assert.ok(positions.length > untouchedPositions.length);
  assert.equal(positions.length, edited.colors.length);
  assert.equal(positions.length, edited.normals.length);
  assert.equal((positions.length / 3) * 2, edited.uvs.length);
  const waterGeometry = createChunkGeometryData(0, 0, seed, { [blockKey(8, 30, 8)]: 'water' }, false);
  assert.ok(waterGeometry.waterPositions.length > 0);
  assert.equal(waterGeometry.waterPositions.length, waterGeometry.waterNormals.length);
  assert.equal((waterGeometry.waterPositions.length / 3) * 2, waterGeometry.waterUvs.length);
  assert.ok(edited.uvs.every((uv) => uv >= 0 && uv <= 1));
  assert.equal(textureForBlockFace('grass', 2), 'grass_top');
  assert.equal(textureForBlockFace('grass', 3), 'dirt');
  assert.equal(textureForBlockFace('oak_log', 2), 'oak_log_top');

  const atlas = createBlockTextureAtlas();
  assert.equal(atlas.image.width, 96);
  assert.equal(atlas.image.height, 48);
  assert.equal(atlas.magFilter, NearestFilter);
  const pixelData = atlas.image.data;
  if (!(pixelData instanceof Uint8Array)) throw new Error('O atlas deve usar pixels RGBA em Uint8Array.');
  const hasTransparentLeafPixel = Array.from({ length: 16 * 16 }, (_, index) => {
    const x = index % 16;
    const y = Math.floor(index / 16) + 32;
    return pixelData[(y * 96 + x) * 4 + 3];
  }).some((alpha) => alpha === 0);
  assert.equal(hasTransparentLeafPixel, true);
  assert.equal(pixelData[(16 * 96 + 32) * 4 + 3], 158, 'a textura da água deve permitir enxergar através dela');
}
