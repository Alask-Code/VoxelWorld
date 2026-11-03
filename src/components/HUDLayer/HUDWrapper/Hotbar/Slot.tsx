import React from 'react';
import { itemName, itemById } from '../../../../domain/content';
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
      aria-label={`Atalho ${index + 1}${stack ? `: ${itemName(stack.itemId)}` : ': vazio'}`}
      aria-pressed={selectedSlot === index}
      className={`relative flex aspect-square size-23 flex-col items-center border-2 justify-center text-xs ${
        selectedSlot === index && 'bg-yellow-200'
      }`}
      key={stack?.itemId}
      onClick={selectSlotFunction}
      title={stack ? itemName(stack.itemId) : 'Slot vazio'}
      type="button"
    >
      <span className="absolute left-2 top-1 text-[9px]">{index + 1}</span>
      {stack && (
        <>
          <ItemIcon itemId={stack.itemId} />
          <span className="max-w-full truncate text-[8px] font-bold [text-shadow:1px_1px_0_#000] sm:text-[9px]">
            {itemName(stack.itemId)}
          </span>
          <span
            className={`item-count ${
              itemById.get(stack.itemId)?.durability ? 'has-durability' : ''
            } absolute bottom-0.5 right-1 text-xs font-black  [text-shadow:1px_1px_0_#000]`}
          >
            {stack.count}
          </span>
          <DurabilityBar stack={stack} />
        </>
      )}
    </button>
  );
}
