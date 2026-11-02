import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useNavigate, useParams } from 'react-router-dom';
import { loadWorld, saveWorld } from '../application/worldStorage';
import VoxelWorld from '../engine/VoxelWorld';
import { ITEMS, itemById, itemName } from '../domain/content';
import {
  addItem,
  removeItem,
  returnStacksToInventory,
  transferStackAtCursor,
  transferStackBetweenSlots
} from '../domain/inventory';
import { craft, findCraftingRecipe, RECIPES } from '../domain/recipes';
import type { Recipe } from '../domain/recipes';
import type { DroppedItemSnapshot, ItemStack, StoredWorld, WorldSnapshot } from '../domain/world';
import { OXYGEN_TICKS_PER_BUBBLE } from '../engine/playerOxygen';
import { useGameStore } from '../stores/game';
import { useSettingsStore } from '../stores/settings';
import requestGamePointerLock from '../engine/pointerLock';
import ItemIcon from '../components/ItemIcon';

function stackLabel(stack: ItemStack | null): string {
  if (!stack) return '';
  return itemName(stack.itemId);
}

function DurabilityBar({ stack }: { stack: ItemStack }) {
  const durability = itemById.get(stack.itemId)?.durability;
  if (durability === undefined) return null;
  const remaining = Math.max(0, durability - (stack.damage ?? 0));
  const percentage = (remaining / durability) * 100;
  return (
    <span
      aria-label={`Durabilidade: ${remaining} de ${durability}`}
      className="item-durability"
      role="img"
    >
      <i style={{ width: `${percentage}%` }} />
    </span>
  );
}

