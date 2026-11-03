import React from 'react';

export default function Crossbar() {
  return (
    <div className="flex fixed items-center justify-center *:absolute left-1/2 top-1/2 -translate-1/2">
      <span className="bg-white w-4 h-0.5" />
      <span className="bg-white w-0.5 h-4" />
    </div>
  );
}
