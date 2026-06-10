import { jsPDF } from "jspdf";
import type { BadgeState } from "@/store/useBadgeStore";
import { drawBadge, TEX_W, TEX_H } from "./badgeTexture";

/**
 * Renders the badge ARTWORK (not the 3D scene) to a high-resolution canvas and
 * saves it as a print-ready PDF sized to the card's aspect ratio.
 */
export function downloadBadgePdf(state: BadgeState) {
  const scale = 3; // crisp, print-friendly
  const canvas = document.createElement("canvas");
  canvas.width = TEX_W * scale;
  canvas.height = TEX_H * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  // images are already cached from the live preview; no-op on (re)load
  drawBadge(ctx, state, () => {});

  const img = canvas.toDataURL("image/png");

  // Page sized to the card art aspect (no distortion). ~70mm wide card.
  const wmm = 70;
  const hmm = wmm * (TEX_H / TEX_W);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [wmm, hmm] });
  pdf.addImage(img, "PNG", 0, 0, wmm, hmm, undefined, "FAST");
  pdf.save("cracha-ragga.pdf");
}