function InventoryCharacterModel() {
  const character = useRef<Group>(null);
  const targetRotation = useRef(0);

  useFrame((_, delta) => {
    if (character.current) {
      character.current.rotation.y += (targetRotation.current - character.current.rotation.y) * Math.min(1, delta * 8);
    }
  });

  return (
    <group
      ref={character}
      position={[0, -1.32, 0]}
      onPointerMove={(event) => {
        targetRotation.current = event.pointer.x * 0.65;
      }}
      onPointerLeave={() => {
        targetRotation.current = 0;
      }}
    >
      <mesh position={[0, 2.38, 0]} castShadow>
        <boxGeometry args={[0.54, 0.54, 0.54]} />
        <meshStandardMaterial color="#d5a77d" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.65, 0]} castShadow>
        <boxGeometry args={[0.56, 0.1, 0.56]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
      <mesh position={[-0.13, 2.4, 0.276]}>
        <boxGeometry args={[0.055, 0.07, 0.018]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      <mesh position={[0.13, 2.4, 0.276]}>
        <boxGeometry args={[0.055, 0.07, 0.018]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      <mesh position={[0, 2.29, 0.282]}>
        <boxGeometry args={[0.09, 0.045, 0.025]} />
        <meshStandardMaterial color="#a56f59" />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <boxGeometry args={[0.62, 0.8, 0.34]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.43, 1.65, 0]} castShadow>
        <boxGeometry args={[0.24, 0.78, 0.32]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[0.43, 1.65, 0]} castShadow>
        <boxGeometry args={[0.24, 0.78, 0.32]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.17, 0.59, 0]} castShadow>
        <boxGeometry args={[0.28, 1.08, 0.32]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[0.17, 0.59, 0]} castShadow>
        <boxGeometry args={[0.28, 1.08, 0.32]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[-0.17, 0.06, 0.035]} castShadow>
        <boxGeometry args={[0.29, 0.12, 0.4]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
      <mesh position={[0.17, 0.06, 0.035]} castShadow>
        <boxGeometry args={[0.29, 0.12, 0.4]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
    </group>
  );
}

function InventoryCharacterPreview() {
  return (
    <div className="inventory-character-preview" aria-label="Prévia 3D do personagem; mova o mouse para girar">
      <Canvas dpr={1} camera={{ position: [0, 0, 5], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
        <ambientLight intensity={1.6} />
        <directionalLight position={[-3, 5, 4]} intensity={2} />
        <InventoryCharacterModel />
      </Canvas>
    </div>
  );
}

function InventoryPanel({
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
    () => RECIPES.filter((recipe) => recipe.type !== 'smelting' && recipe.width <= gridSize && recipe.height <= gridSize),
    [gridSize]
  );
  const matchedRecipe = findCraftingRecipe(grid, gridSize, gridSize);

  useEffect(() => {
    if (!cursor) return undefined;
    const trackCursor = (event: PointerEvent) => setCursorPosition({ x: event.clientX, y: event.clientY });
    window.addEventListener('pointermove', trackCursor);
    return () => window.removeEventListener('pointermove', trackCursor);
  }, [cursor]);

  useEffect(() => () => {
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
  }, [worldId]);

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

  const dropOnSlot = (
    event: React.DragEvent<HTMLButtonElement>,
    area: 'inventory' | 'crafting',
    index: number
  ) => {
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
      setCatalogError(reason instanceof Error ? 'Não foi possível mover o item.' : 'Arraste o item para um slot válido.');
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
    <div className="game-panel inventory-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">EQUIPAMENTO E RECURSOS</p>
          <h2>Inventário</h2>
        </div>
        <button
          className="icon-button"
          onClick={closeInventory}
          type="button"
          aria-label={craftingTable ? 'Fechar bancada' : 'Fechar inventário'}
        >
          ×
        </button>
      </div>
      <div className="inventory-layout">
        <div className="inventory-character-layout">
          <section className="inventory-character-section">
            <h3>Personagem</h3>
            <InventoryCharacterPreview />
          </section>
          <section>
            <h3>Inventário</h3>
            <div className="inventory-grid">
              {snapshot.inventory.map((stack, index) => (
                <button
                  aria-label={`Slot ${index + 1}${stack ? `: ${stackLabel(stack)}, ${stack.count}` : ': vazio'}`}
                  className={`item-slot ${index < 9 ? 'is-hotbar' : ''} ${index === selectedSlot ? 'is-current' : ''}`}
                  key={index}
                  draggable={Boolean(stack)}
                  onClick={(event) => {
                    if (Date.now() - lastDragAt.current < 400) {
                      event.preventDefault();
                      return;
                    }
                    setCursorPosition({ x: event.clientX, y: event.clientY });
                    inventorySlot(index, event.shiftKey);
                  }}
                  onDragEnd={() => { lastDragAt.current = Date.now(); }}
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
                      <span className="item-hover-label">{itemName(stack.itemId)}</span>
                      <span className={`item-count ${itemById.get(stack.itemId)?.durability ? 'has-durability' : ''}`}>
                        {stack.count}
                      </span>
                      <DurabilityBar stack={stack} />
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="equipment-row">
              <span>Armadura: {snapshot.player.armor.filter(Boolean).length}/4</span>
              <span>Mão secundária: {snapshot.player.offhand ? itemName(snapshot.player.offhand.itemId) : 'vazia'}</span>
              {cursor && <span className="cursor-stack">Cursor: {itemName(cursor.itemId)} ×{cursor.count}</span>}
            </div>
          </section>
        </div>
        <section className="crafting-section">
          <div className="crafting-title">
            <h3>{craftingTable ? 'Bancada de trabalho' : 'Criação'}</h3>
            {craftingTable && <span className="muted">3 × 3</span>}
          </div>
          <div className={`craft-grid craft-grid-${gridSize}`}>
            {grid.map((stack, index) => (
              <button
                aria-label={`Ingrediente ${index + 1}${stack ? `: ${stackLabel(stack)}` : ': vazio'}`}
                className="item-slot"
                key={index}
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
                onDragEnd={() => { lastDragAt.current = Date.now(); }}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => beginDrag(event, 'crafting', index, stack)}
                onDrop={(event) => dropOnSlot(event, 'crafting', index)}
                title={stack ? itemName(stack.itemId) : 'Ingrediente vazio'}
                type="button"
              >
                {stack && (
                  <>
                    <ItemIcon itemId={stack.itemId} />
                    <span className="item-hover-label">{itemName(stack.itemId)}</span>
                    <span className={`item-count ${itemById.get(stack.itemId)?.durability ? 'has-durability' : ''}`}>
                      {stack.count}
                    </span>
                    <DurabilityBar stack={stack} />
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="craft-output">
            <span className="muted">Resultado</span>
            <button
              className="item-slot output-slot"
              disabled={!matchedRecipe}
              onClick={() => matchedRecipe && makeRecipe(matchedRecipe)}
              type="button"
            >
              {matchedRecipe && (
                <>
                  <ItemIcon itemId={matchedRecipe.result.itemId} />
                  <span className="item-hover-label">{itemName(matchedRecipe.result.itemId)}</span>
                  <span className="item-count">{matchedRecipe.result.count}</span>
                </>
              )}
            </button>
            <span className="muted">{matchedRecipe?.name ?? '—'}</span>
          </div>
          <h3 className="recipes-heading">Receitas conhecidas</h3>
          <div className="recipe-list">
            {activeRecipes.map((recipe) => (
              <button className="recipe-button" key={recipe.id} onClick={() => recipeFor(recipe.result.itemId)} type="button">
                <ItemIcon itemId={recipe.result.itemId} />
                <span>{recipe.name}</span><span>×{recipe.result.count}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {creative && (
        <section className="creative-catalog">
          <h3>Catálogo criativo</h3>
          <div className="catalog-grid">
            {ITEMS.map((item) => (
              <button className="recipe-button" key={item.id} onClick={() => grantCreativeItem(item.id)} type="button">
                <ItemIcon itemId={item.id} />
                <span>{item.name}</span><span>Adicionar</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {cursor && createPortal(
        <div
          className="inventory-cursor"
          aria-hidden="true"
          style={{ left: cursorPosition.x, top: cursorPosition.y }}
        >
          <ItemIcon itemId={cursor.itemId} />
          {cursor.count > 1 && <span>{cursor.count}</span>}
        </div>,
        document.body
      )}
      {catalogError && <p className="inventory-feedback" role="alert">{catalogError}</p>}
    </div>
  );
}

function GameHud({
  world,
  snapshot,
  saved,
  onOpenInventory
}: {
  world: StoredWorld;
  snapshot: WorldSnapshot;
  saved: string;
  onOpenInventory: () => void;
}) {
  const selectedSlot = useGameStore((state) => state.selectedSlot);
  const selectSlot = useGameStore((state) => state.selectSlot);
  const oxygenTicks = useGameStore((state) => state.oxygenTicks);
  const submerged = useGameStore((state) => state.submerged);
  const miningProgress = useGameStore((state) => state.miningProgress);
  const selectedStack = snapshot.inventory[selectedSlot];
  const oxygenBubbles = Math.ceil(oxygenTicks / OXYGEN_TICKS_PER_BUBBLE);
  const hour = Math.floor((snapshot.timeTicks % 24000) / 1000);
  const phase = hour < 6 ? 'Madrugada' : hour < 18 ? 'Dia' : hour < 21 ? 'Entardecer' : 'Noite';
  const pause = () => {
    useGameStore.getState().setOverlay('pause');
    if (document.pointerLockElement) document.exitPointerLock();
  };
  return (
    <div className="hud-layer">
      <div className="hud-top">
        <div className="hud-world">
          <strong>{world.manifest.name}</strong>
          <span>{phase} · {world.manifest.mode === 'creative' ? 'Criativo' : 'Sobrevivência'}</span>
        </div>
        <div className="hud-actions">
          <span className="save-status">{saved}</span>
          <button className="hud-button" onClick={onOpenInventory} type="button">Inventário <kbd>E</kbd></button>
          <button className="hud-button" onClick={pause} type="button">Pausar <kbd>Esc</kbd></button>
        </div>
      </div>
      {world.manifest.mode === 'survival' && (
        <>
          {submerged && (
            <div className={`oxygen-status ${oxygenBubbles === 0 ? 'is-depleted' : ''}`} aria-label={`Oxigênio: ${oxygenBubbles} de 10`}>
              <span>AR</span>
              <strong aria-hidden="true">{'●'.repeat(oxygenBubbles)}{'○'.repeat(10 - oxygenBubbles)}</strong>
            </div>
          )}
          <div className="survival-hud" aria-label="Status do jogador">
            <div className="survival-status-row">
              <span
                className="survival-hearts"
                aria-label={`Vida: ${snapshot.player.health} de 20`}
                role="img"
              >
                {'♥'.repeat(Math.max(0, Math.ceil(snapshot.player.health / 2)))}
                <i>{'♡'.repeat(Math.max(0, 10 - Math.ceil(snapshot.player.health / 2)))}</i>
              </span>
              <span
                className="survival-hunger"
                aria-label={`Fome: ${snapshot.player.hunger} de 20`}
                role="img"
              >
                {'◆'.repeat(Math.max(0, Math.ceil(snapshot.player.hunger / 2)))}
                <i>{'◇'.repeat(Math.max(0, 10 - Math.ceil(snapshot.player.hunger / 2)))}</i>
              </span>
            </div>
            <div className="experience-row">
              <span className="experience-level" aria-label={`Nível ${snapshot.player.level}`}>{snapshot.player.level}</span>
              <div
                className="experience-bar"
                role="progressbar"
                aria-label="Experiência"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={snapshot.player.experience}
              >
                <i style={{ width: `${Math.min(100, snapshot.player.experience)}%` }} />
              </div>
            </div>
          </div>
        </>
      )}
      <div className={`crosshair ${miningProgress > 0 ? 'is-mining' : ''}`} aria-hidden="true"><span /><span /></div>
      {miningProgress > 0 && (
        <div className="mining-progress" role="progressbar" aria-label="Progresso ao quebrar bloco" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(miningProgress * 100)}>
          <span style={{ width: `${miningProgress * 100}%` }} />
        </div>
      )}
      <div className="hotbar" role="toolbar" aria-label="Barra de acesso rápido">
        {snapshot.inventory.slice(0, 9).map((stack, index) => (
          <button
            aria-label={`Atalho ${index + 1}${stack ? `: ${itemName(stack.itemId)}` : ': vazio'}`}
            aria-pressed={selectedSlot === index}
            className={`hotbar-slot ${selectedSlot === index ? 'selected' : ''}`}
            key={index}
            onClick={() => selectSlot(index)}
            title={stack ? itemName(stack.itemId) : 'Slot vazio'}
            type="button"
          >
            <span className="hotbar-number">{index + 1}</span>
            {stack && (
              <>
                <ItemIcon itemId={stack.itemId} />
                <span className="item-hover-label">{itemName(stack.itemId)}</span>
                <span className={`item-count ${itemById.get(stack.itemId)?.durability ? 'has-durability' : ''}`}>{stack.count}</span>
                <DurabilityBar stack={stack} />
              </>
            )}
          </button>
        ))}
      </div>
      {selectedStack && <div className="selected-item-label"><ItemIcon itemId={selectedStack.itemId} />{itemName(selectedStack.itemId)}</div>}
      <div className="game-hint">Clique na cena para capturar o mouse · WASD mover · Ctrl correr · Espaço pular · Botão esquerdo minerar · Botão direito construir/usar bancada</div>
    </div>
  );
}

export default function Game() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const world = useGameStore((state) => state.world);
  const snapshot = useGameStore((state) => state.snapshot);
  const overlay = useGameStore((state) => state.overlay);
  const submerged = useGameStore((state) => state.submerged);
  const setWorld = useGameStore((state) => state.setWorld);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('Salvamento automático ativo');
  const [saving, setSaving] = useState(false);
  const uiScale = useSettingsStore((state) => state.uiScale);
  const saveRef = useRef<() => Promise<boolean>>(async () => false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const reportEngineError = useCallback((message: string) => setError(message), []);
  const captureGameCursor = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      reportEngineError('A cena ainda não está pronta para capturar o cursor.');
      return;
    }
    requestGamePointerLock(canvas, reportEngineError);
  }, [reportEngineError]);
  const openInventory = useCallback(() => {
    useGameStore.getState().setOverlay('inventory');
    if (document.pointerLockElement) document.exitPointerLock();
  }, []);
  const resumeGame = useCallback(() => {
    useGameStore.getState().setOverlay('none');
    captureGameCursor();
  }, [captureGameCursor]);
  const resumePausedGame = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas && document.pointerLockElement === canvas) {
      useGameStore.getState().setOverlay('none');
      return;
    }
    captureGameCursor();
  }, [captureGameCursor]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    loadWorld(worldId).then((record) => {
      if (!active) return;
      setWorld(record);
      setLoading(false);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o mundo.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [setWorld, worldId]);

  const save = async (): Promise<boolean> => {
    const latest = useGameStore.getState();
    if (!latest.world || !latest.snapshot || saving) return false;
    setSaving(true);
    setSaved('Salvando…');
    try {
      await saveWorld(latest.world.manifest.id, latest.snapshot);
      setSaved(`Salvo às ${new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(new Date())}`);
      setError('');
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Falha ao salvar o mundo.';
      setSaved('Falha no salvamento');
      setError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    saveRef.current = save;
  });

  const saveAndExit = async () => {
    if (await saveRef.current()) {
      useGameStore.getState().clearWorld();
      navigate('/worlds');
    }
  };

  const saveAndOpenSettings = async () => {
    if (await saveRef.current()) navigate('/settings');
  };

  useEffect(() => {
    if (!world) return undefined;
    const interval = window.setInterval(() => { void saveRef.current(); }, 30_000);
    return () => window.clearInterval(interval);
  }, [world]);

  const respawn = () => {
    if (!world || !snapshot) return;
    setSnapshot({
      ...snapshot,
      player: { ...snapshot.player, position: [...world.manifest.spawn], health: 20, hunger: 20 }
    });
    useGameStore.getState().setOverlay('none');
  };

  if (loading) return <main className="loading-screen">Preparando seu mundo…</main>;
  if (error && (!world || world.manifest.id !== worldId)) return <main className="loading-screen"><p role="alert">{error}</p><button className="button" onClick={() => navigate('/worlds')} type="button">Voltar aos mundos</button></main>;
  if (!world || !snapshot) return <main className="loading-screen">Mundo indisponível.</main>;

  return (
    <main className={`game-screen ${submerged ? 'is-underwater' : ''}`} style={{ '--ui-scale': uiScale } as React.CSSProperties}>
      <div className="game-canvas" ref={canvasRef}>
        <VoxelWorld world={world} paused={overlay !== 'none'} onError={reportEngineError} />
      </div>
      <GameHud world={world} snapshot={snapshot} saved={saved} onOpenInventory={openInventory} />
      {error && <p className="game-error" role="alert">{error}</p>}
      {(overlay === 'inventory' || overlay === 'crafting') && (
        <InventoryPanel
          snapshot={snapshot}
          creative={world.manifest.mode === 'creative'}
          craftingTable={overlay === 'crafting'}
          onClose={resumeGame}
        />
      )}
      {overlay === 'pause' && (
        <div className="modal-backdrop">
          <section aria-labelledby="pause-title" aria-modal="true" className="game-panel pause-panel" role="dialog">
            <p className="eyebrow">MUNDO PAUSADO</p>
            <h2 id="pause-title">Um momento de descanso</h2>
            <div className="pause-actions">
              <button className="button button-primary" onClick={resumePausedGame} type="button">Voltar ao jogo</button>
              <button className="button" onClick={() => void saveRef.current()} type="button">{saving ? 'Salvando…' : 'Salvar agora'}</button>
              <button className="button" onClick={() => void saveAndOpenSettings()} type="button">Configurações</button>
              <button className="button button-danger" onClick={() => void saveAndExit()} type="button">Salvar e sair para mundos</button>
            </div>
            <p className="muted">Pressione Esc ou selecione voltar para retomar o jogo e capturar o cursor. O mundo é salvo automaticamente.</p>
          </section>
        </div>
      )}
      {overlay === 'dead' && (
        <div className="modal-backdrop">
          <section aria-labelledby="dead-title" aria-modal="true" className="game-panel pause-panel" role="dialog">
            <p className="eyebrow">FIM DE JOGO</p>
            <h2 id="dead-title">Você caiu no mundo.</h2>
            <p className="muted">Seu ponto de reaparecimento continua guardado.</p>
            <div className="pause-actions">
              <button className="button button-primary" onClick={respawn} type="button">Reaparecer</button>
              <button className="button" onClick={() => void saveAndExit()} type="button">Salvar e sair</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
