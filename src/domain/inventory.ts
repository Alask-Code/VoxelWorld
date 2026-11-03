import { itemById } from './content';
import type { ItemStack } from './world';

export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 9;

export function transferStackAtCursor(
  slot: ItemStack | null,
  cursor: ItemStack | null,
  single: boolean
): { slot: ItemStack | null; cursor: ItemStack | null } {
  if (!cursor) {
    if (!slot) return { slot, cursor };
    const amount = single ? Math.ceil(slot.count / 2) : slot.count;
    return {
      slot: slot.count === amount ? null : { ...slot, count: slot.count - amount },
      cursor: { ...slot, count: amount }
    };
  }

  if (!slot) {
    const amount = single ? 1 : cursor.count;
    return {
      slot: { ...cursor, count: amount },
      cursor: cursor.count === amount ? null : { ...cursor, count: cursor.count - amount }
    };
  }

  const sameStack = slot.itemId === cursor.itemId && (slot.damage ?? 0) === (cursor.damage ?? 0);
  const limit = itemById.get(cursor.itemId)?.maxStack ?? 64;
  if (sameStack && slot.count < limit) {
    const amount = single ? 1 : Math.min(cursor.count, limit - slot.count);
    return {
      slot: { ...slot, count: slot.count + amount },
      cursor: cursor.count === amount ? null : { ...cursor, count: cursor.count - amount }
    };
  }

  if (single) return { slot, cursor };
  return { slot: cursor, cursor: slot };
}

export function transferStackBetweenSlots(
  source: ItemStack | null,
  target: ItemStack | null
): { source: ItemStack | null; target: ItemStack | null } {
  if (!source) return { source, target };
  if (!target) return { source: null, target: source };

  const sameStack = source.itemId === target.itemId && (source.damage ?? 0) === (target.damage ?? 0);
  const limit = itemById.get(source.itemId)?.maxStack ?? 64;
  if (sameStack && target.count < limit) {
    const amount = Math.min(source.count, limit - target.count);
    return {
      source: source.count === amount ? null : { ...source, count: source.count - amount },
      target: { ...target, count: target.count + amount }
    };
  }
  return { source: target, target: source };
}

export function returnStacksToInventory(
  inventory: Array<ItemStack | null>,
  stacks: Array<ItemStack | null>
): { inventory: Array<ItemStack | null>; remainder: Array<ItemStack> } {
  const next = inventory.map((stack) => (stack ? { ...stack } : null));
  const remainder: ItemStack[] = [];

  stacks
    .filter((stack): stack is ItemStack => Boolean(stack))
    .forEach((stack) => {
      let remaining = stack.count;
      const maxStack = itemById.get(stack.itemId)?.maxStack ?? 64;
      next.forEach((current, index) => {
        if (
          remaining > 0 &&
          current?.itemId === stack.itemId &&
          (current.damage ?? 0) === (stack.damage ?? 0) &&
          current.count < maxStack
        ) {
          const amount = Math.min(remaining, maxStack - current.count);
          next[index] = { ...current, count: current.count + amount };
          remaining -= amount;
        }
      });
      next.forEach((current, index) => {
        if (remaining > 0 && !current) {
          const amount = Math.min(remaining, maxStack);
          next[index] = { ...stack, count: amount };
          remaining -= amount;
        }
      });
      if (remaining > 0) remainder.push({ ...stack, count: remaining });
    });

  return { inventory: next, remainder };
}

export function addItem(
  inventory: Array<ItemStack | null>,
  itemId: string,
  amount: number
): { inventory: Array<ItemStack | null>; remainder: number } {
  const next = inventory.map((stack) => (stack ? { ...stack } : null));
  const maxStack = itemById.get(itemId)?.maxStack ?? 64;
  let remaining = amount;

  for (let index = 0; index < next.length && remaining > 0; index += 1) {
    const stack = next[index];
    if (stack?.itemId === itemId && stack.count < maxStack) {
      const added = Math.min(maxStack - stack.count, remaining);
      next[index] = { ...stack, count: stack.count + added };
      remaining -= added;
    }
  }

  for (let index = 0; index < next.length && remaining > 0; index += 1) {
    if (!next[index]) {
      const added = Math.min(maxStack, remaining);
      next[index] = { itemId, count: added, ...(itemById.get(itemId)?.durability ? { damage: 0 } : {}) };
      remaining -= added;
    }
  }

  return { inventory: next, remainder: remaining };
}

export function removeItem(
  inventory: Array<ItemStack | null>,
  itemId: string,
  amount: number
): Array<ItemStack | null> | null {
  const total = inventory.reduce((sum, stack) => sum + (stack?.itemId === itemId ? stack.count : 0), 0);
  if (total < amount) return null;

  let remaining = amount;
  return inventory.map((stack) => {
    if (!stack || stack.itemId !== itemId || remaining === 0) return stack ? { ...stack } : null;
    const removed = Math.min(stack.count, remaining);
    remaining -= removed;
    return stack.count === removed ? null : { ...stack, count: stack.count - removed };
  });
}

export function removeFromSlot(
  inventory: Array<ItemStack | null>,
  slot: number,
  amount: number
): Array<ItemStack | null> | null {
  const stack = inventory[slot];
  if (!stack || !Number.isInteger(amount) || amount < 1 || stack.count < amount) return null;
  const next = inventory.map((entry) => (entry ? { ...entry } : null));
  next[slot] = stack.count === amount ? null : { ...stack, count: stack.count - amount };
  return next;
}

export function damageItem(inventory: Array<ItemStack | null>, slot: number): Array<ItemStack | null> {
  const stack = inventory[slot];
  const durability = stack ? itemById.get(stack.itemId)?.durability : undefined;
  if (!stack || durability === undefined) return inventory;

  const next = inventory.map((entry) => (entry ? { ...entry } : null));
  const damage = (stack.damage ?? 0) + 1;
  next[slot] = damage >= durability ? null : { ...stack, damage };
  return next;
}

export function moveStack(
  inventory: Array<ItemStack | null>,
  from: number,
  to: number,
  split = false
): Array<ItemStack | null> {
  if (from === to || !inventory[from] || !inventory[to]) {
    if (from === to || !inventory[from]) return inventory;
  }
  const next = inventory.map((stack) => (stack ? { ...stack } : null));
  const source = next[from];
  if (!source) return inventory;
  const target = next[to];
  const limit = itemById.get(source.itemId)?.maxStack ?? 64;

  if (target?.itemId === source.itemId && target.count < limit) {
    const amount = split ? 1 : Math.min(source.count, limit - target.count);
    next[to] = { ...target, count: target.count + amount };
    next[from] = source.count === amount ? null : { ...source, count: source.count - amount };
    return next;
  }

  if (split && !target && source.count > 1) {
    const amount = Math.ceil(source.count / 2);
    next[to] = { ...source, count: amount };
    next[from] = { ...source, count: source.count - amount };
    return next;
  }

  next[from] = target;
  next[to] = source;
  return next;
}
