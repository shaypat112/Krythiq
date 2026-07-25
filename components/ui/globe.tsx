"use client";

import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import ThreeGlobe from "three-globe";
import { Color, MeshPhongMaterial } from "three";

export type GlobeArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  altitude: number;
  color: string;
};

export type GlobeLocation = {
  id: string;
  name: string;
  city: string;
  category: string;
  audience: "Enterprise" | "Education" | "Technology";
  description: string;
  lat: number;
  lng: number;
  color: string;
};

function globePosition(lat: number, lng: number, radius = 102) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ] as [number, number, number];
}

function GlobeObject({
  arcs,
  locations,
}: {
  arcs: GlobeArc[];
  locations: GlobeLocation[];
}) {
  const globe = useMemo(() => new ThreeGlobe(), []);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  useEffect(() => {
    const points = arcs.flatMap((arc) => [
      { lat: arc.startLat, lng: arc.startLng, color: arc.color },
      { lat: arc.endLat, lng: arc.endLng, color: arc.color },
    ]);

    globe.globeMaterial(
      new MeshPhongMaterial({
        color: new Color("#0f172a"),
        emissive: new Color("#111827"),
        emissiveIntensity: 0.35,
        shininess: 1.2,
      }),
    );

    globe
      .showAtmosphere(true)
      .atmosphereColor("#8b5cf6")
      .atmosphereAltitude(0.16)
      .arcsData(arcs)
      .arcStartLat((item) => (item as GlobeArc).startLat)
      .arcStartLng((item) => (item as GlobeArc).startLng)
      .arcEndLat((item) => (item as GlobeArc).endLat)
      .arcEndLng((item) => (item as GlobeArc).endLng)
      .arcAltitude((item) => (item as GlobeArc).altitude)
      .arcColor((item: object) => (item as GlobeArc).color)
      .arcDashLength(0.55)
      .arcDashGap(1.8)
      .arcDashAnimateTime(1800)
      .pointsData(points)
      .pointLat((item) => (item as { lat: number }).lat)
      .pointLng((item) => (item as { lng: number }).lng)
      .pointColor((item) => (item as { color: string }).color)
      .pointRadius(0.7)
      .pointAltitude(0.01);
  }, [arcs, globe]);

  return (
    <group>
      <primitive object={globe} />
      {locations.map((location) => {
        const active = activeLocation === location.id;
        return (
          <group
            key={location.id}
            position={globePosition(location.lat, location.lng)}
          >
            <mesh
              scale={active ? 1.35 : 1}
              onPointerOver={(event) => {
                event.stopPropagation();
                setActiveLocation(location.id);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setActiveLocation(null);
                document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[2.2, 18, 18]} />
              <meshBasicMaterial color={location.color} />
            </mesh>
            <mesh scale={active ? 1.4 : 1}>
              <sphereGeometry args={[3.5, 18, 18]} />
              <meshBasicMaterial
                color={location.color}
                transparent
                opacity={active ? 0.22 : 0.1}
                wireframe
              />
            </mesh>
            {active ? (
              <Html center distanceFactor={7.5} zIndexRange={[60, 0]}>
                <article
                  className="pointer-events-none w-64 -translate-y-24 rounded-xl border border-border bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur"
                  aria-label={`${location.name}, ${location.city}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: location.color }}
                    />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {location.category}
                    </p>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{location.name}</h3>
                  <p className="mt-0.5 text-xs font-medium text-foreground/70">
                    {location.city}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {location.description}
                  </p>
                </article>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

export function World({
  arcs,
  locations,
}: {
  arcs: GlobeArc[];
  locations: GlobeLocation[];
}) {
  return (
    <Canvas camera={{ position: [0, 0, 260], fov: 45 }} dpr={[1, 1.7]}>
      <ambientLight intensity={1.8} />
      <directionalLight position={[-100, 50, 100]} intensity={2.2} />
      <GlobeObject arcs={arcs} locations={locations} />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.65}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI - Math.PI / 3}
      />
    </Canvas>
  );
}
