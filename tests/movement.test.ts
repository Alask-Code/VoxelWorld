import assert from 'node:assert/strict';
import {
  calculateMovementVector,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
  playerCollidesWithBlocks,
  playerHasGroundSupport,
  playerIntersectsBlock,
  playerPositionAfterPillarPlacement,
  sweepPlayerAxis
} from '../src/engine/playerMovement';
import { advanceOxygen, MAX_OXYGEN_TICKS } from '../src/engine/playerOxygen';

export default function testCameraRelativeMovement() {
  const [forwardAtDefaultX, forwardAtDefaultZ] = calculateMovementVector(0, 1, 0);
  assert.ok(Math.abs(forwardAtDefaultX) < 1e-10);
  assert.equal(forwardAtDefaultZ, -1);

  const [rightAtDefaultX, rightAtDefaultZ] = calculateMovementVector(0, 0, 1);
  assert.equal(rightAtDefaultX, 1);
  assert.ok(Math.abs(rightAtDefaultZ) < 1e-10);

  const [forwardAfterTurningX, forwardAfterTurningZ] = calculateMovementVector(Math.PI / 2, 1, 0);
  assert.equal(forwardAfterTurningX, -1);
  assert.ok(Math.abs(forwardAfterTurningZ) < 1e-10);

  assert.equal(PLAYER_WIDTH, 0.5);
  assert.equal(PLAYER_HEIGHT, 2);
  assert.equal(playerIntersectsBlock([0.5, 0, 0.5], [0, -1, 0]), false);
  assert.equal(playerIntersectsBlock([0.5, 0, 0.5], [0, 2, 0]), false);
  assert.equal(playerIntersectsBlock([0.5, 0, 0.5], [1, 0, 0]), false);
  assert.equal(playerIntersectsBlock([0.1, 0, 0.5], [0, 1, 0]), true);
  assert.equal(playerIntersectsBlock([0.5, 0, 0.5], [0, 1, 0]), true);
  assert.equal(playerIntersectsBlock([0.5, 0, 0.5], [0, 2, 0]), false);
  assert.deepEqual(playerPositionAfterPillarPlacement([0.5, 5.4, 0.5], [0, 5, 0]), [0.5, 6, 0.5]);
  assert.equal(playerPositionAfterPillarPlacement([0.5, 5.4, 0.5], [1, 5, 0]), null);
  assert.equal(playerPositionAfterPillarPlacement([0.5, 6.1, 0.5], [0, 5, 0]), null);
  assert.equal(
    playerCollidesWithBlocks([0.5, 0, 0.5], (x, y, z) => x === 0 && y === 1 && z === 0),
    true
  );
  assert.equal(
    playerCollidesWithBlocks([0.5, 0, 0.5], (x, y, z) => x === 0 && y === 2 && z === 0),
    false
  );
  assert.equal(
    playerCollidesWithBlocks([0.5, 1, 0.5], (x, y, z) => x === 0 && z === 0 && (y === 0 || y === 3)),
    false
  );
  assert.equal(
    playerCollidesWithBlocks([0.5, 6, 0.5], (x, y, z) => x === 0 && z === 0 && y === 8),
    false
  );
  assert.equal(
    playerHasGroundSupport([0.5, 2, 0.5], (x, y, z) => x === 0 && y === 1 && z === 0),
    true
  );
  assert.equal(
    playerHasGroundSupport([0.5, 2, 0.5], () => false),
    false
  );

  const resolvedMovement = sweepPlayerAxis([0.5, 0, 0.5], 0, 1, (candidate) =>
    playerCollidesWithBlocks(candidate, (x, y, z) => x === 1 && y === 0 && z === 0)
  );
  assert.ok(resolvedMovement > 0.24 && resolvedMovement < 0.26);
  assert.equal(
    playerCollidesWithBlocks([0.5 + resolvedMovement, 0, 0.5], (x, y, z) => x === 1 && y === 0 && z === 0),
    false
  );

  assert.deepEqual(advanceOxygen(MAX_OXYGEN_TICKS, true, 1), {
    oxygenTicks: MAX_OXYGEN_TICKS - 1,
    damage: 0
  });
  assert.deepEqual(advanceOxygen(1, true, 20), { oxygenTicks: 0, damage: 2 });
  assert.deepEqual(advanceOxygen(0, false, 21), { oxygenTicks: 10, damage: 0 });
  assert.deepEqual(advanceOxygen(MAX_OXYGEN_TICKS, false, 22), {
    oxygenTicks: MAX_OXYGEN_TICKS,
    damage: 0
  });
}
