import { addItem } from '../domain/inventory';
import type { DroppedItemSnapshot, ItemStack } from '../domain/world';

const PICKUP_RADIUS_SQUARED = 1.5 * 1.5;
const DROPPED_ITEM_HALF_SIZE = 0.14;
const GRAVITY = 20;
const MAX_PHYSICS_STEP = 0.05;

export function dropPosition(block: readonly [number, number, number]): [number, number, number] {
  return [block[0] + 0.5, block[1] + 0.5, block[2] + 0.5];
}

function droppedItemCollides(
  position: readonly [number, number, number],
  isSolidBlock: (x: number, y: number, z: number) => boolean
): boolean {
  const epsilon = 0.001;
  const minX = Math.floor(position[0] - DROPPED_ITEM_HALF_SIZE + epsilon);
  const maxX = Math.floor(position[0] + DROPPED_ITEM_HALF_SIZE - epsilon);
  const minY = Math.floor(position[1] - DROPPED_ITEM_HALF_SIZE + epsilon);
  const maxY = Math.floor(position[1] + DROPPED_ITEM_HALF_SIZE - epsilon);
  const minZ = Math.floor(position[2] - DROPPED_ITEM_HALF_SIZE + epsilon);
  const maxZ = Math.floor(position[2] + DROPPED_ITEM_HALF_SIZE - epsilon);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (isSolidBlock(x, y, z)) return true;
      }
    }
  }
  return false;
}

function sweepDropAxis(
  position: readonly [number, number, number],
  axis: 0 | 1 | 2,
  distance: number,
  isBlocked: (candidate: readonly [number, number, number]) => boolean
): { distance: number; collided: boolean } {
  const steps = Math.max(1, Math.ceil(Math.abs(distance) / MAX_PHYSICS_STEP));
  const step = distance / steps;
  let moved = 0;

  for (let index = 0; index < steps; index += 1) {
    const candidate: [number, number, number] = [...position];
    candidate[axis] += moved + step;
    if (isBlocked(candidate)) {
      let safeDistance = moved;
      let blockedDistance = moved + step;
      for (let refinement = 0; refinement < 8; refinement += 1) {
        const midpoint = (safeDistance + blockedDistance) / 2;
        const refined: [number, number, number] = [...position];
        refined[axis] += midpoint;
        if (isBlocked(refined)) blockedDistance = midpoint;
        else safeDistance = midpoint;
      }
      return { distance: safeDistance, collided: true };
    }
    moved += step;
  }
  return { distance: moved, collided: false };
}

export function advanceDroppedItems(
  droppedItems: DroppedItemSnapshot[],
  isSolidBlock: (x: number, y: number, z: number) => boolean,
  delta = 1 / 20
): DroppedItemSnapshot[] {
  return droppedItems.map((drop) => {
    if (!drop.velocity) return drop;

    const velocity: [number, number, number] = [...drop.velocity];
    velocity[1] = Math.max(-30, velocity[1] - GRAVITY * delta);
    const position: [number, number, number] = [...drop.position];
    let changed = false;

    ([0, 1, 2] as const).forEach((axis) => {
      const movement = sweepDropAxis(position, axis, velocity[axis] * delta, (candidate) =>
        droppedItemCollides(candidate, isSolidBlock)
      );
      position[axis] += movement.distance;
      if (movement.collided) {
        if (axis === 1 && velocity[axis] < -2) velocity[axis] = -velocity[axis] * 0.2;
        else velocity[axis] = 0;
      }
      if (movement.distance !== 0 || movement.collided) changed = true;
    });

    velocity[0] *= Math.max(0, 1 - delta * 5);
    velocity[2] *= Math.max(0, 1 - delta * 5);
    if (Math.abs(velocity[1]) < 0.15) velocity[1] = 0;
    const atRest = velocity.every((component) => component === 0);
    if (!changed && atRest) return drop;

    return {
      ...drop,
      position,
      ...(atRest ? { velocity: undefined } : { velocity })
    };
  });
}

export function collectDroppedItems(
  inventory: Array<ItemStack | null>,
  droppedItems: DroppedItemSnapshot[],
  playerPosition: readonly [number, number, number],
  timeTicks: number
): { inventory: Array<ItemStack | null>; droppedItems: DroppedItemSnapshot[]; pickedUp: boolean } {
  let nextInventory = inventory;
  let pickedUp = false;
  const remainingDrops: DroppedItemSnapshot[] = [];

  droppedItems.forEach((drop) => {
    const dx = playerPosition[0] - drop.position[0];
    const dy = playerPosition[1] - drop.position[1];
    const dz = playerPosition[2] - drop.position[2];
    if (timeTicks < drop.pickupAfterTick || dx * dx + dy * dy + dz * dz > PICKUP_RADIUS_SQUARED) {
      remainingDrops.push(drop);
      return;
    }

    const result = addItem(nextInventory, drop.itemId, drop.count);
    if (result.remainder === drop.count) {
      remainingDrops.push(drop);
      return;
    }
    pickedUp = true;
    nextInventory = result.inventory;
    if (result.remainder > 0) remainingDrops.push({ ...drop, count: result.remainder });
  });

  return {
    inventory: nextInventory,
    droppedItems: pickedUp ? remainingDrops : droppedItems,
    pickedUp
  };
}
