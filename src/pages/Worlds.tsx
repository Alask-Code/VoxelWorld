/* eslint-disable no-nested-ternary */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteWorld, listWorlds, renameWorld } from '../application/worldStorage';
import type { WorldManifest } from '../domain/world';
import SafeView from '../components/UiLayer/SafeView';
import LinkButton from '../components/UiLayer/LinkButton';
import NavigateButton from '../components/UiLayer/NavigateButton';

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export default function Worlds() {
  const [worlds, setWorlds] = useState<WorldManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      setWorlds(await listWorlds());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os mundos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const remove = async (world: WorldManifest) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Excluir o mundo "${world.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await deleteWorld(world.id);
      setWorlds((current) => current.filter((entry) => entry.id !== world.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir o mundo.');
    }
  };

  const saveName = async (id: string) => {
    try {
      await renameWorld(id, newName);
      setWorlds((current) => current.map((world) => (world.id === id ? { ...world, name: newName.trim() } : world)));
      setRenaming(null);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível renomear o mundo.');
    }
  };

  return (
    <SafeView
      style={{
        backgroundImage: "url('assets/images/background.png')",
        backgroundRepeat: 'no-repeat',
        backgroundClip: 'content-box',
        backgroundSize: 'cover'
      }}
    >
      <section className="bg-stone-400 p-2 gap-2 flex flex-col *:text-white border-2">
        <h1 className="px-2 text-5xl">Seus mundos</h1>
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p>Carregando mundos…</p>
        ) : worlds.length === 0 ? (
          <div>
            <span aria-hidden="true">▦</span>
            <h2>Nenhum mundo ainda</h2>
            <p>Crie seu primeiro mundo para começar a explorar.</p>
          </div>
        ) : (
          <div>
            {worlds.map((world) => (
              <article key={world.id} className="border-2 bg-stone-600 flex">
                <div aria-hidden="true">▧</div>
                <div className="bg-zinc-700">
                  {renaming === world.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveName(world.id);
                      }}
                    >
                      <input maxLength={32} onChange={(event) => setNewName(event.target.value)} value={newName} />
                      <button type="submit">Salvar</button>
                      <button onClick={() => setRenaming(null)} type="button">
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <h2>{world.name}</h2>
                  )}
                  <p>
                    {world.mode === 'creative' ? 'Criativo' : 'Sobrevivência'} · {world.difficulty} · Seed {world.seed}
                  </p>
                  <span>Última sessão: {formatDate(world.lastPlayedAt)}</span>
                </div>
                <div>
                  <NavigateButton onClick={() => navigate(`/game/${world.id}`)} label="Entrar" />
                  <NavigateButton
                    onClick={() => {
                      setRenaming(world.id);
                      setNewName(world.name);
                    }}
                    label="Renomear"
                  />
                  <NavigateButton onClick={() => remove(world)} label="Excluir" />
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="w-full flex justify-between">
          <LinkButton to="/">Menu principal</LinkButton>
          <LinkButton to="/worlds/new">Criar mundo</LinkButton>
        </div>
      </section>
    </SafeView>
  );
}
