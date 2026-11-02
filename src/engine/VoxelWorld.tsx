import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  AmbientLight,
  BufferGeometry,
  BoxGeometry,
  Color,
  DataTexture,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  LinearFilter,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Raycaster,
  Object3D,
  RGBAFormat,
  SRGBColorSpace,
  Vector2,
  Vector3
} from 'three';
import { damageItem, removeFromSlot } from '../domain/inventory';
import { blockById, itemById } from '../domain/content';
import {
  BLOCK_TEXTURE_COLUMNS,
  BLOCK_TEXTURE_IDS,
  BLOCK_TEXTURE_SIZE,
  textureIndexForBlockFace
} from '../domain/blockTextures';
import { blockKey, CHUNK_SIZE, getBlockAt, parseSeed } from '../domain/world';
import type { DroppedItemSnapshot, StoredWorld, WorldSnapshot } from '../domain/world';
import { requestChunkGeometry } from './chunkWorker';
import { createBlockTextureAtlas } from './blockTextureAtlas';
import { adjacentBlock, blockFromSurface } from './blockTarget';
import {
  calculateMovementVector,
  PLAYER_EYE_HEIGHT,
  playerCollidesWithBlocks,
  playerHasGroundSupport,
  playerIntersectsBlock,
  playerPositionAfterPillarPlacement,
  sweepPlayerAxis
} from './playerMovement';
import { advanceOxygen, MAX_OXYGEN_TICKS, OXYGEN_TICKS_PER_BUBBLE } from './playerOxygen';
import { advanceDroppedItems, collectDroppedItems, dropPosition } from './droppedItems';
import { blockDropForTool, blockMiningDuration } from './blockMining';
import requestGamePointerLock from './pointerLock';
import { useGameStore } from '../stores/game';
import { useSettingsStore } from '../stores/settings';
import { createItemIconPixels } from '../components/ItemIcon';

interface VoxelWorldProps {
  world: StoredWorld;
  paused: boolean;
}

interface EngineProps extends VoxelWorldProps {
  snapshot: WorldSnapshot;
  onError: (message: string) => void;
}

const BLOCK_TEXTURE_ATLAS = createBlockTextureAtlas();
const DAY_SKY = new Color('#9bb2b8');
const NIGHT_SKY = new Color('#111b32');
const DROP_BLOCK_FACES = [
  {
    normal: [1, 0, 0],
    vertices: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1]
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ]
  },
  {
    normal: [-1, 0, 0],
    vertices: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0]
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ]
  },
  {
    normal: [0, 1, 0],
    vertices: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0]
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },
  {
    normal: [0, -1, 0],
    vertices: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1]
    ],
    uvs: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1]
    ]
  },
  {
    normal: [0, 0, 1],
    vertices: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1]
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ]
  },
  {
    normal: [0, 0, -1],
    vertices: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ],
    uvs: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ]
  }
];

function createDropShadowTexture(): DataTexture {
  const size = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot((x - 7.5) / 7.5, (y - 7.5) / 7.5);
      const alpha = Math.round(Math.max(0, 1 - distance) ** 2 * 180);
      const offset = (y * size + x) * 4;
      data[offset] = 15;
      data[offset + 1] = 13;
      data[offset + 2] = 10;
      data[offset + 3] = alpha;
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const DROP_SHADOW_TEXTURE = createDropShadowTexture();

function createDroppedBlockGeometry(blockId: string): BufferGeometry {
  const geometry = new BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const atlasRows = Math.ceil(BLOCK_TEXTURE_IDS.length / BLOCK_TEXTURE_COLUMNS);
  const triangles = [0, 1, 2, 0, 2, 3];

  DROP_BLOCK_FACES.forEach((face, faceIndex) => {
    const textureIndex = textureIndexForBlockFace(blockId, faceIndex);
    const tileX = textureIndex % BLOCK_TEXTURE_COLUMNS;
    const tileY = Math.floor(textureIndex / BLOCK_TEXTURE_COLUMNS);
    triangles.forEach((vertexIndex) => {
      const vertex = face.vertices[vertexIndex];
      const uv = face.uvs[vertexIndex];
      positions.push((vertex[0] - 0.5) * 0.28, (vertex[1] - 0.5) * 0.28, (vertex[2] - 0.5) * 0.28);
      normals.push(...face.normal);
      uvs.push(
        (tileX * BLOCK_TEXTURE_SIZE + 0.5 + uv[0] * (BLOCK_TEXTURE_SIZE - 1)) /
          (BLOCK_TEXTURE_COLUMNS * BLOCK_TEXTURE_SIZE),
        (tileY * BLOCK_TEXTURE_SIZE + 0.5 + (1 - uv[1]) * (BLOCK_TEXTURE_SIZE - 1)) / (atlasRows * BLOCK_TEXTURE_SIZE)
      );
    });
  });

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return geometry;
}

function collectVoxelTerrainMeshes(scene: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof Mesh && object.userData.voxelTerrain === true) meshes.push(object);
  });
  return meshes;
}

