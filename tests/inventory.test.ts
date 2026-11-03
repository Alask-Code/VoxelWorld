import assert from 'node:assert/strict';
import {
  addItem,
  damageItem,
  moveStack,
  removeFromSlot,
  removeItem,
  returnStacksToInventory,
  transferStackAtCursor,
  transferStackBetweenSlots
} from '../src/domain/inventory';
import type { ItemStack } from '../src/domain/world';

export default function testInventoryOperations() {
  const empty: Array<ItemStack | null> = Array.from({ length: 36 }, () => null);
  const added = addItem(empty, 'oak_planks', 70);
  assert.equal(added.remainder, 0);
  assert.deepEqual(added.inventory.slice(0, 2), [
    { itemId: 'oak_planks', count: 64 },
    { itemId: 'oak_planks', count: 6 }
  ]);

  const removed = removeItem(added.inventory, 'oak_planks', 65);
  assert.ok(removed);
  assert.equal(removed[0], null);
  assert.deepEqual(removed[1], { itemId: 'oak_planks', count: 5 });
  assert.equal(removeItem(empty, 'stone', 1), null);

  const split = moveStack(added.inventory, 0, 2, true);
  assert.deepEqual(split[0], { itemId: 'oak_planks', count: 32 });
  assert.deepEqual(split[2], { itemId: 'oak_planks', count: 32 });
  assert.deepEqual(removeFromSlot(added.inventory, 0, 1)?.[0], { itemId: 'oak_planks', count: 63 });
  assert.equal(removeFromSlot(added.inventory, 0, 65), null);

  const woodenPickaxe = addItem(empty, 'wooden_pickaxe', 1).inventory;
  const damagedPickaxe = damageItem(woodenPickaxe, 0);
  assert.deepEqual(damagedPickaxe[0], { itemId: 'wooden_pickaxe', count: 1, damage: 1 });
  const nearlyBrokenPickaxe = damagedPickaxe.map((stack, index) =>
    index === 0 && stack ? { ...stack, damage: 58 } : stack
  );
  assert.equal(damageItem(nearlyBrokenPickaxe, 0)[0], null);
  assert.deepEqual(damageItem(added.inventory, 0)[0], added.inventory[0]);

  assert.deepEqual(transferStackAtCursor({ itemId: 'oak_planks', count: 5 }, null, true), {
    slot: { itemId: 'oak_planks', count: 2 },
    cursor: { itemId: 'oak_planks', count: 3 }
  });
  assert.deepEqual(transferStackAtCursor(null, { itemId: 'oak_planks', count: 5 }, true), {
    slot: { itemId: 'oak_planks', count: 1 },
    cursor: { itemId: 'oak_planks', count: 4 }
  });
  assert.deepEqual(
    transferStackBetweenSlots({ itemId: 'oak_planks', count: 10 }, { itemId: 'oak_planks', count: 60 }),
    {
      source: { itemId: 'oak_planks', count: 6 },
      target: { itemId: 'oak_planks', count: 64 }
    }
  );
  const returned = returnStacksToInventory(empty, [{ itemId: 'wooden_pickaxe', count: 1, damage: 12 }]);
  assert.deepEqual(returned.inventory[0], { itemId: 'wooden_pickaxe', count: 1, damage: 12 });
  assert.deepEqual(returned.remainder, []);
}
