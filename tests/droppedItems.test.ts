import assert from 'node:assert/strict';
import { advanceDroppedItems, collectDroppedItems, dropPosition } from '../src/engine/droppedItems';
import type { DroppedItemSnapshot, ItemStack } from '../src/domain/world';

export default function testDroppedItems() {
  assert.deepEqual(dropPosition([2, 5, 3]), [2.5, 5.5, 3.5]);

  const solidFloor = (x: number, y: number, z: number) => x === 0 && y === 0 && z === 0;
  const fallingDrop: DroppedItemSnapshot = {
    id: 'physics-drop',
    itemId: 'dirt',
    count: 1,
    position: [0.5, 4, 0.5],
    velocity: [0, 0, 0],
    pickupAfterTick: 0
  };
  const firstPhysicsStep = advanceDroppedItems([fallingDrop], solidFloor)[0];
  assert.ok(firstPhysicsStep);
  assert.ok(firstPhysicsStep.position[1] < fallingDrop.position[1]);
  assert.ok((firstPhysicsStep.velocity?.[1] ?? 0) < 0);

  let settledDrops: DroppedItemSnapshot[] = [fallingDrop];
  Array.from({ length: 120 }).forEach(() => {
    settledDrops = advanceDroppedItems(settledDrops, solidFloor);
  });
  const settledDrop = settledDrops[0];
  assert.ok(settledDrop);
  assert.ok(Math.abs(settledDrop.position[1] - 1.14) < 0.02);
  assert.equal(settledDrop.velocity, undefined);

  const inventory: Array<ItemStack | null> = Array.from({ length: 36 }, () => null);
  const item: DroppedItemSnapshot = {
    id: 'test-drop',
    itemId: 'dirt',
    count: 2,
    position: [1, 1, 1],
    pickupAfterTick: 5
  };
  const cooling = collectDroppedItems(inventory, [item], [1, 1, 1], 4);
  assert.equal(cooling.pickedUp, false);
  assert.equal(cooling.droppedItems.length, 1);

  const collected = collectDroppedItems(inventory, [item], [1, 1, 1], 5);
  assert.equal(collected.pickedUp, true);
  assert.equal(collected.inventory[0]?.itemId, 'dirt');
  assert.equal(collected.inventory[0]?.count, 2);
  assert.equal(collected.droppedItems.length, 0);

  const outOfReach = collectDroppedItems(inventory, [item], [5, 1, 1], 5);
  assert.equal(outOfReach.pickedUp, false);
  assert.equal(outOfReach.droppedItems.length, 1);

  const almostFull = Array.from({ length: 36 }, (): ItemStack => ({ itemId: 'dirt', count: 64 }));
  almostFull[0] = { itemId: 'coal', count: 63 };
  const partial = collectDroppedItems(almostFull, [{ ...item, itemId: 'coal' }], [1, 1, 1], 5);
  assert.equal(partial.inventory[0]?.count, 64);
  assert.equal(partial.droppedItems[0]?.count, 1);
}
