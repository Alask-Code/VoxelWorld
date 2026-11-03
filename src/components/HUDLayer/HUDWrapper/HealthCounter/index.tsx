import React from 'react';
import { RiHeartFill, RiHeartLine } from 'react-icons/ri';

export default function HealthCounter({ health }: { health: number }) {
  const hearts = Math.max(0, Math.min(10, Math.ceil(health / 2)));

  return (
    <div className="flex justify-between text-2xl items-center text-red-500">
      {Array.from({ length: hearts }, (_, index) => (
        <RiHeartFill key={`filled-${index}`} />
      ))}

      {Array.from({ length: 10 - hearts }, (_, index) => (
        <RiHeartLine key={`empty-${index}`} />
      ))}
    </div>
  );
}
