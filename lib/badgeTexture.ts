import type { BadgeState } from "@/store/useBadgeStore";
import { getVertical } from "@/lib/verticals";

export const TEX_W = 768;
export const TEX_H = 1080;

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

function drawPattern(ctx: CanvasRenderingContext2D, s: BadgeState) {
  if (s.bgPattern === "none") return;
  ctx.save();
  ctx.globalAlpha = s.patternOpacity;
  ctx.strokeStyle = s.textColor;
  ctx.fillStyle = s.textColor;
  const gap = Math.max(8, 90 - s.patternDensity * 2);

  switch (s.bgPattern) {
    case "lines":
      ctx.lineWidth = 1.2;
      for (let y = 0; y < TEX_H; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TEX_W, y);
        ctx.stroke();
      }
      break;
    case "diagonal":
      ctx.lineWidth = 1.2;
      for (let x = -TEX_H; x < TEX_W; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + TEX_H, TEX_H);
        ctx.stroke();
      }
      break;
    case "dots":
      for (let y = gap; y < TEX_H; y += gap) {
        for (let x = gap; x < TEX_W; x += gap) {
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case "grid":
      ctx.lineWidth = 1;
      for (let x = 0; x < TEX_W; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TEX_H);
        ctx.stroke();
      }
      for (let y = 0; y < TEX_H; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(TEX_W, y);
        ctx.stroke();
      }
      break;
    case "noise": {
      const n = s.patternDensity * 120;
      for (let i = 0; i < n; i++) {
        // deterministic-ish scatter
        const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const y = (Math.sin(i * 78.233) * 12543.123) % 1;
        ctx.fillRect(Math.abs(x) * TEX_W, Math.abs(y) * TEX_H, 1.6, 1.6);
      }
      break;
    }
  }
  ctx.restore();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  baseSize: number,
  weight = "700"
): number {
  let size = baseSize;
  do {
    ctx.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > 12);
  return size;
}

/**
 * Renders the full badge face onto the provided 2D context.
 * `onImageReady` is called when a deferred image finishes loading so the
 * caller can re-render.
 */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onImageReady: () => void
) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);

  const pad = 40;

  // Card body
  ctx.fillStyle = s.badgeColor;
  roundRect(ctx, 0, 0, TEX_W, TEX_H, 48);
  ctx.fill();

  // background pattern
  drawPattern(ctx, s);

  // Inner border
  ctx.strokeStyle = s.borderColor;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  roundRect(ctx, pad * 0.55, pad * 0.55, TEX_W - pad * 1.1, TEX_H - pad * 1.1, 34);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Lanyard slot
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  roundRect(ctx, TEX_W / 2 - 90, 34, 180, 26, 13);
  ctx.fill();

  const vertical = getVertical(s.vertical);
  const keyColor = vertical.color;

  // ---- Vertical logo (above the photo) ----
  {
    const sym = vertical.sym;
    const targetW = 170;
    const scale = targetW / sym.w;
    const cx = TEX_W / 2;
    const cy = 150;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-sym.w / 2, -sym.h / 2);
    ctx.fillStyle = s.textColor;
    ctx.globalAlpha = 0.95;
    ctx.fill(new Path2D(sym.d));
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---- Photo: FIXED circle, image is zoomed (scale) + panned (posX/posY) ----
  const R = 150; // fixed radius — the circle never changes
  const pcx = TEX_W / 2;
  const pcy = 430;

  ctx.save();
  // key-color border ring (themed by the selected vertical)
  ctx.beginPath();
  ctx.arc(pcx, pcy, R + 12, 0, Math.PI * 2);
  ctx.fillStyle = keyColor;
  ctx.fill();
  // thin light separator so the ring reads on a same-color card
  ctx.beginPath();
  ctx.arc(pcx, pcy, R + 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();

  // clip to the fixed circle
  ctx.beginPath();
  ctx.arc(pcx, pcy, R, 0, Math.PI * 2);
  ctx.clip();
  // white backing
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(pcx - R, pcy - R, R * 2, R * 2);

  if (s.photo.src) {
    const img = loadImage(s.photo.src, onImageReady);
    if (img && img.complete && img.naturalWidth) {
      // cover-fit the circle, then apply zoom (scale) and pan (posX/posY)
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

  // ---- Text block ----
  ctx.textAlign = "center";
  ctx.fillStyle = s.textColor;

  let ty = pcy + R + 100;

  const nameSize = fitText(ctx, s.fullName, TEX_W - 120, 64, "800");
  ctx.font = `800 ${nameSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(s.fullName, TEX_W / 2, ty);
  ty += 58;

  if (s.role) {
    ctx.globalAlpha = 0.95;
    const rs = fitText(ctx, s.role, TEX_W - 140, 36, "600");
    ctx.font = `600 ${rs}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(s.role.toUpperCase(), TEX_W / 2, ty);
    ty += 50;
    ctx.globalAlpha = 1;
  }

  // department comes from the selected vertical
  ctx.globalAlpha = 0.75;
  const dep = vertical.label;
  const ds = fitText(ctx, dep, TEX_W - 160, 30, "600");
  ctx.font = `600 ${ds}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(dep, TEX_W / 2, ty);
  ctx.globalAlpha = 1;

  // ---- Sauce stains (painted on top of everything) ----
  for (const st of s.stains) drawStain(ctx, st);
}

function drawStain(
  ctx: CanvasRenderingContext2D,
  st: { x: number; y: number; r: number; color: string; seed: number }
) {
  // deterministic pseudo-random from seed
  let n = st.seed;
  const rnd = () => {
    n = (n * 9301 + 49297) % 233280;
    return n / 233280;
  };

  ctx.save();
  ctx.translate(st.x, st.y);
  ctx.fillStyle = st.color;

  // main organic blob
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

  // satellite droplets
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

  // glossy highlight
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-st.r * 0.25, -st.r * 0.25, st.r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function placeholderPhoto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // simple silhouette
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.85, r * 0.62, Math.PI, Math.PI * 2);
  ctx.fill();
}