function ChunkMesh({
  chunkX,
  chunkZ,
  world,
  edits,
  onError
}: {
  chunkX: number;
  chunkZ: number;
  world: StoredWorld;
  edits: Record<string, string>;
  onError: (message: string) => void;
}) {
  const [geometry, setGeometry] = useState<BufferGeometry | null>(null);
  const [waterGeometry, setWaterGeometry] = useState<BufferGeometry | null>(null);
  const geometryRef = useRef<BufferGeometry[]>([]);
  const chunkEdits = useMemo(() => {
    const originX = chunkX * CHUNK_SIZE;
    const originZ = chunkZ * CHUNK_SIZE;
    const nearby: Record<string, string> = {};
    Object.entries(edits).forEach(([key, block]) => {
      const [x, , z] = key.split(',').map(Number);
      if (x >= originX - 1 && x <= originX + CHUNK_SIZE && z >= originZ - 1 && z <= originZ + CHUNK_SIZE) {
        nearby[key] = block;
      }
    });
    return nearby;
  }, [chunkX, chunkZ, edits]);
  const chunkEditsSignature = JSON.stringify(chunkEdits);

  useEffect(() => {
    let active = true;
    const requestEdits: Record<string, string> = JSON.parse(chunkEditsSignature);
    requestChunkGeometry(chunkX, chunkZ, parseSeed(world.manifest.seed), requestEdits, world.manifest.structures)
      .then((data) => {
        const next = new BufferGeometry();
        next.setAttribute('position', new Float32BufferAttribute(data.positions, 3));
        next.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        next.setAttribute('color', new Float32BufferAttribute(data.colors, 3));
        next.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
        next.computeBoundingSphere();
        const nextWater = new BufferGeometry();
        nextWater.setAttribute('position', new Float32BufferAttribute(data.waterPositions, 3));
        nextWater.setAttribute('normal', new Float32BufferAttribute(data.waterNormals, 3));
        nextWater.setAttribute('color', new Float32BufferAttribute(data.waterColors, 3));
        nextWater.setAttribute('uv', new Float32BufferAttribute(data.waterUvs, 2));
        nextWater.computeBoundingSphere();
        if (!active) {
          next.dispose();
          nextWater.dispose();
          return;
        }
        setGeometry(next);
        setWaterGeometry(nextWater);
      })
      .catch((error: unknown) => {
        if (active) onError(error instanceof Error ? error.message : 'Falha ao gerar um chunk.');
      });
    return () => {
      active = false;
    };
  }, [chunkEditsSignature, chunkX, chunkZ, onError, world.manifest.seed, world.manifest.structures]);

  useEffect(
    () => () => {
      geometryRef.current.forEach((entry) => entry.dispose());
      geometryRef.current = [];
    },
    []
  );

  useEffect(() => {
    const nextGeometries = [geometry, waterGeometry].filter((entry): entry is BufferGeometry => Boolean(entry));
    geometryRef.current.forEach((previous) => {
      if (!nextGeometries.includes(previous)) previous.dispose();
    });
    geometryRef.current = nextGeometries;
  }, [geometry, waterGeometry]);

  if (!geometry) return null;

  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow userData={{ voxelTerrain: true }}>
        <meshStandardMaterial map={BLOCK_TEXTURE_ATLAS} vertexColors alphaTest={0.35} roughness={0.92} />
      </mesh>
      {waterGeometry && waterGeometry.getAttribute('position').count > 0 && (
        <mesh geometry={waterGeometry} renderOrder={1} userData={{ voxelTerrain: true }}>
          <meshStandardMaterial
            map={BLOCK_TEXTURE_ATLAS}
            vertexColors
            transparent
            alphaTest={0.05}
            depthWrite={false}
            roughness={0.25}
            side={DoubleSide}
          />
        </mesh>
      )}
    </>
  );
}

function mineBlock(world: StoredWorld, snapshot: WorldSnapshot, x: number, y: number, z: number) {
  const seed = parseSeed(world.manifest.seed);
  const blockId = getBlockAt(x, y, z, seed, snapshot.blockEdits, world.manifest.structures);
  const definition = blockById.get(blockId);
  if (!definition || blockId === 'air' || definition.hardness < 0 || !definition.drops.length) return;
  const state = useGameStore.getState();
  const current = state.snapshot;
  if (!current) return;
  const selected = current.inventory[state.selectedSlot];
  const tool = selected ? itemById.get(selected.itemId) : undefined;
  const drop = blockDropForTool(definition, tool?.id, world.manifest.mode === 'survival');
  const edits = { ...current.blockEdits, [blockKey(x, y, z)]: 'air' };
  const droppedItems: DroppedItemSnapshot[] = [...(current.droppedItems ?? [])];
  if (drop) {
    droppedItems.push({
      id: crypto.randomUUID(),
      itemId: drop,
      count: 1,
      position: dropPosition([x, y, z]),
      velocity: [0, 2.5, 0],
      pickupAfterTick: current.timeTicks + 40
    });
  }
  state.setSnapshot({
    ...current,
    inventory:
      world.manifest.mode === 'survival' ? damageItem(current.inventory, state.selectedSlot) : current.inventory,
    droppedItems,
    blockEdits: edits
  });
}

function placeBlock(
  world: StoredWorld,
  snapshot: WorldSnapshot,
  x: number,
  y: number,
  z: number,
  playerPosition: Vector3,
  supportingFace: boolean
) {
  const state = useGameStore.getState();
  const current = state.snapshot;
  if (!current || y < 0 || y >= 40) return;
  const stack = current.inventory[state.selectedSlot];
  const item = stack ? itemById.get(stack.itemId) : undefined;
  const blockId = item?.placeBlock;
  if (
    !stack ||
    !blockId ||
    !['air', 'water'].includes(
      getBlockAt(x, y, z, parseSeed(world.manifest.seed), current.blockEdits, world.manifest.structures)
    )
  )
    return;
  const target: [number, number, number] = [x, y, z];
  const currentPosition: [number, number, number] = [playerPosition.x, playerPosition.y, playerPosition.z];
  const pillarPosition = supportingFace ? playerPositionAfterPillarPlacement(currentPosition, target) : null;
  if (playerIntersectsBlock(currentPosition, target) && !pillarPosition) return;
  const inventory =
    world.manifest.mode === 'creative' ? current.inventory : removeFromSlot(current.inventory, state.selectedSlot, 1);
  if (!inventory && world.manifest.mode !== 'creative') return;
  const blockEdits = { ...current.blockEdits, [blockKey(x, y, z)]: blockId };
  if (
    pillarPosition &&
    playerCollidesWithBlocks(pillarPosition, (blockX, blockY, blockZ) => {
      const placedBlock = getBlockAt(
        blockX,
        blockY,
        blockZ,
        parseSeed(world.manifest.seed),
        blockEdits,
        world.manifest.structures
      );
      return Boolean(blockById.get(placedBlock)?.solid);
    })
  ) {
    return;
  }
  state.setSnapshot({
    ...current,
    inventory: inventory ?? current.inventory,
    blockEdits,
    ...(pillarPosition
      ? {
          player: {
            ...current.player,
            position: pillarPosition
          }
        }
      : {})
  });
  if (pillarPosition) playerPosition.set(...pillarPosition);
}

