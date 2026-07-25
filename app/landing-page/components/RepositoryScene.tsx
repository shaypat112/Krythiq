"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AlertTriangle, CheckCircle2, GitBranch, ScanSearch, ShieldCheck } from "lucide-react";

type ServiceNode = {
  id: string;
  label: string;
  kind: string;
  position: [number, number, number];
  risk?: "high" | "medium";
};

const services: ServiceNode[] = [
  { id: "edge", label: "Public API", kind: "entry point", position: [-3.2, 1.3, 0] },
  { id: "auth", label: "Auth service", kind: "identity", position: [-1.2, .25, .5] },
  { id: "token", label: "Token validator", kind: "trust boundary", position: [.8, 1.25, -.3], risk: "high" },
  { id: "users", label: "User database", kind: "data store", position: [2.8, .1, .2] },
  { id: "billing", label: "Billing webhook", kind: "integration", position: [-.8, -1.65, -.2], risk: "medium" },
  { id: "vault", label: "Secrets vault", kind: "protected store", position: [1.6, -1.65, .5] },
  { id: "audit", label: "Audit stream", kind: "telemetry", position: [3.45, -1.45, -.4] },
];

const connections = [["edge", "auth"], ["auth", "token"], ["token", "users"], ["auth", "billing"], ["billing", "vault"], ["token", "vault"], ["users", "audit"], ["vault", "audit"]];

function Connection({ from, to, risky }: { from: THREE.Vector3; to: THREE.Vector3; risky: boolean }) {
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
    const material = new THREE.LineBasicMaterial({ color: risky ? "#f97316" : "#334155", transparent: true, opacity: risky ? .75 : .55 });
    return new THREE.Line(geometry, material);
  }, [from, risky, to]);
  return <primitive object={line} />;
}

function Graph({ selected, onSelect, reducedMotion }: { selected: string; onSelect: (id: string) => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, pointer }) => {
    if (!group.current) return;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, pointer.x * .12, .04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -pointer.y * .07, .04);
    if (!reducedMotion) group.current.position.y = Math.sin(clock.elapsedTime * .55) * .04;
  });

  return <group ref={group} rotation={[-.16, -.15, 0]}>
    {connections.map(([a, b]) => {
      const start = services.find((node) => node.id === a)!;
      const end = services.find((node) => node.id === b)!;
      return <Connection key={`${a}-${b}`} from={new THREE.Vector3(...start.position)} to={new THREE.Vector3(...end.position)} risky={Boolean(start.risk || end.risk)} />;
    })}
    {services.map((node) => {
      const active = selected === node.id;
      const color = node.risk === "high" ? "#fb7185" : node.risk === "medium" ? "#fbbf24" : active ? "#a78bfa" : "#38bdf8";
      return <group key={node.id} position={node.position}>
        {node.risk ? <mesh><sphereGeometry args={[.42, 32, 32]} /><meshBasicMaterial color={color} transparent opacity={.09} /></mesh> : null}
        <mesh onClick={(event) => { event.stopPropagation(); onSelect(node.id); }} onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "default"; }} scale={active ? 1.15 : 1}>
          <icosahedronGeometry args={[node.risk ? .22 : .17, 2]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active || node.risk ? 1.15 : .45} roughness={.35} metalness={.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -.32, 0]}><ringGeometry args={[.2, .23, 32]} /><meshBasicMaterial color={color} transparent opacity={active ? .8 : .24} side={THREE.DoubleSide} /></mesh>
      </group>;
    })}
  </group>;
}

export function RepositoryScene() {
  const [selected, setSelected] = useState("token");
  const selectedNode = services.find((node) => node.id === selected) ?? services[2];
  const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return <div className="relative h-full min-h-[300px] overflow-hidden bg-[#080c13] text-white">
    <div className="absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between border-b border-white/8 bg-[#0b1019]/90 px-3 backdrop-blur">
      <div className="flex items-center gap-2 text-[9px] text-white/55 sm:text-[10px]"><span className="grid h-5 w-5 place-items-center rounded-md bg-violet-500/15 text-violet-300"><ShieldCheck className="h-3 w-3" /></span><strong className="font-medium text-white/85">acme/payments-api</strong><span className="hidden text-white/25 sm:inline">/ architecture</span></div>
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/8 px-2 py-1 text-[8px] text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />SCAN COMPLETE</span>
    </div>

    <div className="absolute bottom-0 left-0 top-10 z-20 hidden w-28 border-r border-white/8 bg-[#0a0e16]/82 p-3 text-[8px] text-white/40 backdrop-blur sm:block">
      <p className="mb-3 flex items-center gap-1.5 font-medium uppercase tracking-wider text-white/65"><GitBranch className="h-3 w-3" />Services</p>
      <div className="space-y-2">{services.map((node) => <button key={node.id} onClick={() => setSelected(node.id)} className={`block w-full truncate rounded px-1.5 py-1 text-left transition ${selected === node.id ? "bg-white/8 text-white" : "hover:text-white/70"}`}>{node.label}</button>)}</div>
    </div>

    <div className="absolute inset-0 top-10 sm:left-28 sm:right-36">
      <Canvas camera={{ position: [0, .3, 7.8], fov: 46 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <ambientLight intensity={.8} /><pointLight position={[-3, 4, 5]} intensity={20} color="#60a5fa" /><pointLight position={[4, -2, 3]} intensity={14} color="#8b5cf6" />
        <Graph selected={selected} onSelect={setSelected} reducedMotion={reducedMotion} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/8 bg-black/35 px-2.5 py-2 backdrop-blur"><p className="text-[8px] uppercase tracking-widest text-white/30">Selected service</p><p className="mt-1 text-[10px] font-medium text-white/85">{selectedNode.label}</p><p className="text-[8px] text-white/35">{selectedNode.kind}</p></div>
    </div>

    <aside className="absolute bottom-0 right-0 top-10 z-20 w-36 border-l border-white/8 bg-[#0a0e16]/88 p-3 backdrop-blur max-sm:hidden">
      <p className="flex items-center gap-1.5 text-[8px] font-medium uppercase tracking-wider text-white/55"><ScanSearch className="h-3 w-3" />Findings</p>
      <div className="mt-3 space-y-2"><Finding severity="High" title="Token role fallback" file="session.ts:84" /><Finding severity="Medium" title="Unsigned webhook" file="billing.ts:31" /></div>
      <div className="mt-3 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-2"><p className="flex items-center gap-1 text-[8px] text-emerald-300"><CheckCircle2 className="h-3 w-3" />2 fixes generated</p><p className="mt-1 text-[7px] leading-3 text-white/35">Validated against the repository context.</p></div>
    </aside>

    <div className="absolute bottom-2 right-2 z-30 sm:hidden"><span className="flex items-center gap-1 rounded-full border border-red-400/15 bg-red-400/8 px-2 py-1 text-[8px] text-red-300"><AlertTriangle className="h-2.5 w-2.5" />2 risks mapped</span></div>
  </div>;
}

function Finding({ severity, title, file }: { severity: string; title: string; file: string }) {
  return <button className="w-full rounded-lg border border-white/8 bg-white/[.025] p-2 text-left transition hover:border-white/15 hover:bg-white/[.05]"><span className={`text-[7px] font-semibold uppercase ${severity === "High" ? "text-red-300" : "text-amber-300"}`}>{severity}</span><p className="mt-1 text-[8px] leading-3 text-white/75">{title}</p><p className="mt-1 truncate font-mono text-[7px] text-white/30">{file}</p></button>;
}
