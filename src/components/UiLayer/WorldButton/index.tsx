import React from 'react';
import { RiBox3Line } from 'react-icons/ri';
import NavigateButton from '../NavigateButton';
import { WorldManifest } from '../../../domain/world';
import WorldDetails from './Details';

export interface WorldButtonProps {
  world: WorldManifest;
  renaming: string | null;
  newName: string;
  setFunctions: {
    Renaming: (id: string | null) => void;
    NewName: (name: string) => void;
    saveName: (id: string) => void;
    remove: (world: WorldManifest) => void;
    formatDate: (timestamp: number) => string;
    navigate: (path: string) => void;
  };
}

export default function WorldButton({ world, renaming, newName, setFunctions }: WorldButtonProps) {
  return (
    <article key={world.id} className="border-2 p-2 gap-2 items-center justify-start bg-stone-600 flex">
      <RiBox3Line className="border-2 h-full min-w-1/11 bg-black/50 text-6xl" />
      <WorldDetails newName={newName} world={world} renaming={renaming} setFunctions={setFunctions} />
      <div className="h-full gap-2 flex">
        <NavigateButton onClick={() => setFunctions.navigate(`/game/${world.id}`)} label="Entrar" />
        <NavigateButton
          onClick={() => {
            setFunctions.Renaming(world.id);
            setFunctions.NewName(world.name);
          }}
          label="Renomear"
        />
        <NavigateButton onClick={() => setFunctions.remove(world)} label="Excluir" />
      </div>
    </article>
  );
}
