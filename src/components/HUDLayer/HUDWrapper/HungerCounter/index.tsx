import React from 'react';
import { PiHamburger, PiHamburgerFill } from 'react-icons/pi';

export default function HungerCounter({ hunger }: { hunger: number }) {
  return (
    <div className="text-amber-600 flex text-2xl items-center justify-between">
      {Array.from({ length: Math.max(0, Math.ceil(hunger / 2)) }, (_, index) => (
        <PiHamburgerFill key={`filled-${index}`} />
      ))}
      {Array.from({ length: Math.max(0, 10 - Math.ceil(hunger / 2)) }, (_, index) => (
        <PiHamburger key={`empty-${index}`} />
      ))}
    </div>
  );
}
