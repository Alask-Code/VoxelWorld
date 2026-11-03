import React from 'react';
import { itemById } from '../../../domain/content';
import { ItemStack } from '../../../domain/world';

export default function DurabilityBar({ stack }: { stack: ItemStack }) {
  const durability = itemById.get(stack.itemId)?.durability;
  if (durability === undefined) return null;
  const remaining = Math.max(0, durability - (stack.damage ?? 0));
  const percentage = (remaining / durability) * 100;
  return (
    <span
      className="durability-bar absolute bottom-1 left-1/2 h-[3px] w-3/4 -translate-x-1/2 overflow-hidden border border-[#222] bg-[#333] shadow-[1px_1px_0_#000]"
      aria-label={`Durabilidade: ${remaining} de ${durability}`}
      role="img"
    >
      <i className="block h-full bg-[#80c342] shadow-[inset_0_1px_0_#b4e77b]" style={{ width: `${percentage}%` }} />
    </span>
  );
}
