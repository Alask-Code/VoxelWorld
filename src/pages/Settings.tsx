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
    <main className="page-screen">
      <header className="page-header">
        <Link className="brand-link" to="/">VOXEL<span>WORLD</span></Link>
        <span className="header-note">PREFERÊNCIAS LOCAIS</span>
      </header>
      <section className="settings-page">
        <p className="eyebrow">PERSONALIZE SUA EXPERIÊNCIA</p>
        <h1>Configurações</h1>
        <div className="settings-grid">
          <section className="settings-card">
            <h2>Vídeo e interface</h2>
            <label className="range-setting">
              Distância de renderização <output>{settings.renderDistance} chunks</output>
              <input max="5" min="2" onChange={(event) => settings.setRenderDistance(Number(event.target.value))} type="range" value={settings.renderDistance} />
            </label>
            <label className="range-setting">
              Escala da interface <output>{Math.round(settings.uiScale * 100)}%</output>
              <input max="1" min="0.75" onChange={(event) => settings.setNumber('uiScale', Number(event.target.value))} step="0.05" type="range" value={settings.uiScale} />
            </label>
            <label className="check-row">
              <input checked={settings.reducedMotion} onChange={(event) => settings.setReducedMotion(event.target.checked)} type="checkbox" />
              <span>Reduzir efeitos e movimentos da interface</span>
            </label>
          </section>
          <section className="settings-card">
            <h2>Áudio</h2>
            {([
              ['masterVolume', 'Volume geral'],
              ['musicVolume', 'Música'],
              ['effectsVolume', 'Efeitos']
            ] as const).map(([field, label]) => (
              <label className="range-setting" key={field}>
                {label} <output>{Math.round(settings[field] * 100)}%</output>
                <input max="1" min="0" onChange={(event) => settings.setNumber(field, Number(event.target.value))} step="0.05" type="range" value={settings[field]} />
              </label>
            ))}
          </section>
          <section className="settings-card settings-controls">
            <h2>Controles</h2>
            {Object.entries(actionLabels).map(([action, label]) => (
              <div className="control-row" key={action}>
                <span>{label}</span>
                <button className="button button-small" onClick={() => setWaitingFor(action as GameAction)} type="button">
                  {waitingFor === action ? 'Pressione uma tecla…' : keyLabel(settings.controls[action as GameAction])}
                </button>
              </div>
            ))}
          </section>
        </div>
        <button className="button button-primary settings-return" onClick={() => navigate(gameWorld ? `/game/${gameWorld.manifest.id}` : '/')} type="button">
          Voltar
        </button>
      </section>
    </main>
  );
}
