import type { BadgeState } from "@/store/useBadgeStore";
import {
  getVertical,
  FRASE_ENXUTA,
  FRASE_VERSO,
  inkFor,
  bandInkFor,
  alpha,
} from "@/lib/verticals";
import type { IconItem, VersionKey } from "@/lib/verticals";
import { iconDataUri } from "@/lib/badgeIcons";

// Cartão CR80 na vertical: 54 × 86 mm. A textura mantém essa proporção para
// que a prévia 3D e o PDF de impressão sejam exatamente a mesma arte.
export const TEX_W = 768;
export const TEX_H = 1223;

const CARD_RADIUS = 46;

/** Nada relevante acima disto — é onde a gráfica fura o oblongo. */
const SLOT_SAFE = 118;

/** Altura da tarja branca do rodapé. */
const BAND_H = 190;
const BAND_TOP = TEX_H - BAND_H;

const MARGIN = 62;

const SANS = '"Instrument Sans", system-ui, sans-serif';
const DISPLAY = '"Dotties Vanilla", "Instrument Sans", system-ui, sans-serif';

// ---------------------------------------------------------------- imagens

const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(
  src: string,
  onReady: () => void
): HTMLImageElement | null {
  if (imageCache.has(src)) {
    const img = imageCache.get(src)!;
    return img.complete && img.naturalWidth ? img : null;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => onReady();
  img.src = src;
  imageCache.set(src, img);
  return null;
}

/** Desenha uma imagem contida numa caixa, centralizada, sem distorcer. */
function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number
) {
  const iw = img instanceof HTMLCanvasElement ? img.width : img.naturalWidth;
  const ih = img instanceof HTMLCanvasElement ? img.height : img.naturalHeight;
  const s = Math.min(maxW / iw, maxH / ih);
  const w = iw * s;
  const h = ih * s;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  return h;
}

// ------------------------------------------------------------- primitivas

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

/** Ajusta o corpo até a linha caber na largura pedida. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  start: number,
  min: number,
  font: (px: number) => string
) {
  let px = start;
  ctx.font = font(px);
  while (ctx.measureText(text).width > maxW && px > min) {
    px -= 1;
    ctx.font = font(px);
  }
  return px;
}

/** Quebra o texto em linhas que cabem em maxW. O \n do texto é respeitado. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const next = line ? line + " " + word : word;
      if (line && ctx.measureText(next).width > maxW) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing existe no Chromium; onde não existir, o texto só sai sem
  // tracking — não quebra o desenho.
  (ctx as unknown as { letterSpacing: string }).letterSpacing = px + "px";
}


// Tinta da face em desenho. As duas faces sao desenhadas em chamadas
// sequenciais e cada uma fixa INK antes de qualquer traco.
let INK = "#ffffff";

/** Cache de imagens recoloridas na tinta da face. */
const tintCache = new Map<string, HTMLCanvasElement>();

/**
 * Supersampling do recolorido. Os lockups da marca trazem width/height
 * pequenos (ex.: 453x85), e rasterizar no tamanho nativo para depois ampliar
 * borra o nome da vertical. Como o `drawImage` de um SVG re-rasteriza o vetor
 * no tamanho de destino, pedir 3x já sai nítido.
 */
const TINT_SS = 3;

/** Recolore um SVG branco para a tinta atual, preservando o alfa. */
function tinted(img: HTMLImageElement, color: string) {
  const key = img.src + "|" + color;
  const hit = tintCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * TINT_SS));
  c.height = Math.max(1, Math.round(img.naturalHeight * TINT_SS));
  const cx = c.getContext("2d")!;
  cx.drawImage(img, 0, 0, c.width, c.height);
  cx.globalCompositeOperation = "source-in";
  cx.fillStyle = color;
  cx.fillRect(0, 0, c.width, c.height);
  tintCache.set(key, c);
  return c;
}

// ------------------------------------------------------------------ base

function cardBase(
  ctx: CanvasRenderingContext2D,
  color: string,
  bleed: boolean
) {
  const radius = bleed ? 0 : CARD_RADIUS;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  if (radius > 0) roundRect(ctx, 0, 0, TEX_W, TEX_H, radius);
  else ctx.rect(0, 0, TEX_W, TEX_H);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
}

/**
 * Marca de fundo: o símbolo da vertical em escala grande, sangrando pela
 * lateral do cartão — é assim que ele aparece na peça impressa e nos demais
 * materiais, não como um selo pequeno contido dentro da margem.
 */
