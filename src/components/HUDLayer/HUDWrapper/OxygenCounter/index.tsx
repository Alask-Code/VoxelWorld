import React from 'react';
import { RiBubbleChartFill, RiBubbleChartLine } from 'react-icons/ri';

export default function OxygenCounter({ oxygenBubbles }: { oxygenBubbles: number }) {
  return (
    <div className="flex text-2xl items-center justify-between text-sky-500">
      {Array.from({ length: oxygenBubbles }, (_, index) => (
        <RiBubbleChartFill key={`filled-${index}`} />
      ))}

      {Array.from({ length: 10 - oxygenBubbles }, (_, index) => (
        <RiBubbleChartLine key={`empty-${index}`} />
      ))}
    </div>
  );
}
