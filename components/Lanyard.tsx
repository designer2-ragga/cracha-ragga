"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import Badge, { CARD_H } from "./Badge";
import { useBadgeStore } from "@/store/useBadgeStore";
import { inkFor } from "@/lib/verticals";
import { RibbonGeometry } from "@/lib/ribbon";


/**
 * Largura real da fita em unidades de mundo. Medido na foto do cordão do
 * Rapha: a fita dá 51% da largura do cartão (cartão 335 px, fita 175 px),
 * ou seja ~28 mm de fita para 54 mm de cartão.
 */
const STRAP_W = 0.51 * 1.6;


/**
 * Folga entre a ponta da fita e o topo do cartão: é onde mora a ferragem
 * (crimpe + argola + presilha). Sem ela a fita passa por cima do metal.
 */
const HARDWARE_GAP = 0.95;

/**
 * Comprimento de um bloco da fita em múltiplos da largura dela. É o que
 * mantém o logo com a proporção certa: o ladrilho é recortado com esse mesmo
 * aspecto e o `repeat` é calculado a partir do comprimento real da corda.
 */
const TILE_ASPECT = 2.9;

/** Comprimento de um ladrilho da textura, em unidades de mundo. */
const TILE_PITCH = STRAP_W * TILE_ASPECT;
const IDENTITY_QUAT = new THREE.Quaternion();

export default function Lanyard() {
  const physics = useBadgeStore((s) => s.physics);
  const lanyardColor = useBadgeStore((s) => s.lanyardColor);

  // Strap texture: the selected vertical's logo tiled along the lanyard.
  const strip = useMemo(() => {
    const c = document.createElement("canvas");
    // O ladrilho tem o MESMO aspecto que vai ocupar na fita (TILE_ASPECT : 1),
    // então o logo sai sem esticar independente do comprimento da corda.
    c.height = 256;
    c.width = Math.round(256 * TILE_ASPECT);
    const ctx = c.getContext("2d")!;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return { ctx, tex };
  }, []);

  // Cordão = símbolo + "ragga" repetido, como na fita real (a fita não
  // leva a palavra "GRUPO" — conferido na foto do cordão do Rapha).
  // Só a cor muda entre as versões (v1 roxo padrão, v2 cor da vertical).
  useEffect(() => {
    const ctx = strip.ctx;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const draw = (img?: HTMLImageElement) => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = lanyardColor;
      ctx.fillRect(0, 0, W, H);
      if (img && img.complete && img.naturalWidth) {
        // largura pela proporção natural do lockup, nunca esticado
        const tw = W * 0.69; // 2 larguras de fita, como na foto
        const th = tw * (img.naturalHeight / img.naturalWidth);
        // a fita clara (v2 de Franquia e Insumos) pede logo escuro
        const tinta = inkFor(lanyardColor);
        const t = document.createElement("canvas");
        t.width = Math.ceil(tw);
        t.height = Math.max(1, Math.ceil(th));
        const tc = t.getContext("2d")!;
        tc.drawImage(img, 0, 0, tw, th);
        tc.globalCompositeOperation = "source-in";
        tc.fillStyle = tinta;
        tc.fillRect(0, 0, t.width, t.height);
        // O U da fita corre do cartão para cima; sem o giro de 180° o
        // lockup sai de cabeça para baixo no lado visível da fita.
        ctx.save();
        ctx.translate(W / 2, H / 2);
        ctx.rotate(Math.PI);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(t, -tw / 2, -th / 2);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      strip.tex.needsUpdate = true;
    };
    const img = new Image();
    img.onload = () => draw(img);
    img.src = "/badge/lockups/ragga-cordao.svg";
    if (img.complete) draw(img);
    else draw();
  }, [lanyardColor, strip]);

  useEffect(() => () => strip.tex.dispose(), [strip]);


  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);

  const band = useRef<THREE.Mesh>(null);
  const ribbon = useMemo(() => new RibbonGeometry(48), []);
  useEffect(() => () => ribbon.dispose(), [ribbon]);
  const { camera } = useThree();

  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);
  const [recentering, setRecentering] = useState(false);

  // Fita mais comprida: com 0,55 por segmento cabia um único lockup na
  // parte visível. A foto do cordão mostra a marca repetida várias vezes.
  const seg = 0.62 * physics.ropeLength;

  // O cartão descansa sempre no centro da cena (y = 0) e a âncora da corda é
  // derivada daí — assim o cordão sai por cima do quadro em vez de empurrar o
  // cartão para baixo quando a corda muda de comprimento.
  const restY = 0;
  const anchorY = seg * 3 + CARD_H / 2 + HARDWARE_GAP;

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
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, CARD_H / 2 + HARDWARE_GAP, 0],
  ]);

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

      // A repetição da arte vai nos UVs, por comprimento de arco: assim o
      // lockup mantém a proporção qualquer que seja o comprimento da corda.
      ribbon.update(curve.getPoints(ribbon.segments), STRAP_W, TILE_PITCH);

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
      <group position={[0, anchorY, 0]}>
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
          position={[0, -seg * 3 - CARD_H / 2 - HARDWARE_GAP, 0]}
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

      {/* The lanyard rendered as a WIDE flat strap with logos tiled along it. */}
      {/* fita como objeto 3D: tem frente e verso de verdade */}
      <mesh ref={band} castShadow>
        <primitive object={ribbon} attach="geometry" />
        <meshStandardMaterial
          map={strip.tex}
          side={THREE.DoubleSide}
          roughness={0.82}
          metalness={0}
        />
      </mesh>
    </>
  );
}
