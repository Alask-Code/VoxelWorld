import { DataTexture, NearestFilter, RGBAFormat, SRGBColorSpace } from 'three';
import { BLOCK_TEXTURE_COLUMNS, BLOCK_TEXTURE_IDS, BLOCK_TEXTURE_SIZE } from '../domain/blockTextures';

type Rgb = readonly [number, number, number];
type Pattern =
  | 'noise'
  | 'stone'
  | 'ore'
  | 'dirt'
  | 'grass'
  | 'grass-side'
  | 'sand'
  | 'snow'
  | 'water'
  | 'bark'
  | 'rings'
  | 'planks'
  | 'leaves'
  | 'table-side'
  | 'table-top'
  | 'furnace-side'
  | 'furnace-front'
  | 'furnace-top';

interface TextureStyle {
  palette: readonly Rgb[];
  pattern: Pattern;
}

const styles: Record<typeof BLOCK_TEXTURE_IDS[number], TextureStyle> = {
  bedrock: {
    palette: [
      [30, 33, 30],
      [49, 53, 46],
      [69, 70, 61]
    ],
    pattern: 'noise'
  },
  stone: {
    palette: [
      [92, 99, 94],
      [119, 124, 116],
      [143, 143, 130]
    ],
    pattern: 'stone'
  },
  coal_ore: {
    palette: [
      [83, 91, 87],
      [111, 117, 109],
      [34, 39, 38],
      [54, 60, 54]
    ],
    pattern: 'ore'
  },
  dirt: {
    palette: [
      [105, 71, 48],
      [128, 88, 59],
      [151, 105, 68]
    ],
    pattern: 'dirt'
  },
  grass_top: {
    palette: [
      [76, 130, 59],
      [91, 151, 66],
      [111, 169, 77]
    ],
    pattern: 'grass'
  },
  grass_side: {
    palette: [
      [105, 72, 48],
      [132, 91, 58],
      [76, 130, 59],
      [96, 153, 67]
    ],
    pattern: 'grass-side'
  },
  sand: {
    palette: [
      [187, 165, 105],
      [207, 188, 128],
      [223, 204, 148]
    ],
    pattern: 'sand'
  },
  snow: {
    palette: [
      [174, 197, 200],
      [207, 223, 222],
      [232, 239, 230]
    ],
    pattern: 'snow'
  },
  water: {
    palette: [
      [48, 105, 139],
      [59, 129, 158],
      [79, 151, 172]
    ],
    pattern: 'water'
  },
  oak_log_side: {
    palette: [
      [87, 57, 34],
      [118, 79, 44],
      [144, 102, 57]
    ],
    pattern: 'bark'
  },
  oak_log_top: {
    palette: [
      [115, 81, 47],
      [150, 112, 67],
      [174, 133, 82]
    ],
    pattern: 'rings'
  },
  oak_planks: {
    palette: [
      [138, 98, 57],
      [161, 119, 71],
      [181, 139, 86]
    ],
    pattern: 'planks'
  },
  leaves: {
    palette: [
      [42, 91, 46],
      [55, 116, 52],
      [73, 139, 61]
    ],
    pattern: 'leaves'
  },
  crafting_table_side: {
    palette: [
      [106, 69, 39],
      [143, 97, 52],
      [176, 128, 69]
    ],
    pattern: 'table-side'
  },
  crafting_table_top: {
    palette: [
      [117, 79, 46],
      [154, 111, 64],
      [187, 143, 83]
    ],
    pattern: 'table-top'
  },
  furnace_side: {
    palette: [
      [84, 89, 84],
      [108, 113, 106],
      [132, 137, 127]
    ],
    pattern: 'furnace-side'
  },
  furnace_front: {
    palette: [
      [82, 88, 84],
      [43, 48, 46],
      [149, 95, 48],
      [211, 147, 63]
    ],
    pattern: 'furnace-front'
  },
  furnace_top: {
    palette: [
      [89, 95, 90],
      [117, 123, 116],
      [139, 143, 131]
    ],
    pattern: 'furnace-top'
  }
};

