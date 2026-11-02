import React, { lazy, Suspense } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import Menu from './Menu';
import Settings from './Settings';
import WorldCreation from './WorldCreation';
import Worlds from './Worlds';
import { useSettingsStore } from '../stores/settings';

const Game = lazy(() => import('./Game'));

function Credits() {
  return (
    <main className="page-screen">
      <header className="page-header"><Link className="brand-link" to="/">VOXEL<span>WORLD</span></Link></header>
      <section className="credits-page">
        <p className="eyebrow">UM PROJETO INDEPENDENTE</p>
        <h1>Créditos</h1>
        <p>Voxel World é um protótipo original de jogo sandbox para desktop, desenvolvido com React, Three.js e Electron.</p>
        <p>Os materiais visuais desta versão são gerados por código. Não são usados assets, marcas ou arquivos de jogos de terceiros.</p>
        <Link className="button button-primary" to="/">Voltar ao menu</Link>
      </section>
    </main>
  );
}

export default function App() {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  return (
    <HashRouter>
      <div className="app-shell" data-reduced-motion={reducedMotion}>
        <Routes>
          <Route element={<Menu />} path="/" />
          <Route element={<Worlds />} path="/worlds" />
          <Route element={<WorldCreation />} path="/worlds/new" />
          <Route element={<Settings />} path="/settings" />
          <Route element={<Credits />} path="/credits" />
          <Route element={<Suspense fallback={<main className="loading-screen">Carregando o motor 3D…</main>}><Game /></Suspense>} path="/game/:worldId" />
          <Route element={<Menu />} path="*" />
        </Routes>
      </div>
    </HashRouter>
  );
}
