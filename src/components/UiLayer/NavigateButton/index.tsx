import React from 'react';

interface NavigateButtonProps {
  onClick: () => void;
  label: string;
}

export default function NavigateButton({ label, onClick }: NavigateButtonProps) {
  return (
    <button onClick={onClick} className="text-white font-bold px-2 border-2 ">
      {label}
    </button>
  );
}