function randomPixel(x: number, y: number, salt: number): number {
  let value = Math.imul(x + salt * 31, 374761393) + Math.imul(y + salt * 17, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function paletteColor(style: TextureStyle, x: number, y: number, salt: number): Rgb {
  const index = Math.floor(randomPixel(x, y, salt) * style.palette.length);
  return style.palette[Math.min(index, style.palette.length - 1)];
}

function pixel(style: TextureStyle, x: number, y: number, salt: number): [Rgb, number] {
  const noise = randomPixel(x, y, salt);
  const color = (index: number) => style.palette[Math.min(index, style.palette.length - 1)];
  switch (style.pattern) {
    case 'stone':
    case 'noise':
    case 'dirt':
    case 'sand':
    case 'snow':
      return [paletteColor(style, x, y, salt), 255];
    case 'ore': {
      const cluster = (x * 7 + y * 11 + salt) % 17;
      return [cluster < 5 && noise > 0.22 ? color(2 + Math.floor(noise * 2)) : color(noise > 0.72 ? 1 : 0), 255];
    }
    case 'grass':
      return [color(noise > 0.72 ? 2 : noise > 0.28 ? 1 : 0), 255];
    case 'grass-side':
      if (y < 3 || (y === 3 && noise > 0.2)) return [color(y === 3 ? 2 : 1 + Math.floor(noise * 2)), 255];
      return [color(noise > 0.72 ? 1 : 0), 255];
    case 'water':
      return [color((Math.floor(y / 3) + Math.floor(x / 6) + Math.floor(noise * 2)) % 3), 158];
    case 'bark': {
      const groove = x % 5 === 0 || (x + y * 2) % 13 === 0;
      return [color(groove ? 0 : noise > 0.72 ? 2 : 1), 255];
    }
    case 'rings': {
      const distance = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      return [color(Math.floor(distance + noise * 2) % 3), 255];
    }
    case 'planks': {
      const seam = y % 5 === 0 || (y % 5 === 1 && x % 8 === 0);
      const knot = Math.abs(x - (4 + Math.floor(y / 5) * 3)) < 2 && y % 5 === 3;
      return [color(seam ? 0 : knot ? 2 : noise > 0.6 ? 2 : 1), 255];
    }
    case 'leaves':
      return [color(noise > 0.68 ? 2 : noise > 0.3 ? 1 : 0), noise > 0.96 ? 0 : 255];
    case 'table-side': {
      const border = y < 3 || y > 12;
      const squares = x % 6 === 0;
      return [color(border || squares ? 0 : noise > 0.65 ? 2 : 1), 255];
    }
    case 'table-top': {
      const grid = x % 4 === 0 || y % 4 === 0;
      return [color(grid ? 0 : noise > 0.7 ? 2 : 1), 255];
    }
    case 'furnace-side': {
      const mortar = x % 8 === 0 || y % 5 === 0;
      return [color(mortar ? 0 : noise > 0.72 ? 2 : 1), 255];
    }
    case 'furnace-front': {
      const opening = x >= 4 && x <= 11 && y >= 5 && y <= 13;
      const ember = opening && y > 10 && x > 6 && x < 10 && noise > 0.55;
      return [color(ember ? 3 : opening ? 1 : 0), 255];
    }
    case 'furnace-top': {
      const rim = x < 2 || x > 13 || y < 2 || y > 13;
      return [color(rim ? 0 : noise > 0.65 ? 2 : 1), 255];
    }
    default:
      return [color(0), 255];
  }
}

export function createBlockTextureAtlas(): DataTexture {
  const rows = Math.ceil(BLOCK_TEXTURE_IDS.length / BLOCK_TEXTURE_COLUMNS);
  const width = BLOCK_TEXTURE_COLUMNS * BLOCK_TEXTURE_SIZE;
  const height = rows * BLOCK_TEXTURE_SIZE;
  const data = new Uint8Array(width * height * 4);

  BLOCK_TEXTURE_IDS.forEach((textureId, textureIndex) => {
    const tileX = (textureIndex % BLOCK_TEXTURE_COLUMNS) * BLOCK_TEXTURE_SIZE;
    const tileY = Math.floor(textureIndex / BLOCK_TEXTURE_COLUMNS) * BLOCK_TEXTURE_SIZE;
    const style = styles[textureId];
    for (let y = 0; y < BLOCK_TEXTURE_SIZE; y += 1) {
      for (let x = 0; x < BLOCK_TEXTURE_SIZE; x += 1) {
        const [rgb, alpha] = pixel(style, x, y, textureIndex + 1);
        const offset = ((tileY + y) * width + tileX + x) * 4;
        data[offset] = rgb[0];
        data[offset + 1] = rgb[1];
        data[offset + 2] = rgb[2];
        data[offset + 3] = alpha;
      }
    }
  });

  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
