import React from 'react';
import { itemName, itemById } from '../../../../domain/content';
import ItemIcon from '../../../ItemIcon';
import DurabilityBar from '../../DurabilityBar';
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
    <div
      className="mx-auto flex w-fit max-w-full gap-1 border-2 p-1"
      role="toolbar"
      aria-label="Barra de acesso rápido"
    >
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
