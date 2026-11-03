import assert from 'node:assert/strict';
import { blockDropForTool, blockMiningDuration, hasCorrectMiningTool } from '../src/engine/blockMining';

export default function testBlockMining() {
  const stone = { hardness: 1.5, toolTags: ['pickaxe'], drops: ['cobblestone'] };
  const correctToolTime = blockMiningDuration(stone, 'wooden_pickaxe', false);
  const wrongToolTime = blockMiningDuration(stone, 'wooden_axe', false);
  assert.ok(correctToolTime !== null);
  assert.ok(wrongToolTime !== null);
  assert.ok(correctToolTime < wrongToolTime);
  assert.equal(hasCorrectMiningTool({ toolTags: ['axe'] }, 'wooden_pickaxe'), false);
  assert.equal(hasCorrectMiningTool({ toolTags: ['axe'] }, 'wooden_axe'), true);
  assert.equal(blockDropForTool({ drops: ['dirt'], toolTags: ['shovel'] }, 'wooden_pickaxe', true), 'dirt');
  assert.equal(
    blockDropForTool(
      { drops: ['cobblestone'], toolTags: ['pickaxe'], requiresCorrectToolForDrop: true },
      undefined,
      true
    ),
    null
  );
  assert.equal(
    blockDropForTool(
      { drops: ['cobblestone'], toolTags: ['pickaxe'], requiresCorrectToolForDrop: true },
      'wooden_pickaxe',
      true
    ),
    'cobblestone'
  );
  assert.equal(blockDropForTool({ drops: ['dirt'], toolTags: [] }, undefined, false), null);
  assert.equal(blockMiningDuration(stone, undefined, true), 0.1);
  assert.equal(blockMiningDuration({ hardness: -1, toolTags: [], drops: [] }, undefined, false), null);
}
