export type BlockPosition = [number, number, number];
export type BlockNormal = readonly [number, number, number];

export function blockFromSurface(point: readonly [number, number, number], normal: BlockNormal): BlockPosition {
  const epsilon = 0.015;
  return [
    Math.floor(point[0] - normal[0] * epsilon),
    Math.floor(point[1] - normal[1] * epsilon),
    Math.floor(point[2] - normal[2] * epsilon)
  ];
}

export function adjacentBlock(block: BlockPosition, normal: BlockNormal): BlockPosition {
  return [block[0] + Math.round(normal[0]), block[1] + Math.round(normal[1]), block[2] + Math.round(normal[2])];
}
