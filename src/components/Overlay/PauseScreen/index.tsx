import React, { RefObject } from 'react';

interface PauseScreenProps {
  resumePausedGame: () => void;
  saveRef: RefObject<() => Promise<boolean>>;
  saving: boolean;
  saveAndOpenSettings: () => void;
  saveAndExit: () => void;
}

export default function PauseScreen({
  resumePausedGame,
  saveRef,
  saving,
  saveAndOpenSettings,
  saveAndExit
}: PauseScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex size-full items-center justify-center bg-black/10 p-4 font-mono">
      <section
        className="w-full max-w-lg border-4 border-[#171717] bg-[#c6c6c6] p-5 text-center text-[#303030]"
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
          Pressione Esc ou selecione voltar para retomar o jogo e capturar o cursor. O mundo é salvo automaticamente.
        </p>
      </section>
    </div>
  );
}
