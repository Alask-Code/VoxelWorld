import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadWorld, saveWorld } from '../application/worldStorage';
import VoxelWorld from '../engine/VoxelWorld';
import { useGameStore } from '../stores/game';
import { useSettingsStore } from '../stores/settings';
import requestGamePointerLock from '../engine/pointerLock';
import InventoryPanel from '../components/HUDLayer/Inventory/Panel';
import HUDWrapper from '../components/HUDLayer/HUDWrapper';

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
        <p
          className="border-2 border-[#171717] bg-[#8b2929] p-4 shadow-[inset_2px_2px_0_#bd5555,inset_-2px_-2px_0_#501313,4px_4px_0_#111] [text-shadow:2px_2px_0_#000]"
          role="alert"
        >
          {error}
        </p>
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
    <main
      className={`relative flex h-screen items-center justify-center overflow-hidden bg-[#303030] ${
        submerged ? 'border-12 border-blue-700/70' : ''
      }`}
      style={{ '--ui-scale': uiScale } as React.CSSProperties}
    >
      <div className="size-full bg-[#303030]" ref={canvasRef}>
        <VoxelWorld world={world} paused={overlay !== 'none'} onError={reportEngineError} />
      </div>
      <HUDWrapper world={world} snapshot={snapshot} onOpenInventory={openInventory} />
      {error && (
        <p
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border-2 border-[#171717] bg-[#8b2929] p-3 font-mono text-sm text-white shadow-[inset_2px_2px_0_#bd5555,inset_-2px_-2px_0_#501313,3px_3px_0_#111]"
          role="alert"
        >
          {error}
        </p>
      )}
      {(overlay === 'inventory' || overlay === 'crafting') && (
        <InventoryPanel
          snapshot={snapshot}
          creative={world.manifest.mode === 'creative'}
          craftingTable={overlay === 'crafting'}
          onClose={resumeGame}
        />
      )}
      {overlay === 'pause' && (
        <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/70 p-4 font-mono">
          <section
            className="w-full max-w-lg border-4 border-[#171717] bg-[#c6c6c6] p-5 text-center text-[#303030] shadow-[inset_4px_4px_0_#fff,inset_-4px_-4px_0_#555,8px_8px_0_#111]"
            aria-labelledby="pause-title"
            aria-modal="true"
            role="dialog"
          >
            <p className="mb-3 text-xs font-bold tracking-[0.25em] text-[#555] [text-shadow:1px_1px_0_#fff]">
              MUNDO PAUSADO
            </p>
            <h2 className="mb-6 text-2xl font-black [text-shadow:2px_2px_0_#fff]" id="pause-title">
              Um momento de descanso
            </h2>
            <div className="flex flex-col gap-3">
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#222] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={resumePausedGame}
                type="button"
              >
                Voltar ao jogo
              </button>
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#222] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={() => saveRef.current()}
                type="button"
              >
                {saving ? 'Salvando…' : 'Salvar agora'}
              </button>
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#222] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={() => saveAndOpenSettings()}
                type="button"
              >
                Configurações
              </button>
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#222] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={() => saveAndExit()}
                type="button"
              >
                Salvar e sair para mundos
              </button>
            </div>
            <p className="mt-6 border-t-2 border-[#888] pt-4 text-xs leading-relaxed text-[#444]">
              Pressione Esc ou selecione voltar para retomar o jogo e capturar o cursor. O mundo é salvo
              automaticamente.
            </p>
          </section>
        </div>
      )}
      {overlay === 'dead' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
          <section
            className="w-full max-w-lg border-4 border-[#171717] bg-[#3b2020] p-6 text-center text-white shadow-[inset_4px_4px_0_#754040,inset_-4px_-4px_0_#190909,8px_8px_0_#000]"
            aria-labelledby="dead-title"
            aria-modal="true"
            role="dialog"
          >
            <p className="mb-3 text-sm font-black tracking-[0.3em] text-red-400 [text-shadow:2px_2px_0_#000]">
              FIM DE JOGO
            </p>
            <h2 className="mb-4 text-3xl font-black [text-shadow:3px_3px_0_#000]" id="dead-title">
              Você caiu no mundo.
            </h2>
            <p className="mb-6 text-sm text-gray-300">Seu ponto de reaparecimento continua guardado.</p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#000] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={respawn}
                type="button"
              >
                Reaparecer
              </button>
              <button
                className="w-full border-2 border-[#171717] bg-[#777] px-4 py-3 font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,3px_3px_0_#000] hover:bg-[#888] active:translate-y-1 active:shadow-none"
                onClick={() => saveAndExit()}
                type="button"
              >
                Salvar e sair
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