function Terrain({
  world,
  snapshot,
  center,
  playerPosition,
  onError
}: {
  world: StoredWorld;
  snapshot: WorldSnapshot;
  center: [number, number];
  playerPosition: React.MutableRefObject<Vector3>;
  onError: (message: string) => void;
}) {
  const renderDistance = useSettingsStore((state) => state.renderDistance);
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);
  const centerPointer = useMemo(() => new Vector2(0, 0), []);
  const targetMeshes = useRef<Mesh[]>([]);
  const meshScanElapsed = useRef(1);
  const selectedBlockOutline = useRef<LineSegments>(null);
  const outlineGeometry = useMemo(() => {
    const boxGeometry = new BoxGeometry(1.012, 1.012, 1.012);
    const edges = new EdgesGeometry(boxGeometry);
    boxGeometry.dispose();
    return edges;
  }, []);
  const mining = useRef({ held: false, targetKey: '', elapsed: 0, lastProgressSent: -1 });
  const worldContext = useRef({ world, snapshot });
  worldContext.current = { world, snapshot };

  const getTargetedBlock = useCallback(() => {
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(centerPointer, camera);
    const seed = parseSeed(worldContext.current.world.manifest.seed);
    const hit = raycaster.intersectObjects(targetMeshes.current, false).find((intersection) => {
      if (!intersection.face || intersection.distance > 6) return false;
      const normal = intersection.face.normal.clone().transformDirection(intersection.object.matrixWorld);
      const block = blockFromSurface(
        [intersection.point.x, intersection.point.y, intersection.point.z],
        [normal.x, normal.y, normal.z]
      );
      return (
        getBlockAt(
          ...block,
          seed,
          worldContext.current.snapshot.blockEdits,
          worldContext.current.world.manifest.structures
        ) !== 'water'
      );
    });
    if (!hit?.face) return null;
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    const block = blockFromSurface([hit.point.x, hit.point.y, hit.point.z], [normal.x, normal.y, normal.z]);
    return { block, normal };
  }, [camera, centerPointer, raycaster, scene]);

  useEffect(() => () => outlineGeometry.dispose(), [outlineGeometry]);

  const cancelMining = useCallback(() => {
    mining.current = { held: false, targetKey: '', elapsed: 0, lastProgressSent: -1 };
    useGameStore.getState().setMiningProgress(0);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (document.pointerLockElement !== gl.domElement || (event.button !== 0 && event.button !== 2)) return;
      const target = getTargetedBlock();
      if (!target) return;
      const { block, normal } = target;
      const state = useGameStore.getState();
      const currentWorld = state.world ?? worldContext.current.world;
      const currentSnapshot = state.snapshot ?? worldContext.current.snapshot;

      if (event.button === 0) {
        mining.current = { held: true, targetKey: '', elapsed: 0, lastProgressSent: -1 };
      } else if (
        getBlockAt(
          ...block,
          parseSeed(currentWorld.manifest.seed),
          currentSnapshot.blockEdits,
          currentWorld.manifest.structures
        ) === 'crafting_table'
      ) {
        state.setOverlay('crafting');
        document.exitPointerLock();
      } else {
        placeBlock(
          currentWorld,
          currentSnapshot,
          ...adjacentBlock(block, [normal.x, normal.y, normal.z]),
          playerPosition.current,
          normal.y > 0.5
        );
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.button === 0) cancelMining();
    };
    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== gl.domElement) cancelMining();
    };
    const handleBlur = () => cancelMining();
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      cancelMining();
    };
  }, [cancelMining, getTargetedBlock, gl, playerPosition]);

  useFrame((_, rawDelta) => {
    meshScanElapsed.current += rawDelta;
    if (meshScanElapsed.current >= 0.25) {
      meshScanElapsed.current = 0;
      targetMeshes.current = collectVoxelTerrainMeshes(scene);
    }

    const activeMining = mining.current;
    const state = useGameStore.getState();
    const target = getTargetedBlock();
    if (selectedBlockOutline.current) {
      selectedBlockOutline.current.visible = Boolean(target) && state.overlay === 'none';
      if (target) {
        selectedBlockOutline.current.position.set(target.block[0] + 0.5, target.block[1] + 0.5, target.block[2] + 0.5);
      }
    }
    if (!activeMining.held || state.overlay !== 'none') return;

    const currentWorld = state.world ?? worldContext.current.world;
    const currentSnapshot = state.snapshot ?? worldContext.current.snapshot;
    if (!target) {
      activeMining.targetKey = '';
      activeMining.elapsed = 0;
      activeMining.lastProgressSent = -1;
      state.setMiningProgress(0);
      return;
    }

    const [x, y, z] = target.block;
    const blockId = getBlockAt(
      x,
      y,
      z,
      parseSeed(currentWorld.manifest.seed),
      currentSnapshot.blockEdits,
      currentWorld.manifest.structures
    );
    const definition = blockById.get(blockId);
    const selected = currentSnapshot.inventory[state.selectedSlot];
    const duration = definition
      ? blockMiningDuration(definition, selected?.itemId, currentWorld.manifest.mode === 'creative')
      : null;
    if (duration === null) {
      activeMining.targetKey = '';
      activeMining.elapsed = 0;
      activeMining.lastProgressSent = -1;
      state.setMiningProgress(0);
      return;
    }

    const targetKey = `${blockKey(x, y, z)}|${selected?.itemId ?? ''}`;
    if (activeMining.targetKey !== targetKey) {
      activeMining.targetKey = targetKey;
      activeMining.elapsed = 0;
      activeMining.lastProgressSent = -1;
    }
    activeMining.elapsed += Math.min(rawDelta, 0.05);
    const progress = Math.min(1, activeMining.elapsed / duration);
    if (Math.abs(progress - activeMining.lastProgressSent) >= 0.04 || progress === 1) {
      activeMining.lastProgressSent = progress;
      state.setMiningProgress(progress);
    }
    if (progress >= 1) {
      mineBlock(currentWorld, currentSnapshot, x, y, z);
      activeMining.targetKey = '';
      activeMining.elapsed = 0;
      activeMining.lastProgressSent = -1;
      state.setMiningProgress(0);
    }
  });

  const boxOutline = (
    <lineSegments ref={selectedBlockOutline} geometry={outlineGeometry} visible={false} renderOrder={10}>
      <lineBasicMaterial color="#211b12" depthTest={false} transparent opacity={0.9} />
    </lineSegments>
  );

  const chunks: Array<[number, number]> = [];
  for (let z = -renderDistance; z <= renderDistance; z += 1) {
    for (let x = -renderDistance; x <= renderDistance; x += 1) chunks.push([center[0] + x, center[1] + z]);
  }

  return (
    <>
      {boxOutline}
      {chunks.map(([x, z]) => (
        <ChunkMesh
          key={`${x},${z}`}
          chunkX={x}
          chunkZ={z}
          world={world}
          edits={snapshot.blockEdits}
          onError={onError}
        />
      ))}
    </>
  );
}

