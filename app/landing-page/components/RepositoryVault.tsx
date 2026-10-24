"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { VaultFallback } from "./VaultFallback";

const chamberPositions = [
  [-2.65, 1.38, 0], [0, 1.38, -0.25], [2.65, 1.38, 0],
  [-2.65, -1.38, -0.2], [0, -1.38, 0], [2.65, -1.38, -0.2],
] as const;

function smoothstep(start: number, end: number, value: number) {
  const x = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
}

function supportsWebGL() {
  if (typeof document === "undefined") return true;
  const canvas = document.createElement("canvas");
  try {
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  } finally {
    canvas.remove();
  }
}

function Pipe({ points }: { points: readonly [number, number, number][] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    return new THREE.TubeGeometry(curve, 36, 0.055, 8, false);
  }, [points]);
  return <mesh geometry={geometry}><meshStandardMaterial color="#303638" metalness={0.82} roughness={0.38} /></mesh>;
}

function Hatch({ progress, index, reduced }: { progress: React.MutableRefObject<number>; index: number; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const door = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const wheel = useRef<THREE.Group>(null);
  const base = chamberPositions[index];

  useFrame(() => {
    if (!group.current || !door.current || !core.current || !glow.current || !wheel.current) return;
    const center = index / (chamberPositions.length - 1);
    const distance = Math.abs((reduced ? 0 : progress.current) - center);
    const open = 1 - smoothstep(0, 0.11, distance);
    group.current.scale.setScalar(0.9 + open * 0.2);
    door.current.rotation.x = -open * 1.48;
    core.current.emissiveIntensity = 0.08 + open * 1.3;
    glow.current.opacity = 0.12 + open * 0.8;
    wheel.current.rotation.z = open * 0.5;
  });

  return (
    <group ref={group} position={base}>
      {/* Pressure housing */}
      <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.88, 0.92, 0.48, 48]} />
        <meshStandardMaterial color="#252a2c" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.095]}>
        <torusGeometry args={[0.8, 0.09, 16, 64]} />
        <meshStandardMaterial color="#8b9599" metalness={0.92} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.11, 48]} />
        <meshStandardMaterial color="#080b0c" metalness={0.62} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.16]}>
        <circleGeometry args={[0.48, 48]} />
        <meshBasicMaterial ref={glow} color="#bdc8cc" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <torusGeometry args={[0.42, 0.026, 10, 48]} />
        <meshStandardMaterial color="#7f8b8f" metalness={0.78} roughness={0.25} />
      </mesh>
      <group ref={wheel} position={[0, 0, 0.24]}>
        <mesh>
          <torusGeometry args={[0.24, 0.035, 10, 36]} />
          <meshStandardMaterial color="#a6b0b3" metalness={0.88} roughness={0.25} />
        </mesh>
        {[0, Math.PI / 3, (Math.PI * 2) / 3].map((angle) => (
          <mesh key={angle} rotation={[0, 0, angle]}>
            <boxGeometry args={[0.48, 0.045, 0.045]} />
            <meshStandardMaterial color="#899396" metalness={0.86} roughness={0.28} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.085, 20, 20]} />
          <meshStandardMaterial ref={core} color="#d2d9db" emissive="#aab7bb" emissiveIntensity={0.08} metalness={0.72} roughness={0.2} />
        </mesh>
      </group>
      {/* Six inset locking bolts */}
      {Array.from({ length: 6 }, (_, bolt) => {
        const angle = (bolt / 6) * Math.PI * 2;
        return (
          <mesh key={bolt} position={[Math.cos(angle) * 0.67, Math.sin(angle) * 0.67, 0.19]}>
            <cylinderGeometry args={[0.045, 0.045, 0.045, 12]} />
            <meshStandardMaterial color="#aab3b6" metalness={0.94} roughness={0.2} />
          </mesh>
        );
      })}
      {/* The hinged pressure door */}
      <group ref={door} position={[0, 0.57, 0.2]}>
        <group position={[0, -0.57, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.56, 0.6, 0.16, 48]} />
            <meshStandardMaterial color="#434a4d" metalness={0.92} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.095]}>
            <torusGeometry args={[0.45, 0.045, 12, 48]} />
            <meshStandardMaterial color="#b7c0c3" metalness={0.96} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.105]}>
            <torusGeometry args={[0.31, 0.018, 8, 36]} />
            <meshStandardMaterial color="#858f92" metalness={0.9} roughness={0.24} />
          </mesh>
        </group>
      </group>
      <mesh position={[0, 0.71, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 16]} />
        <meshStandardMaterial color="#c4cbcd" metalness={0.94} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Vault({ value, reduced }: { value: MotionValue<number>; reduced: boolean }) {
  const progress = useRef(value.get());
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (reduced) return;
    return value.on("change", (latest) => {
      progress.current = latest;
      invalidate();
    });
  }, [invalidate, reduced, value]);

  return (
    <>
      <ambientLight intensity={0.7} color="#c4cacc" />
      <directionalLight position={[-4, 5, 7]} intensity={2.8} color="#e0e4e6" />
      <pointLight position={[0, 0, 4]} intensity={34} distance={11} color="#879398" />
      <pointLight position={[-3, -2, 2]} intensity={16} distance={8} color="#717d84" />
      <fog attach="fog" args={["#060809", 10, 23]} />
      {/* Thick conduits sit behind the doors, like lines cast into a pressure wall. */}
      <Pipe points={[[-2.55, 1.38, -0.46], [-1.35, 1.38, -0.46], [-0.85, 1.38, -0.46]]} />
      <Pipe points={[[0.85, 1.38, -0.46], [1.45, 1.38, -0.46], [2.55, 1.38, -0.46]]} />
      <Pipe points={[[-2.55, -1.38, -0.46], [-1.35, -1.38, -0.46], [-0.85, -1.38, -0.46]]} />
      <Pipe points={[[0.85, -1.38, -0.46], [1.45, -1.38, -0.46], [2.55, -1.38, -0.46]]} />
      <Pipe points={[[-2.65, 0.6, -0.46], [-2.65, 0, -0.46], [-2.65, -0.6, -0.46]]} />
      <Pipe points={[[0, 0.6, -0.46], [0, 0, -0.46], [0, -0.6, -0.46]]} />
      <Pipe points={[[2.65, 0.6, -0.46], [2.65, 0, -0.46], [2.65, -0.6, -0.46]]} />
      {chamberPositions.map((_, index) => <Hatch key={index} index={index} progress={progress} reduced={reduced} />)}
    </>
  );
}

export function RepositoryVault({ progress }: { progress: MotionValue<number> }) {
  const reduced = Boolean(useReducedMotion());
  const [webglAvailable] = useState(supportsWebGL);

  if (!webglAvailable) return <VaultFallback />;

  return (
    <div className="h-full w-full" aria-hidden="true">
      <Canvas
        fallback={<VaultFallback />}
        frameloop="demand"
        dpr={[1, 1.4]}
        camera={{ position: [0, 0, 12.6], fov: 39 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Vault value={progress} reduced={reduced} />
      </Canvas>
    </div>
  );
}
