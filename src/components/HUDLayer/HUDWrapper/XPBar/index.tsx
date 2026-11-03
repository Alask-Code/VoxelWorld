import React from 'react';
import { WorldSnapshot } from '../../../../domain/world';

export default function XPBar({ snapshot }: { snapshot: WorldSnapshot }) {
  return (
    <div className="flex flex-col justify-center items-center">
      <p className="flex text-xl size-fit leading-[10pt] italic">{snapshot.player.level}</p>

      <div className="flex-1 border-2 border-emerald-800 bg-emerald-950 w-full">
        <div
          className="h-full flex p-1 bg-linear-to-r from-emerald-800 to-emerald-500"
          style={{ width: `${Math.min(100, snapshot.player.experience + 10)}%` }}
        />
      </div>
    </div>
  );
}
