import React from 'react';
import { WorldManifest } from '../../../domain/world';
import { WorldButtonProps } from '.';
import WorldTitle from './Title';

interface WorldDetailsProps {
  world: WorldManifest;
  renaming: string | null;
  newName: string;
  setFunctions: WorldButtonProps['setFunctions'];
}

export default function WorldDetails({
  world,
  renaming,
  newName,
  setFunctions: { NewName, saveName, Renaming, formatDate }
}: WorldDetailsProps) {
  return (
    <div className="bg-black/50 text-white border-black text-2xl border-2 flex flex-col size-full text-md">
      <WorldTitle
        world={world}
        newWorldName={newName}
        NewName={NewName}
        saveName={saveName}
        Renaming={Renaming}
        isRenaming={renaming}
      />
      <p className="capitalize text-xl px-2 text-stone-400">
        {world.mode === 'creative' ? 'Criativo' : 'sobrevivência'} | {world.difficulty} | {world.seed}
      </p>
      <p className="capitalize px-2 text-xl text-stone-400">{formatDate(world.lastPlayedAt)}</p>
    </div>
  );
}
