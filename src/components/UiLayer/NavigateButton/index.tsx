import React from 'react';

interface NavigateButtonProps {
  onClick: () => void;
  label: string;
}

export default function NavigateButton({ label, onClick }: NavigateButtonProps) {
  return (
    <button onClick={onClick} className="border-2 px-8 bg-emerald-600 cursor-pointer text-2xl">
      {label}
    </button>
  );
}
