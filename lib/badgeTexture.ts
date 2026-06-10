import type { BadgeState } from "@/store/useBadgeStore";

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

  // ---- Logo (top) ----
  const logoY = 110;
  if (s.logo.src) {
    const img = loadImage(s.logo.src, onImageReady);
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = s.logo.opacity;
      const baseW = 220 * s.logo.scale;
      const ratio = img.naturalHeight / img.naturalWidth;
      const w = baseW;
      const h = baseW * ratio;
      const cx = TEX_W / 2 + s.logo.posX;
      const cy = logoY + h / 2 + s.logo.posY;
      ctx.translate(cx, cy);
      ctx.rotate((s.logo.rotation * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  // ---- Photo (circular) ----
  const photoCY = 430;
  const baseR = 150;
  const r = baseR * s.photo.scale;
  const pcx = TEX_W / 2 + s.photo.posX;
  const pcy = photoCY + s.photo.posY;
  const corner = (r * s.photo.borderRadius) / 100; // 100 => full circle

  ctx.save();
  // border ring
  ctx.beginPath();
  roundedSquarePath(ctx, pcx, pcy, r + 9, corner + 9);
  ctx.fillStyle = s.photo.borderColor;
  ctx.fill();

  // clip region for the photo
  ctx.beginPath();
  roundedSquarePath(ctx, pcx, pcy, r, corner);
  ctx.clip();

  if (s.photo.src) {
    const img = loadImage(s.photo.src, onImageReady);
    if (img && img.complete && img.naturalWidth) {
      ctx.globalAlpha = s.photo.opacity;
      ctx.translate(pcx, pcy);
      ctx.rotate((s.photo.rotation * Math.PI) / 180);
      // cover fit
      const size = r * 2;
      const ir = img.naturalWidth / img.naturalHeight;
      let dw = size,
        dh = size;
      if (ir > 1) dw = size * ir;
      else dh = size / ir;
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    } else {
      placeholderPhoto(ctx, pcx, pcy, r, s);
    }
  } else {
    placeholderPhoto(ctx, pcx, pcy, r, s);
  }
  ctx.restore();

  // ---- Text block ----
  ctx.textAlign = "center";
  ctx.fillStyle = s.textColor;

  let ty = pcy + r + 90;

  const nameSize = fitText(ctx, s.fullName, TEX_W - 120, 64, "800");
  ctx.font = `800 ${nameSize}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(s.fullName, TEX_W / 2, ty);
  ty += 56;

  if (s.role) {
    ctx.globalAlpha = 0.95;
    const rs = fitText(ctx, s.role, TEX_W - 140, 36, "600");
    ctx.font = `600 ${rs}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(s.role.toUpperCase(), TEX_W / 2, ty);
    ty += 44;
    ctx.globalAlpha = 1;
  }

  if (s.department) {
    ctx.globalAlpha = 0.7;
    const ds = fitText(ctx, s.department, TEX_W - 160, 28, "500");
    ctx.font = `500 ${ds}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(s.department, TEX_W / 2, ty);
    ty += 40;
    ctx.globalAlpha = 1;
  }

  // divider
  ctx.strokeStyle = s.textColor;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(TEX_W / 2 - 80, ty);
  ctx.lineTo(TEX_W / 2 + 80, ty);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ty += 44;

  if (s.subtitle) {
    ctx.globalAlpha = 0.85;
    const ss = fitText(ctx, s.subtitle, TEX_W - 160, 26, "500");
    ctx.font = `italic 500 ${ss}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(s.subtitle, TEX_W / 2, ty);
    ctx.globalAlpha = 1;
  }

  // ---- Footer ----
  ctx.globalAlpha = 0.8;
  ctx.font = `600 24px ui-monospace, monospace`;
  ctx.textAlign = "left";
  ctx.fillText(s.footerLeft, pad + 8, TEX_H - 52);
  ctx.textAlign = "right";
  ctx.fillText(s.footerRight, TEX_W - pad - 8, TEX_H - 52);
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

function roundedSquarePath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  corner: number
) {
  const x = cx - r;
  const y = cy - r;
  const size = r * 2;
  const rr = Math.min(corner, r);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + size, y, x + size, y + size, rr);
  ctx.arcTo(x + size, y + size, x, y + size, rr);
  ctx.arcTo(x, y + size, x, y, rr);
  ctx.arcTo(x, y, x + size, y, rr);
  ctx.closePath();
}

function placeholderPhoto(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  s: BadgeState
) {
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // simple silhouette
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.85, r * 0.62, Math.PI, Math.PI * 2);
  ctx.fill();
}