function collidesWithWorld(world: StoredWorld, snapshot: WorldSnapshot, x: number, y: number, z: number): boolean {
  const seed = parseSeed(world.manifest.seed);
  return playerCollidesWithBlocks([x, y, z], (blockX, blockY, blockZ) => {
    const block = getBlockAt(blockX, blockY, blockZ, seed, snapshot.blockEdits, world.manifest.structures);
    return Boolean(blockById.get(block)?.solid);
  });
}

function hasGroundSupport(world: StoredWorld, snapshot: WorldSnapshot, x: number, y: number, z: number): boolean {
  const seed = parseSeed(world.manifest.seed);
  return playerHasGroundSupport([x, y, z], (blockX, blockY, blockZ) => {
    const block = getBlockAt(blockX, blockY, blockZ, seed, snapshot.blockEdits, world.manifest.structures);
    return Boolean(blockById.get(block)?.solid);
  });
}

function PlayerController({
  world,
  paused,
  initialSnapshot,
  playerPosition,
  onChunkChange,
  onError
}: {
  world: StoredWorld;
  paused: boolean;
  initialSnapshot: WorldSnapshot;
  playerPosition: React.MutableRefObject<Vector3>;
  onChunkChange: (center: [number, number]) => void;
  onError: (message: string) => void;
}) {
  const { camera, gl } = useThree();
  const position = playerPosition;
  const verticalVelocity = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);
  const keys = useRef(new Set<string>());
  const wasLocked = useRef(false);
  const simulationAccumulator = useRef(0);
  const snapshotTimer = useRef(0);
  const tickCounter = useRef(initialSnapshot.timeTicks);
  const oxygenTicks = useRef(useGameStore.getState().oxygenTicks);
  const pendingDrowningDamage = useRef(0);
  const controls = useSettingsStore((state) => state.controls);

  useEffect(() => {
    const canvas = gl.domElement;
    const onClick = () => {
      if (!paused && useGameStore.getState().overlay === 'none') requestGamePointerLock(canvas, onError);
    };
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === canvas;
      const { overlay, setOverlay } = useGameStore.getState();
      if (locked && overlay === 'pause') {
        setOverlay('none');
      } else if (wasLocked.current && !locked && overlay === 'none') {
        setOverlay('pause');
      }
      wasLocked.current = locked;
    };
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas || paused) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = Math.max(-1.45, Math.min(1.45, pitch.current - event.movementY * 0.0022));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyA') {
        event.preventDefault();
        return;
      }
      if (event.code === 'Escape') {
        event.preventDefault();
        const { overlay } = useGameStore.getState();
        if (overlay === 'inventory' || overlay === 'crafting') {
          useGameStore.getState().setOverlay('none');
          requestGamePointerLock(canvas, onError);
        } else if (overlay === 'pause') {
          if (document.pointerLockElement === canvas) {
            useGameStore.getState().setOverlay('none');
          } else {
            requestGamePointerLock(canvas, onError);
          }
        } else if (document.pointerLockElement === canvas) {
          document.exitPointerLock();
        } else {
          useGameStore.getState().setOverlay('pause');
        }
        return;
      }
      if (paused || useGameStore.getState().overlay !== 'none') return;
      keys.current.add(event.code);
      if (/^Digit[1-9]$/.test(event.code)) useGameStore.getState().selectSlot(Number(event.code.slice(-1)) - 1);
      if (!event.repeat && event.code === 'KeyF') {
        const state = useGameStore.getState();
        const current = state.snapshot;
        if (current) {
          const inventory = current.inventory.map((stack) => (stack ? { ...stack } : null));
          const { offhand } = current.player;
          const selected = inventory[state.selectedSlot];
          inventory[state.selectedSlot] = offhand;
          state.setSnapshot({
            ...current,
            inventory,
            player: { ...current.player, offhand: selected }
          });
        }
      }
      if (!event.repeat && event.code === controls.drop) {
        event.preventDefault();
        const state = useGameStore.getState();
        const current = state.snapshot;
        const selected = current?.inventory[state.selectedSlot];
        if (current && selected) {
          const directionX = -Math.sin(yaw.current);
          const directionZ = -Math.cos(yaw.current);
          const droppedItem: DroppedItemSnapshot = {
            id: crypto.randomUUID(),
            itemId: selected.itemId,
            count: 1,
            position: [
              position.current.x + directionX * 0.65,
              position.current.y + PLAYER_EYE_HEIGHT,
              position.current.z + directionZ * 0.65
            ],
            velocity: [directionX * 2, 2.5, directionZ * 2],
            pickupAfterTick: tickCounter.current + 40
          };
          state.setSnapshot({
            ...current,
            inventory: removeFromSlot(current.inventory, state.selectedSlot, 1) ?? current.inventory,
            droppedItems: [...(current.droppedItems ?? []), droppedItem]
          });
        }
      }
      if (event.code === controls.inventory) {
        event.preventDefault();
        useGameStore.getState().setOverlay('inventory');
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onWheel = (event: WheelEvent) => {
      if (document.pointerLockElement === canvas) {
        const current = useGameStore.getState().selectedSlot;
        useGameStore.getState().selectSlot((current + (event.deltaY > 0 ? 1 : 8)) % 9);
      }
    };
    canvas.addEventListener('click', onClick);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('wheel', onWheel);
    return () => {
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [controls.inventory, gl, onError, paused]);

  useEffect(() => {
    if (paused) keys.current.clear();
  }, [paused]);

  useFrame((_, rawDelta) => {
    if (paused || useGameStore.getState().overlay !== 'none') return;
    const delta = Math.min(rawDelta, 0.05);
    const currentWorld = useGameStore.getState().world ?? world;
    const currentSnapshot = useGameStore.getState().snapshot ?? initialSnapshot;
    const isCreative = currentWorld.manifest.mode === 'creative';
    const activeKeys = keys.current;
    const forward = Number(activeKeys.has(controls.forward)) - Number(activeKeys.has(controls.back));
    const strafe = Number(activeKeys.has(controls.right)) - Number(activeKeys.has(controls.left));
    const movementLength = Math.hypot(forward, strafe) || 1;
    let speed = 5;
    if (activeKeys.has(controls.sprint)) speed = 8;
    else if (activeKeys.has(controls.sneak)) speed = 2;
    const [directionX, directionZ] = calculateMovementVector(yaw.current, forward, strafe);
    const movementX = (directionX * speed * delta) / movementLength;
    const movementZ = (directionZ * speed * delta) / movementLength;
    position.current.x += sweepPlayerAxis(
      [position.current.x, position.current.y, position.current.z],
      0,
      movementX,
      (candidate) => collidesWithWorld(currentWorld, currentSnapshot, ...candidate)
    );
    position.current.z += sweepPlayerAxis(
      [position.current.x, position.current.y, position.current.z],
      2,
      movementZ,
      (candidate) => collidesWithWorld(currentWorld, currentSnapshot, ...candidate)
    );

    if (isCreative) {
      const verticalInput = Number(activeKeys.has(controls.jump)) - Number(activeKeys.has(controls.sneak));
      position.current.y += sweepPlayerAxis(
        [position.current.x, position.current.y, position.current.z],
        1,
        verticalInput * speed * delta,
        (candidate) => collidesWithWorld(currentWorld, currentSnapshot, ...candidate)
      );
    } else {
      if (
        activeKeys.has(controls.jump) &&
        hasGroundSupport(currentWorld, currentSnapshot, position.current.x, position.current.y, position.current.z)
      ) {
        verticalVelocity.current = 7.2;
      }
      verticalVelocity.current -= 20 * delta;
      const verticalDistance = verticalVelocity.current * delta;
      const verticalMovement = sweepPlayerAxis(
        [position.current.x, position.current.y, position.current.z],
        1,
        verticalDistance,
        (candidate) => collidesWithWorld(currentWorld, currentSnapshot, ...candidate)
      );
      position.current.y += verticalMovement;
      if (Math.abs(verticalMovement - verticalDistance) > 1e-5) verticalVelocity.current = 0;
    }
    camera.position.set(position.current.x, position.current.y + PLAYER_EYE_HEIGHT, position.current.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch.current, yaw.current, 0);

    const chunkX = Math.floor(position.current.x / CHUNK_SIZE);
    const chunkZ = Math.floor(position.current.z / CHUNK_SIZE);
    snapshotTimer.current += delta;
    simulationAccumulator.current += delta;
    while (simulationAccumulator.current >= 1 / 20) {
      simulationAccumulator.current -= 1 / 20;
      tickCounter.current += 1;
      const state = useGameStore.getState();
      const latest = state.snapshot;
      if (latest?.droppedItems?.length) {
        const currentSeed = parseSeed(currentWorld.manifest.seed);
        const movedDrops = advanceDroppedItems(
          latest.droppedItems,
          (x, y, z) => {
            const block = getBlockAt(x, y, z, currentSeed, latest.blockEdits, currentWorld.manifest.structures);
            return Boolean(blockById.get(block)?.solid);
          },
          1 / 20
        );
        const collected = collectDroppedItems(
          latest.inventory,
          movedDrops,
          [position.current.x, position.current.y, position.current.z],
          tickCounter.current
        );
        const dropsMoved = movedDrops.some((drop, index) => drop !== latest.droppedItems?.[index]);
        if (collected.pickedUp || dropsMoved) {
          state.setSnapshot({
            ...latest,
            inventory: collected.pickedUp ? collected.inventory : latest.inventory,
            droppedItems: collected.droppedItems
          });
        }
      }
      const eyePosition = [position.current.x, position.current.y + PLAYER_EYE_HEIGHT, position.current.z] as const;
      const underWater =
        getBlockAt(
          Math.floor(eyePosition[0]),
          Math.floor(eyePosition[1]),
          Math.floor(eyePosition[2]),
          parseSeed(currentWorld.manifest.seed),
          currentSnapshot.blockEdits,
          currentWorld.manifest.structures
        ) === 'water';
      const previousOxygen = oxygenTicks.current;
      if (currentWorld.manifest.mode === 'survival') {
        const breath = advanceOxygen(oxygenTicks.current, underWater, tickCounter.current);
        oxygenTicks.current = breath.oxygenTicks;
        pendingDrowningDamage.current += breath.damage;
      } else {
        oxygenTicks.current = MAX_OXYGEN_TICKS;
      }
      if (
        underWater !== useGameStore.getState().submerged ||
        Math.ceil(previousOxygen / OXYGEN_TICKS_PER_BUBBLE) !== Math.ceil(oxygenTicks.current / OXYGEN_TICKS_PER_BUBBLE)
      ) {
        useGameStore.getState().setBreath(oxygenTicks.current, underWater);
      }
    }
    if (snapshotTimer.current >= 1) {
      snapshotTimer.current = 0;
      onChunkChange([chunkX, chunkZ]);
      let { health } = currentSnapshot.player;
      let { hunger } = currentSnapshot.player;
      health = Math.max(0, health - pendingDrowningDamage.current);
      pendingDrowningDamage.current = 0;
      if (!isCreative && tickCounter.current > 0 && tickCounter.current % 1800 === 0) hunger = Math.max(0, hunger - 1);
      if (!isCreative && hunger === 0 && tickCounter.current % 40 === 0) health = Math.max(0, health - 1);
      else if (!isCreative && hunger >= 18 && health < 20 && tickCounter.current % 120 === 0)
        health = Math.min(20, health + 1);
      const latest = useGameStore.getState().snapshot;
      if (!latest) return;
      const next: WorldSnapshot = {
        ...latest,
        timeTicks: tickCounter.current,
        player: {
          ...latest.player,
          position: [position.current.x, position.current.y, position.current.z],
          health,
          hunger
        }
      };
      useGameStore.getState().setSnapshot(next);
      if (health <= 0) useGameStore.getState().setOverlay('dead');
    }
  });

  return null;
}

