"use client";

import { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Lanyard from "./Lanyard";
import { useBadgeStore } from "@/store/useBadgeStore";
import { downloadBadgePdf } from "@/lib/exportBadge";

function SceneControls() {
  const recenter = useBadgeStore((s) => s.recenter);
  const shuffle = useBadgeStore((s) => s.shuffle);
  const throwFood = useBadgeStore((s) => s.throwFood);

  // Export the badge ARTWORK as a print-ready PDF (not a screenshot of the
  // 3D scene).
  const download = useCallback(() => {
    downloadBadgePdf(useBadgeStore.getState());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center gap-3">
      <button
        onClick={recenter}
        className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--text)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        ↺ Resetar Posição
      </button>
      <button
        onClick={shuffle}
        className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--text)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        ⤬ Balançar
      </button>
      <button
        onClick={throwFood}
        title="Jogue um lanche aleatório no crachá!"
        className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-4 py-2.5 text-base leading-none backdrop-blur transition hover:border-[var(--accent)] hover:scale-110"
      >
        🎲
      </button>
      <button
        onClick={download}
        className="pointer-events-auto rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold tracking-wide text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
      >
        ↓ Baixar PDF
      </button>
    </div>
  );
}

export default function Scene() {
  const physics = useBadgeStore((s) => s.physics);

  // Rebuild the physics world when rope length or stiffness change.
  const resetNonce = useBadgeStore((s) => s.resetNonce);
  const physicsKey = `${physics.ropeLength.toFixed(2)}-${physics.stiffness.toFixed(2)}-${resetNonce}`;
  const gravityY = -22 * physics.stiffness;

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, 13], fov: 22 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 16, 30]} />

        <ambientLight intensity={0.55} />
        <directionalLight position={[0, 0, 8]} intensity={1.0} />
        <directionalLight
          position={[5, 8, 6]}
          intensity={2.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <spotLight
          position={[-6, 4, 4]}
          angle={0.5}
          penumbra={1}
          intensity={1.6}
          color="#ffd9b0"
        />
        <pointLight position={[4, -3, 4]} intensity={1.2} color="#ff8a4c" />

        <Suspense fallback={null}>
          <Physics
            key={physicsKey}
            gravity={[0, gravityY, 0]}
            timeStep={1 / 90}
            interpolate
          >
            <Lanyard />
          </Physics>

          <Environment resolution={256}>
            {/* large soft fill so reflections never go pure black */}
            <Lightformer
              intensity={0.7}
              color="#9aa0b0"
              position={[0, 0, -8]}
              scale={[40, 40, 1]}
            />
            <Lightformer
              intensity={1.4}
              color="white"
              position={[0, 0, 6]}
              scale={[20, 20, 1]}
            />
            <Lightformer
              intensity={2.2}
              color="white"
              position={[0, -1, 5]}
              rotation={[0, 0, 0]}
              scale={[10, 10, 1]}
            />
            <Lightformer
              intensity={2}
              color="#ffe6cc"
              position={[-1, -1, -3]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[10, 2, 1]}
            />
            <Lightformer
              intensity={2}
              color="#cfe3ff"
              position={[1, 1, -2]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[10, 2, 1]}
            />
            <Lightformer
              intensity={2.4}
              color="white"
              position={[-2, 2, 1]}
              rotation={[0, Math.PI / 2, Math.PI / 3]}
              scale={[6, 6, 1]}
            />
          </Environment>
        </Suspense>
      </Canvas>

      <SceneControls />

      <div className="pointer-events-none absolute left-6 top-6 z-10 select-none">
        <div className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--muted)]">
          Grupo Ragga
        </div>
        <div className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)]">
          Crachá <span className="text-[var(--accent)]">Studio</span>
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">
          Arraste o crachá para balançar
        </div>
      </div>
    </div>
  );
}
