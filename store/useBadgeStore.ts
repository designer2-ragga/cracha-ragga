import { create } from "zustand";
import { getVertical } from "@/lib/verticals";

export type BgPattern = "none" | "lines" | "dots" | "grid" | "noise" | "diagonal";

// "fries" is the dice option; it spawns several independent "fry" sticks.
export type FoodType = "hotdog" | "ketchup" | "mustard" | "fries" | "fry";

export interface FoodThrow {
  id: number;
  type: FoodType;
}

/** A sauce splat painted onto the badge face, in canvas (texture) coords. */
export interface Stain {
  x: number;
  y: number;
  r: number;
  color: string;
  seed: number;
}

const FOOD_TYPES: FoodType[] = ["hotdog", "ketchup", "mustard", "fries"];
let foodCounter = 0;

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
  // Selected Grupo Ragga vertical (drives lanyard color + logo)
  vertical: string;

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

  // Food fun
  foodThrows: FoodThrow[];
  stains: Stain[];

  // texture revision — bump to force CanvasTexture regeneration
  rev: number;

  set: <K extends keyof BadgeState>(key: K, value: BadgeState[K]) => void;
  setVertical: (key: string) => void;
  setPhoto: (p: Partial<PhotoConfig>) => void;
  setLogo: (l: Partial<LogoConfig>) => void;
  setPhysics: (p: Partial<PhysicsConfig>) => void;
  setMaterial: (m: Partial<MaterialConfig>) => void;
  shuffle: () => void;
  throwFood: () => void;
  removeFood: (id: number) => void;
  addStain: (s: Stain) => void;
  recenter: () => void;
  reset: () => void;

  // bump to remount the physics world (re-centers the badge)
  resetNonce: number;
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
  intensity: 0.45,
  blur: 0.28,
  clearcoat: 0.5,
  roughness: 0.5,
  reflectivity: 0.2,
};

const initialState = {
  vertical: "mkt-vendas",
  fullName: "Ana Ragga",
  role: "Diretora Criativa",
  department: "Grupo Ragga",
  subtitle: "Identidade & Design",
  footerLeft: "ID 0042",
  footerRight: "grupo-ragga.com",
  photo: initialPhoto,
  logo: initialLogo,
  badgeColor: "#E86820",
  textColor: "#ffffff",
  borderColor: "#ffffff",
  lanyardColor: "#E86820",
  bgPattern: "dots" as BgPattern,
  patternDensity: 24,
  patternOpacity: 0.12,
  physics: initialPhysics,
  material: initialMaterial,
  foodThrows: [],
  stains: [],
  resetNonce: 0,
  rev: 0,
};

export const useBadgeStore = create<BadgeState>((set) => ({
  ...initialState,

  set: (key, value) =>
    set((s) => ({ [key]: value, rev: s.rev + 1 }) as Partial<BadgeState>),

  // Selecting a vertical adopts its brand key-color for BOTH the lanyard
  // strap and the badge card.
  setVertical: (key) =>
    set((s) => ({
      vertical: key,
      lanyardColor: getVertical(key).color,
      badgeColor: getVertical(key).color,
      rev: s.rev + 1,
    })),

  setPhoto: (p) =>
    set((s) => ({ photo: { ...s.photo, ...p }, rev: s.rev + 1 })),

  setLogo: (l) =>
    set((s) => ({ logo: { ...s.logo, ...l }, rev: s.rev + 1 })),

  setPhysics: (p) =>
    set((s) => ({ physics: { ...s.physics, ...p } })),

  setMaterial: (m) =>
    set((s) => ({ material: { ...s.material, ...m } })),

  shuffle: () =>
    set((s) => ({
      physics: { ...s.physics, shuffleNonce: s.physics.shuffleNonce + 1 },
    })),

  // Roll the dice: throw one random food at the badge. "fries" scatters
  // 8 independent fry sticks; everything else is a single item.
  throwFood: () =>
    set((s) => {
      const pick = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
      const additions: FoodThrow[] =
        pick === "fries"
          ? Array.from({ length: 8 }, () => ({
              id: ++foodCounter,
              type: "fry" as FoodType,
            }))
          : [{ id: ++foodCounter, type: pick }];
      const next = [...s.foodThrows, ...additions];
      // keep a generous cap (a fries roll alone is 8 bodies)
      return { foodThrows: next.slice(-26) };
    }),

  removeFood: (id) =>
    set((s) => ({ foodThrows: s.foodThrows.filter((f) => f.id !== id) })),

  addStain: (stain) =>
    set((s) => ({ stains: [...s.stains, stain].slice(-40), rev: s.rev + 1 })),

  // Re-center the badge and wipe any food/stains, keeping the design.
  recenter: () =>
    set((s) => ({
      foodThrows: [],
      stains: [],
      resetNonce: s.resetNonce + 1,
      rev: s.rev + 1,
    })),

  reset: () =>
    set((s) => ({
      ...initialState,
      foodThrows: [],
      stains: [],
      resetNonce: s.resetNonce + 1,
      rev: Date.now(),
    })),
}));
