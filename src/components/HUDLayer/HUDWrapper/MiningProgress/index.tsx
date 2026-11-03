import React from 'react';

export default function MiningProgress({ progress }: { progress: number }) {
  return (
    <div className="absolute bottom-20 left-1/2 z-20 h-3 w-48 -translate-x-1/2 overflow-hidden border-2 border-black bg-[#292929]">
      <span className="block h-full bg-[#a0a0a0]" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
