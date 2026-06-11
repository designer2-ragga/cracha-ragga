import type { BadgeState } from "@/store/useBadgeStore";
import { getVertical } from "@/lib/verticals";

export const TEX_W = 768;
export const TEX_H = 1080;

const PANEL_H = 768; // orange top panel is a 768×768 square (Figma)
const PANEL_RADIUS = 50; // rounded top corners of the orange panel
const BORDER_BOTTOM = 883; // the thin orange frame extends to here
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
  onImageReady: () => void,
  opts: { bleed?: boolean } = {}
) {
  const vertical = getVertical(s.vertical);
  const keyColor = vertical.color;
  // bleed = square corners for print export; otherwise rounded to match card
  const radius = opts.bleed ? 0 : CARD_RADIUS;

  ctx.clearRect(0, 0, TEX_W, TEX_H);

  // white card base
  ctx.fillStyle = "#ffffff";
  if (radius > 0) {
    roundRect(ctx, 0, 0, TEX_W, TEX_H, radius);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, TEX_W, TEX_H);
  }

  // ---- Orange top panel (768×768 square) with the Ragga pattern ----
  const panelRadius = opts.bleed ? 0 : PANEL_RADIUS;
  ctx.save();
  if (panelRadius > 0) roundedTopRect(ctx, 0, 0, TEX_W, PANEL_H, panelRadius);
  else ctx.rect(0, 0, TEX_W, PANEL_H);
  ctx.clip();
  const pat = loadImage(`/badge/patterns/${vertical.key}.svg`, onImageReady);
  if (pat && pat.complete && pat.naturalWidth) {
    const sc = Math.max(TEX_W / pat.naturalWidth, PANEL_H / pat.naturalHeight);
    const dw = pat.naturalWidth * sc;
    const dh = pat.naturalHeight * sc;
    ctx.drawImage(pat, (TEX_W - dw) / 2, (PANEL_H - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = keyColor;
    ctx.fillRect(0, 0, TEX_W, PANEL_H);
  }
  // key-color layer at 85% over the dark-mode pattern
  ctx.fillStyle = hexToRgba(keyColor, 0.85);
  ctx.fillRect(0, 0, TEX_W, PANEL_H);
  ctx.restore();

  // ---- Thin key-color frame around the upper card ----
  ctx.strokeStyle = keyColor;
  ctx.lineWidth = 4;
  roundRect(ctx, 2, 2, TEX_W - 4, BORDER_BOTTOM - 4, panelRadius || PANEL_RADIUS);
  ctx.stroke();

  // ---- Photo circle, centered in the orange square — zoom + pan inside ----
  const R = 216;
  const pcx = 384;
  const pcy = 384;
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

  // ---- Name (white, italic) over the orange square ----
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  let nameSize = 57;
  const nameFont = (px: number) =>
    `italic 500 ${px}px "Dotties Vanilla", system-ui, sans-serif`;
  ctx.font = nameFont(nameSize);
  while (ctx.measureText(s.fullName).width > TEX_W - 130 && nameSize > 22) {
    nameSize -= 2;
    ctx.font = nameFont(nameSize);
  }
  ctx.fillText(s.fullName, 384, 675);

  // ---- Role (key-color) in the white strip ----
  ctx.fillStyle = keyColor;
  ctx.font = `500 43px "Dotties Vanilla", system-ui, sans-serif`;
  ctx.fillText(s.role, 384, 805);

  // ---- Bottom: official horizontal brand logo for the vertical ----
  drawLockup(ctx, vertical.key, onImageReady);

  // ---- Sauce stains (painted on top of everything) ----
  if (s.stainAlpha > 0.001)
    for (const st of s.stains) drawStain(ctx, st, s.stainAlpha);
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
  ctx.drawImage(logo, 384 - w / 2, 978 - h / 2, w, h);
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
  st: { x: number; y: number; r: number; color: string; seed: number },
  alpha = 1
) {
  let n = st.seed;
  const rnd = () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };

  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.fillStyle = st.color;

  ctx.globalAlpha = 0.92 * alpha;
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
    ctx.globalAlpha = 0.85 * alpha;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * dist, Math.sin(a) * dist, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.25 * alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-st.r * 0.25, -st.r * 0.25, st.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
