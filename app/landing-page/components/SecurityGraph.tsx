"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const positions: [number, number, number][] = [
  [-3.4, 1.2, 0],
  [-1.25, 1.85, -0.6],
  [1.1, 1.05, 0.25],
  [-1.8, -0.75, 0.5],
  [0.45, -1.15, -0.35],
  [3.05, -0.45, 0.2],
];

const edges = [
  [0, 1], [0, 3], [1, 2], [1, 3], [1, 4],
  [2, 4], [2, 5], [3, 4], [4, 5],
] as const;

const satellites = [
  { position: [-4.35, 0.05, -0.4], parent: 0 },
  { position: [-3.65, 2.45, -0.7], parent: 0 },
  { position: [-2.55, 0.45, 0.1], parent: 0 },
  { position: [-1.7, 2.85, 0.15], parent: 1 },
  { position: [-0.1, 2.45, -0.9], parent: 1 },
  { position: [1.75, 2.1, -0.55], parent: 2 },
  { position: [2.65, 1.0, -0.6], parent: 2 },
  { position: [-3.1, -1.7, -0.75], parent: 3 },
  { position: [-0.95, -2.2, 0.2], parent: 3 },
  { position: [0.95, -2.35, -0.75], parent: 4 },
  { position: [2.1, -1.45, 0.55], parent: 4 },
  { position: [4.05, 0.55, -0.8], parent: 5 },
  { position: [4.4, -1.45, -0.25], parent: 5 },
] as const;

function GraphEdge({ from, to, active }: { from: THREE.Vector3; to: THREE.Vector3; active: boolean }) {
  const edge = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setFromPoints([from, to]);
    return new THREE.Line(
      next,
      new THREE.LineBasicMaterial({
        color: active ? "#8dd8ff" : "#31404a",
        transparent: true,
        opacity: active ? 0.9 : 0.48,
      }),
    );
  }, [active, from, to]);

  return <primitive object={edge} />;
}

function GraphNode({
  index,
  hovered,
  onHover,
}: {
  index: number;
  hovered: boolean;
  onHover: (index: number | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = positions[index][1] + Math.sin(clock.elapsedTime * 0.75 + index) * 0.045;
    ref.current.rotation.y += 0.0025;
  });

  const scale = hovered ? 1.24 : 1;

  return (
    <group
      ref={ref}
      position={positions[index]}
      scale={scale}
      onPointerEnter={(event) => {
        event.stopPropagation();
        onHover(index);
        document.body.style.cursor = "pointer";
      }}
      onPointerLeave={() => {
        onHover(null);
        document.body.style.cursor = "auto";
      }}
    >
      {hovered && (
        <mesh scale={1.8}>
          <sphereGeometry args={[0.48, 24, 24]} />
          <meshBasicMaterial color="#4fb9ed" transparent opacity={0.09} />
        </mesh>
      )}
      <mesh>
        <icosahedronGeometry args={[index === 5 ? 0.52 : 0.44, 2]} />
        <meshStandardMaterial
          color={hovered ? "#dff6ff" : "#8eb1c2"}
          emissive={hovered ? "#42b9ef" : "#193744"}
          emissiveIntensity={hovered ? 1.8 : 0.5}
          roughness={0.32}
          metalness={0.55}
        />
      </mesh>
      <mesh scale={1.35}>
        <icosahedronGeometry args={[0.46, 1]} />
        <meshBasicMaterial color="#74cfff" wireframe transparent opacity={hovered ? 0.75 : 0.22} />
      </mesh>
    </group>
  );
}

function Satellite({ position }: { position: readonly [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.scale.setScalar(0.9 + Math.sin(clock.elapsedTime + position[0]) * 0.08);
  });

  return (
    <mesh ref={ref} position={[...position]}>
      <sphereGeometry args={[0.1, 12, 12]} />
      <meshBasicMaterial color="#568297" transparent opacity={0.8} />
    </mesh>
  );
}

function MovingSignal() {
  const ref = useRef<THREE.Mesh>(null);
  const path = useMemo(
    () => new THREE.CatmullRomCurve3([0, 1, 2, 4, 5].map((index) => new THREE.Vector3(...positions[index]))),
    [],
  );

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.copy(path.getPoint((clock.elapsedTime * 0.075) % 1));
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.075, 16, 16]} />
      <meshBasicMaterial color="#e9fbff" />
      <pointLight color="#6fd3ff" intensity={2.5} distance={1.6} />
    </mesh>
  );
}

function Scene({ hovered, onHover }: { hovered: number | null; onHover: (index: number | null) => void }) {
  const vectors = useMemo(() => positions.map((position) => new THREE.Vector3(...position)), []);

  return (
    <group rotation={[-0.08, -0.08, -0.04]}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 5, 4]} intensity={1.5} color="#b8e9ff" />
      {edges.map(([from, to]) => (
        <GraphEdge
          key={`${from}-${to}`}
          from={vectors[from]}
          to={vectors[to]}
          active={from === hovered || to === hovered}
        />
      ))}
      {satellites.map((satellite, index) => (
        <group key={index}>
          <GraphEdge
            from={vectors[satellite.parent]}
            to={new THREE.Vector3(...satellite.position)}
            active={satellite.parent === hovered}
          />
          <Satellite position={satellite.position} />
        </group>
      ))}
      {positions.map((_, index) => (
        <GraphNode key={index} index={index} hovered={hovered === index} onHover={onHover} />
      ))}
      <MovingSignal />
    </group>
  );
}

export function SecurityGraph({ hovered, onHover }: { hovered: number | null; onHover: (index: number | null) => void }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 9], fov: 46 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onHover(null)}
    >
      <Scene hovered={hovered} onHover={onHover} />
    </Canvas>
  );
}
