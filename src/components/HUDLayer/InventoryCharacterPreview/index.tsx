import { Canvas } from '@react-three/fiber';
import React from 'react';
import InventoryCharacterModel from '../InventoryCharacterModel';

export default function InventoryCharacterPreview() {
  return (
    <div
      className="relative h-64 w-full overflow-hidden border-2 border-[#555] bg-[#8b8b8b] shadow-[inset_3px_3px_0_#555,inset_-3px_-3px_0_#bbb]"
      aria-label="Prévia 3D do personagem; mova o mouse para girar"
    >
      <Canvas dpr={1} camera={{ position: [0, 0, 5], fov: 32 }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)}>
        <ambientLight intensity={1.6} />
        <directionalLight position={[-3, 5, 4]} intensity={2} />
        <InventoryCharacterModel />
      </Canvas>
    </div>
  );
}
