import React from 'react';
import { Link } from 'react-router-dom';

export default function Menu() {
  return (
    <main className="menu-screen">
      <div className="menu-topline">
        <span>VOXEL WORLD</span>
        <span>EDIÇÃO DE DESENVOLVIMENTO</span>
      </div>
      <section className="menu-hero">
        <p className="eyebrow">UM MUNDO, BLOCO POR BLOCO</p>
        <h1>Voxel<br /><span>World</span></h1>
        <p className="menu-description">
          Explore um mundo moldado pela sua seed. Reúna recursos, construa seu abrigo e descubra o que existe além do horizonte.
        </p>
        <nav className="menu-actions" aria-label="Menu principal">
          <Link className="button button-primary" to="/worlds">Jogar</Link>
          <Link className="button" to="/worlds/new">Criar mundo</Link>
          <Link className="button" to="/settings">Configurações</Link>
          <Link className="button" to="/credits">Créditos</Link>
          {window.gameApi && (
            <button className="button button-quiet" onClick={() => void window.gameApi?.closeApp()} type="button">
              Sair
            </button>
          )}
        </nav>
      </section>
      <footer className="menu-footer">
        <span>SINGLE-PLAYER · MUNDO LOCAL</span>
        <span>PROTÓTIPO VOXEL 0.1</span>
      </footer>
    </main>
  );
}
