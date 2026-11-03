import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import { Group } from 'three';

export default function InventoryCharacterModel() {
  const character = useRef<Group>(null);
  const targetRotation = useRef(0);

  useFrame((_, delta) => {
    if (character.current) {
      character.current.rotation.y += (targetRotation.current - character.current.rotation.y) * Math.min(1, delta * 8);
    }
  });

  return (
    <group
      ref={character}
      position={[0, -1.32, 0]}
      onPointerMove={(event) => {
        targetRotation.current = event.pointer.x * 0.65;
      }}
      onPointerLeave={() => {
        targetRotation.current = 0;
      }}
    >
      <mesh position={[0, 2.38, 0]} castShadow>
        <boxGeometry args={[0.54, 0.54, 0.54]} />
        <meshStandardMaterial color="#d5a77d" roughness={0.92} />
      </mesh>
      <mesh position={[0, 2.65, 0]} castShadow>
        <boxGeometry args={[0.56, 0.1, 0.56]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
      <mesh position={[-0.13, 2.4, 0.276]}>
        <boxGeometry args={[0.055, 0.07, 0.018]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      <mesh position={[0.13, 2.4, 0.276]}>
        <boxGeometry args={[0.055, 0.07, 0.018]} />
        <meshStandardMaterial color="#252525" />
      </mesh>
      <mesh position={[0, 2.29, 0.282]}>
        <boxGeometry args={[0.09, 0.045, 0.025]} />
        <meshStandardMaterial color="#a56f59" />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <boxGeometry args={[0.62, 0.8, 0.34]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.43, 1.65, 0]} castShadow>
        <boxGeometry args={[0.24, 0.78, 0.32]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[0.43, 1.65, 0]} castShadow>
        <boxGeometry args={[0.24, 0.78, 0.32]} />
        <meshStandardMaterial color="#426b54" roughness={0.9} />
      </mesh>
      <mesh position={[-0.17, 0.59, 0]} castShadow>
        <boxGeometry args={[0.28, 1.08, 0.32]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[0.17, 0.59, 0]} castShadow>
        <boxGeometry args={[0.28, 1.08, 0.32]} />
        <meshStandardMaterial color="#35445c" roughness={0.92} />
      </mesh>
      <mesh position={[-0.17, 0.06, 0.035]} castShadow>
        <boxGeometry args={[0.29, 0.12, 0.4]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
      <mesh position={[0.17, 0.06, 0.035]} castShadow>
        <boxGeometry args={[0.29, 0.12, 0.4]} />
        <meshStandardMaterial color="#493526" roughness={0.95} />
      </mesh>
    </group>
  );
}
