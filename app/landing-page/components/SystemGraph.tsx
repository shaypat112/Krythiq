"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const nodes = [
  { label: "Frontend", position: [-2.8, 1.25, 0.25], color: "#9dd7ff" },
  { label: "API", position: [-0.75, 0.35, 0.6], color: "#b5e4ff" },
  { label: "Database", position: [1.45, -1.05, 0], color: "#85c9f4" },
  { label: "Authentication", position: [0.65, 1.6, -0.2], color: "#c7e9ff" },
  { label: "Infrastructure", position: [3.05, 0.8, -0.55], color: "#81bbdf" },
  { label: "External services", position: [3.25, -1.55, 0.2], color: "#6aa7cf" },
] as const;

const links = [[0, 1], [1, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5]] as const;

function smoothstep(start: number, end: number, value: number) {
  const x = THREE.MathUtils.clamp((value - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
}

function Edge({ from, to, index, progress, reduced }: { from: THREE.Vector3; to: THREE.Vector3; index: number; progress: React.MutableRefObject<number>; reduced: boolean }) {
  const material = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, color: "#55788d" }), []);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([from, to]), [from, to]);
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  const materialRef = useRef(material);
  const lineRef = useRef(line);

  useFrame(({ clock }) => {
    const p = progress.current;
    const assembled = reduced ? 1 : smoothstep(0.01 + index * 0.008, 0.16 + index * 0.008, p + Math.min(clock.elapsedTime * 0.025, 0.08));
    const problemState = smoothstep(0.38, 0.48, p) * (1 - smoothstep(0.61, 0.7, p));
    const active = problemState > 0.05 && (index === 1 || index === 4 || index === 7);
    materialRef.current.opacity = assembled * (active ? 0.95 : 0.36);
    materialRef.current.color.set(active ? "#e58b62" : p > 0.79 ? "#6dbd9b" : "#55788d");
    lineRef.current.scale.x = assembled;
  });

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <primitive object={line} />;
}

function Node({ node, index, progress, reduced }: { node: (typeof nodes)[number]; index: number; progress: React.MutableRefObject<number>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const base = useMemo(() => new THREE.Vector3(...node.position), [node.position]);

  useFrame(({ clock }) => {
    if (!group.current || !core.current || !ring.current) return;
    const p = progress.current;
    const assembled = reduced ? 1 : smoothstep(index * 0.012, 0.13 + index * 0.012, p + Math.min(clock.elapsedTime * 0.028, 0.09));
    const spread = 0.78 + smoothstep(0.22, 0.38, p) * 0.28;
    const problem = smoothstep(0.39, 0.48, p) * (1 - smoothstep(0.64, 0.73, p));
    const issue = (index === 1 || index === 2 || index === 4) ? problem : 0;
    const stable = smoothstep(0.78, 0.9, p);
    group.current.position.copy(base).multiplyScalar(spread);
    group.current.scale.setScalar(Math.max(0.001, assembled) * (1 + issue * 0.16));
    group.current.rotation.y = reduced ? 0 : clock.elapsedTime * 0.05 + p * 0.35;
    core.current.color.set(issue > 0.1 ? "#f0a37f" : stable > 0.5 ? "#9cddc0" : node.color);
    core.current.emissive.set(issue > 0.1 ? "#7a2f1d" : stable > 0.5 ? "#245e48" : "#17384a");
    core.current.emissiveIntensity = 0.45 + issue * 1.4;
    ring.current.opacity = 0.16 + issue * 0.52 + stable * 0.12;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.34, 2]} />
        <meshStandardMaterial ref={core} color={node.color} roughness={0.3} metalness={0.65} />
      </mesh>
      <mesh scale={1.42}>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshBasicMaterial ref={ring} color={node.color} transparent wireframe opacity={0.16} />
      </mesh>
    </group>
  );
}

function Scene({ value, reduced }: { value: MotionValue<number>; reduced: boolean }) {
  const progress = useRef(value.get());
  const root = useRef<THREE.Group>(null);
  const vectors = useMemo(() => nodes.map((node) => new THREE.Vector3(...node.position)), []);

  useEffect(() => value.on("change", (latest) => { progress.current = latest; }), [value]);
  useFrame(() => {
    if (!root.current) return;
    const p = progress.current;
    root.current.rotation.x = -0.08 + p * 0.08;
    root.current.rotation.y = -0.16 + p * 0.28;
    root.current.position.x = p < 0.2 ? 1.1 : 0.65 + smoothstep(0.2, 0.4, p) * 0.5;
    root.current.position.y = p < 0.2 ? -0.25 : -0.05;
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.9} />
      <directionalLight position={[-2, 5, 5]} intensity={2.1} color="#dff4ff" />
      <pointLight position={[3, -1, 3]} intensity={18} distance={7} color="#438eb8" />
      {links.map(([from, to], index) => <Edge key={`${from}-${to}`} from={vectors[from]} to={vectors[to]} index={index} progress={progress} reduced={reduced} />)}
      {nodes.map((node, index) => <Node key={node.label} node={node} index={index} progress={progress} reduced={reduced} />)}
    </group>
  );
}

export function SystemGraph({ progress }: { progress: MotionValue<number> }) {
  const reduced = Boolean(useReducedMotion());
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="h-full w-full">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8.5], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Scene value={progress} reduced={reduced} />
      </Canvas>
    </div>
  );
}
