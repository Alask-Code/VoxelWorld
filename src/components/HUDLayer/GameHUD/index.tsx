import React from 'react';
import { itemName, itemById } from '../../../domain/content';
import { StoredWorld, WorldSnapshot } from '../../../domain/world';
import { OXYGEN_TICKS_PER_BUBBLE } from '../../../engine/playerOxygen';
import { useGameStore } from '../../../stores/game';
import ItemIcon from '../../ItemIcon';
import DurabilityBar from '../DurabilityBar';

export default function GameHud({
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
    <div className="fixed inset-0 flex h-screen flex-col justify-between p-4 font-mono text-white sm:p-8">
      <div className="flex items-center justify-between gap-3 border-2 border-black/80 bg-black/45 p-2 shadow-[inset_2px_2px_0_#ffffff30,inset_-2px_-2px_0_#00000070]">
        <div className="border-2 border-black/70 bg-black/50 px-3 py-2 text-xs font-bold tracking-wider text-white shadow-[inset_2px_2px_0_#ffffff20,inset_-2px_-2px_0_#00000060] sm:text-sm">
          {phase} · {world.manifest.mode === 'creative' ? 'Criativo' : 'Sobrevivência'}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            className="border-2 border-black/80 bg-[#777] px-3 py-2 text-xs font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,2px_2px_0_#111] hover:bg-[#888] active:translate-y-0.5 active:shadow-none sm:text-sm"
            onClick={onOpenInventory}
            type="button"
          >
            Inventário <kbd className="ml-1 border border-black/50 bg-[#444] px-1 text-amber-300">E</kbd>
          </button>
          <button
            className="border-2 border-black/80 bg-[#777] px-3 py-2 text-xs font-bold text-white shadow-[inset_2px_2px_0_#aaa,inset_-2px_-2px_0_#444,2px_2px_0_#111] hover:bg-[#888] active:translate-y-0.5 active:shadow-none sm:text-sm"
            onClick={pause}
            type="button"
          >
            Pausar <kbd className="ml-1 border border-black/50 bg-[#444] px-1 text-amber-300">Esc</kbd>
          </button>
        </div>
      </div>
      {world.manifest.mode === 'survival' && (
        <div className="absolute bottom-24 left-1/2 w-fit max-w-[90vw] -translate-x-1/2 border-2 border-black/70 bg-black/40 p-2 shadow-[inset_2px_2px_0_#ffffff20,inset_-2px_-2px_0_#00000070] sm:bottom-28 sm:p-3">
          {submerged && (
            <div
              className={`oxygen-status ${
                oxygenBubbles === 0 ? 'is-depleted' : ''
              } mb-2 flex items-center justify-center gap-2 text-sm font-black text-cyan-300 [text-shadow:2px_2px_0_#000]`}
              aria-label={`Oxigênio: ${oxygenBubbles} de 10`}
            >
              <span>AR</span>
              <strong className="tracking-widest" aria-hidden="true">
                {'●'.repeat(oxygenBubbles)}
                {'○'.repeat(10 - oxygenBubbles)}
              </strong>
            </div>
          )}
          <div className="flex flex-col gap-2" aria-label="Status do jogador">
            <div className="flex items-center justify-center gap-4 border-b-2 border-white/10 pb-2 text-xl [text-shadow:2px_2px_0_#000] sm:text-2xl">
              <span
                className="tracking-tight text-red-500"
                aria-label={`Vida: ${snapshot.player.health} de 20`}
                role="img"
              >
                {'♥'.repeat(Math.max(0, Math.ceil(snapshot.player.health / 2)))}
                <i className="text-red-950/80">{'♡'.repeat(Math.max(0, 10 - Math.ceil(snapshot.player.health / 2)))}</i>
              </span>
              <span
                className="tracking-tight text-amber-400"
                aria-label={`Fome: ${snapshot.player.hunger} de 20`}
                role="img"
              >
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
      <div
        className={`flex fixed items-center justify-center pointer-events-none *:absolute  left-1/2 top-1/2 z-10 p-10 -translate-x-1/2 -translate-y-1/2 ${
          miningProgress > 0 ? 'is-mining' : ''
        }`}
        aria-hidden="true"
      >
        <span className="bg-green-600 w-4 h-0.5" />
        <span className="bg-white w-0.5 h-4" />
      </div>
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
      <div
        className="mx-auto flex w-fit max-w-full border-4 border-[#171717] bg-[#777] p-1 shadow-[inset_3px_3px_0_#aaa,inset_-3px_-3px_0_#444,4px_4px_0_#111]"
        role="toolbar"
        aria-label="Barra de acesso rápido"
      >
        {snapshot.inventory.slice(0, 9).map((stack, index) => (
          <button
            aria-label={`Atalho ${index + 1}${stack ? `: ${itemName(stack.itemId)}` : ': vazio'}`}
            aria-pressed={selectedSlot === index}
            className={`relative flex aspect-square w-9 flex-col items-center justify-center border-2 border-[#555] bg-[#8b8b8b] text-xs shadow-[inset_2px_2px_0_#bdbdbd,inset_-2px_-2px_0_#555] sm:w-12 ${
              selectedSlot === index
                ? '!border-[#fff] !bg-[#aaa] !shadow-[inset_2px_2px_0_#eee,inset_-2px_-2px_0_#666,0_0_0_2px_#222]'
                : 'hover:bg-[#999]'
            }`}
            key={stack?.itemId}
            onClick={() => selectSlot(index)}
            title={stack ? itemName(stack.itemId) : 'Slot vazio'}
            type="button"
          >
            <span className="absolute left-1 top-0.5 text-[9px] text-white/80 [text-shadow:1px_1px_0_#000] sm:text-[10px]">
              {index + 1}
            </span>
            {stack && (
              <>
                <ItemIcon itemId={stack.itemId} />
                <span className="max-w-full truncate text-[8px] font-bold text-white [text-shadow:1px_1px_0_#000] sm:text-[9px]">
                  {itemName(stack.itemId)}
                </span>
                <span
                  className={`item-count ${
                    itemById.get(stack.itemId)?.durability ? 'has-durability' : ''
                  } absolute bottom-0.5 right-1 text-xs font-black text-white [text-shadow:1px_1px_0_#000]`}
                >
                  {stack.count}
                </span>
                <DurabilityBar stack={stack} />
              </>
            )}
          </button>
        ))}
      </div>
      {selectedStack && (
        <div className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 border-2 border-black bg-black/60 px-3 py-2 font-bold text-sm text-white shadow-[inset_2px_2px_0_#ffffff30,inset_-2px_-2px_0_#00000070] [text-shadow:1px_1px_0_#000]">
          <ItemIcon itemId={selectedStack.itemId} />
          {itemName(selectedStack.itemId)}
        </div>
      )}
    </div>
  );
}
