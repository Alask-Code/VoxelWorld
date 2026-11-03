import React from 'react';
import { itemName } from '../../../../domain/content';

export default function Tooltip({ itemId }: { itemId: string }) {
  return <div className="px-2 text-emerald-500">{itemName(itemId)}</div>;
}