function DroppedItemMesh({
  item,
  terrainMeshes
}: {
  item: DroppedItemSnapshot;
  terrainMeshes: React.MutableRefObject<Mesh[]>;
}) {
  const mesh = useRef<Mesh>(null);
  const shadow = useRef<Mesh>(null);
  const shadowMaterial = useMemo(
    () => new MeshBasicMaterial({ map: DROP_SHADOW_TEXTURE, transparent: true, depthWrite: false, toneMapped: false }),
    []
  );
  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial]);
  const raycaster = useMemo(() => new Raycaster(), []);
  const rayOrigin = useMemo(() => new Vector3(), []);
  const rayDown = useMemo(() => new Vector3(0, -1, 0), []);
  const phase = useMemo(
    () => Array.from(item.id).reduce((sum, character) => sum + character.charCodeAt(0), 0) % (Math.PI * 2),
    [item.id]
  );
  useEffect(() => {
    if (mesh.current) mesh.current.rotation.y = 0.35;
  }, []);
  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 2.4;
    mesh.current.position.y = item.position[1] + Math.sin(clock.elapsedTime * 3 + phase) * 0.045;
    if (!shadow.current) return;
    rayOrigin.set(item.position[0], item.position[1] + 1, item.position[2]);
    raycaster.set(rayOrigin, rayDown);
    const surface = raycaster.intersectObjects(terrainMeshes.current, false)[0];
    const floorY = surface?.point.y ?? item.position[1] - 0.14;
    const heightAboveGround = Math.max(0, item.position[1] - floorY - 0.14);
    shadow.current.position.set(item.position[0], floorY + 0.008, item.position[2]);
    shadow.current.scale.setScalar(1 + Math.min(heightAboveGround, 2) * 0.55);
    shadowMaterial.opacity = 0.28 / (1 + heightAboveGround * 1.8);
  });
  const itemDefinition = itemById.get(item.itemId);
  const blockId = itemDefinition?.category === 'block' ? itemDefinition.placeBlock ?? item.itemId : undefined;
  const block = blockId ? blockById.get(blockId) : undefined;
  const geometry = useMemo(() => (blockId && block ? createDroppedBlockGeometry(blockId) : null), [blockId, block]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  return geometry ? (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[0.48, 0.48]} />
        <primitive object={shadowMaterial} attach="material" />
      </mesh>
      <mesh ref={mesh} geometry={geometry} position={item.position} castShadow>
        <meshStandardMaterial map={BLOCK_TEXTURE_ATLAS} roughness={0.8} />
      </mesh>
    </>
  ) : (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[0.48, 0.48]} />
        <primitive object={shadowMaterial} attach="material" />
      </mesh>
      <mesh ref={mesh} position={item.position} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color="#d6c17b" roughness={0.8} />
      </mesh>
    </>
  );
}

