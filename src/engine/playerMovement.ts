export const PLAYER_WIDTH = 0.5;
export const PLAYER_HEIGHT = 2;
export const PLAYER_EYE_HEIGHT = 1.62;
export const PLAYER_COLLISION_EPSILON = 0.001;
export const PLAYER_MAX_MOVE_STEP = 0.1;

export function calculateMovementVector(yaw: number, forward: number, strafe: number): [number, number] {
  return [-Math.sin(yaw) * forward + Math.cos(yaw) * strafe, -Math.cos(yaw) * forward - Math.sin(yaw) * strafe];
}

export function playerIntersectsBlock(
  position: readonly [number, number, number],
  block: readonly [number, number, number]
): boolean {
  const halfWidth = PLAYER_WIDTH / 2;
  const epsilon = PLAYER_COLLISION_EPSILON;
  return (
    position[0] + halfWidth - epsilon > block[0] &&
    position[0] - halfWidth + epsilon < block[0] + 1 &&
    position[1] + PLAYER_HEIGHT - epsilon > block[1] &&
    position[1] + epsilon < block[1] + 1 &&
    position[2] + halfWidth - epsilon > block[2] &&
    position[2] - halfWidth + epsilon < block[2] + 1
  );
}

export function playerPositionAfterPillarPlacement(
  position: readonly [number, number, number],
  block: readonly [number, number, number]
): [number, number, number] | null {
  if (
    !playerIntersectsBlock(position, block) ||
    Math.floor(position[0]) !== block[0] ||
    Math.floor(position[1]) !== block[1] ||
    Math.floor(position[2]) !== block[2]
  ) {
    return null;
  }
  return [position[0], block[1] + 1, position[2]];
}

export function playerCollidesWithBlocks(
  position: readonly [number, number, number],
  isSolidBlock: (x: number, y: number, z: number) => boolean
): boolean {
  const halfWidth = PLAYER_WIDTH / 2;
  const epsilon = PLAYER_COLLISION_EPSILON;
  const minX = Math.floor(position[0] - halfWidth + epsilon);
  const maxX = Math.floor(position[0] + halfWidth - epsilon);
  const minY = Math.floor(position[1] + epsilon);
  const maxY = Math.floor(position[1] + PLAYER_HEIGHT - epsilon);
  const minZ = Math.floor(position[2] - halfWidth + epsilon);
  const maxZ = Math.floor(position[2] + halfWidth - epsilon);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        if (isSolidBlock(x, y, z)) return true;
      }
    }
  }
  return false;
}

export function playerHasGroundSupport(
  position: readonly [number, number, number],
  isSolidBlock: (x: number, y: number, z: number) => boolean
): boolean {
  const halfWidth = PLAYER_WIDTH / 2;
  const epsilon = PLAYER_COLLISION_EPSILON;
  const blockY = Math.floor(position[1] - 0.01);
  const minX = Math.floor(position[0] - halfWidth + epsilon);
  const maxX = Math.floor(position[0] + halfWidth - epsilon);
  const minZ = Math.floor(position[2] - halfWidth + epsilon);
  const maxZ = Math.floor(position[2] + halfWidth - epsilon);

  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      if (isSolidBlock(x, blockY, z)) return true;
    }
  }
  return false;
}

export function sweepPlayerAxis(
  position: readonly [number, number, number],
  axis: 0 | 1 | 2,
  distance: number,
  isBlocked: (candidate: readonly [number, number, number]) => boolean
): number {
  if (distance === 0) return 0;
  const steps = Math.ceil(Math.abs(distance) / PLAYER_MAX_MOVE_STEP);
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
        const refinedCandidate: [number, number, number] = [...position];
        refinedCandidate[axis] += midpoint;
        if (isBlocked(refinedCandidate)) blockedDistance = midpoint;
        else safeDistance = midpoint;
      }
      return safeDistance;
    }
    moved += step;
  }

  return moved;
}