function watermark(
  ctx: CanvasRenderingContext2D,
  verticalKey: string,
  onReady: () => void
) {
  const img = loadImage("/badge/icones/" + verticalKey + ".svg", onReady);
  if (!img) return;
  ctx.save();
  // o clip do cartão já corta o que passa da borda
  ctx.globalAlpha = INK === "#ffffff" ? 0.07 : 0.11;
  ctx.translate(TEX_W * 1.04, TEX_H * 0.46);
  ctx.rotate(0.14);
  drawContained(ctx, tinted(img, INK), 0, 0, 700, 860);
  ctx.restore();
}

/**
 * Oblongo do topo. É furo de gráfica, então só entra na prévia 3D — no PDF
 * (bleed) a área fica limpa para a facadora.
 */
function slot(ctx: CanvasRenderingContext2D) {
  const w = 196;
  const h = 34;
  const x = (TEX_W - w) / 2;
  const y = 58;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y + 1.5, w, h, h / 2);
  ctx.stroke();
  ctx.restore();
}

/** Tarja branca do rodapé com a frase, na cor da vertical. */
function footerBand(
  ctx: CanvasRenderingContext2D,
  text: string,
  keyColor: string
) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, BAND_TOP, TEX_W, BAND_H);

  ctx.fillStyle = bandInkFor(keyColor);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setTracking(ctx, 0.5);

  const maxW = TEX_W - MARGIN * 2;
  const font = (px: number) => "700 " + px + "px " + SANS;
  let size = 34;
  ctx.font = font(size);
  let lines = wrap(ctx, text, maxW);
  while (lines.length > 2 && size > 20) {
    size -= 2;
    ctx.font = font(size);
    lines = wrap(ctx, text, maxW);
  }
  for (const l of lines) {
    size = Math.min(size, fitFont(ctx, l, maxW, size, 18, font));
  }
  ctx.font = font(size);

  const lh = size * 1.22;
  const y0 = BAND_TOP + BAND_H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, y0 + i * lh));
  setTracking(ctx, 0);
}

/** Régua fina com a estrela ao centro. */
function starDivider(
  ctx: CanvasRenderingContext2D,
  y: number,
  onReady: () => void
) {
  const half = (TEX_W - MARGIN * 2) / 2;
  ctx.strokeStyle = alpha(INK, 0.42);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y);
  ctx.lineTo(MARGIN + half - 26, y);
  ctx.moveTo(TEX_W - MARGIN - half + 26, y);
  ctx.lineTo(TEX_W - MARGIN, y);
  ctx.stroke();

  const star = loadImage(iconDataUri("star", "#ffffff"), onReady);
  if (star) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    drawContained(ctx, tinted(star, INK), TEX_W / 2, y, 26, 26);
    ctx.restore();
  }
}

/** Altura do bloco de ícones: pictograma + respiro + até 3 linhas de rótulo. */
const ICON_BLOCK_H = 56 + 20 + 3 * 21;

/** Fileira de 4 pictogramas com rótulo, separados por filetes verticais. */
function iconRow(
  ctx: CanvasRenderingContext2D,
  items: IconItem[],
  top: number,
  onReady: () => void
) {
  const inner = TEX_W - MARGIN * 2;
  const colW = inner / items.length;
  const iconSize = 56;
  const iconCy = top + iconSize / 2;
  const labelTop = top + iconSize + 20;
  const labelFont = (px: number) => "600 " + px + "px " + SANS;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  let labelSize = 17;

  items.forEach((item, i) => {
    const cx = MARGIN + colW * i + colW / 2;

    const img = loadImage(iconDataUri(item.icon, "#ffffff"), onReady);
    if (img) drawContained(ctx, tinted(img, INK), cx, iconCy, iconSize, iconSize);

    ctx.fillStyle = alpha(INK, 0.94);
    setTracking(ctx, 0.6);
    const maxW = colW - 18;
    let size = 17;
    ctx.font = labelFont(size);
    let lines = wrap(ctx, item.label.toUpperCase(), maxW);
    while (lines.length > 3 && size > 12) {
      size -= 1;
      ctx.font = labelFont(size);
      lines = wrap(ctx, item.label.toUpperCase(), maxW);
    }
    ctx.font = labelFont(size);
    labelSize = Math.min(labelSize, size);
    lines.forEach((l, k) => ctx.fillText(l, cx, labelTop + k * (size * 1.24)));
    setTracking(ctx, 0);
  });

  const rowBottom = labelTop + 3 * (labelSize * 1.24);

  // filetes só depois de saber a altura real do bloco
  ctx.strokeStyle = alpha(INK, 0.34);
  ctx.lineWidth = 1.25;
  for (let i = 1; i < items.length; i++) {
    const x = MARGIN + colW * i;
    ctx.beginPath();
    ctx.moveTo(x, top - 4);
    ctx.lineTo(x, rowBottom - 8);
    ctx.stroke();
  }

  return rowBottom;
}

