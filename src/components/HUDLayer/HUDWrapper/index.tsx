import React from 'react';
import { itemName } from '../../../domain/content';
import { StoredWorld, WorldSnapshot } from '../../../domain/world';
import { OXYGEN_TICKS_PER_BUBBLE } from '../../../engine/playerOxygen';
import { useGameStore } from '../../../stores/game';
import ItemIcon from '../../ItemIcon';
import Crossbar from './Crossbar';
import Hotbar from './Hotbar';
import OxygenCounter from './OxygenCounter';

export default function HUDWrapper({
  world,
  snapshot,
  onOpenInventory
}: {
  world: StoredWorld;
  snapshot: WorldSnapshot;
  onOpenInventory: () => void;
}) {
  const { selectedSlot, selectSlot, oxygenTicks, submerged, miningProgress } = useGameStore();
  const selectedStack = snapshot.inventory[selectedSlot];
  const oxygenBubbles = Math.ceil(oxygenTicks / OXYGEN_TICKS_PER_BUBBLE);
  const hour = Math.floor((snapshot.timeTicks % 24000) / 1000);
  const phase = hour < 6 ? 'Madrugada' : hour < 18 ? 'Dia' : hour < 21 ? 'Entardecer' : 'Noite';
  const pause = () => {
    useGameStore.getState().setOverlay('pause');
    if (document.pointerLockElement) document.exitPointerLock();
  };
  return (
    <div className="fixed *:text-white inset-0 flex h-screen flex-col justify-between p-4 font-mono  sm:p-8">
      <div className="flex items-center justify-between gap-3 border-2 border-black/80 bg-black/45 p-2 shadow-[inset_2px_2px_0_#ffffff30,inset_-2px_-2px_0_#00000070]">
        <div className="border-2 border-black/70 bg-black/50 px-3 py-2 text-xs font-bold tracking-wider  shadow-[inset_2px_2px_0_#ffffff20,inset_-2px_-2px_0_#00000060] sm:text-sm">
          {phase} · {world.manifest.mode === 'creative' ? 'Criativo' : 'Sobrevivência'}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="border-2 border-black/80 bg-[#777] px-3 py-2 text-xs font-bold shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,2px_2px_0_#111] hover:bg-[#888] active:translate-y-0.5 active:shadow-none sm:text-sm"
            onClick={onOpenInventory}
            type="button"
          >
            Inventário <kbd className="ml-1 border border-black/50 bg-[#444] px-1 text-amber-300">E</kbd>
          </button>
          <button
            className="border-2 border-black/80 bg-[#777] px-3 py-2 text-xs font-bold  shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,2px_2px_0_#111] hover:bg-[#888] active:translate-y-0.5 active:shadow-none sm:text-sm"
            onClick={pause}
            type="button"
          >
            Pausar <kbd className="border border-black/50 bg-[#444] px-1 text-amber-300">Esc</kbd>
          </button>
        </div>
      </div>
      {world.manifest.mode === 'survival' && (
        <div className="absolute bottom-24 left-1/2 w-fit max-w-[90vw] -translate-x-1/2 border-2 border-black/70 bg-yellow-200/40 p-2 shadow-[inset_2px_2px_0_#ffffff20,inset_-2px_-2px_0_#00000070] sm:bottom-28 sm:p-3">
          {submerged && <OxygenCounter oxygenBubbles={oxygenBubbles} />}
          <div className="flex flex-col gap-2" aria-label="Status do jogador">
            <div className="flex items-center justify-center gap-4 border-b-2 border-white/10 pb-2 text-xl [text-shadow:2px_2px_0_#000] sm:text-2xl">
              <span className="text-red-500" aria-label={`Vida: ${snapshot.player.health} de 20`} role="img">
                {'♥'.repeat(Math.max(0, Math.ceil(snapshot.player.health / 2)))}
                <i className="text-red-950/80">{'♡'.repeat(Math.max(0, 10 - Math.ceil(snapshot.player.health / 2)))}</i>
              </span>
              <span className="text-amber-400" aria-label={`Fome: ${snapshot.player.hunger} de 20`} role="img">
                {'◆'.repeat(Math.max(0, Math.ceil(snapshot.player.hunger / 2)))}
                <i className="text-amber-950/80">
                  {'◇'.repeat(Math.max(0, 10 - Math.ceil(snapshot.player.hunger / 2)))}
                </i>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="flex size-7 shrink-0 items-center justify-center border-2 border-black bg-[#444] text-sm font-black text-lime-300 shadow-[inset_1px_1px_0_#888]"
                aria-label={`Nível ${snapshot.player.level}`}
              >
                {snapshot.player.level}
              </span>
              <div
                className="h-3 flex-1 overflow-hidden border-2 border-black bg-[#292929] shadow-[inset_1px_1px_0_#111]"
                role="progressbar"
                aria-label="Experiência"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={snapshot.player.experience}
              >
                <i
                  className="block h-full bg-[#80d020] shadow-[inset_0_2px_0_#b5ff65]"
                  style={{ width: `${Math.min(100, snapshot.player.experience)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <Crossbar />
      {miningProgress > 0 && (
        <div
          className="absolute bottom-20 left-1/2 z-20 h-3 w-48 -translate-x-1/2 overflow-hidden border-2 border-black bg-[#292929] shadow-[2px_2px_0_#000]"
          role="progressbar"
          aria-label="Progresso ao quebrar bloco"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(miningProgress * 100)}
        >
          <span
            className="block h-full bg-[#a0a0a0] shadow-[inset_0_2px_0_#ddd]"
            style={{ width: `${miningProgress * 100}%` }}
          />
        </div>
      )}
      <Hotbar snapshot={snapshot} selectedSlot={selectedSlot} selectSlot={selectSlot} />
      {selectedStack && (
        <div className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border-2 border-black bg-black/60 px-3 py-2 font-bold text-sm  shadow-[inset_2px_2px_0_#ffffff30,inset_-2px_-2px_0_#00000070] [text-shadow:1px_1px_0_#000]">
          <ItemIcon itemId={selectedStack.itemId} />
          {itemName(selectedStack.itemId)}
        </div>
      )}
    </div>
  );
}
