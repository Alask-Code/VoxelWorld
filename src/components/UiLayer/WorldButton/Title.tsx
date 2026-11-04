import React from 'react';
import { WorldManifest } from '../../../domain/world';

export default function WorldTitle({
  world,
  isRenaming: renaming,
  saveName,
  newWorldName: newName,
  NewName,
  Renaming
}: {
  world: WorldManifest;
  isRenaming: string | null;
  newWorldName: string;
  Renaming: (id: string | null) => void;
  NewName: (name: string) => void;
  saveName: (id: string) => void;
}) {
  return renaming === world.id ? (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        saveName(world.id);
      }}
    >
      <input maxLength={32} onChange={(event) => NewName(event.target.value)} value={newName} />
      <button type="submit">Salvar</button>
      <button onClick={() => Renaming(null)} type="button">
        Cancelar
      </button>
    </form>
  ) : (
    <h2 className="text-2xl px-2">{world.name}</h2>
  );
}