/** Foto circular com anel branco. */
function photo(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  cx: number,
  cy: number,
  r: number,
  onReady: () => void
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#d6d8db";
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  const img = s.photo.src ? loadImage(s.photo.src, onReady) : null;
  if (img) {
    const base = r * 2;
    const ir = img.naturalWidth / img.naturalHeight;
    let dw = base;
    let dh = base;
    if (ir > 1) dw = base * ir;
    else dh = base / ir;
    dw *= s.photo.scale;
    dh *= s.photo.scale;
    ctx.drawImage(
      img,
      cx - dw / 2 + s.photo.posX,
      cy - dh / 2 + s.photo.posY,
      dw,
      dh
    );
  } else {
    placeholder(ctx, cx, cy, r);
  }
  ctx.restore();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3.5, 0, Math.PI * 2);
  ctx.stroke();
}

function placeholder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.82, r * 0.6, Math.PI, Math.PI * 2);
  ctx.fill();
}

/** Nome + cargo, centralizados. Devolve o y do fim do bloco. */
function nameBlock(
  ctx: CanvasRenderingContext2D,
  fullName: string,
  role: string,
  top: number,
  maxBottom: number
) {
  const maxW = TEX_W - MARGIN * 2 - 10;
  const nameFont = (px: number) => "700 " + px + "px " + SANS;
  const roleFont = (px: number) => "500 " + px + "px " + SANS;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // ---- medir antes de desenhar ----
  setTracking(ctx, 0.5);
  const name = fullName.toUpperCase();

  // Nome longo quebra em duas linhas em vez de encolher até sumir: abaixo de
  // 40 px ele perderia a hierarquia sobre o cargo.
  let nameSize = fitFont(ctx, name, maxW, 56, 40, nameFont);
  let nameLines = [name];
  if (ctx.measureText(name).width > maxW) {
    nameLines = wrap(ctx, name, maxW);
    for (const l of nameLines) {
      nameSize = Math.min(
        nameSize,
        fitFont(ctx, l, maxW, nameSize, 30, nameFont)
      );
    }
    ctx.font = nameFont(nameSize);
  }
  const nameLh = nameSize * 1.1;

  setTracking(ctx, 1.6);
  // o cargo nunca compete com o nome
  let roleSize = Math.min(30, Math.round(nameSize * 0.62));
  ctx.font = roleFont(roleSize);
  let roleLines = wrap(ctx, role.toUpperCase(), maxW);
  while (roleLines.length > 2 && roleSize > 18) {
    roleSize -= 1;
    ctx.font = roleFont(roleSize);
    roleLines = wrap(ctx, role.toUpperCase(), maxW);
  }
  const roleLh = roleSize * 1.2;

  const blockH =
    (nameLines.length - 1) * nameLh +
    nameSize * 1.28 +
    roleLines.length * roleLh;

  // Nome de duas linhas não pode empurrar o cargo para cima da régua.
  const y0 = Math.min(top, maxBottom - blockH);

  // ---- desenhar ----
  setTracking(ctx, 0.5);
  ctx.font = nameFont(nameSize);
  ctx.fillStyle = INK;
  nameLines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, y0 + i * nameLh));

  const roleTop = y0 + (nameLines.length - 1) * nameLh + nameSize * 1.28;
  setTracking(ctx, 1.6);
  ctx.font = roleFont(roleSize);
  ctx.fillStyle = alpha(INK, 0.88);
  roleLines.forEach((l, i) => ctx.fillText(l, TEX_W / 2, roleTop + i * roleLh));
  setTracking(ctx, 0);

  return roleTop + roleLines.length * roleLh;
}

// ------------------------------------------------------------------ faces

