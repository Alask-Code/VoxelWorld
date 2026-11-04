import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadWorld, saveWorld } from '../application/worldStorage';
import VoxelWorld from '../engine/VoxelWorld';
import { useGameStore } from '../stores/game';
import requestGamePointerLock from '../engine/pointerLock';
import InventoryPanel from '../components/HUDLayer/Inventory/Panel';
import HUDWrapper from '../components/HUDLayer/HUDWrapper';
import ErrorMessage from '../components/Overlay/ErrorMessage';
import PauseScreen from '../components/Overlay/PauseScreen';
import DeadScreen from '../components/Overlay/DeadScreen';

export default function Game() {
  const { worldId = '' } = useParams();
  const navigate = useNavigate();
  const world = useGameStore((state) => state.world);
  const snapshot = useGameStore((state) => state.snapshot);
  const overlay = useGameStore((state) => state.overlay);
  const setWorld = useGameStore((state) => state.setWorld);
  const setSnapshot = useGameStore((state) => state.setSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
    loadWorld(worldId)
      .then((record) => {
        if (!active) return;
        setWorld(record);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Não foi possível abrir o mundo.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setWorld, worldId]);

  const save = async (): Promise<boolean> => {
    const latest = useGameStore.getState();
    if (!latest.world || !latest.snapshot || saving) return false;
    setSaving(true);
    try {
      await saveWorld(latest.world.manifest.id, latest.snapshot);
      setError('');
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Falha ao salvar o mundo.';
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
    const interval = window.setInterval(() => {
      saveRef.current();
    }, 30_000);
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

  if (loading)
    return (
      <main className="flex h-screen items-center justify-center bg-[#303030] font-mono text-xl text-white [text-shadow:2px_2px_0_#000]">
        Preparando seu mundo…
      </main>
    );
  if (error && (!world || world.manifest.id !== worldId))
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-6 bg-[#303030] font-mono text-white">
        <ErrorMessage error={error} />
        <button
          className="min-w-64 border-2 border-[#171717] bg-[#777] px-6 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#111] hover:bg-[#888] active:translate-y-1 active:shadow-none"
          onClick={() => navigate('/worlds')}
          type="button"
        >
          Voltar aos mundos
        </button>
      </main>
    );
  if (!world || !snapshot)
    return (
      <main className="flex h-screen items-center justify-center bg-[#303030] font-mono text-white [text-shadow:2px_2px_0_#000]">
        Mundo indisponível.
      </main>
    );

  return (
    <main className="flex h-screen items-center justify-center overflow-hidden">
      <div className="size-full bg-[#303030]" ref={canvasRef}>
        <VoxelWorld world={world} paused={overlay !== 'none'} onError={reportEngineError} />
      </div>
      <HUDWrapper world={world} snapshot={snapshot} />
      {error && <ErrorMessage error={error} />}
      {(overlay === 'inventory' || overlay === 'crafting') && (
        <InventoryPanel
          snapshot={snapshot}
          creative={world.manifest.mode === 'creative'}
          craftingTable={overlay === 'crafting'}
          onClose={resumeGame}
        />
      )}
      {overlay === 'pause' && (
        <PauseScreen
          resumePausedGame={resumePausedGame}
          saveRef={saveRef}
          saving={saving}
          saveAndExit={saveAndExit}
          saveAndOpenSettings={saveAndOpenSettings}
        />
      )}
      {overlay === 'dead' && <DeadScreen respawn={respawn} saveAndExit={saveAndExit} />}
    </main>
  );
}
