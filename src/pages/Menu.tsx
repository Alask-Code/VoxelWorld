import React from 'react';
import SafeView from '../components/UiLayer/SafeView';
import LinkButton from '../components/UiLayer/LinkButton';

export default function Menu() {
  return (
    <SafeView
      style={{
        backgroundImage: "url('assets/images/background.png')",
        backgroundRepeat: 'no-repeat',
        backgroundClip: 'content-box',
        backgroundSize: 'cover'
      }}
    >
      <section
        className="flex flex-col items-center justify-evenly gap-12 h-full
      
      "
      >
        <h1 className="text-9xl relative  shadow-gray-600">
          Voxel
          <span className=" text-green-400"> World</span>
          <span
            className="text-[16pt] -rotate-12 text-center absolute inset-0 top-2/3 left-2/3 size-fit line-clamp-1 whitespace-nowrap text-amber-400
          "
          >
            Explore um mundo moldado pela sua seed.
          </span>
        </h1>

        <nav className="flex flex-col gap-2" aria-label="Menu principal">
          <LinkButton to="/worlds">Jogar</LinkButton>
          <div className="flex *:w-1/2 gap-2">
            <LinkButton to="/settings">Ajustes</LinkButton>
            <LinkButton to="/credits">Créditos</LinkButton>
          </div>
          {window.gameApi && <LinkButton to="/exit">Sair</LinkButton>}
        </nav>
      </section>
    </SafeView>
  );
}
