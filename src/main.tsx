import React, { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const Lazy = lazy(() => import('./pages/App'));

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Elemento raiz da aplicação não encontrado.');

const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <Suspense fallback={<main>Abrindo Voxel World…</main>}>
      <Lazy />
    </Suspense>
  </StrictMode>
);
