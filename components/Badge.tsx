"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useBadgeStore } from "@/store/useBadgeStore";
import { drawBadge, TEX_W, TEX_H } from "@/lib/badgeTexture";

export const CARD_W = 1.6;
export const CARD_H = 2.25;
export const CARD_T = 0.0125; // 75% thinner

/** Draws periodic vertical soft bands (rotated into diagonals by the texture)
 *  for the glossy "light streak" reflection. `blur` softens the band edges. */
function drawStreaks(
  ctx: CanvasRenderingContext2D,
  size: number,
  blur: number
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

const Metal = () => (
  <meshStandardMaterial
    color="#cfd0d4"
    metalness={1}
    roughness={0.28}
    envMapIntensity={1.5}
  />
);

/** A brushed-steel swivel snap-hook clasp connecting the strap to the card. */
function Clasp() {
  return (
    <group>
      {/* card eyelet (grommet) */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <torusGeometry args={[0.06, 0.02, 14, 32]} />
        <Metal />
      </mesh>

      {/* swivel barrel where the strap is sewn in */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.13, 20]} />
        <Metal />
      </mesh>
      {/* swivel collar */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.05, 16]} />
        <Metal />
      </mesh>

      {/* open J-hook arc that grabs the eyelet */}
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, Math.PI * 0.15]} castShadow>
        <torusGeometry args={[0.075, 0.022, 14, 32, Math.PI * 1.55]} />
        <Metal />
      </mesh>
      {/* hook tip */}
      <mesh position={[0.07, 0.11, 0]} castShadow>
        <sphereGeometry args={[0.026, 12, 12]} />
        <Metal />
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

  const { canvas, ctx, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TEX_W;
    c.height = TEX_H;
    const context = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, ctx: context, texture: tex };
  }, []);

  // Load the Dotties Vanilla font (used by the badge artwork) once.
  useEffect(() => {
    let alive = true;
    const faces = [
      new FontFace(
        "Dotties Vanilla",
        "url(/fonts/DottiesVanilla-Medium.woff2)",
        { weight: "500", style: "normal" }
      ),
      new FontFace(
        "Dotties Vanilla",
        "url(/fonts/DottiesVanilla-MediumItalic.woff2)",
        { weight: "500", style: "italic" }
      ),
    ];
    Promise.all(faces.map((f) => f.load()))
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
      drawBadge(ctx, useBadgeStore.getState(), render);
      texture.needsUpdate = true;
    };
    render();
  }, [rev, ctx, texture, canvas, fontsReady]);

  useEffect(() => () => texture.dispose(), [texture]);

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

  // Slowly sweep the streaks across the badge, in a loop.
  useFrame((_, delta) => {
    streak.tex.offset.x = (streak.tex.offset.x + delta * 0.04) % 1;
  });

  return (
    <group>
      {/* metallic swivel snap-hook clasp + card eyelet */}
      <group position={[0, CARD_H / 2, 0]}>
        <Clasp />
      </group>

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
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>

      {/* diagonal light-streak reflection sweeping across the face */}
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
    </group>
  );
}
