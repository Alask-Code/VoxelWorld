import React from 'react';

export default function DeadScreen({
  respawn,
  saveAndExit
}: {
  respawn: () => void;
  saveAndExit: () => Promise<void>;
}) {
  return (
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
  );
}
