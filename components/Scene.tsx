"use client";

import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import Lanyard from "./Lanyard";
import { useBadgeStore, ZOOM_MIN, ZOOM_MAX } from "@/store/useBadgeStore";
import { downloadBadgePdf } from "@/lib/exportBadge";

/** Botão redondo do controle de zoom. */
function ZoomButton({
  label,
  glyph,
  onClick,
  disabled,
}: {
  label: string;
  glyph: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // o before estende a área de clique para 40 px sem engordar a pílula
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-base leading-none text-[var(--text)] transition-[background-color,color,opacity] before:absolute before:-inset-1 before:content-[''] hover:bg-white/8 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35"
    >
      {glyph}
    </button>
  );
}

function ZoomControl() {
  const zoom = useBadgeStore((s) => s.zoom);
  const nudgeZoom = useBadgeStore((s) => s.nudgeZoom);
  const setZoom = useBadgeStore((s) => s.setZoom);

  return (
    <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--panel)]/80 p-1 backdrop-blur">
      <ZoomButton
        label="Afastar"
        glyph="−"
        onClick={() => nudgeZoom(1 / 1.18)}
        disabled={zoom <= ZOOM_MIN + 0.001}
      />
      <button
        onClick={() => setZoom(1)}
        title="Voltar ao enquadramento padrão"
        className="w-12 rounded-full py-1.5 text-center text-[11px] font-semibold tabular-nums text-[var(--muted)] transition-colors hover:text-[var(--text)] active:scale-[0.96]"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ZoomButton
        label="Aproximar"
        glyph="+"
        onClick={() => nudgeZoom(1.18)}
        disabled={zoom >= ZOOM_MAX - 0.001}
      />
    </div>
  );
}

function SceneControls() {
  const recenter = useBadgeStore((s) => s.recenter);
  const flipped = useBadgeStore((s) => s.flipped);
  const toggleFlip = useBadgeStore((s) => s.toggleFlip);

  // Export the badge ARTWORK as a print-ready PDF (not a screenshot of the
  // 3D scene).
  const download = useCallback(() => {
    downloadBadgePdf(useBadgeStore.getState());
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center gap-3">
      <ZoomControl />
      <button
        onClick={recenter}
        className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--text)] backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.96]"
      >
        Resetar posição
      </button>
      <button
        onClick={toggleFlip}
        aria-pressed={flipped}
        className="pointer-events-auto rounded-full border border-[var(--border)] bg-[var(--panel)]/80 px-5 py-2.5 text-xs font-semibold tracking-wide text-[var(--text)] backdrop-blur transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.96]"
      >
        {flipped ? "Ver frente" : "Virar"}
      </button>
      <button
        onClick={download}
        className="pointer-events-auto rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-semibold tracking-wide text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110 active:scale-[0.96]"
      >
        Baixar PDF para impressão
      </button>
    </div>
  );
}

/** Raio base da órbita: o enquadramento de 100%. */
const CAM_R = 15.0;

/**
 * "Virar" gira a cena inteira, não só o cartão: a câmera orbita 180° em torno
 * do conjunto, então cordão e ferragem viram junto. Como o arrasto do cartão
 * despoja o ponteiro através da câmera, ele continua correto depois do giro.
 */
function FlipCamera() {
  const flipped = useBadgeStore((s) => s.flipped);
  const zoom = useBadgeStore((s) => s.zoom);
  const ang = useRef(0);
  const raio = useRef(CAM_R);

  useFrame(({ camera }, delta) => {
    const alvoAng = flipped ? Math.PI : 0;
    const alvoRaio = CAM_R / zoom;
    // amortecimento independente de frame rate, para giro e zoom
    const k = 1 - Math.exp(-7 * delta);
    ang.current += (alvoAng - ang.current) * k;
    raio.current += (alvoRaio - raio.current) * k;
    if (Math.abs(alvoAng - ang.current) < 0.0004) ang.current = alvoAng;
    if (Math.abs(alvoRaio - raio.current) < 0.002) raio.current = alvoRaio;

    camera.position.set(
      Math.sin(ang.current) * raio.current,
      0,
      Math.cos(ang.current) * raio.current
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function Scene() {
  const physics = useBadgeStore((s) => s.physics);

  // Rebuild the physics world when rope length or stiffness change.
  const resetNonce = useBadgeStore((s) => s.resetNonce);
  const physicsKey = `${physics.ropeLength.toFixed(2)}-${physics.stiffness.toFixed(2)}-${resetNonce}`;
  const gravityY = -22 * physics.stiffness;

  // Roda do mouse aproxima e afasta. Precisa de listener manual porque o
  // onWheel do React é passivo e não deixa cancelar o scroll da página.
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // normaliza linha/pixel e limita o passo por evento
      const passo = Math.max(-1, Math.min(1, e.deltaY / 100));
      useBadgeStore.getState().nudgeZoom(Math.exp(-passo * 0.22));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div ref={wrap} className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0, CAM_R], fov: 22 }}
        gl={{ antialias: true, alpha: true }}
      >
        <FlipCamera />
        <color attach="background" args={["#0a0a0a"]} />
        {/* A névoa começava em 16, e afastar o zoom leva a câmera a ~27 —
            o crachá inteiro entrava na névoa e escurecia. Agora ela só age
            depois do afastamento máximo. */}
        <fog attach="fog" args={["#0a0a0a", 34, 62]} />

        <ambientLight intensity={0.95} />
        <directionalLight position={[0, 0, 8]} intensity={0.55} />
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
    </div>
  );
}
