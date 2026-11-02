import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteWorld, listWorlds, renameWorld } from '../application/worldStorage';
import type { WorldManifest } from '../domain/world';

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
    void refresh();
  }, []);

  const remove = async (world: WorldManifest) => {
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
    <main className="page-screen">
      <header className="page-header">
        <Link className="brand-link" to="/">VOXEL<span>WORLD</span></Link>
        <Link className="text-link" to="/settings">Configurações</Link>
      </header>
      <section className="page-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ARQUIVOS LOCAIS</p>
            <h1>Seus mundos</h1>
          </div>
          <Link className="button button-primary" to="/worlds/new">+ Novo mundo</Link>
        </div>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        {loading ? (
          <p className="muted">Carregando mundos…</p>
        ) : worlds.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true">▦</span>
            <h2>Nenhum mundo ainda</h2>
            <p>Crie seu primeiro mundo para começar a explorar.</p>
            <Link className="button button-primary" to="/worlds/new">Criar mundo</Link>
          </div>
        ) : (
          <div className="world-list">
            {worlds.map((world) => (
              <article className="world-card" key={world.id}>
                <div className="world-card-mark" aria-hidden="true">▧</div>
                <div className="world-card-info">
                  {renaming === world.id ? (
                    <form
                      className="rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveName(world.id);
                      }}
                    >
                      <input autoFocus maxLength={32} onChange={(event) => setNewName(event.target.value)} value={newName} />
                      <button className="text-link" type="submit">Salvar</button>
                      <button className="text-link" onClick={() => setRenaming(null)} type="button">Cancelar</button>
                    </form>
                  ) : (
                    <h2>{world.name}</h2>
                  )}
                  <p>
                    {world.mode === 'creative' ? 'Criativo' : 'Sobrevivência'} · {world.difficulty} · Seed {world.seed}
                  </p>
                  <span className="muted">Última sessão: {formatDate(world.lastPlayedAt)}</span>
                </div>
                <div className="world-card-actions">
                  <button className="button button-primary" onClick={() => navigate(`/game/${world.id}`)} type="button">
                    Entrar
                  </button>
                  <button
                    className="button button-small"
                    onClick={() => {
                      setRenaming(world.id);
                      setNewName(world.name);
                    }}
                    type="button"
                  >
                    Renomear
                  </button>
                  <button className="button button-small button-danger" onClick={() => void remove(world)} type="button">
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <Link className="back-link" to="/">← Menu principal</Link>
      </section>
    </main>
  );
}
