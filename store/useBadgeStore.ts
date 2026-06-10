import { create } from "zustand";

export type BgPattern = "none" | "lines" | "dots" | "grid" | "noise" | "diagonal";

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

export interface BadgeState {
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

  // texture revision — bump to force CanvasTexture regeneration
  rev: number;

  set: <K extends keyof BadgeState>(key: K, value: BadgeState[K]) => void;
  setPhoto: (p: Partial<PhotoConfig>) => void;
  setLogo: (l: Partial<LogoConfig>) => void;
  setPhysics: (p: Partial<PhysicsConfig>) => void;
  shuffle: () => void;
  reset: () => void;
}

const RAGGA_ORANGE = "#e85d2a";

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

const initialState = {
  fullName: "Ana Ragga",
  role: "Diretora Criativa",
  department: "Grupo Ragga",
  subtitle: "Identidade & Design",
  footerLeft: "ID 0042",
  footerRight: "grupo-ragga.com",
  photo: initialPhoto,
  logo: initialLogo,
  badgeColor: RAGGA_ORANGE,
  textColor: "#ffffff",
  borderColor: "#ffffff",
  lanyardColor: "#1c1c1c",
  bgPattern: "dots" as BgPattern,
  patternDensity: 24,
  patternOpacity: 0.12,
  physics: initialPhysics,
  rev: 0,
};

export const useBadgeStore = create<BadgeState>((set) => ({
  ...initialState,

  set: (key, value) =>
    set((s) => ({ [key]: value, rev: s.rev + 1 }) as Partial<BadgeState>),

  setPhoto: (p) =>
    set((s) => ({ photo: { ...s.photo, ...p }, rev: s.rev + 1 })),

  setLogo: (l) =>
    set((s) => ({ logo: { ...s.logo, ...l }, rev: s.rev + 1 })),

  setPhysics: (p) =>
    set((s) => ({ physics: { ...s.physics, ...p } })),

  shuffle: () =>
    set((s) => ({
      physics: { ...s.physics, shuffleNonce: s.physics.shuffleNonce + 1 },
    })),

  reset: () => set(() => ({ ...initialState, rev: Date.now() })),
}));
