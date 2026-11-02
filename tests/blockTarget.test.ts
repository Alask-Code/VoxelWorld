import assert from 'node:assert/strict';
import { adjacentBlock, blockFromSurface } from '../src/engine/blockTarget';

export default function testBlockTargeting() {
  const sideBlock = blockFromSurface([1, 0.5, 0.5], [1, 0, 0]);
  assert.deepEqual(sideBlock, [0, 0, 0]);
  assert.deepEqual(adjacentBlock(sideBlock, [1, 0, 0]), [1, 0, 0]);

  const topBlock = blockFromSurface([0.5, 1, 0.5], [0, 1, 0]);
  assert.deepEqual(topBlock, [0, 0, 0]);
  assert.deepEqual(adjacentBlock(topBlock, [0, 1, 0]), [0, 1, 0]);

  const negativeFaceBlock = blockFromSurface([0, 0.5, 0.5], [-1, 0, 0]);
  assert.deepEqual(negativeFaceBlock, [0, 0, 0]);
  assert.deepEqual(adjacentBlock(negativeFaceBlock, [-1, 0, 0]), [-1, 0, 0]);
}
