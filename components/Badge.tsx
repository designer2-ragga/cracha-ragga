"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useBadgeStore } from "@/store/useBadgeStore";
import { drawBadge, TEX_W, TEX_H } from "@/lib/badgeTexture";

export const CARD_W = 1.6;
export const CARD_H = 2.25;
export const CARD_T = 0.05;

/**
 * Pure-visual badge.
 *
 * The printed face is a flat plane carrying a CanvasTexture (clean 0..1 UVs,
 * unlike a RoundedBox whose bevels distort the mapping). It sits just in front
 * of a rounded plastic body so the badge keeps soft corners and a glossy
 * plastic edge. A metallic clip + ring is rendered above where the lanyard
 * attaches.
 */
export default function Badge() {
  const rev = useBadgeStore((s) => s.rev);
  const badgeColor = useBadgeStore((s) => s.badgeColor);

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

  // Redraw whenever any badge field changes.
  useEffect(() => {
    const render = () => {
      drawBadge(ctx, useBadgeStore.getState(), render);
      texture.needsUpdate = true;
    };
    render();
  }, [rev, ctx, texture, canvas]);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <group>
      {/* metallic clip + ring above the card */}
      <group position={[0, CARD_H / 2 + 0.16, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.11, 0.035, 16, 40]} />
          <meshStandardMaterial
            color="#d8d8dc"
            metalness={1}
            roughness={0.25}
            envMapIntensity={1.4}
          />
        </mesh>
        <mesh position={[0, -0.12, 0]} castShadow>
          <boxGeometry args={[0.16, 0.18, 0.06]} />
          <meshStandardMaterial
            color="#bfbfc4"
            metalness={1}
            roughness={0.3}
            envMapIntensity={1.4}
          />
        </mesh>
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
          color={badgeColor}
          clearcoat={0.7}
          clearcoatRoughness={0.35}
          roughness={0.5}
          metalness={0}
          envMapIntensity={0.5}
          reflectivity={0.3}
        />
      </RoundedBox>

      {/* printed face — flat plane with clean UVs, transparent rounded corners
          reveal the plastic body beneath */}
      <mesh position={[0, 0, CARD_T / 2 + 0.003]}>
        <planeGeometry args={[CARD_W - 0.02, CARD_H - 0.02]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.55}
          metalness={0}
          envMapIntensity={0.35}
        />
      </mesh>
    </group>
  );
}
