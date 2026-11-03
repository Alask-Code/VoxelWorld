import React, { CSSProperties, ReactNode } from 'react';

export default function SafeView({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="bg-amber-400 h-screen w-screen flex items-center justify-center
    "
      style={style}
    >
      {children}
    </div>
  );
}
