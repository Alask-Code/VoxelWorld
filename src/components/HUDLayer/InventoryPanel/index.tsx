import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

import { itemById, itemName, ITEMS } from '../../../domain/content';
import {
  returnStacksToInventory,
  transferStackAtCursor,
  transferStackBetweenSlots,
  removeItem,
  addItem
} from '../../../domain/inventory';
import { RECIPES, findCraftingRecipe, Recipe, craft } from '../../../domain/recipes';
import { ItemStack, DroppedItemSnapshot, WorldSnapshot } from '../../../domain/world';
import { useGameStore } from '../../../stores/game';
import ItemIcon from '../../ItemIcon';
import stackLabel from '../stackLabel';
import DurabilityBar from '../DurabilityBar';
import InventoryCharacterPreview from '../InventoryCharacterPreview';

export default function InventoryPanel({
  snapshot,
  creative,
  craftingTable,
  onClose
}: {
  snapshot: WorldSnapshot;
  creative: boolean;
  craftingTable: boolean;
  onClose: () => void;
}) {
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const selectedSlot = useGameStore((state) => state.selectedSlot);
  const worldId = useGameStore((state) => state.world?.manifest.id);
  const gridSize: 2 | 3 = craftingTable ? 3 : 2;
  const [grid, setGrid] = useState<Array<ItemStack | null>>(Array.from({ length: craftingTable ? 9 : 4 }, () => null));
  const [cursor, setCursor] = useState<ItemStack | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [catalogError, setCatalogError] = useState('');
  const lastDragAt = useRef(0);
  const pendingRef = useRef({ snapshot, cursor, grid });
  pendingRef.current = { snapshot, cursor, grid };
  const activeRecipes = useMemo(
    () =>
      RECIPES.filter((recipe) => recipe.type !== 'smelting' && recipe.width <= gridSize && recipe.height <= gridSize),
    [gridSize]
  );
  const matchedRecipe = findCraftingRecipe(grid, gridSize, gridSize);

  useEffect(() => {
    if (!cursor) return undefined;
    const trackCursor = (event: PointerEvent) => setCursorPosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('pointermove', trackCursor);
    return () => window.removeEventListener('pointermove', trackCursor);
  }, [cursor]);

  useEffect(
    () => () => {
      const current = useGameStore.getState();
      const pending = pendingRef.current;
      if (!worldId || !current.world || current.world.manifest.id !== worldId) return;
      const currentSnapshot = current.snapshot;
      if (!currentSnapshot) return;
      const returned = returnStacksToInventory(currentSnapshot.inventory, [...pending.grid, pending.cursor]);
      const droppedItems: DroppedItemSnapshot[] = returned.remainder.map((stack, index) => ({
        ...stack,
        id: crypto.randomUUID(),
        position: [
          currentSnapshot.player.position[0] + (index % 2 === 0 ? 0.18 : -0.18),
          currentSnapshot.player.position[1] + 0.55,
          currentSnapshot.player.position[2]
        ],
        velocity: [0, 1.4, 0],
        pickupAfterTick: currentSnapshot.timeTicks + 20
      }));
      current.setSnapshot({
        ...currentSnapshot,
        inventory: returned.inventory,
        droppedItems: [...(currentSnapshot.droppedItems ?? []), ...droppedItems]
      });
    },
    [worldId]
  );

  const transferCursorToSlot = (
    slots: Array<ItemStack | null>,
    index: number,
    setSlots: (next: Array<ItemStack | null>) => void,
    single: boolean
  ) => {
    const result = transferStackAtCursor(slots[index], cursor, single);
    if (result.slot === slots[index] && result.cursor === cursor) return;
    const next = slots.map((stack) => (stack ? { ...stack } : null));
    next[index] = result.slot;
    setSlots(next);
    setCursor(result.cursor);
  };

  const inventorySlot = (index: number, single: boolean) => {
    transferCursorToSlot(snapshot.inventory, index, (inventory) => setSnapshot({ ...snapshot, inventory }), single);
  };

  const craftingSlot = (index: number, single: boolean) => {
    transferCursorToSlot(grid, index, setGrid, single);
  };

  const transferBetweenSlots = (
    sourceArea: 'inventory' | 'crafting',
    sourceIndex: number,
    targetArea: 'inventory' | 'crafting',
    targetIndex: number
  ) => {
    if (sourceArea === targetArea && sourceIndex === targetIndex) return;
    const sourceSlots = sourceArea === 'inventory' ? snapshot.inventory : grid;
    const targetSlots = targetArea === 'inventory' ? snapshot.inventory : grid;
    if (!sourceSlots[sourceIndex]) return;
    const result = transferStackBetweenSlots(sourceSlots[sourceIndex], targetSlots[targetIndex]);
    const nextSource = sourceSlots.map((stack) => (stack ? { ...stack } : null));
    nextSource[sourceIndex] = result.source;
    if (sourceArea === targetArea) {
      nextSource[targetIndex] = result.target;
      if (sourceArea === 'inventory') setSnapshot({ ...snapshot, inventory: nextSource });
      else setGrid(nextSource);
      return;
    }
    const nextTarget = targetSlots.map((stack) => (stack ? { ...stack } : null));
    nextTarget[targetIndex] = result.target;
    if (sourceArea === 'inventory') setSnapshot({ ...snapshot, inventory: nextSource });
    else setGrid(nextSource);
    if (targetArea === 'inventory') setSnapshot({ ...snapshot, inventory: nextTarget });
    else setGrid(nextTarget);
  };

  const beginDrag = (
    event: React.DragEvent<HTMLButtonElement>,
    area: 'inventory' | 'crafting',
    index: number,
    stack: ItemStack | null
  ) => {
    if (!stack) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/x-voxel-slot', JSON.stringify({ area, index }));
  };

  const dropOnSlot = (event: React.DragEvent<HTMLButtonElement>, area: 'inventory' | 'crafting', index: number) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/x-voxel-slot');
    if (!payload) return;
    try {
      const source = JSON.parse(payload) as { area: 'inventory' | 'crafting'; index: number };
      if (
        (source.area === 'inventory' || source.area === 'crafting') &&
        Number.isInteger(source.index) &&
        source.index >= 0
      ) {
        transferBetweenSlots(source.area, source.index, area, index);
        lastDragAt.current = Date.now();
      }
    } catch (reason) {
      setCatalogError(
        reason instanceof Error ? 'Não foi possível mover o item.' : 'Arraste o item para um slot válido.'
      );
    }
  };

  const closeInventory = () => {
    const returned = returnStacksToInventory(snapshot.inventory, [...grid, cursor]);
    if (returned.remainder.length > 0) {
      setCatalogError('Libere espaço no inventário antes de fechar para guardar os itens da criação.');
      return;
    }
    setSnapshot({ ...snapshot, inventory: returned.inventory });
    pendingRef.current = { snapshot: { ...snapshot, inventory: returned.inventory }, grid: [], cursor: null };
    setCursor(null);
    setGrid([]);
    onClose();
  };

  const makeRecipe = (recipe: Recipe) => {
    const result = craft(snapshot.inventory, grid, gridSize, gridSize, recipe);
    if (!result) return;
    setSnapshot({ ...snapshot, inventory: result.inventory });
    setGrid(result.grid);
  };

  const recipeFor = (itemId: string) => {
    const recipe = RECIPES.find((entry) => entry.result.itemId === itemId && entry.type !== 'smelting');
    if (!recipe || recipe.width > gridSize || recipe.height > gridSize) return;
    const restored = returnStacksToInventory(snapshot.inventory, [...grid, cursor]);
    if (restored.remainder.length > 0) {
      setCatalogError('Libere espaço no inventário para reorganizar os ingredientes.');
      return;
    }
    const next = Array.from({ length: gridSize * gridSize }, () => null) as Array<ItemStack | null>;
    recipe.pattern.forEach((ingredient, index) => {
      if (ingredient) next[index] = { itemId: ingredient, count: 1 };
    });
    const needed = recipe.pattern.filter((ingredient): ingredient is string => Boolean(ingredient));
    let remainingInventory = restored.inventory;
    for (const ingredient of needed) {
      const updated = removeItem(remainingInventory, ingredient, 1);
      if (!updated) {
        setCatalogError('Faltam ingredientes para esta receita.');
        return;
      }
      remainingInventory = updated;
    }
    setSnapshot({ ...snapshot, inventory: remainingInventory });
    setGrid(next);
    setCursor(null);
    setCatalogError('');
  };

  const grantCreativeItem = (itemId: string) => {
    const definition = itemById.get(itemId);
    const result = addItem(snapshot.inventory, itemId, definition?.maxStack === 1 ? 1 : 64);
    setSnapshot({ ...snapshot, inventory: result.inventory });
    setCatalogError(result.remainder ? 'Não há espaço livre suficiente no inventário.' : '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 font-mono sm:p-6">
      <div className="my-auto w-full max-w-5xl border-4 border-[#171717] bg-[#c6c6c6] p-3 text-[#303030] shadow-[inset_4px_4px_0_#fff,inset_-4px_-4px_0_#555,8px_8px_0_#111] sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b-2 border-[#888] pb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-[#666] [text-shadow:1px_1px_0_#fff] sm:text-xs">
              EQUIPAMENTO E RECURSOS
            </p>
            <h2 className="mt-1 text-2xl font-black [text-shadow:2px_2px_0_#fff]">Inventário</h2>
          </div>
          <button
            className="flex size-9 items-center justify-center border-2 border-[#171717] bg-[#777] text-2xl font-black text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,2px_2px_0_#111] hover:bg-[#999] active:translate-y-0.5 active:shadow-none"
            onClick={closeInventory}
            type="button"
            aria-label={craftingTable ? 'Fechar bancada' : 'Fechar inventário'}
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="flex flex-col gap-5">
            <section className="border-2 border-[#555] bg-[#aaa] p-3 shadow-[inset_2px_2px_0_#ddd,inset_-2px_-2px_0_#777]">
              <h3 className="mb-3 text-sm font-black [text-shadow:1px_1px_0_#ddd]">Personagem</h3>
              <InventoryCharacterPreview />
            </section>
            <section className="border-2 border-[#555] bg-[#aaa] p-3 shadow-[inset_2px_2px_0_#ddd,inset_-2px_-2px_0_#777]">
              <h3 className="mb-3 text-sm font-black [text-shadow:1px_1px_0_#ddd]">Inventário</h3>
              <div className="grid grid-cols-9 gap-1.5">
                {snapshot.inventory.map((stack, index) => (
                  <button
                    aria-label={`Slot ${index + 1}${stack ? `: ${stackLabel(stack)}, ${stack.count}` : ': vazio'}`}
                    className={`item-slot relative flex aspect-square min-w-0 flex-col items-center justify-center border-2 border-[#555] bg-[#8b8b8b] shadow-[inset_2px_2px_0_#bbb,inset_-2px_-2px_0_#555] hover:bg-[#aaa] ${
                      index < 9 ? 'is-hotbar' : ''
                    } ${
                      index === selectedSlot
                        ? 'is-current !border-white !bg-[#aaa] !shadow-[inset_2px_2px_0_#eee,inset_-2px_-2px_0_#666,0_0_0_2px_#444]'
                        : ''
                    }`}
                    key={stack?.itemId}
                    draggable={Boolean(stack)}
                    onClick={(event) => {
                      if (Date.now() - lastDragAt.current < 400) {
                        event.preventDefault();
                        return;
                      }
                      setCursorPosition({ x: event.clientX, y: event.clientY });
                      inventorySlot(index, event.shiftKey);
                    }}
                    onDragEnd={() => {
                      lastDragAt.current = Date.now();
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={(event) => beginDrag(event, 'inventory', index, stack)}
                    onDrop={(event) => dropOnSlot(event, 'inventory', index)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setCursorPosition({ x: event.clientX, y: event.clientY });
                      inventorySlot(index, true);
                    }}
                    title={stack ? itemName(stack.itemId) : 'Slot vazio'}
                    type="button"
                  >
                    {stack && (
                      <>
                        <ItemIcon itemId={stack.itemId} />
                        <span className="max-w-full truncate text-[8px] font-bold text-white [text-shadow:1px_1px_0_#000]">
                          {itemName(stack.itemId)}
                        </span>
                        <span
                          className={`item-count ${itemById.get(stack.itemId)?.durability ? 'has-durability' : ''}`}
                        >
                          {stack.count}
                        </span>
                        <DurabilityBar stack={stack} />
                      </>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 border-t-2 border-[#888] pt-3 text-[10px] font-bold text-[#444] sm:text-xs">
                <span className="border-2 border-[#777] bg-[#bbb] p-2 shadow-[inset_1px_1px_0_#ddd]">
                  Armadura: {snapshot.player.armor.filter(Boolean).length}/4
                </span>
                <span className="border-2 border-[#777] bg-[#bbb] p-2 shadow-[inset_1px_1px_0_#ddd]">
                  Mão secundária: {snapshot.player.offhand ? itemName(snapshot.player.offhand.itemId) : 'vazia'}
                </span>
                {cursor && (
                  <span className="border-2 border-[#777] bg-[#bbb] p-2 shadow-[inset_1px_1px_0_#ddd]">
                    Cursor: {itemName(cursor.itemId)} ×{cursor.count}
                  </span>
                )}
              </div>
            </section>
          </div>
          <section className="flex flex-col gap-4 border-2 border-[#555] bg-[#aaa] p-3 shadow-[inset_2px_2px_0_#ddd,inset_-2px_-2px_0_#777]">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black [text-shadow:1px_1px_0_#ddd]">
                {craftingTable ? 'Bancada de trabalho' : 'Criação'}
              </h3>
              {craftingTable && (
                <span className="border-2 border-[#666] bg-[#888] px-2 py-1 text-xs font-bold text-white">3 × 3</span>
              )}
            </div>
            <div className={`craft-grid craft-grid-${gridSize} mx-auto w-fit`}>
              {grid.map((stack, index) => (
                <button
                  aria-label={`Ingrediente ${index + 1}${stack ? `: ${stackLabel(stack)}` : ': vazio'}`}
                  className="relative flex aspect-square min-w-12 items-center justify-center border-2 border-[#555] bg-[#8b8b8b] shadow-[inset_2px_2px_0_#bbb,inset_-2px_-2px_0_#555] hover:bg-[#aaa]"
                  key={stack?.itemId}
                  onClick={(event) => {
                    if (Date.now() - lastDragAt.current < 400) {
                      event.preventDefault();
                      return;
                    }
                    setCursorPosition({ x: event.clientX, y: event.clientY });
                    craftingSlot(index, event.shiftKey);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setCursorPosition({ x: event.clientX, y: event.clientY });
                    craftingSlot(index, true);
                  }}
                  draggable={Boolean(stack)}
                  onDragEnd={() => {
                    lastDragAt.current = Date.now();
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={(event) => beginDrag(event, 'crafting', index, stack)}
                  onDrop={(event) => dropOnSlot(event, 'crafting', index)}
                  title={stack ? itemName(stack.itemId) : 'Ingrediente vazio'}
                  type="button"
                >
                  {stack && (
                    <>
                      <ItemIcon itemId={stack.itemId} />
                      <span className="text-[9px] font-bold text-white [text-shadow:1px_1px_0_#000]">
                        {itemName(stack.itemId)}
                      </span>
                      <span className={`item-count ${itemById.get(stack.itemId)?.durability ? 'has-durability' : ''}`}>
                        {stack.count}
                      </span>
                      <DurabilityBar stack={stack} />
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 border-t-2 border-[#888] pt-4">
              <span className="text-xs font-black">Resultado</span>
              <button
                className="relative flex size-16 shrink-0 items-center justify-center border-2 border-[#444] bg-[#8b8b8b] shadow-[inset_3px_3px_0_#bbb,inset_-3px_-3px_0_#555,2px_2px_0_#222] hover:bg-[#aaa] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!matchedRecipe}
                onClick={() => matchedRecipe && makeRecipe(matchedRecipe)}
                type="button"
              >
                {matchedRecipe && (
                  <>
                    <ItemIcon itemId={matchedRecipe.result.itemId} />
                    <span className="absolute bottom-1 right-1 text-xs font-black text-white [text-shadow:1px_1px_0_#000]">
                      {matchedRecipe.result.count}
                    </span>
                  </>
                )}
              </button>
              <span className="min-w-0 text-xs font-bold text-[#444]">{matchedRecipe?.name ?? '—'}</span>
            </div>
            <h3 className="border-t-2 border-[#888] pt-3 text-sm font-black [text-shadow:1px_1px_0_#ddd]">
              Receitas conhecidas
            </h3>
            <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {activeRecipes.map((recipe) => (
                <button
                  className="flex min-w-0 items-center gap-2 border-2 border-[#555] bg-[#888] p-2 text-left text-[10px] font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#555] hover:bg-[#999] active:translate-y-0.5"
                  key={recipe.id}
                  onClick={() => recipeFor(recipe.result.itemId)}
                  type="button"
                >
                  <ItemIcon itemId={recipe.result.itemId} />
                  <span className="min-w-0 truncate">{recipe.name}</span>
                  <span className="ml-auto shrink-0">×{recipe.result.count}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        {creative && (
          <section className="mt-5 border-2 border-[#555] bg-[#aaa] p-3 shadow-[inset_2px_2px_0_#ddd,inset_-2px_-2px_0_#777]">
            <h3 className="mb-3 text-sm font-black [text-shadow:1px_1px_0_#ddd]">Catálogo criativo</h3>
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5">
              {ITEMS.map((item) => (
                <button
                  className="flex min-w-0 items-center gap-2 border-2 border-[#555] bg-[#888] p-2 text-left text-xs font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#555] hover:bg-[#999] active:translate-y-0.5"
                  key={item.id}
                  onClick={() => grantCreativeItem(item.id)}
                  type="button"
                >
                  <ItemIcon itemId={item.id} />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 text-[9px] text-amber-200">Adicionar</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      {cursor &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 drop-shadow-[2px_2px_0_#000]"
            aria-hidden="true"
            style={{ left: cursorPosition.x, top: cursorPosition.y }}
          >
            <ItemIcon itemId={cursor.itemId} />
            {cursor.count > 1 && (
              <span className="font-bold text-white [text-shadow:1px_1px_0_#000]">{cursor.count}</span>
            )}
          </div>,
          document.body
        )}
      {catalogError && (
        <p
          className="fixed bottom-5 left-1/2 z-[110] w-max max-w-[90vw] -translate-x-1/2 border-2 border-black bg-[#8b2929] p-3 text-center text-xs font-bold text-white shadow-[inset_2px_2px_0_#bd5555,inset_-2px_-2px_0_#501313,3px_3px_0_#000] [text-shadow:1px_1px_0_#000]"
          role="alert"
        >
          {catalogError}
        </p>
      )}
    </div>
  );
}
