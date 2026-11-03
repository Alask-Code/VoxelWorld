import React from 'react';
import { WorldSnapshot } from '../../../../domain/world';
import HotbarSlot from './Slot';

export default function Hotbar({
  snapshot,
  selectedSlot,
  selectSlot
}: {
  snapshot: WorldSnapshot;
  selectedSlot: number;
  selectSlot: (index: number) => void;
}) {
  return (
    <div className="flex w-fit max-w-full gap-0.5 bg-stone-600 border-stone-500 border p-0.5">
      {snapshot.inventory.slice(0, 9).map((stack, index) => (
        <HotbarSlot
          key={stack?.itemId || index}
          index={index}
          stack={stack}
          selectedSlot={selectedSlot}
          selectSlotFunction={() => selectSlot(index)}
        />
      ))}
    </div>
  );
}
