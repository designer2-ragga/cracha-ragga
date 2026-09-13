import { create } from "zustand";
import { getVertical, corDoCordao, CORDAO_PADRAO } from "@/lib/verticals";
import type { VersionKey } from "@/lib/verticals";

export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 2.6;

export type BgPattern =
  "none" | "lines" | "dots" | "grid" | "noise" | "diagonal";

export interface PhotoConfig {
  src: string | null;
  scale: number;
  posX: number;
  posY: number;
  rotation: number;
  borderRadius: number; // 0..100 -> percent of circle
  borderColor: string;
  opacity: number;
}

export interface LogoConfig {
  src: string | null;
  scale: number;
  posX: number;
  posY: number;
  rotation: number;
  opacity: number;
}

export interface PhysicsConfig {
  damping: number;
  stiffness: number;
  ropeLength: number;
  responsiveness: number;
  shuffleNonce: number;
}

/** Tunable look of the glossy reflection on the badge face. */
export interface MaterialConfig {
  intensity: number; // envMapIntensity — "opacity"/strength of the reflection
  blur: number; // clearcoatRoughness — 0 sharp glint .. 1 soft sheen
  clearcoat: number; // amount of glossy coat
  roughness: number; // base matte..glossy
  reflectivity: number; // fresnel reflectivity
}

export interface BadgeState {
  // v1 institucional (frente + verso) ou v2 enxuta (só frente)
  version: VersionKey;

  // Vertical do Grupo Ragga — define cor do cartão, lockup e conteúdo
  vertical: string;

  // true = cartão virado, mostrando o verso
  flipped: boolean;

  // aproximação da câmera na prévia; 1 = enquadramento padrão
  zoom: number;

  // Basic info
  fullName: string;
  role: string;
  department: string;
  subtitle: string;
  footerLeft: string;
  footerRight: string;

  // Photo & logo
  photo: PhotoConfig;
  logo: LogoConfig;

  // Design
  badgeColor: string;
  textColor: string;
  borderColor: string;
  lanyardColor: string;
  bgPattern: BgPattern;
  patternDensity: number;
  patternOpacity: number;

  // Physics
  physics: PhysicsConfig;

  // Reflection / finish of the badge face
  material: MaterialConfig;

  // texture revision — bump to force CanvasTexture regeneration
  rev: number;

  set: <K extends keyof BadgeState>(key: K, value: BadgeState[K]) => void;
  setVersion: (v: VersionKey) => void;
  toggleFlip: () => void;
  setZoom: (z: number) => void;
  nudgeZoom: (fator: number) => void;
  setVertical: (key: string) => void;
  setPhoto: (p: Partial<PhotoConfig>) => void;
  setLogo: (l: Partial<LogoConfig>) => void;
  setPhysics: (p: Partial<PhysicsConfig>) => void;
  setMaterial: (m: Partial<MaterialConfig>) => void;
  shuffle: () => void;
  recenter: () => void;
  reset: () => void;

  // bump to remount the physics world (full reset)
  resetNonce: number;
  // bump to trigger a smooth re-center animation
  recenterNonce: number;
}

const initialPhoto: PhotoConfig = {
  src: null,
  scale: 1,
  posX: 0,
  posY: 0,
  rotation: 0,
  borderRadius: 100,
  borderColor: "#ffffff",
  opacity: 1,
};

const initialLogo: LogoConfig = {
  src: null,
  scale: 1,
  posX: 0,
  posY: 0,
  rotation: 0,
  opacity: 1,
};

const initialPhysics: PhysicsConfig = {
  damping: 2.5,
  stiffness: 1,
  ropeLength: 1,
  responsiveness: 1,
  shuffleNonce: 0,
};

const initialMaterial: MaterialConfig = {
  intensity: 0.72, // streak opacity (60% brighter than before)
  blur: 0.28,
  clearcoat: 0.5,
  roughness: 0.5,
  reflectivity: 0.2,
};

const initialState = {
  version: "institucional" as VersionKey,
  vertical: "grupo",
  flipped: false,
  zoom: 1,
  fullName: "Nome Sobrenome",
  role: "Cargo",
  department: "Grupo Ragga",
  subtitle: "Identidade & Design",
  footerLeft: "ID 0042",
  footerRight: "grupo-ragga.com",
  photo: initialPhoto,
  logo: initialLogo,
  badgeColor: "#2D1B4E",
  textColor: "#ffffff",
  borderColor: "#ffffff",
  lanyardColor: CORDAO_PADRAO,
  bgPattern: "dots" as BgPattern,
  patternDensity: 24,
  patternOpacity: 0.12,
  physics: initialPhysics,
  material: initialMaterial,
  resetNonce: 0,
  recenterNonce: 0,
  rev: 0,
};

export const useBadgeStore = create<BadgeState>((set) => ({
  ...initialState,

  set: (key, value) =>
    set((s) => ({ [key]: value, rev: s.rev + 1 }) as Partial<BadgeState>),

  toggleFlip: () => set((s) => ({ flipped: !s.flipped })),

  setZoom: (z) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) }),

  nudgeZoom: (fator) =>
    set((s) => ({
      zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s.zoom * fator)),
    })),

  // Trocar de versão só muda o cordão: na v1 ele é o roxo padrão único
  // (regra do Rapha), na v2 ele acompanha a vertical (proposta nossa).
  setVersion: (version) =>
    set((s) => ({
      version,
      lanyardColor: corDoCordao(version, s.vertical),
      rev: s.rev + 1,
    })),

  // A vertical define a cor do cartão e, na v2, também a do cordão.
  setVertical: (key) =>
    set((s) => ({
      vertical: key,
      lanyardColor: corDoCordao(s.version, key),
      badgeColor: getVertical(key).color,
      rev: s.rev + 1,
    })),

  setPhoto: (p) =>
    set((s) => ({ photo: { ...s.photo, ...p }, rev: s.rev + 1 })),

  setLogo: (l) => set((s) => ({ logo: { ...s.logo, ...l }, rev: s.rev + 1 })),

  setPhysics: (p) => set((s) => ({ physics: { ...s.physics, ...p } })),

  setMaterial: (m) => set((s) => ({ material: { ...s.material, ...m } })),

  shuffle: () =>
    set((s) => ({
      physics: { ...s.physics, shuffleNonce: s.physics.shuffleNonce + 1 },
    })),

  // Recentraliza o crachá (animação suave, tratada na cena 3D).
  recenter: () => set((s) => ({ recenterNonce: s.recenterNonce + 1 })),

  reset: () =>
    set((s) => ({
      ...initialState,
      resetNonce: s.resetNonce + 1,
      rev: Date.now(),
    })),
}));