function DroppedItems({ items }: { items: DroppedItemSnapshot[] }) {
  const { scene } = useThree();
  const terrainMeshes = useRef<Mesh[]>([]);
  const meshScanElapsed = useRef(1);
  useFrame((_, delta) => {
    meshScanElapsed.current += delta;
    if (meshScanElapsed.current >= 0.25) {
      meshScanElapsed.current = 0;
      terrainMeshes.current = collectVoxelTerrainMeshes(scene);
    }
  });

  return (
    <>
      {items.map((item) => (
        <DroppedItemMesh key={item.id} item={item} terrainMeshes={terrainMeshes} />
      ))}
    </>
  );
}

function FirstPersonHand() {
  const { camera, scene } = useThree();
  const hand = useRef<Group>(null);
  const handPosition = useMemo(() => new Vector3(), []);
  const cameraOrigin = useMemo(() => new Vector3(), []);
  const handForward = useMemo(() => new Vector3(), []);
  const handRaycaster = useMemo(() => new Raycaster(), []);
  const terrainMeshes = useRef<Mesh[]>([]);
  const meshScanElapsed = useRef(1);
  const selected = useGameStore((state) => state.snapshot?.inventory[state.selectedSlot] ?? null);
  const miningProgress = useGameStore((state) => state.miningProgress);
  const heldItem = selected ? itemById.get(selected.itemId) : undefined;
  const heldBlock = heldItem?.category === 'block';
  const heldItemTexture = useMemo(() => {
    if (!selected) return null;
    const data = new Uint8Array(16 * 16 * 4);
    const blockColor = heldBlock ? blockById.get(heldItem?.placeBlock ?? selected.itemId)?.color : undefined;
    createItemIconPixels(selected.itemId).forEach((color, index) => {
      const offset = index * 4;
      const pixelColor = color ?? blockColor;
      if (pixelColor) {
        data[offset] = Number.parseInt(pixelColor.slice(1, 3), 16);
        data[offset + 1] = Number.parseInt(pixelColor.slice(3, 5), 16);
        data[offset + 2] = Number.parseInt(pixelColor.slice(5, 7), 16);
        data[offset + 3] = 255;
      }
    });
    const texture = new DataTexture(data, 16, 16, RGBAFormat);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [selected?.itemId]);

  useEffect(() => () => heldItemTexture?.dispose(), [heldItemTexture]);

  useFrame(({ clock }, delta) => {
    if (!hand.current) return;
    const swing = miningProgress > 0 ? Math.max(0, Math.sin(clock.elapsedTime * 12)) : 0;
    handPosition.set(
      0.42 + swing * 0.045,
      -0.46 + Math.sin(clock.elapsedTime * 2.2) * 0.008 - swing * 0.07,
      -0.78 + swing * 0.08
    );
    camera.localToWorld(handPosition);
    meshScanElapsed.current += delta;
    if (meshScanElapsed.current >= 0.25) {
      meshScanElapsed.current = 0;
      terrainMeshes.current = collectVoxelTerrainMeshes(scene);
    }
    camera.getWorldPosition(cameraOrigin);
    handForward.set(0.42 + swing * 0.045, -0.46 - swing * 0.07, -1.35 + swing * 0.08);
    camera.localToWorld(handForward);
    handForward.sub(cameraOrigin);
    const desiredReach = handForward.length();
    handForward.normalize();
    handRaycaster.set(cameraOrigin, handForward);
    const obstruction = handRaycaster.intersectObjects(terrainMeshes.current, false)[0];
    let correction = 0;
    if (obstruction) {
      correction = Math.min(0, obstruction.distance - desiredReach - 0.08);
      hand.current.visible = correction > -0.82;
      handPosition.addScaledVector(handForward, Math.max(-0.82, correction));
    } else {
      hand.current.visible = true;
    }
    hand.current.position.copy(handPosition);
    hand.current.quaternion.copy(camera.quaternion);
    hand.current.rotation.z += 0.22 - swing * 0.42;
    hand.current.rotation.x += Math.sin(clock.elapsedTime * 2.2) * 0.012 + swing * 0.62;
  });

  return (
    <group ref={hand}>
      <mesh position={[0, -0.06, 0.14]} rotation={[0.08, 0, -0.35]} castShadow>
        <boxGeometry args={[0.17, 0.2, 0.42]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.025, -0.16, -0.13]} rotation={[0.08, 0, -0.2]} castShadow>
        <boxGeometry args={[0.19, 0.17, 0.19]} />
        <meshStandardMaterial color="#d5a77d" roughness={0.92} />
      </mesh>
      {selected && heldItemTexture && heldBlock && (
        <mesh position={[-0.025, -0.06, -0.12]} rotation={[0.35, 0.65, -0.18]} castShadow>
          <boxGeometry args={[0.25, 0.25, 0.25]} />
          <meshStandardMaterial map={heldItemTexture} roughness={0.88} />
        </mesh>
      )}
      {selected && heldItemTexture && !heldBlock && (
        <mesh
          position={heldItem?.category === 'tool' ? [-0.035, 0.12, -0.08] : [-0.025, -0.06, -0.08]}
          scale={heldItem?.category === 'tool' ? [1, -1, 1] : [1, 1, 1]}
          rotation={heldItem?.category === 'tool' ? [0.18, -1, -0.2] : [0.25, 0, -0.2 - Math.PI]}
          renderOrder={10}
        >
          <planeGeometry args={heldItem?.category === 'tool' ? [0.48, 0.48] : [0.28, 0.28]} />
          <meshBasicMaterial
            map={heldItemTexture}
            transparent
            alphaTest={0.1}
            depthWrite={false}
            depthTest={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

function FirstPersonLegs({ playerPosition }: { playerPosition: React.MutableRefObject<Vector3> }) {
  const camera = useThree((state) => state.camera);
  const legs = useRef<Group>(null);

  useFrame(() => {
    if (!legs.current) return;
    legs.current.position.set(playerPosition.current.x, playerPosition.current.y, playerPosition.current.z);
    legs.current.rotation.y = camera.rotation.y;
  });

  return (
    <group ref={legs}>
      <mesh position={[-0.12, 0.39, 0.015]} castShadow>
        <boxGeometry args={[0.22, 0.62, 0.23]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[0.12, 0.39, 0.015]} castShadow>
        <boxGeometry args={[0.22, 0.62, 0.23]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[-0.12, 0.09, -0.04]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.3]} />
        <meshStandardMaterial color="#493526" roughness={0.9} />
      </mesh>
      <mesh position={[0.12, 0.09, -0.04]} castShadow>
        <boxGeometry args={[0.22, 0.16, 0.3]} />
        <meshStandardMaterial color="#493526" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 0.025, -0.04]} castShadow>
        <boxGeometry args={[0.22, 0.035, 0.3]} />
        <meshStandardMaterial color="#29231d" roughness={0.95} />
      </mesh>
      <mesh position={[0.12, 0.025, -0.04]} castShadow>
        <boxGeometry args={[0.22, 0.035, 0.3]} />
        <meshStandardMaterial color="#29231d" roughness={0.95} />
      </mesh>
    </group>
  );
}

function FirstPersonTorso({ playerPosition }: { playerPosition: React.MutableRefObject<Vector3> }) {
  const camera = useThree((state) => state.camera);
  const torso = useRef<Group>(null);

  useFrame(() => {
    if (!torso.current) return;
    const yaw = camera.rotation.y;
    torso.current.position.set(
      playerPosition.current.x + Math.sin(yaw) * 0.24,
      playerPosition.current.y,
      playerPosition.current.z + Math.cos(yaw) * 0.24
    );
    torso.current.rotation.y = camera.rotation.y;
  });

  return (
    <group ref={torso}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.64, 0.72, 0.24]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.37, 1.23, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.32, 0.24]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[0.37, 1.23, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.32, 0.24]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
    </group>
  );
}

