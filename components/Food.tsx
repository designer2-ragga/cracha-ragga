"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  RigidBody,
  type RapierRigidBody,
  type CollisionEnterPayload,
} from "@react-three/rapier";
import {
  useBadgeStore,
  type FoodThrow,
  type FoodType,
} from "@/store/useBadgeStore";
import { CARD_W, CARD_H } from "./Badge";
import { TEX_W, TEX_H } from "@/lib/badgeTexture";

const SAUCE_COLOR: Record<string, string> = {
  ketchup: "#c41e1e",
  mustard: "#e0a800",
};

// TEMP debug: make solid foods hover in front of the camera for inspection.
const DEBUG_HOVER = false;

/* --------------------- procedural textures --------------------- */
// Lazily-built, cached canvas textures so every flying item shares them.

function speckle(
  ctx: CanvasRenderingContext2D,
  count: number,
  colors: string[]
) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    const s = Math.random() * 2 + 0.4;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, s, s);
  }
}

let _fry: THREE.CanvasTexture | null = null;
function fryTexture() {
  if (_fry) return _fry;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#b9842f");
  g.addColorStop(0.12, "#e7bd55");
  g.addColorStop(0.5, "#f0cb6b");
  g.addColorStop(0.88, "#e7bd55");
  g.addColorStop(1, "#a9772a");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  // lengthwise streaks (the fried ridges)
  for (let i = 0; i < 14; i++) {
    x.strokeStyle = `rgba(150,100,40,${0.05 + Math.random() * 0.1})`;
    x.lineWidth = 1 + Math.random() * 2;
    const xx = Math.random() * 128;
    x.beginPath();
    x.moveTo(xx, 0);
    x.lineTo(xx + (Math.random() * 8 - 4), 128);
    x.stroke();
  }
  speckle(x, 150, [
    "rgba(120,70,25,0.5)",
    "rgba(90,50,18,0.45)",
    "rgba(255,240,205,0.4)",
  ]);
  _fry = new THREE.CanvasTexture(c);
  _fry.colorSpace = THREE.SRGBColorSpace;
  _fry.wrapS = _fry.wrapT = THREE.RepeatWrapping;
  return _fry;
}

let _bun: THREE.CanvasTexture | null = null;
function bunTexture() {
  if (_bun) return _bun;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  x.fillStyle = "#e7b264";
  x.fillRect(0, 0, 128, 128);
  // soft mottling
  for (let i = 0; i < 40; i++) {
    const r = 6 + Math.random() * 22;
    x.fillStyle =
      Math.random() > 0.5
        ? `rgba(212,150,70,${0.12 + Math.random() * 0.15})`
        : `rgba(247,220,160,${0.12 + Math.random() * 0.18})`;
    x.beginPath();
    x.arc(Math.random() * 128, Math.random() * 128, r, 0, Math.PI * 2);
    x.fill();
  }
  // toasted freckles
  speckle(x, 90, ["rgba(150,95,40,0.4)", "rgba(120,75,30,0.35)"]);
  _bun = new THREE.CanvasTexture(c);
  _bun.colorSpace = THREE.SRGBColorSpace;
  _bun.wrapS = _bun.wrapT = THREE.RepeatWrapping;
  return _bun;
}

let _sausage: THREE.CanvasTexture | null = null;
function sausageTexture() {
  if (_sausage) return _sausage;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#8a2f17");
  g.addColorStop(0.5, "#b6492a");
  g.addColorStop(1, "#8a2f17");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  // glossy highlight band
  x.fillStyle = "rgba(255,180,140,0.25)";
  x.fillRect(0, 40, 128, 14);
  // grill char spots
  speckle(x, 70, ["rgba(70,25,12,0.5)", "rgba(40,15,8,0.45)"]);
  _sausage = new THREE.CanvasTexture(c);
  _sausage.colorSpace = THREE.SRGBColorSpace;
  _sausage.wrapS = _sausage.wrapT = THREE.RepeatWrapping;
  return _sausage;
}

/* ----------------------------- meshes ----------------------------- */

