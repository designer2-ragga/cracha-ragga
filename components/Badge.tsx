"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useBadgeStore } from "@/store/useBadgeStore";
import { drawFront, drawBack, TEX_W, TEX_H } from "@/lib/badgeTexture";

export const CARD_W = 1.6;
export const CARD_H = (CARD_W * TEX_H) / TEX_W; // CR80 vertical, 54 × 86 mm
export const CARD_T = 0.0125; // 75% thinner

/** Draws periodic vertical soft bands (rotated into diagonals by the texture)
 *  for the glossy "light streak" reflection. `blur` softens the band edges. */
function drawStreaks(
  ctx: CanvasRenderingContext2D,
  size: number,
  blur: number,
) {
  ctx.clearRect(0, 0, size, size);
  const bands = [
    { center: 0.28, width: 0.085, alpha: 0.95 },
    { center: 0.44, width: 0.035, alpha: 0.7 },
  ];
  for (const b of bands) {
    const cx = b.center * size;
    const w = b.width * size * (1 + blur * 2.2);
    const grad = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, `rgba(255,255,255,${b.alpha})`);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(cx - w, -size, w * 2, size * 3);
  }
}

/** Latão escovado — a ferragem da foto é dourada, não cromada. */
const Metal = ({ color = "#b99f5e" }: { color?: string }) => (
  <meshStandardMaterial
    color={color}
    metalness={1}
    roughness={0.34}
    envMapIntensity={1.5}
  />
);

/**
 * Ferragem do crachá, medida na foto do cordão do Rapha contra a largura do
 * cartão: presilha jacaré chata (0,21 da largura do cartão) presa por uma
 * argola redonda, e acima dela a dobra da fita fechada num crimpe chato. A
 * língua da presilha atravessa o oblongo. Não é mosquetão giratório.
 *
 * A pilha toda mede ~0,95 — é o valor de HARDWARE_GAP no Lanyard, que é a
 * folga reservada entre a ponta da fita e o topo do cartão.
 */
const CLIP_W = 0.32;
const CLIP_TOP = 0.52;
const RING_R = 0.16;

function Clasp() {
  return (
    <group>
      {/* chapa da presilha; começa abaixo do topo do cartão, como a língua */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[CLIP_W, 0.64, 0.035]} />
        <Metal />
      </mesh>
      {/* topo arredondado, por onde a argola passa */}
      <mesh position={[0, CLIP_TOP, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[CLIP_W / 2, CLIP_W / 2, 0.035, 20]} />
        <Metal />
      </mesh>
      {/* estrias diagonais da chapa, só para pegar luz */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[0, -0.04 + i * 0.11, 0.021]}
          rotation={[0, 0, -0.42]}
          castShadow
        >
          <boxGeometry args={[CLIP_W * 0.84, 0.026, 0.012]} />
          <Metal color="#9c8348" />
        </mesh>
      ))}

      {/* argola redonda, atravessando o topo da presilha */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <torusGeometry args={[RING_R, 0.019, 12, 40]} />
        <Metal />
      </mesh>

      {/* dobra da fita, presa entre a argola e o crimpe */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.42, 0.2, 0.055]} />
        <meshStandardMaterial color="#181334" roughness={0.88} />
      </mesh>
      {/* crimpe chato de metal escovado */}
      <mesh position={[0, 0.925, 0]} castShadow>
        <boxGeometry args={[0.78, 0.09, 0.085]} />
        <Metal color="#b3b3b8" />
      </mesh>
    </group>
  );
}

/**
 * Pure-visual badge.
 *
 * The printed face is a flat plane carrying a CanvasTexture (clean 0..1 UVs,
 * unlike a RoundedBox whose bevels distort the mapping). It sits just in front
 * of a rounded plastic body so the badge keeps soft corners and a glossy
 * plastic edge. A metallic clip + ring is rendered above where the lanyard
 * attaches.
 */
// Fixed diagonal-streak reflection look.
const STREAK_OPACITY = 0.18;
const STREAK_BLUR = 1.0;

