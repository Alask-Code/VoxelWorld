import { addItem, removeItem } from './inventory';
import type { ItemStack } from './world';

export interface Recipe {
  id: string;
  name: string;
  type: 'shaped' | 'shapeless' | 'smelting';
  width: number;
  height: number;
  pattern: Array<string | null>;
  result: ItemStack;
  experience?: number;
  cookTicks?: number;
}

export const RECIPES: Recipe[] = [
  { id: 'oak_planks', name: 'Tábuas de carvalho', type: 'shapeless', width: 1, height: 1, pattern: ['oak_log'], result: { itemId: 'oak_planks', count: 4 } },
  { id: 'sticks', name: 'Gravetos', type: 'shaped', width: 1, height: 2, pattern: ['oak_planks', 'oak_planks'], result: { itemId: 'stick', count: 4 } },
  { id: 'crafting_table', name: 'Bancada de trabalho', type: 'shaped', width: 2, height: 2, pattern: ['oak_planks', 'oak_planks', 'oak_planks', 'oak_planks'], result: { itemId: 'crafting_table', count: 1 } },
  { id: 'wooden_pickaxe', name: 'Picareta de madeira', type: 'shaped', width: 3, height: 2, pattern: ['oak_planks', 'oak_planks', 'oak_planks', null, 'stick', null], result: { itemId: 'wooden_pickaxe', count: 1 } },
  { id: 'wooden_sword', name: 'Espada de madeira', type: 'shaped', width: 1, height: 2, pattern: ['oak_planks', 'stick'], result: { itemId: 'wooden_sword', count: 1 } },
  { id: 'wooden_axe', name: 'Machado de madeira', type: 'shaped', width: 2, height: 2, pattern: ['oak_planks', 'oak_planks', 'oak_planks', 'stick'], result: { itemId: 'wooden_axe', count: 1 } },
  { id: 'wooden_hoe', name: 'Rastelo de madeira', type: 'shaped', width: 2, height: 2, pattern: ['oak_planks', 'oak_planks', null, 'stick'], result: { itemId: 'wooden_hoe', count: 1 } },
  { id: 'wooden_shovel', name: 'Pá de madeira', type: 'shaped', width: 1, height: 2, pattern: ['oak_planks', 'stick'], result: { itemId: 'wooden_shovel', count: 1 } },
  { id: 'bread', name: 'Pão assado', type: 'smelting', width: 1, height: 1, pattern: ['wheat'], result: { itemId: 'bread', count: 1 }, experience: 0.35, cookTicks: 200 }
];

function trimGrid(grid: Array<ItemStack | null>, width: number, height: number) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  grid.forEach((stack, index) => {
    if (!stack) return;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (maxX < minX) return { width: 0, height: 0, cells: [] as Array<ItemStack | null> };
  const trimmed: Array<ItemStack | null> = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) trimmed.push(grid[y * width + x] ?? null);
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1, cells: trimmed };
}

export function findCraftingRecipe(grid: Array<ItemStack | null>, width: number, height: number): Recipe | null {
  const occupied = grid.filter((stack): stack is ItemStack => Boolean(stack));
  if (occupied.length === 0) return null;
  const normalized = trimGrid(grid, width, height);

  return RECIPES.find((recipe) => {
    if (recipe.type === 'smelting') return false;
    if (recipe.type === 'shapeless') {
      const expected = recipe.pattern.filter((item): item is string => Boolean(item));
      return occupied.length === expected.length && expected.every((itemId) => occupied.some((stack) => stack.itemId === itemId));
    }
    if (normalized.width !== recipe.width || normalized.height !== recipe.height) return false;
    return recipe.pattern.every((itemId, index) => (normalized.cells[index]?.itemId ?? null) === itemId);
  }) ?? null;
}

export function craft(
  inventory: Array<ItemStack | null>,
  grid: Array<ItemStack | null>,
  width: number,
  height: number,
  recipe: Recipe
): { inventory: Array<ItemStack | null>; grid: Array<ItemStack | null> } | null {
  if (findCraftingRecipe(grid, width, height)?.id !== recipe.id) return null;
  const nextGrid = grid.map((stack) => (stack ? { ...stack, count: stack.count - 1 } : null))
    .map((stack) => (stack && stack.count > 0 ? stack : null));
  const added = addItem(inventory, recipe.result.itemId, recipe.result.count);
  if (added.remainder > 0) return null;
  return { inventory: added.inventory, grid: nextGrid };
}

export function smelt(
  inventory: Array<ItemStack | null>,
  inputItem: string,
  fuelItem: string
): { inventory: Array<ItemStack | null>; result: ItemStack } | null {
  const recipe = RECIPES.find((entry) => entry.type === 'smelting' && entry.pattern[0] === inputItem);
  if (!recipe || !inventory.some((stack) => stack?.itemId === fuelItem)) return null;
  const afterInput = removeItem(inventory, inputItem, 1);
  if (!afterInput) return null;
  const afterFuel = removeItem(afterInput, fuelItem, 1);
  if (!afterFuel) return null;
  const added = addItem(afterFuel, recipe.result.itemId, recipe.result.count);
  return added.remainder > 0 ? null : { inventory: added.inventory, result: recipe.result };
}
