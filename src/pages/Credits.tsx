import React from 'react';
import { Link } from 'react-router-dom';

export default function Credits() {
  return (
    <main>
      <header>
        <Link to="/">
          VOXEL<span>WORLD</span>
        </Link>
      </header>
      <section>
        <p>UM PROJETO INDEPENDENTE</p>
        <h1>Créditos</h1>
        <p>
          Voxel World é um protótipo original de jogo sandbox para desktop, desenvolvido com React, Three.js e Electron.
        </p>
        <p>
          Os materiais visuais desta versão são gerados por código. Não são usados assets, marcas ou arquivos de jogos
          de terceiros.
        </p>
        <Link to="/">Voltar ao menu</Link>
      </section>
    </main>
  );
}
