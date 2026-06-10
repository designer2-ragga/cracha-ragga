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

/* ----------------------------- meshes ----------------------------- */

function HotDogMesh() {
  return (
    <group rotation={[0, 0, 0.2]}>
      {/* bun */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.17, 0.7, 8, 16]} />
        <meshStandardMaterial color="#e3a857" roughness={0.7} />
      </mesh>
      {/* sausage */}
      <mesh castShadow position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, 0.82, 8, 16]} />
        <meshStandardMaterial color="#9c3a1f" roughness={0.45} />
      </mesh>
      {/* mustard squiggle */}
      {[-0.3, -0.1, 0.1, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0.21, (i % 2 ? 0.05 : -0.05)]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#e0a800" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function FriesMesh() {
  const sticks = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: (i - 3) * 0.06 + (Math.sin(i * 3.1) * 0.02),
        z: Math.cos(i * 2.3) * 0.04,
        rot: (Math.sin(i * 1.7) * 0.25),
        len: 0.45 + (i % 3) * 0.08,
      })),
    []
  );
  return (
    <group>
      {sticks.map((s, i) => (
        <mesh key={i} castShadow position={[s.x, 0, s.z]} rotation={[s.rot, 0, s.rot * 0.5]}>
          <boxGeometry args={[0.05, s.len, 0.05]} />
          <meshStandardMaterial color="#eABF45" roughness={0.6} />
        </mesh>
      ))}
    </group>
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
      pos: [
        (Math.random() - 0.5) * 3.5,
        2.4 + Math.random() * 0.8,
        3 + Math.random() * 1.2,
      ] as [number, number, number],
      spin: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      ] as [number, number, number],
    }),
    []
  );

  useEffect(() => {
    const b = body.current;
    if (!b) return;
    // aim at the badge (its current position) with a downward arc
    const card = cardRef.current?.translation() ?? { x: 0, y: -0.4, z: 0 };
    const from = new THREE.Vector3(...spawn.pos);
    const to = new THREE.Vector3(card.x, card.y, card.z);
    const dir = to.sub(from).normalize();
    const speed = isSauce ? 9 + Math.random() * 3 : 5.5 + Math.random() * 2;
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
  }, [cardRef, item.id, removeFood, spawn]);

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
      gravityScale={isSauce ? 1 : 0.55}
      restitution={isSauce ? 0.1 : 0.5}
      friction={0.8}
      density={isSauce ? 2 : 1}
      onCollisionEnter={isSauce ? onHit : undefined}
    >
      {item.type === "hotdog" && <HotDogMesh />}
      {item.type === "fries" && <FriesMesh />}
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
