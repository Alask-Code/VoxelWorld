import React from 'react';
import ItemIcon from '../../../ItemIcon';
import DurabilityBar from '../../DurabilityBar';

interface HotbarSlotProps {
  index: number;
  stack: { itemId: string; count: number } | null;
  selectedSlot: number;
  selectSlotFunction: () => void;
}

export default function HotbarSlot({ index, stack, selectedSlot, selectSlotFunction }: HotbarSlotProps) {
  return (
    <button
      className={`flex relative aspect-square size-14 bg-stone-800 text-stone-300 py-1 flex-col items-center border border-stone-700 justify-center text-xs ${
        selectedSlot === index && 'bg-emerald-600! text-emerald-400!'
      }`}
      key={stack?.itemId}
      onClick={selectSlotFunction}
    >
      {stack && (
        <>
          <ItemIcon itemId={stack.itemId} />
          <p className="text-xl absolute bottom-1 right-1">{stack.count}</p>
          <DurabilityBar stack={stack} />
        </>
      )}
    </button>
  );
}
