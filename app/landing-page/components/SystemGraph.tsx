"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
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

function supportsWebGL() {
  if (typeof document === "undefined") return true;
  const probe = document.createElement("canvas");
  try {
    return Boolean(probe.getContext("webgl2") || probe.getContext("webgl") || probe.getContext("experimental-webgl"));
  } catch {
    return false;
  } finally {
    probe.remove();
  }
}

function Edge({ from, to, index, progress, reduced }: { from: THREE.Vector3; to: THREE.Vector3; index: number; progress: React.MutableRefObject<number>; reduced: boolean }) {
  const material = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, color: "#55788d" }), []);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([from, to]), [from, to]);
  const geometryRef = useRef(geometry);
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  const materialRef = useRef(material);

  useFrame(() => {
    const p = reduced ? 1 : progress.current;
    const assembled = reduced ? 1 : smoothstep(0.01 + index * 0.008, 0.16 + index * 0.008, p);
    const spread = 0.78 + smoothstep(0.22, 0.38, p) * 0.28;
    const problemState = smoothstep(0.38, 0.48, p) * (1 - smoothstep(0.61, 0.7, p));
    const active = problemState > 0.05 && (index === 1 || index === 4 || index === 7);
    materialRef.current.opacity = assembled * (active ? 0.95 : 0.36);
    materialRef.current.color.set(active ? "#fb7185" : p > 0.79 ? "#6dbd9b" : "#55788d");
    const activeGeometry = geometryRef.current;
    const positions = activeGeometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(0, from.x * spread, from.y * spread, from.z);
    positions.setXYZ(1, to.x * spread, to.y * spread, to.z);
    positions.needsUpdate = true;
    activeGeometry.computeBoundingSphere();
  });

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <primitive object={line} />;
}

function Node({ node, index, progress, reduced }: { node: (typeof nodes)[number]; index: number; progress: React.MutableRefObject<number>; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  const base = useMemo(() => new THREE.Vector3(...node.position), [node.position]);

  useFrame(() => {
    if (!group.current || !core.current || !ring.current) return;
    const p = reduced ? 1 : progress.current;
    const assembled = reduced ? 1 : smoothstep(index * 0.012, 0.13 + index * 0.012, p);
    const spread = 0.78 + smoothstep(0.22, 0.38, p) * 0.28;
    const problem = smoothstep(0.39, 0.48, p) * (1 - smoothstep(0.64, 0.73, p));
    const issue = (index === 1 || index === 2 || index === 4) ? problem : 0;
    const stable = smoothstep(0.78, 0.9, p);
    group.current.position.copy(base).multiplyScalar(spread);
    group.current.scale.setScalar(Math.max(0.001, assembled) * (1 + issue * 0.16));
    group.current.rotation.y = reduced ? 0 : p * 0.22;
    core.current.color.set(issue > 0.1 ? "#fb7185" : stable > 0.5 ? "#9cddc0" : node.color);
    core.current.emissive.set(issue > 0.1 ? "#681d36" : stable > 0.5 ? "#245e48" : "#17384a");
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

  useEffect(() => {
    if (reduced) return;
    return value.on("change", (latest) => { progress.current = latest; });
  }, [reduced, value]);
  useFrame(() => {
    if (!root.current) return;
    const p = reduced ? 1 : progress.current;
    root.current.rotation.x = -0.08 + p * 0.08;
    root.current.rotation.y = -0.16 + p * 0.28;
    root.current.position.x = -0.25;
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

function RenderGraph({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (reduced) return;
    return progress.on("change", invalidate);
  }, [invalidate, progress, reduced]);
  return <Scene value={progress} reduced={reduced} />;
}

export function SystemGraph({ progress }: { progress: MotionValue<number> }) {
  const reduced = Boolean(useReducedMotion());
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [webglAvailable] = useState(supportsWebGL);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (webglAvailable === false) return <StaticFallback />;

  return (
    <div ref={container} className="h-full w-full" aria-hidden="true">
      <Canvas
        fallback={<StaticFallback />}
        frameloop={visible ? "demand" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8.5], fov: 42 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <RenderGraph progress={progress} reduced={reduced} />
      </Canvas>
    </div>
  );
}

function StaticFallback() {
  return (
    <div className="grid h-full min-h-64 place-items-center px-6 text-center text-sm text-stone-300">
      <div>
        <svg viewBox="0 0 440 220" className="mx-auto mb-4 w-full max-w-md" aria-hidden="true">
          <g fill="none" stroke="#55788d" strokeWidth="1.5"><path d="M52 76 150 112 242 54M150 112 265 170M150 112 340 100M242 54 340 100M265 170 340 100" /></g>
          <g fill="#a8dcf8"><circle cx="52" cy="76" r="7"/><circle cx="150" cy="112" r="9"/><circle cx="242" cy="54" r="7"/><circle cx="265" cy="170" r="8"/><circle cx="340" cy="100" r="8"/></g>
        </svg>
        Repository map: frontend, API, authentication, database, and services.
      </div>
    </div>
  );
}