function HotDogMesh() {
  const bun = bunTexture();
  const sausage = sausageTexture();
  return (
    <group rotation={[0, 0, 0.12]}>
      {/* lower bun */}
      <mesh castShadow position={[0, -0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.22, 1.3, 10, 20]} />
        <meshStandardMaterial map={bun} bumpMap={bun} bumpScale={0.015} roughness={0.85} />
      </mesh>
      {/* upper bun lips */}
      <mesh castShadow position={[0, 0.12, 0.16]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.11, 1.32, 8, 16]} />
        <meshStandardMaterial map={bun} bumpMap={bun} bumpScale={0.015} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.12, -0.16]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.11, 1.32, 8, 16]} />
        <meshStandardMaterial map={bun} bumpMap={bun} bumpScale={0.015} roughness={0.85} />
      </mesh>
      {/* sausage */}
      <mesh castShadow position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.145, 1.55, 12, 24]} />
        <meshStandardMaterial
          map={sausage}
          bumpMap={sausage}
          bumpScale={0.01}
          roughness={0.4}
          metalness={0}
        />
      </mesh>
      {/* mustard zig-zag on top */}
      {Array.from({ length: 11 }, (_, i) => {
        const t = i / 10;
        return (
          <mesh
            key={i}
            position={[(t - 0.5) * 1.3, 0.3, Math.sin(t * Math.PI * 5) * 0.08]}
          >
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#e8b300" roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}

function FryStick({ seed }: { seed: number }) {
  const tex = fryTexture();
  // deterministic size from the item id so each fry differs but is stable
  const len = 0.9 + ((seed * 37) % 100) / 100 * 0.5; // 0.9 .. 1.4
  return (
    <mesh castShadow>
      <boxGeometry args={[0.13, len, 0.13]} />
      <meshStandardMaterial
        map={tex}
        bumpMap={tex}
        bumpScale={0.02}
        roughness={0.55}
        metalness={0}
      />
    </mesh>
  );
}

function SauceMesh({ type }: { type: FoodType }) {
  return (
    <mesh castShadow scale={[1, 0.7, 1]}>
      <sphereGeometry args={[0.14, 16, 16]} />
      <meshStandardMaterial
        color={SAUCE_COLOR[type]}
        roughness={0.18}
        metalness={0}
      />
    </mesh>
  );
}

/* ----------------------------- item ------------------------------- */

function FoodItem({
  item,
  cardRef,
}: {
  item: FoodThrow;
  cardRef: React.RefObject<RapierRigidBody | null>;
}) {
  const body = useRef<RapierRigidBody>(null);
  const removeFood = useBadgeStore((s) => s.removeFood);
  const addStain = useBadgeStore((s) => s.addStain);
  const splatted = useRef(false);

  const isSauce = item.type === "ketchup" || item.type === "mustard";

  // Stable spawn point + tumble for this item.
  const spawn = useMemo(
    () => ({
      pos: (DEBUG_HOVER && !isSauce
        ? [(Math.random() - 0.5) * 2.6, 0.5 + Math.random() * 0.8, 5]
        : [
            (Math.random() - 0.5) * 3.8,
            2.3 + Math.random() * 1.0,
            2.8 + Math.random() * 1.4,
          ]) as [number, number, number],
      spin: [
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      ] as [number, number, number],
    }),
    []
  );

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    if (DEBUG_HOVER && !isSauce) {
      b.setAngvel({ x: 0.3, y: 0.6, z: 0.1 }, true);
      const t = setTimeout(() => removeFood(item.id), 60000);
      return () => clearTimeout(t);
    }
    // aim at the badge (its current position) with a downward arc
    const card = cardRef.current?.translation() ?? { x: 0, y: -0.4, z: 0 };
    const from = new THREE.Vector3(...spawn.pos);
    const to = new THREE.Vector3(card.x, card.y, card.z);
    const dir = to.sub(from).normalize();
    const speed = isSauce ? 9 + Math.random() * 3 : 5 + Math.random() * 2.5;
    b.setLinvel(
      {
        x: dir.x * speed + (Math.random() - 0.5) * 2.5,
        y: dir.y * speed * 0.4 + (isSauce ? 1.5 : 3),
        z: dir.z * speed,
      },
      true
    );
    b.setAngvel({ x: spawn.spin[0], y: spawn.spin[1], z: spawn.spin[2] }, true);

    const t = setTimeout(() => removeFood(item.id), 7000);
    return () => clearTimeout(t);
  }, [cardRef, item.id, removeFood, spawn, isSauce]);

  const onHit = (e: CollisionEnterPayload) => {
    if (!isSauce || splatted.current) return;
    if (e.other.rigidBody !== cardRef.current) return;
    splatted.current = true;

    // project the contact point onto the card face → canvas coords
    const b = body.current;
    const cb = cardRef.current;
    if (b && cb) {
      const wp = b.translation();
      const ct = cb.translation();
      const cr = cb.rotation();
      const q = new THREE.Quaternion(cr.x, cr.y, cr.z, cr.w).invert();
      const local = new THREE.Vector3(
        wp.x - ct.x,
        wp.y - ct.y,
        wp.z - ct.z
      ).applyQuaternion(q);
      const u = THREE.MathUtils.clamp(local.x / CARD_W + 0.5, 0.08, 0.92);
      const v = THREE.MathUtils.clamp(0.5 - local.y / CARD_H, 0.08, 0.92);
      addStain({
        x: u * TEX_W,
        y: v * TEX_H,
        r: 55 + Math.random() * 55,
        color: SAUCE_COLOR[item.type],
        seed: item.id * 1337 + 7,
      });
    }
    // sauce disappears once it splatters
    removeFood(item.id);
  };

  return (
    <RigidBody
      ref={body}
      position={spawn.pos}
      colliders={isSauce ? "ball" : "cuboid"}
      ccd
      gravityScale={isSauce ? 1 : DEBUG_HOVER ? 0 : 0.6}
      restitution={isSauce ? 0.1 : 0.4}
      friction={0.9}
      density={isSauce ? 2 : 1}
      onCollisionEnter={isSauce ? onHit : undefined}
    >
      {item.type === "hotdog" && <HotDogMesh />}
      {item.type === "fry" && <FryStick seed={item.id} />}
      {isSauce && <SauceMesh type={item.type} />}
    </RigidBody>
  );
}

/* ----------------------------- layer ------------------------------ */

export default function FoodLayer({
  cardRef,
}: {
  cardRef: React.RefObject<RapierRigidBody | null>;
}) {
  const foodThrows = useBadgeStore((s) => s.foodThrows);
  return (
    <>
      {foodThrows.map((f) => (
        <FoodItem key={f.id} item={f} cardRef={cardRef} />
      ))}
    </>
  );
}
