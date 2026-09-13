import { jsPDF } from "jspdf";
import type { BadgeState } from "@/store/useBadgeStore";
import { drawFront, drawBack, TEX_W, TEX_H } from "./badgeTexture";
import { getVertical } from "./verticals";

// Cartão CR80 na vertical + sangria. Premissa declarada no briefing até a
// gráfica confirmar: 54 × 86 mm de corte, 3 mm de sangria em volta.
const TRIM_W = 54;
const TRIM_H = 86;
const BLEED = 3;

const PAGE_W = TRIM_W + BLEED * 2;
const PAGE_H = TRIM_H + BLEED * 2;

/** Resolução do raster: ~4× a textura, acima de 1200 dpi no tamanho de corte. */
const SCALE = 4;

type Face = (
  ctx: CanvasRenderingContext2D,
  s: BadgeState,
  onReady: () => void,
  opts: { bleed?: boolean }
) => void;

/**
 * Rasteriza uma face em full-bleed. A arte é desenhada maior que o corte e
 * centralizada, para que a sangria seja extensão real do desenho e não uma
 * tarja chapada na borda.
 */
function renderFace(face: Face, state: BadgeState): string {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(TEX_W * SCALE * (PAGE_W / TRIM_W));
  canvas.height = Math.round(TEX_H * SCALE * (PAGE_H / TRIM_H));
  const ctx = canvas.getContext("2d")!;

  // escala de bleed: a arte cresce o suficiente para cobrir a sangria
  const over = Math.max(PAGE_W / TRIM_W, PAGE_H / TRIM_H);
  ctx.scale(SCALE * over, SCALE * over);
  ctx.translate(
    (canvas.width / (SCALE * over) - TEX_W) / 2,
    (canvas.height / (SCALE * over) - TEX_H) / 2
  );

  face(ctx, state, () => {}, { bleed: true });
  return canvas.toDataURL("image/png");
}

/** Marcas de corte nos quatro cantos, fora da área de sangria. */
function cropMarks(pdf: jsPDF) {
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.12);
  const len = 2.4;
  const L = BLEED;
  const R = BLEED + TRIM_W;
  const T = BLEED;
  const B = BLEED + TRIM_H;

  const corner = (x: number, y: number, sx: number, sy: number) => {
    pdf.line(x + sx * BLEED, y, x + sx * (BLEED - len), y);
    pdf.line(x, y + sy * BLEED, x, y + sy * (BLEED - len));
  };
  corner(L, T, -1, -1);
  corner(R, T, 1, -1);
  corner(L, B, -1, 1);
  corner(R, B, 1, 1);
}

/**
 * PDF pronto para a gráfica. A versão institucional sai com duas páginas
 * (frente e verso); a enxuta também sai com duas, porque o cartão é impresso
 * dos dois lados — o verso dela é só o lockup do grupo.
 */
export function buildBadgePdf(state: BadgeState): jsPDF {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_W, PAGE_H],
    compress: true,
  });

  const pages: Array<[string, Face]> = [
    ["frente", drawFront],
    ["verso", drawBack],
  ];

  pages.forEach(([, face], i) => {
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
    const img = renderFace(face, state);
    pdf.addImage(img, "PNG", 0, 0, PAGE_W, PAGE_H, undefined, "FAST");
    cropMarks(pdf);
  });

  return pdf;
}

/** Nome do arquivo: vertical + versao + pessoa. */
export function badgeFileName(state: BadgeState): string {
  const v = getVertical(state.vertical);
  // NFD separa o acento do glifo; o filtro abaixo descarta tudo que não for
  // [a-z0-9], acentos combinantes inclusive — não precisa de faixa unicode.
  const slug = (state.fullName || "cracha")
    .normalize("NFD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `cracha-${v.key}-${state.version}-${slug}.pdf`;
}

export function downloadBadgePdf(state: BadgeState) {
  buildBadgePdf(state).save(badgeFileName(state));
}
