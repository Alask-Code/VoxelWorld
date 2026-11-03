import React, { useId, useMemo } from 'react';
import { blockById, itemById } from '../domain/content';

export type IconPixels = Array<string | null>;

function colorChannels(color: string): [number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16)
  ];
}

function shade(color: string, amount: number): string {
  const channels = colorChannels(color).map((channel) => Math.max(0, Math.min(255, Math.round(channel + amount))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function createItemIconPixels(itemId: string): IconPixels {
  const pixels: IconPixels = Array.from({ length: 16 * 16 }, () => null);
  const setPixel = (x: number, y: number, color: string) => {
    if (x >= 0 && x < 16 && y >= 0 && y < 16) pixels[y * 16 + x] = color;
  };
  const fillRect = (x: number, y: number, width: number, height: number, color: string) => {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) setPixel(column, row, color);
    }
  };
  const drawLine = (startX: number, startY: number, endX: number, endY: number, color: string) => {
    const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
    for (let step = 0; step <= steps; step += 1) {
      const progress = steps === 0 ? 0 : step / steps;
      const x = Math.round(startX + (endX - startX) * progress);
      const y = Math.round(startY + (endY - startY) * progress);
      fillRect(x - 1, y - 1, 2, 2, color);
    }
  };

  const item = itemById.get(itemId);
  const block = blockById.get(item?.placeBlock ?? itemId);
  if (block) {
    const [red, green, blue] = colorChannels(block.color);
    const base = `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
    for (let y = 1; y < 15; y += 1) {
      for (let x = 1; x < 15; x += 1) {
        const noise = Math.abs(Math.sin((x + itemId.length * 17) * 12.9898 + (y + itemId.charCodeAt(0)) * 78.233));
        const variation = (Math.floor(noise * 1000) % 5) * 9 - 18;
        setPixel(x, y, shade(base, variation));
      }
    }
    if (itemId === 'oak_log') {
      for (let y = 1; y < 15; y += 1) {
        setPixel(4, y, shade(base, -28));
        setPixel(10, y, shade(base, 24));
      }
      fillRect(5, 5, 5, 5, shade(base, 35));
      fillRect(7, 7, 2, 2, shade(base, -8));
    } else if (itemId === 'oak_planks') {
      [5, 10].forEach((y) => fillRect(1, y, 14, 1, shade(base, -26)));
      [6, 12].forEach((x, index) => fillRect(x, index === 0 ? 1 : 6, 1, 4, shade(base, -18)));
    } else if (itemId === 'furnace') {
      fillRect(4, 5, 8, 7, '#292d2a');
      fillRect(5, 6, 6, 5, '#141716');
      fillRect(7, 10, 3, 1, '#e58a37');
    }
    return pixels;
  }

  if (itemId.includes('wooden_')) {
    const wood = '#86552f';
    const woodHighlight = '#bd8950';
    const metal = '#c5d0ca';
    const metalShadow = '#75857e';
    if (itemId.endsWith('_sword')) {
      drawLine(5, 11, 12, 4, metal);
      drawLine(4, 12, 8, 8, wood);
      drawLine(3, 10, 7, 14, woodHighlight);
      fillRect(10, 3, 4, 2, '#edf0e3');
    } else {
      drawLine(4, 13, 11, 5, wood);
      drawLine(5, 13, 12, 5, woodHighlight);
      if (itemId.endsWith('_pickaxe')) {
        drawLine(6, 4, 13, 3, metal);
        fillRect(11, 2, 3, 2, metalShadow);
      } else if (itemId.endsWith('_axe')) {
        fillRect(10, 2, 4, 2, metal);
        fillRect(9, 3, 5, 3, metal);
        fillRect(9, 5, 3, 2, metalShadow);
      } else if (itemId.endsWith('_shovel')) {
        fillRect(10, 2, 4, 4, metal);
        fillRect(11, 3, 2, 2, '#e3e9dc');
        setPixel(10, 6, metalShadow);
      } else if (itemId.endsWith('_hoe')) {
        drawLine(9, 4, 14, 3, metal);
        fillRect(12, 2, 3, 2, metalShadow);
      }
    }
    return pixels;
  }

  const itemColors: typeof itemId extends string ? { [K in typeof itemId]?: string } : never = {
    coal: '#343936',
    snowball: '#e5eee8',
    oak_sapling: '#4b9445',
    stick: '#9a7045',
    bread: '#c78d43'
  };

  const materialColor = itemColors[itemId] ?? '#a9b5ad';
  for (let y = 2; y < 14; y += 1) {
    for (let x = 2; x < 14; x += 1) {
      const distance = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      const inside =
        itemId === 'coal' || itemId === 'stick'
          ? (x * 7 + y * 11 + itemId.length) % 9 < 6
          : distance < (itemId === 'bread' ? 13 : 11);
      if (inside) setPixel(x, y, shade(materialColor, ((x + y) % 3) * 18 - 12));
    }
  }
  if (itemId === 'stick') drawLine(4, 12, 11, 4, '#d0a16a');
  if (itemId === 'oak_sapling') {
    fillRect(7, 8, 2, 5, '#80552f');
    fillRect(5, 4, 3, 3, '#4b9445');
    fillRect(8, 3, 4, 4, '#66b34e');
    fillRect(10, 6, 3, 2, '#4b9445');
  }
  if (itemId === 'bread') {
    [5, 8, 11].forEach((x) => setPixel(x, 6, '#f0d091'));
  }
  return pixels;
}

function pixelPaths(pixels: IconPixels): Array<{ color: string; path: string }> {
  const paths = new Map<string, string[]>();
  for (let y = 0; y < 16; y += 1) {
    let x = 0;
    while (x < 16) {
      const color = pixels[y * 16 + x];
      if (!color) {
        x += 1;
      } else {
        let endX = x + 1;
        while (endX < 16 && pixels[y * 16 + endX] === color) endX += 1;
        const commands = paths.get(color) ?? [];
        commands.push(`M${x} ${y}h${endX - x}v1h-${endX - x}z`);
        paths.set(color, commands);
        x = endX;
      }
    }
  }
  return Array.from(paths, ([color, commands]) => ({ color, path: commands.join('') }));
}

export default function ItemIcon({ itemId }: { itemId: string }) {
  const paths = useMemo(() => pixelPaths(createItemIconPixels(itemId)), [itemId]);
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const item = itemById.get(itemId);
  const block = item?.category === 'block' ? blockById.get(item.placeBlock ?? itemId) : undefined;
  if (block) {
    return (
      <svg aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16">
        <defs>
          <clipPath id={clipId}>
            <path d="M2 5 8 9v6l-6-3z" />
          </clipPath>
        </defs>
        <path d="M2 5 8 1l6 4-6 4z" fill={shade(block.color, 34)} stroke={shade(block.color, -55)} />
        <path d="M8 9 14 5v7l-6 3z" fill={shade(block.color, -32)} stroke={shade(block.color, -65)} />
        <path d="M2 5 8 9v6l-6-3z" fill={block.color} stroke={shade(block.color, -65)} />
        <g clipPath={`url(#${clipId})`}>
          <rect width="16" height="16" fill={block.color} />
          {paths.map(({ color, path }) => (
            <path d={path} fill={color} key={color} />
          ))}
        </g>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" shapeRendering="crispEdges" viewBox="0 0 16 16">
      {paths.map(({ color, path }) => (
        <path d={path} fill={color} key={color} />
      ))}
    </svg>
  );
}
