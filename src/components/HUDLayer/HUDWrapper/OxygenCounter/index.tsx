import React from 'react';

export default function OxygenCounter({ oxygenBubbles }: { oxygenBubbles: number }) {
  return (
    <div
      className={`oxygen-status ${
        oxygenBubbles === 0 ? 'is-depleted' : ''
      } mb-2 flex items-center justify-center gap-2 text-sm font-black text-cyan-300 [text-shadow:2px_2px_0_#000]`}
      aria-label={`Oxigênio: ${oxygenBubbles} de 10`}
    >
      <span>Oxigênio</span>
      <strong className="tracking-widest" aria-hidden="true">
        {'●'.repeat(oxygenBubbles)}
        {'○'.repeat(10 - oxygenBubbles)}
      </strong>
    </div>
  );
}
