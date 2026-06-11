"use client";

import { useBadgeStore } from "@/store/useBadgeStore";
import { VERTICALS } from "@/lib/verticals";
import { TextField, Slider } from "./ui/Field";
import PhotoUploader from "./ui/PhotoUploader";
import XYPad from "./ui/XYPad";

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5">
      {children}
    </div>
  );
}

export default function Sidebar() {
  const s = useBadgeStore();

  return (
    <aside className="z-20 flex h-screen w-[340px] flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--panel)]">
      {/* header — Grupo Ragga horizontal logo */}
      <div className="flex items-center border-b border-[var(--border)] px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badge/grupo-horizontal.svg"
          alt="Grupo Ragga"
          className="h-7 w-auto"
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {/* vertical */}
        <Block>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--muted)]">
              Selecione sua vertical
            </span>
            <div className="relative">
              <select
                value={s.vertical}
                onChange={(e) => s.setVertical(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 pr-9 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
              >
                {VERTICALS.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.label}
                  </option>
                ))}
              </select>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              >
                <path
                  d="M6 9.5 12 15.5 18 9.5"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </label>
        </Block>

        {/* basic info */}
        <Block>
          <TextField
            label="Nome Completo"
            value={s.fullName}
            onChange={(v) => s.set("fullName", v)}
          />
          <TextField
            label="Cargo / Função"
            value={s.role}
            onChange={(v) => s.set("role", v)}
          />
        </Block>

        {/* photo */}
        <Block>
          <PhotoUploader src={s.photo.src} onChange={(src) => s.setPhoto({ src })} />
          <Slider
            label="Zoom"
            value={s.photo.scale}
            min={1}
            max={4}
            step={0.02}
            onChange={(v) => s.setPhoto({ scale: v })}
          />
          <XYPad
            label="Posição"
            x={s.photo.posX}
            y={s.photo.posY}
            min={-200}
            max={200}
            onChange={(px, py) => s.setPhoto({ posX: px, posY: py })}
          />
        </Block>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3 text-center text-[10px] text-[var(--muted)]">
        Crachá Ragga · React Three Fiber + Rapier
      </div>
    </aside>
  );
}
