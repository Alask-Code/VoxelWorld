import assert from 'node:assert/strict';
import { itemById } from '../src/domain/content';
import { craft, findCraftingRecipe, RECIPES } from '../src/domain/recipes';
import type { ItemStack } from '../src/domain/world';

export default function testCraftingRules() {
  const grid: Array<ItemStack | null> = [
    { itemId: 'oak_planks', count: 1 },
    { itemId: 'oak_planks', count: 1 },
    { itemId: 'oak_planks', count: 1 },
    { itemId: 'oak_planks', count: 1 }
  ];
  const recipe = findCraftingRecipe(grid, 2, 2);
  assert.equal(recipe?.id, 'crafting_table');
  const result = craft(
    Array.from({ length: 36 }, () => null),
    grid,
    2,
    2,
    recipe!
  );
  assert.ok(result);
  assert.deepEqual(result.inventory[0], { itemId: 'crafting_table', count: 1 });
  assert.deepEqual(result.grid, [null, null, null, null]);

  const invalid = findCraftingRecipe(
    [{ itemId: 'oak_planks', count: 1 }, { itemId: 'stick', count: 1 }, null, null],
    2,
    2
  );
  assert.equal(invalid, null);

  const toolIds = ['wooden_sword', 'wooden_pickaxe', 'wooden_axe', 'wooden_hoe', 'wooden_shovel'];
  toolIds.forEach((itemId) => {
    assert.equal(itemById.get(itemId)?.category, 'tool');
    assert.ok(itemById.get(itemId)?.durability);
    assert.ok(RECIPES.some((entry) => entry.result.itemId === itemId));
  });
  assert.equal(
    findCraftingRecipe(
      [{ itemId: 'oak_planks', count: 1 }, { itemId: 'oak_planks', count: 1 }, null, { itemId: 'stick', count: 1 }],
      2,
      2
    )?.id,
    'wooden_hoe'
  );
}