function WorldLighting({ timeTicks, submerged }: { timeTicks: number; submerged: boolean }) {
  const sunlight = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const moonlight = useRef<DirectionalLight>(null);
  const sky = useMemo(() => new Color(), []);
  const { scene } = useThree();

  useFrame(() => {
    const timeOfDay = (timeTicks % 24000) / 1000;
    const daylight = Math.max(0, Math.sin(((timeOfDay - 6) * Math.PI) / 12));
    const sunAngle = ((timeOfDay - 6) / 24) * Math.PI * 2;
    sky.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);
    if (submerged) sky.set('#07365b');
    if (scene.background instanceof Color) scene.background.copy(sky);
    if (scene.fog instanceof Fog) {
      scene.fog.color.copy(sky);
      scene.fog.near = submerged ? 0 : 40;
      scene.fog.far = submerged ? 9 : 120;
    }
    if (ambient.current) ambient.current.intensity = submerged ? 0.65 : 0.18 + daylight * 1.32;
    if (sunlight.current) sunlight.current.intensity = submerged ? 0.08 : daylight * 2.2;
    sunlight.current?.position.set(Math.cos(sunAngle) * 40, Math.sin(sunAngle) * 55, 20);
    if (moonlight.current) moonlight.current.intensity = (1 - daylight) * 0.22;
  });

  return (
    <>
      <color attach="background" args={['#111b32']} />
      <fog attach="fog" args={['#111b32', 40, 120]} />
      <ambientLight ref={ambient} intensity={0.18} />
      <directionalLight
        ref={sunlight}
        position={[-30, 55, 20]}
        intensity={0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight ref={moonlight} position={[30, 20, -20]} color="#9fb8ff" intensity={0.22} />
    </>
  );
}

