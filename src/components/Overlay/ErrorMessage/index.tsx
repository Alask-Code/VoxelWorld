import React from 'react';

export default function ErrorMessage({ error }: { error: string }) {
  return (
    <p className="fixed left-1/2 top-4 z-50 -translate-x-1/2 border-2 border-[#171717] bg-[#8b2929] p-3 font-mono text-sm text-white shadow-[inset_2px_2px_0_#bd5555,inset_-2px_-2px_0_#501313,3px_3px_0_#111]">
      {error}
    </p>
  );
}
