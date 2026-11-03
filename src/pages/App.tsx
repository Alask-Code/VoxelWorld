import React, { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Menu from './Menu';
import Settings from './Settings';
import WorldCreation from './WorldCreation';
import Worlds from './Worlds';
import { useSettingsStore } from '../stores/settings';
import Credits from './Credits';

const Game = lazy(() => import('./Game'));

export default function App() {
  const reducedMotion = useSettingsStore((state) => state.reducedMotion);
  return (
    <HashRouter>
      <div data-reduced-motion={reducedMotion}>
        <Routes>
          <Route element={<Menu />} path="/" />
          <Route element={<Worlds />} path="/worlds" />
          <Route element={<WorldCreation />} path="/worlds/new" />
          <Route element={<Settings />} path="/settings" />
          <Route element={<Credits />} path="/credits" />
          <Route
            element={
              <Suspense fallback={<main>Carregando o motor 3D…</main>}>
                <Game />
              </Suspense>
            }
            path="/game/:worldId"
          />
          <Route element={<Menu />} path="*" />
        </Routes>
      </div>
    </HashRouter>
  );
}
