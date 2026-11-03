export const BLOCK_TEXTURE_SIZE = 16;
export const BLOCK_TEXTURE_COLUMNS = 6;

export const BLOCK_TEXTURE_IDS = [
  'bedrock',
  'stone',
  'coal_ore',
  'dirt',
  'grass_top',
  'grass_side',
  'sand',
  'snow',
  'water',
  'oak_log_side',
  'oak_log_top',
  'oak_planks',
  'leaves',
  'crafting_table_side',
  'crafting_table_top',
  'furnace_side',
  'furnace_front',
  'furnace_top'
] as const;

export type BlockTextureId = typeof BLOCK_TEXTURE_IDS[number];

const textureIndex = new Map<BlockTextureId, number>(BLOCK_TEXTURE_IDS.map((textureId, index) => [textureId, index]));

export function textureForBlockFace(blockId: string, faceIndex: number): BlockTextureId {
  if (blockId === 'grass') {
    if (faceIndex === 2) return 'grass_top';
    if (faceIndex === 3) return 'dirt';
    return 'grass_side';
  }
  if (blockId === 'oak_log') return faceIndex === 2 || faceIndex === 3 ? 'oak_log_top' : 'oak_log_side';
  if (blockId === 'crafting_table') return faceIndex === 2 ? 'crafting_table_top' : 'crafting_table_side';
  if (blockId === 'furnace') {
    if (faceIndex === 2) return 'furnace_top';
    if (faceIndex === 4) return 'furnace_front';
    return 'furnace_side';
  }
  const textureId = BLOCK_TEXTURE_IDS.find((candidate) => candidate === blockId);
  if (textureId) return textureId;
  return 'stone';
}

export function textureIndexForBlockFace(blockId: string, faceIndex: number): number {
  return textureIndex.get(textureForBlockFace(blockId, faceIndex)) ?? 1;
}
