import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function LinkButton({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      onClick={() => {
        if (window.gameApi && to === '/exit') {
          window.gameApi.closeApp();
        }
      }}
      style={{
        boxShadow: 'inset -0.5pt -0.5pt 0 2px rgba(0, 0, 0, 0.5), inset 0.5pt 0.5pt 0 2px rgba(255, 255, 255, 0.5)'
      }}
      className="bg-stone-400 border-2 text-black text-center text-2xl px-4 py-2"
    >
      {children}
    </Link>
  );
}
