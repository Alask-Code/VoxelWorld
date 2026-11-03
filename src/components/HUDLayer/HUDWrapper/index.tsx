import React from 'react';
import { StoredWorld, WorldSnapshot } from '../../../domain/world';
import { useGameStore } from '../../../stores/game';
import Crossbar from './Crossbar';
import Hotbar from './Hotbar';
import Tooltip from './Tooltip';
import SurvivalPanel from './SurvivalPanel';
import MiningProgress from './MiningProgress';

export default function HUDWrapper({ world, snapshot }: { world: StoredWorld; snapshot: WorldSnapshot }) {
  const { selectedSlot, selectSlot, miningProgress } = useGameStore();
  const selectedStack = snapshot.inventory[selectedSlot];

  return (
    <div className="fixed flex flex-col w-screen h-screen items-center justify-end p-2">
      {world.manifest.mode === 'survival' && <SurvivalPanel snapshot={snapshot} />}
      <Crossbar />
      {miningProgress > 0 && <MiningProgress progress={miningProgress} />}
      {selectedStack && <Tooltip itemId={selectedStack.itemId} />}
      <Hotbar snapshot={snapshot} selectedSlot={selectedSlot} selectSlot={selectSlot} />
    </div>
  );
}
