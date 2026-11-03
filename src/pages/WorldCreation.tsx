import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createWorld } from '../application/worldStorage';
import type { Difficulty, GameMode } from '../domain/world';

export default function WorldCreation() {
  const [name, setName] = useState('Meu mundo');
  const [seed, setSeed] = useState('');
  const [mode, setMode] = useState<GameMode>('survival');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [structures, setStructures] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const world = await createWorld({ name, seed, mode, difficulty, structures });
      navigate(`/game/${world.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível criar o mundo.');
      setBusy(false);
    }
  };

  return (
    <main>
      <header>
        <Link to="/">
          VOXEL<span>WORLD</span>
        </Link>
        <span>CRIAÇÃO DE MUNDO</span>
      </header>
      <section>
        <p>PREPARE SUA PRÓXIMA JORNADA</p>
        <h1>Criar mundo</h1>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            Nome do mundo
            <input maxLength={32} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label>
            Seed <span>(deixe em branco para gerar uma aleatória)</span>
            <input
              maxLength={128}
              onChange={(event) => setSeed(event.target.value)}
              placeholder="Ex.: bosque-azul-2048"
              value={seed}
            />
          </label>
          <fieldset>
            <legend>Modo de jogo</legend>
            <div>
              <label className={`choice-card ${mode === 'survival' ? 'is-selected' : ''}`}>
                <input checked={mode === 'survival'} name="mode" onChange={() => setMode('survival')} type="radio" />
                <strong>Sobrevivência</strong>
                <span>Reúna recursos e cuide da sua saúde.</span>
              </label>
              <label className={`choice-card ${mode === 'creative' ? 'is-selected' : ''}`}>
                <input checked={mode === 'creative'} name="mode" onChange={() => setMode('creative')} type="radio" />
                <strong>Criativo</strong>
                <span>Voe e construa sem limites de recursos.</span>
              </label>
            </div>
          </fieldset>
          <label>
            Dificuldade
            <select onChange={(event) => setDifficulty(event.target.value as Difficulty)} value={difficulty}>
              <option value="peaceful">Pacífica</option>
              <option value="easy">Fácil</option>
              <option value="normal">Normal</option>
              <option value="hard">Difícil</option>
            </select>
          </label>
          <label>
            <input checked={structures} onChange={(event) => setStructures(event.target.checked)} type="checkbox" />
            <span>Gerar estruturas do mundo</span>
          </label>
          {error && <p role="alert">{error}</p>}
          <div>
            <Link to="/worlds">Voltar</Link>
            <button disabled={busy} type="submit">
              {busy ? 'Criando…' : 'Criar e jogar'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
