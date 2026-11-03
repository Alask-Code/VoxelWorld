import React from 'react';
import { itemById } from '../../../domain/content';
import { ItemStack } from '../../../domain/world';

export default function DurabilityBar({ stack }: { stack: ItemStack }) {
  const durability = itemById.get(stack.itemId)?.durability;
  if (durability === undefined) return null;
  const remaining = Math.max(0, durability - (stack.damage ?? 0));
  const percentage = (remaining / durability) * 100;
  return (
    <p className="h-2 w-3/4 overflow-hidden border-[#222] bg-[#333]">
      <i className="block h-full bg-[#80c342]" style={{ width: `${percentage}%` }} />
    </p>
  );
}
