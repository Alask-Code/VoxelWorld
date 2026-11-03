import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/game';
import { useSettingsStore, type GameAction } from '../stores/settings';

const actionLabels: Record<GameAction, string> = {
  forward: 'Mover para frente',
  back: 'Mover para trás',
  left: 'Mover à esquerda',
  right: 'Mover à direita',
  jump: 'Pular / voar',
  sneak: 'Agachar / descer',
  sprint: 'Correr',
  inventory: 'Inventário',
  drop: 'Soltar item'
};

function keyLabel(code: string): string {
  return code.replace('Key', '').replace('Digit', '').replace('Left', ' esquerdo').replace('Right', ' direito');
}

export default function Settings() {
  const settings = useSettingsStore();
  const gameWorld = useGameStore((state) => state.world);
  const [waitingFor, setWaitingFor] = useState<GameAction | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!waitingFor) return undefined;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      settings.setControl(waitingFor, event.code);
      setWaitingFor(null);
    };
    window.addEventListener('keydown', capture, { once: true });
    return () => window.removeEventListener('keydown', capture);
  }, [settings, waitingFor]);

  return (
    <main>
      <header>
        <Link to="/">
          VOXEL<span>WORLD</span>
        </Link>
        <span>PREFERÊNCIAS LOCAIS</span>
      </header>
      <section>
        <p>PERSONALIZE SUA EXPERIÊNCIA</p>
        <h1>Configurações</h1>
        <div>
          <section>
            <h2>Vídeo e interface</h2>
            <label>
              Distância de renderização <output>{settings.renderDistance} chunks</output>
              <input
                max="5"
                min="2"
                onChange={(event) => settings.setRenderDistance(Number(event.target.value))}
                type="range"
                value={settings.renderDistance}
              />
            </label>
            <label>
              Escala da interface <output>{Math.round(settings.uiScale * 100)}%</output>
              <input
                max="1"
                min="0.75"
                onChange={(event) => settings.setNumber('uiScale', Number(event.target.value))}
                step="0.05"
                type="range"
                value={settings.uiScale}
              />
            </label>
            <label>
              <input
                checked={settings.reducedMotion}
                onChange={(event) => settings.setReducedMotion(event.target.checked)}
                type="checkbox"
              />
              <span>Reduzir efeitos e movimentos da interface</span>
            </label>
          </section>
          <section>
            <h2>Áudio</h2>
            {(
              [
                ['masterVolume', 'Volume geral'],
                ['musicVolume', 'Música'],
                ['effectsVolume', 'Efeitos']
              ] as const
            ).map(([field, label]) => (
              <label key={field}>
                {label} <output>{Math.round(settings[field] * 100)}%</output>
                <input
                  max="1"
                  min="0"
                  onChange={(event) => settings.setNumber(field, Number(event.target.value))}
                  step="0.05"
                  type="range"
                  value={settings[field]}
                />
              </label>
            ))}
          </section>
          <section>
            <h2>Controles</h2>
            {Object.entries(actionLabels).map(([action, label]) => (
              <div key={action}>
                <span>{label}</span>
                <button onClick={() => setWaitingFor(action as GameAction)} type="button">
                  {waitingFor === action ? 'Pressione uma tecla…' : keyLabel(settings.controls[action as GameAction])}
                </button>
              </div>
            ))}
          </section>
        </div>
        <button onClick={() => navigate(gameWorld ? `/game/${gameWorld.manifest.id}` : '/')} type="button">
          Voltar
        </button>
      </section>
    </main>
  );
}
