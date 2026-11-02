export const MAX_OXYGEN_TICKS = 300;
export const OXYGEN_TICKS_PER_BUBBLE = 30;

export function advanceOxygen(
  oxygenTicks: number,
  submerged: boolean,
  worldTick: number
): { oxygenTicks: number; damage: number } {
  if (!submerged) {
    return { oxygenTicks: Math.min(MAX_OXYGEN_TICKS, oxygenTicks + 10), damage: 0 };
  }

  const nextOxygen = Math.max(0, oxygenTicks - 1);
  const damage = nextOxygen === 0 && worldTick % 20 === 0 ? 2 : 0;
  return { oxygenTicks: nextOxygen, damage };
}
