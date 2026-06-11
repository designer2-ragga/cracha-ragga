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
import FoodLayer from "./Food";

extend({ MeshLineGeometry, MeshLineMaterial });

const ANCHOR_Y = 2.6;
const IDENTITY_QUAT = new THREE.Quaternion();

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

  // Strap = the vertical's official horizontal logo (white) tiled along it.
  useEffect(() => {
    const ctx = strip.ctx;
    const W = 256;
    const H = 256;
    const draw = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = lanyardColor;
      ctx.fillRect(0, 0, W, H);
      if (img && img.complete && img.naturalWidth) {
        const tw = W * 0.88;
        const th = tw * (img.naturalHeight / img.naturalWidth);
        // recolour the brand logo to white for the coloured strap
        const t = document.createElement("canvas");
        t.width = Math.ceil(tw);
        t.height = Math.max(1, Math.ceil(th));
        const tc = t.getContext("2d")!;
        tc.drawImage(img, 0, 0, tw, th);
        tc.globalCompositeOperation = "source-in";
        tc.fillStyle = "#ffffff";
        tc.fillRect(0, 0, t.width, t.height);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(t, (W - tw) / 2, (H - th) / 2);
        ctx.globalAlpha = 1;
      }
      strip.tex.needsUpdate = true;
    };
    const img = new Image();
    img.onload = () => draw(img);
    img.src = `/badge/logos/${vertical}.svg`;
    if (img.complete) draw(img);
    else draw();
  }, [vertical, lanyardColor, strip]);

  useEffect(() => () => strip.tex.dispose(), [strip]);

  // Repetitions of the horizontal logo along the strap.
  const repeatX = Math.max(1, Math.round(2 * physics.ropeLength));

  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const band = useRef<THREE.Mesh>(null);
  const { size, camera } = useThree();

  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);
  const [recentering, setRecentering] = useState(false);

  const seg = 0.55 * physics.ropeLength;
  const restY = ANCHOR_Y - seg * 3 - CARD_H / 2 - 0.25;

  // Smooth re-center animation driven by the store's recenterNonce.
  const recenterNonce = useBadgeStore((s) => s.recenterNonce);
  const recenterAnim = useRef({
    active: false,
    startT: -1,
    from: new THREE.Vector3(),
    fromQuat: new THREE.Quaternion(),
  });
  const firstRecenter = useRef(true);
  useEffect(() => {
    if (firstRecenter.current) {
      firstRecenter.current = false;
      return;
    }
    recenterAnim.current.active = true;
    recenterAnim.current.startT = -1; // captured on next frame
    setRecentering(true);
  }, [recenterNonce]);

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
    const ra = recenterAnim.current;

    if (ra.active && card.current) {
      // Smoothly ease the card back to its rest pose (ease-in-out), then
      // hand control back to physics.
      if (ra.startT < 0) {
        const t = card.current.translation();
        const r = card.current.rotation();
        ra.from.set(t.x, t.y, t.z);
        ra.fromQuat.set(r.x, r.y, r.z, r.w);
        ra.startT = state.clock.elapsedTime;
      }
      let k = (state.clock.elapsedTime - ra.startT) / 0.8;
      if (k > 1) k = 1;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      [card, j1, j2, j3].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({
        x: ra.from.x * (1 - e),
        y: ra.from.y + (restY - ra.from.y) * e,
        z: ra.from.z * (1 - e),
      });
      const q = ra.fromQuat.clone().slerp(IDENTITY_QUAT, e);
      card.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      if (k >= 1) {
        ra.active = false;
        setRecentering(false);
        card.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        card.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    } else if (dragged && card.current) {
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

      // Idle motion: the only movement is the card turning a little around its
      // own vertical axis (yaw). Pitch (x) and swing/roll (z) are damped out so
      // it stays upright and facing forward; yaw is driven by a slow sine.
      // Skipped while dragging or re-centering (card is kinematic then).
      if (!ra.active && !dragged) {
        ang.copy(card.current.angvel() as THREE.Vector3);
        const q = card.current.rotation();
        rot.set(q.x, q.y, q.z);
        const yaw = Math.atan2(
          2 * (q.w * q.y + q.x * q.z),
          1 - 2 * (q.y * q.y + q.x * q.x)
        );
        const targetYaw = 0.28 * Math.sin(state.clock.elapsedTime * 0.7);
        card.current.setAngvel(
          {
            x: ang.x * 0.6 - rot.x * 6,
            y: (targetYaw - yaw) * 3.2,
            z: ang.z * 0.6 - rot.z * 6,
          },
          false
        );
      }
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
          type={dragged || recentering ? "kinematicPosition" : "dynamic"}
          position={[0, -seg * 3 - CARD_H / 2 - 0.25, 0]}
          colliders={false}
          linearDamping={physics.damping}
          angularDamping={physics.damping}
        >
          <CuboidCollider args={[0.8, 1.125, 0.02]} />
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

      {/* Food thrown by the dice button. */}
      <FoodLayer cardRef={card} />

      {/* The lanyard rendered as a WIDE flat strap with logos tiled along it. */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          map={strip.tex}
          useMap={1}
          repeat={[repeatX, 1]}
          depthTest={false}
          resolution={[size.width, size.height]}
          lineWidth={1.2}
        />
      </mesh>
    </>
  );
}