export default function Badge() {
  const rev = useBadgeStore((s) => s.rev);
  const [fontsReady, setFontsReady] = useState(false);

  const faces = useMemo(() => {
    const make = () => {
      const c = document.createElement("canvas");
      c.width = TEX_W;
      c.height = TEX_H;
      const context = c.getContext("2d")!;
      const tex = new THREE.CanvasTexture(c);
      tex.anisotropy = 16;
      tex.colorSpace = THREE.SRGBColorSpace;
      return { ctx: context, tex };
    };
    return { front: make(), back: make() };
  }, []);

  // Load the Dotties Vanilla font (used by the badge artwork) once.
  useEffect(() => {
    let alive = true;
    const list = [
      new FontFace(
        "Instrument Sans",
        "url(/fonts/InstrumentSans-latin.woff2)",
        { weight: "400 700", style: "normal" },
      ),
      new FontFace(
        "Instrument Sans",
        "url(/fonts/InstrumentSans-latin-ext.woff2)",
        { weight: "400 700", style: "normal" },
      ),
      new FontFace(
        "Dotties Vanilla",
        "url(/fonts/DottiesVanilla-ExtraBold.woff2)",
        { weight: "800", style: "normal" },
      ),
      new FontFace(
        "Dotties Vanilla",
        "url(/fonts/DottiesVanilla-Medium.woff2)",
        { weight: "500", style: "normal" },
      ),
    ];
    Promise.all(list.map((f) => f.load()))
      .then((loaded) => {
        if (!alive) return;
        loaded.forEach((f) => document.fonts.add(f));
        setFontsReady(true);
      })
      .catch(() => alive && setFontsReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Redraw whenever any badge field changes (or fonts finish loading).
  useEffect(() => {
    const render = () => {
      const state = useBadgeStore.getState();
      drawFront(faces.front.ctx, state, render);
      drawBack(faces.back.ctx, state, render);
      faces.front.tex.needsUpdate = true;
      faces.back.tex.needsUpdate = true;
    };
    render();
  }, [rev, faces, fontsReady]);

  useEffect(
    () => () => {
      faces.front.tex.dispose();
      faces.back.tex.dispose();
    },
    [faces],
  );

  // Diagonal "light streak" reflection overlay.
  const streak = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const context = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.center.set(0.5, 0.5);
    tex.rotation = -0.5; // turn the vertical bands into diagonals
    return { ctx: context, tex };
  }, []);

  useEffect(() => {
    drawStreaks(streak.ctx, 256, STREAK_BLUR);
    streak.tex.needsUpdate = true;
  }, [streak]);

  useEffect(() => () => streak.tex.dispose(), [streak]);

  // Brilho varrendo a face, em loop. O "Virar" é feito pela câmera, na cena.
  useFrame((_, delta) => {
    streak.tex.offset.x = (streak.tex.offset.x + delta * 0.04) % 1;
  });

  return (
    <group>
      {/* argola e mosquetao ficam fora do giro */}
      <group position={[0, CARD_H / 2, 0]}>
        <Clasp />
      </group>

      <group>
        {/* plastic body */}
        <RoundedBox
          args={[CARD_W, CARD_H, CARD_T]}
          radius={0.1}
          smoothness={6}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial
            color="#ffffff"
            clearcoat={0.22}
            clearcoatRoughness={0.6}
            roughness={0.72}
            metalness={0}
            envMapIntensity={0.16}
            reflectivity={0.14}
          />
        </RoundedBox>

        {/* printed face — the artwork printed ON the white plastic surface
          (flush with the card front, not floating under a clear layer). */}
        <mesh position={[0, 0, CARD_T / 2 + 0.0008]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial
            map={faces.front.tex}
            transparent
            toneMapped={false}
          />
        </mesh>

        {/* verso — girado no eixo Y para não sair espelhado */}
        <mesh
          position={[0, 0, -CARD_T / 2 - 0.0008]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshBasicMaterial
            map={faces.back.tex}
            transparent
            toneMapped={false}
          />
        </mesh>

        {/* brilho diagonal varrendo as duas faces */}
        <mesh position={[0, 0, CARD_T / 2 + 0.0014]}>
          <planeGeometry args={[CARD_W - 0.06, CARD_H - 0.06]} />
          <meshBasicMaterial
            map={streak.tex}
            transparent
            opacity={STREAK_OPACITY}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh
          position={[0, 0, -CARD_T / 2 - 0.0014]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[CARD_W - 0.06, CARD_H - 0.06]} />
          <meshBasicMaterial
            map={streak.tex}
            transparent
            opacity={STREAK_OPACITY}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
