"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree, extend } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import Badge, { CARD_H } from "./Badge";
import { useBadgeStore } from "@/store/useBadgeStore";
import { getVertical, drawLanyardTile } from "@/lib/verticals";

extend({ MeshLineGeometry, MeshLineMaterial });

const ANCHOR_Y = 2.6;

export default function Lanyard() {
  const physics = useBadgeStore((s) => s.physics);
  const lanyardColor = useBadgeStore((s) => s.lanyardColor);
  const vertical = useBadgeStore((s) => s.vertical);

  // Strap texture: the selected vertical's logo tiled along the lanyard.
  const strip = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { ctx, tex };
  }, []);

  useEffect(() => {
    drawLanyardTile(strip.ctx, 256, lanyardColor, "#ffffff", getVertical(vertical).sym);
    strip.tex.needsUpdate = true;
  }, [vertical, lanyardColor, strip]);

  useEffect(() => () => strip.tex.dispose(), [strip]);

  // How many logo tiles repeat along the strap (keeps them roughly square).
  const repeatX = Math.max(4, Math.round(9 * physics.ropeLength));

  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const band = useRef<THREE.Mesh>(null);
  const { size, camera } = useThree();

  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);

  const seg = 0.55 * physics.ropeLength;

  // Rope chain anchor -> j1 -> j2 -> j3, then spherical joint to the card top.
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], seg]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], seg]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], seg]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, CARD_H / 2 + 0.25, 0]]);

  // reusable temporaries
  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  );
  const vec = useRef(new THREE.Vector3()).current;
  const dir = useRef(new THREE.Vector3()).current;
  const ang = useRef(new THREE.Vector3()).current;
  const rot = useRef(new THREE.Vector3()).current;

  useEffect(() => {
    if (hovered) document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragged]);

  // Apply damping live to all dynamic bodies.
  useEffect(() => {
    [j1, j2, j3, card].forEach((r) => {
      r.current?.setLinearDamping(physics.damping);
      r.current?.setAngularDamping(physics.damping);
    });
  }, [physics.damping]);

  // Shuffle: kick the card with a random impulse.
  useEffect(() => {
    if (physics.shuffleNonce === 0) return;
    const k = 6 * physics.responsiveness;
    card.current?.wakeUp();
    card.current?.applyImpulse(
      {
        x: (Math.sin(physics.shuffleNonce * 12.9) ) * k,
        y: Math.abs(Math.cos(physics.shuffleNonce * 7.7)) * k * 0.4,
        z: (Math.cos(physics.shuffleNonce * 4.1)) * k * 0.6,
      },
      true
    );
    card.current?.applyTorqueImpulse(
      {
        x: 0,
        y: Math.sin(physics.shuffleNonce * 3.3) * k * 0.2,
        z: Math.cos(physics.shuffleNonce * 2.2) * k * 0.2,
      },
      true
    );
  }, [physics.shuffleNonce, physics.responsiveness]);

  interface Lerped extends RapierRigidBody {
    lerped?: THREE.Vector3;
  }

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
      dir.copy(vec).sub(camera.position).normalize();
      vec.add(dir.multiplyScalar(camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    if (fixed.current && j1.current && j2.current && j3.current && card.current) {
      // Smooth the rope segment positions for a fluid line.
      const speed = 12 + physics.responsiveness * 18;
      [j1, j2].forEach((r) => {
        const c = r.current as Lerped;
        if (!c.lerped) c.lerped = new THREE.Vector3().copy(c.translation());
        const clamped = Math.max(
          0.1,
          Math.min(1, c.lerped.distanceTo(c.translation()))
        );
        c.lerped.lerp(c.translation(), dt * (10 + clamped * speed));
      });

      const j1l = (j1.current as Lerped).lerped!;
      const j2l = (j2.current as Lerped).lerped!;
      curve.points[0].copy(j3.current.translation() as THREE.Vector3);
      curve.points[1].copy(j2l);
      curve.points[2].copy(j1l);
      curve.points[3].copy(fixed.current.translation() as THREE.Vector3);

      if (band.current) {
        // @ts-expect-error meshline geometry method
        band.current.geometry.setPoints(curve.getPoints(32));
      }

      // Gently rotate the card back toward the camera (self-righting on
      // pitch + yaw). The quaternion x/y/z components approximate the small
      // rotation away from facing the camera; z (the pendulum swing) is left
      // free so the badge keeps swinging naturally.
      ang.copy(card.current.angvel() as THREE.Vector3);
      const q = card.current.rotation();
      rot.set(q.x, q.y, q.z);
      const k = 1.6 * physics.responsiveness;
      card.current.setAngvel(
        { x: ang.x - rot.x * k, y: ang.y - rot.y * k, z: ang.z },
        false
      );
    }
  });

  return (
    <>
      <group position={[0, ANCHOR_Y, 0]}>
        <RigidBody ref={fixed} type="fixed" colliders={false} />
        <RigidBody
          ref={j1}
          type="dynamic"
          position={[0, -seg, 0]}
          colliders={false}
          linearDamping={physics.damping}
          angularDamping={physics.damping}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          ref={j2}
          type="dynamic"
          position={[0, -seg * 2, 0]}
          colliders={false}
          linearDamping={physics.damping}
          angularDamping={physics.damping}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          ref={j3}
          type="dynamic"
          position={[0, -seg * 3, 0]}
          colliders={false}
          linearDamping={physics.damping}
          angularDamping={physics.damping}
        >
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          ref={card}
          type={dragged ? "kinematicPosition" : "dynamic"}
          position={[0, -seg * 3 - CARD_H / 2 - 0.25, 0]}
          colliders={false}
          linearDamping={physics.damping}
          angularDamping={physics.damping}
        >
          <CuboidCollider args={[0.8, 1.125, 0.05]} />
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerUp={(e) => {
              (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
              setDragged(false);
            }}
            onPointerDown={(e) => {
              (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
              const pos = card.current!.translation();
              setDragged(
                new THREE.Vector3()
                  .copy(e.point)
                  .sub(new THREE.Vector3(pos.x, pos.y, pos.z))
              );
            }}
          >
            <Badge />
          </group>
        </RigidBody>
      </group>

      {/* The lanyard band rendered as a thick line following the rope. */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          map={strip.tex}
          useMap={1}
          repeat={[repeatX, 1]}
          depthTest={false}
          resolution={[size.width, size.height]}
          lineWidth={0.3}
        />
      </mesh>
    </>
  );
}
