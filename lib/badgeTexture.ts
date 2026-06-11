import type { BadgeState } from "@/store/useBadgeStore";
import { getVertical } from "@/lib/verticals";

export const TEX_W = 768;
export const TEX_H = 1080;

const PANEL_H = 790; // orange top panel height (Figma)
const CARD_RADIUS = 48; // matches the 3D card's rounded corners

// Simple in-memory image cache so we don't reload data URLs every frame.
const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(
  src: string,
  onReady: () => void
): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    return img.complete ? img : null;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => onReady();
  img.src = src;
  imageCache.set(src, img);
  return null;
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Rectangle with only the TOP corners rounded. */
function roundedTopRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Renders the badge face — faithful to the Figma layout:
 *  orange (vertical key-color) patterned top panel, white lower band,
 *  centred photo circle, name + role in Dotties Vanilla, and the
 *  "ragga + vertical" lockup at the bottom.
 */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onImageReady: () => void
) {
  const vertical = getVertical(s.vertical);
  const keyColor = vertical.color;

  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // white card base (matches the 3D card's rounded corners)
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, TEX_W, TEX_H, CARD_RADIUS);
  ctx.fill();

  // ---- Orange top panel with the Ragga pattern ----
  ctx.save();
  roundedTopRect(ctx, 0, 0, TEX_W, PANEL_H, CARD_RADIUS);
  ctx.clip();
  const pat = loadImage("/badge/pattern-mkt.png", onImageReady);
  if (pat && pat.complete && pat.naturalWidth) {
    const sc = Math.max(TEX_W / pat.naturalWidth, PANEL_H / pat.naturalHeight);
    const dw = pat.naturalWidth * sc;
    const dh = pat.naturalHeight * sc;
    ctx.drawImage(pat, (TEX_W - dw) / 2, (PANEL_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = keyColor;
    ctx.fillRect(0, 0, TEX_W, PANEL_H);
  }
  ctx.fillStyle = hexToRgba(keyColor, 0.82);
  ctx.fillRect(0, 0, TEX_W, PANEL_H);
  ctx.restore();

  // ---- Photo circle (fixed) — zoom + pan inside ----
  const R = 163;
  const pcx = 384;
  const pcy = 343;
  ctx.save();
  ctx.beginPath();
  ctx.arc(pcx, pcy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#d6d8db";
  ctx.fillRect(pcx - R, pcy - R, R * 2, R * 2);
  if (s.photo.src) {
    const img = loadImage(s.photo.src, onImageReady);
    if (img && img.complete && img.naturalWidth) {
      const base = R * 2;
      const ir = img.naturalWidth / img.naturalHeight;
      let dw = base;
      let dh = base;
      if (ir > 1) dw = base * ir;
      else dh = base / ir;
      dw *= s.photo.scale;
      dh *= s.photo.scale;
      ctx.drawImage(
        img,
        pcx - dw / 2 + s.photo.posX,
        pcy - dh / 2 + s.photo.posY,
        dw,
        dh
      );
    } else {
      placeholderPhoto(ctx, pcx, pcy, R);
    }
  } else {
    placeholderPhoto(ctx, pcx, pcy, R);
  }
  ctx.restore();

  // ---- Name + role (Dotties Vanilla) ----
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";

  let nameSize = 57;
  ctx.font = `800 ${nameSize}px "Dotties Vanilla", system-ui, sans-serif`;
  while (ctx.measureText(s.fullName).width > TEX_W - 130 && nameSize > 22) {
    nameSize -= 2;
    ctx.font = `800 ${nameSize}px "Dotties Vanilla", system-ui, sans-serif`;
  }
  ctx.fillText(s.fullName, 384, 595);

  ctx.font = `400 43px "Dotties Vanilla", system-ui, sans-serif`;
  ctx.fillText(s.role, 384, 668);

  // ---- Bottom: official horizontal brand logo for the vertical ----
  drawLockup(ctx, vertical.key, onImageReady);

  // ---- Sauce stains (painted on top of everything) ----
  for (const st of s.stains) drawStain(ctx, st);
}

function drawLockup(
  ctx: CanvasRenderingContext2D,
  verticalKey: string,
  onReady: () => void
) {
  const logo = loadImage(`/badge/logos/${verticalKey}.svg`, onReady);
  if (!logo || !logo.complete || !logo.naturalWidth) return;
  const maxW = 580;
  const maxH = 78;
  const sc = Math.min(maxW / logo.naturalWidth, maxH / logo.naturalHeight);
  const w = logo.naturalWidth * sc;
  const h = logo.naturalHeight * sc;
  ctx.drawImage(logo, 384 - w / 2, 935 - h / 2, w, h);
}

function placeholderPhoto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.fillStyle = "#d6d8db";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.82, r * 0.6, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawStain(
  ctx: CanvasRenderingContext2D,
  st: { x: number; y: number; r: number; color: string; seed: number }
) {
  let n = st.seed;
  const rnd = () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };

  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.fillStyle = st.color;

  ctx.globalAlpha = 0.92;
  const pts = 11;
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const rr = st.r * (0.7 + rnd() * 0.55);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  const drops = 4 + Math.floor(rnd() * 5);
  for (let i = 0; i < drops; i++) {
    const a = rnd() * Math.PI * 2;
    const dist = st.r * (1.0 + rnd() * 1.3);
    const dr = st.r * (0.08 + rnd() * 0.22);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-st.r * 0.25, -st.r * 0.25, st.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
