import React from 'react';
import { WorldSnapshot } from '../../../../domain/world';
import HealthCounter from '../HealthCounter';
import HungerCounter from '../HungerCounter';
import OxygenCounter from '../OxygenCounter';
import { useGameStore } from '../../../../stores/game';
import { OXYGEN_TICKS_PER_BUBBLE } from '../../../../engine/playerOxygen';
import XPBar from '../XPBar';

export default function SurvivalPanel({ snapshot }: { snapshot: WorldSnapshot }) {
  const { submerged, oxygenTicks } = useGameStore();
  const oxygenBubbles = Math.ceil(oxygenTicks / OXYGEN_TICKS_PER_BUBBLE);

  return (
    <div className="w-fit flex flex-col gap-1">
      <div className="gap-1 grid grid-cols-2">
        <HealthCounter health={snapshot.player.health} />
        <HungerCounter hunger={snapshot.player.hunger} />
        <p />
        {submerged && <OxygenCounter oxygenBubbles={oxygenBubbles} />}
      </div>
      <XPBar snapshot={snapshot} />
    </div>
  );
}
