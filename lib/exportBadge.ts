import { jsPDF } from "jspdf";
import type { BadgeState } from "@/store/useBadgeStore";
import { drawBadge, TEX_W, TEX_H } from "./badgeTexture";

/**
 * Renders the badge ARTWORK to a high-resolution, full-bleed (square corners)
 * canvas and saves it as a print-ready PDF with corner crop marks.
 */
export function downloadBadgePdf(state: BadgeState) {
  const scale = 4; // ~1100+ DPI at the trim size below
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W * scale;
  canvas.height = TEX_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  // bleed: no rounded corners, full rectangle for print
  drawBadge(ctx, { ...state, stainAlpha: 1 }, () => {}, { bleed: true });

  const img = canvas.toDataURL("image/png");

  // Trim size (the card) + a margin that holds the crop marks.
  const trimW = 70;
  const trimH = trimW * (TEX_H / TEX_W);
  const margin = 6;
  const pageW = trimW + margin * 2;
  const pageH = trimH + margin * 2;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageW, pageH],
  });
  pdf.addImage(img, "PNG", margin, margin, trimW, trimH, undefined, "FAST");

  // ---- crop marks (4 corners, outside the trim) ----
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.12);
  const len = 4; // mark length (mm)
  const gap = 1.2; // gap from trim edge (mm)
  const L = margin; // left trim x
  const R = margin + trimW; // right trim x
  const T = margin; // top trim y
  const B = margin + trimH; // bottom trim y

  const corner = (x: number, y: number, sx: number, sy: number) => {
    // horizontal arm
    pdf.line(x + sx * gap, y, x + sx * (gap + len), y);
    // vertical arm
    pdf.line(x, y + sy * gap, x, y + sy * (gap + len));
  };
  corner(L, T, -1, -1); // top-left
  corner(R, T, 1, -1); // top-right
  corner(L, B, -1, 1); // bottom-left
  corner(R, B, 1, 1); // bottom-right

  pdf.save("cracha-ragga.pdf");
}
