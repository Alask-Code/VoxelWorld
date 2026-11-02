export interface BlockDefinition {
  id: string;
  numericId: number;
  name: string;
  hardness: number;
  color: string;
  toolTags: string[];
  drops: string[];
  requiresCorrectToolForDrop?: boolean;
  solid: boolean;
}

export interface ItemDefinition {
  id: string;
  name: string;
  maxStack: number;
  category: 'block' | 'tool' | 'material' | 'food' | 'armor';
  placeBlock?: string;
  durability?: number;
}

export const BLOCKS: BlockDefinition[] = [
  {
    id: 'bedrock',
    numericId: 1,
    name: 'Rocha matriz',
    hardness: -1,
    color: '#303033',
    toolTags: [],
    drops: [],
    solid: true
  },
  {
    id: 'stone',
    numericId: 2,
    name: 'Pedra',
    hardness: 1.5,
    color: '#6e716d',
    toolTags: ['pickaxe'],
    drops: ['cobblestone'],
    requiresCorrectToolForDrop: true,
    solid: true
  },
  {
    id: 'coal_ore',
    numericId: 3,
    name: 'Minério de carvão',
    hardness: 3,
    color: '#4b4d4a',
    toolTags: ['pickaxe'],
    drops: ['coal'],
    requiresCorrectToolForDrop: true,
    solid: true
  },
  {
    id: 'dirt',
    numericId: 4,
    name: 'Terra',
    hardness: 0.5,
    color: '#704a2e',
    toolTags: ['shovel'],
    drops: ['dirt'],
    solid: true
  },
  {
    id: 'grass',
    numericId: 5,
    name: 'Grama',
    hardness: 0.6,
    color: '#4f8c40',
    toolTags: ['shovel'],
    drops: ['dirt'],
    solid: true
  },
  {
    id: 'sand',
    numericId: 6,
    name: 'Areia',
    hardness: 0.5,
    color: '#c0aa6d',
    toolTags: ['shovel'],
    drops: ['sand'],
    solid: true
  },
  {
    id: 'snow',
    numericId: 7,
    name: 'Neve',
    hardness: 0.2,
    color: '#d4e0e3',
    toolTags: ['shovel'],
    drops: ['snowball'],
    solid: true
  },
  { id: 'water', numericId: 8, name: 'Água', hardness: 100, color: '#2c628f', toolTags: [], drops: [], solid: false },
  {
    id: 'oak_log',
    numericId: 9,
    name: 'Tronco de carvalho',
    hardness: 2,
    color: '#634221',
    toolTags: ['axe'],
    drops: ['oak_log'],
    solid: true
  },
  {
    id: 'oak_planks',
    numericId: 10,
    name: 'Tábuas de carvalho',
    hardness: 2,
    color: '#946b40',
    toolTags: ['axe'],
    drops: ['oak_planks'],
    solid: true
  },
  {
    id: 'leaves',
    numericId: 11,
    name: 'Folhas',
    hardness: 0.2,
    color: '#3b6d33',
    toolTags: ['shears'],
    drops: ['oak_sapling'],
    solid: true
  },
  {
    id: 'crafting_table',
    numericId: 12,
    name: 'Bancada de trabalho',
    hardness: 2.5,
    color: '#875d35',
    toolTags: ['axe'],
    drops: ['crafting_table'],
    solid: true
  },
  {
    id: 'furnace',
    numericId: 13,
    name: 'Fornalha',
    hardness: 3.5,
    color: '#646762',
    toolTags: ['pickaxe'],
    drops: ['furnace'],
    solid: true
  }
];

export const ITEMS: ItemDefinition[] = [
  ...BLOCKS.filter(
    (block) => block.id !== 'bedrock' && block.id !== 'grass' && block.id !== 'water' && block.id !== 'leaves'
  ).map((block) => ({
    id: block.id,
    name: block.name,
    maxStack: 64,
    category: 'block' as const,
    placeBlock: block.id
  })),
  { id: 'wooden_pickaxe', name: 'Picareta de madeira', maxStack: 1, category: 'tool', durability: 59 },
  { id: 'cobblestone', name: 'Pedregulho', maxStack: 64, category: 'block', placeBlock: 'stone' },
  { id: 'coal', name: 'Carvão', maxStack: 64, category: 'material' },
  { id: 'snowball', name: 'Bola de neve', maxStack: 16, category: 'material' },
  { id: 'oak_sapling', name: 'Muda de carvalho', maxStack: 64, category: 'material' },
  { id: 'stick', name: 'Graveto', maxStack: 64, category: 'material' },
  { id: 'wooden_sword', name: 'Espada de madeira', maxStack: 1, category: 'tool', durability: 59 },
  { id: 'bread', name: 'Pão', maxStack: 64, category: 'food' },
  { id: 'wooden_axe', name: 'Machado de madeira', maxStack: 1, category: 'tool', durability: 59 },
  { id: 'wooden_hoe', name: 'Rastelo de madeira', maxStack: 1, category: 'tool', durability: 59 },
  { id: 'wooden_shovel', name: 'Pá de madeira', maxStack: 1, category: 'tool', durability: 59 }
];

export const blockById = new Map(BLOCKS.map((block) => [block.id, block]));
export const itemById = new Map(ITEMS.map((item) => [item.id, item]));

export function itemName(id: string): string {
  return itemById.get(id)?.name ?? id.replace(/_/g, ' ');
}