export function drawFront(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onReady: () => void,
  opts: { bleed?: boolean } = {}
) {
  const v = getVertical(s.vertical);
  INK = inkFor(v.color);

  cardBase(ctx, v.color, !!opts.bleed);
  watermark(ctx, v.key, onReady);
  if (!opts.bleed) slot(ctx);

  // lockup vertical (ragga + nome da vertical), no topo
  const lock = loadImage("/badge/lockups/" + v.key + ".svg", onReady);
  // Todos os lockups saem com a MESMA altura (84), não com a mesma largura:
  // os aspectos vão de 5,1:1 (Grupo) a 8,3:1 (Restaurantes), e limitar pela
  // largura faria o wordmark de Restaurantes nascer menor que o dos outros.
  // A largura máxima só existe como trava de segurança.
  if (lock)
    drawContained(ctx, tinted(lock, INK), TEX_W / 2, SLOT_SAFE + 70, 690, 84);

  if (s.version === "enxuta") {
    photo(ctx, s, TEX_W / 2, 515, 172, onReady);
    const end = nameBlock(ctx, s.fullName, s.role, 742, BAND_TOP - 128);

    const grupo = loadImage("/badge/lockups/grupo-horizontal.svg", onReady);
    if (grupo) {
      drawContained(
        ctx,
        tinted(grupo, INK),
        TEX_W / 2,
        (end + BAND_TOP) / 2 + 2,
        290,
        58
      );
    }

    footerBand(ctx, FRASE_ENXUTA, v.color);
  } else {
    // O bloco de ícones é ancorado no rodapé, não no fim do nome: assim
    // todas as verticais alinham entre si mesmo com cargo de duas linhas.
    const iconTop = BAND_TOP - ICON_BLOCK_H - 39;
    const dividerY = iconTop - 34;

    photo(ctx, s, TEX_W / 2, 452, 152, onReady);
    nameBlock(ctx, s.fullName, s.role, 640, dividerY - 20);

    starDivider(ctx, dividerY, onReady);
    iconRow(ctx, v.iconesFrente, iconTop, onReady);

    footerBand(ctx, v.fraseFrente, v.color);
  }

  ctx.restore();
}

export function drawBack(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onReady: () => void,
  opts: { bleed?: boolean } = {}
) {
  const v = getVertical(s.vertical);
  INK = inkFor(v.color);

  cardBase(ctx, v.color, !!opts.bleed);
  watermark(ctx, v.key, onReady);
  if (!opts.bleed) slot(ctx);

  // A versão enxuta é só frente: o verso leva o lockup do grupo e nada mais,
  // para não virar um 4/0 branco sem acabamento.
  if (s.version === "enxuta") {
    const grupo = loadImage("/badge/lockups/grupo-horizontal.svg", onReady);
    if (grupo)
      drawContained(ctx, tinted(grupo, INK), TEX_W / 2, TEX_H / 2, 360, 80);
    ctx.restore();
    return;
  }

  const maxW = TEX_W - MARGIN * 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Ícones e lockup são ancorados no rodapé: o parágrafo muda de altura
  // entre as verticais e não pode empurrar o resto da face.
  const grupo = loadImage("/badge/lockups/grupo-horizontal.svg", onReady);
  const lockCy = BAND_TOP - 82;
  if (grupo) drawContained(ctx, tinted(grupo, INK), TEX_W / 2, lockCy, 350, 76);

  const iconTop = lockCy - 62 - ICON_BLOCK_H;
  const dividerY = iconTop - 38;

  // ---- bloco de texto do topo, medido antes de desenhar ----
  const titleSize = 52;
  const titleLh = titleSize * 1.14;
  const bodyLh = 41;

  ctx.font = "800 " + titleSize + "px " + DISPLAY;
  const titleLines = wrap(ctx, "PROPÓSITO QUE\nCONECTA.", maxW);
  const l2 = v.versoLinha2 ? wrap(ctx, v.versoLinha2, maxW) : [];

  ctx.font = "400 26px " + SANS;
  const body = wrap(ctx, v.versoTexto, maxW);

  const blockH =
    (titleLines.length + l2.length) * titleLh + 30 + body.length * bodyLh;

  // Sem a 2ª linha (Grupo e Restaurantes) o bloco fica curto; descer parte
  // da folga evita o buraco entre o parágrafo e a régua.
  const top = SLOT_SAFE + 22;
  const slack = Math.max(0, dividerY - 46 - top - blockH);
  let y = top + Math.min(slack * 0.45, 90);

  ctx.font = "800 " + titleSize + "px " + DISPLAY;
  ctx.fillStyle = INK;
  titleLines.forEach((l, i) => ctx.fillText(l, MARGIN, y + i * titleLh));
  y += titleLines.length * titleLh;

  if (l2.length) {
    ctx.fillStyle = alpha(INK, 0.5);
    l2.forEach((l, i) => ctx.fillText(l, MARGIN, y + i * titleLh));
    y += l2.length * titleLh;
  }

  y += 30;
  ctx.fillStyle = alpha(INK, 0.94);
  ctx.font = "400 26px " + SANS;
  body.forEach((l, i) => ctx.fillText(l, MARGIN, y + i * bodyLh));

  starDivider(ctx, dividerY, onReady);
  iconRow(ctx, v.iconesVerso, iconTop, onReady);

  footerBand(ctx, FRASE_VERSO, v.color);
  ctx.restore();
}

/** Compat: a face padrão do card é a frente. */
export function drawBadge(
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onReady: () => void,
  opts: { bleed?: boolean } = {}
) {
  drawFront(ctx, s, onReady, opts);
}

export type { VersionKey };
