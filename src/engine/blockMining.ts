import type { BlockDefinition } from '../domain/content';

const MINING_TIME_FLOOR_SECONDS = 0.1;

export function hasCorrectMiningTool(
  block: Pick<BlockDefinition, 'toolTags'>,
  toolId: string | undefined
): boolean {
  return block.toolTags.length === 0 || block.toolTags.some((tag) => toolId?.endsWith(`_${tag}`));
}

export function blockDropForTool(
  block: Pick<BlockDefinition, 'drops' | 'toolTags' | 'requiresCorrectToolForDrop'>,
  toolId: string | undefined,
  survival: boolean
): string | null {
  if (!survival || block.drops.length === 0) return null;
  if (block.requiresCorrectToolForDrop && !hasCorrectMiningTool(block, toolId)) return null;
  return block.drops[0];
}

export function blockMiningDuration(
  block: Pick<BlockDefinition, 'hardness' | 'toolTags' | 'drops'>,
  toolId: string | undefined,
  creative: boolean
): number | null {
  if (block.hardness < 0 || block.drops.length === 0) return null;
  if (creative) return MINING_TIME_FLOOR_SECONDS;
  const correctTool = hasCorrectMiningTool(block, toolId);
  const speed = correctTool ? 5 : 1;
  return Math.max(MINING_TIME_FLOOR_SECONDS, (block.hardness * (correctTool ? 1 : 1.5)) / speed);
}
