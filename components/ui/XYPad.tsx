"use client";

import { useCallback, useRef, useState } from "react";

/**
 * A 2D position pad: a dotted grid with cardinal axes and a draggable handle.
 * Drag the dot into any quadrant to set X (horizontal) and Y (vertical).
 */
export default function XYPad({
  label,
  x,
  y,
  min,
  max,
  onChange,
}: {
  label: string;
  x: number;
  y: number;
  min: number;
  max: number;
  onChange: (x: number, y: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const norm = (v: number) => (v - min) / (max - min); // 0..1
  const hx = norm(x) * 100;
  const hy = norm(y) * 100;

  const apply = useCallback(
    (clientX: number, clientY: number) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      onChange(
        Math.round(min + px * (max - min)),
        Math.round(min + py * (max - min))
      );
    },
    [min, max, onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center justify-between text-xs font-medium text-[var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--text)]">
          {Math.round(x)}, {Math.round(y)}
        </span>
      </span>
      <div
        ref={ref}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          apply(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) apply(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(false);
        }}
        className="relative mx-auto aspect-square w-44 cursor-crosshair touch-none rounded-xl border border-[var(--border)] bg-[var(--panel-2)]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "center",
        }}
      >
        {/* cardinal axes */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/15" />
        <div className="pointer-events-none absolute bottom-0 top-0 left-1/2 w-px -translate-x-1/2 bg-white/15" />
        {/* handle */}
        <div
          className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-[#0a0a0a] bg-[var(--accent)] shadow"
          style={{
            left: `${hx}%`,
            top: `${hy}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
}