function EngineScene({ world, snapshot, paused, onError }: EngineProps) {
  const submerged = useGameStore((state) => state.submerged);
  const playerPosition = useRef(new Vector3(...snapshot.player.position));
  const [center, setCenter] = useState<[number, number]>([
    Math.floor(snapshot.player.position[0] / CHUNK_SIZE),
    Math.floor(snapshot.player.position[2] / CHUNK_SIZE)
  ]);
  return (
    <>
      <WorldLighting timeTicks={snapshot.timeTicks} submerged={submerged} />
      <Terrain world={world} snapshot={snapshot} center={center} playerPosition={playerPosition} onError={onError} />
      <DroppedItems items={snapshot.droppedItems ?? []} />
      <PlayerController
        world={world}
        paused={paused}
        initialSnapshot={snapshot}
        playerPosition={playerPosition}
        onError={onError}
        onChunkChange={(nextCenter) =>
          setCenter((current) => (current[0] === nextCenter[0] && current[1] === nextCenter[1] ? current : nextCenter))
        }
      />
      <FirstPersonHand />
      <FirstPersonTorso playerPosition={playerPosition} />
      <FirstPersonLegs playerPosition={playerPosition} />
    </>
  );
}

export default function VoxelWorld({
  world,
  paused,
  onError
}: VoxelWorldProps & { onError: (message: string) => void }) {
  const snapshot = useGameStore((state) => state.snapshot) ?? world.snapshot;
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => setCanvasReady(true), []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 24, 32], fov: 72, near: 0.1, far: 180 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {canvasReady && <EngineScene world={world} snapshot={snapshot} paused={paused} onError={onError} />}
    </Canvas>
  );
}
