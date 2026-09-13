"use client";

import Link from "next/link";
import { useBadgeStore } from "@/store/useBadgeStore";
import { VERTICALS, getVertical, corDoCordao } from "@/lib/verticals";
import type { VersionKey } from "@/lib/verticals";
import { TextField, Slider } from "./ui/Field";
import PhotoUploader from "./ui/PhotoUploader";
import XYPad from "./ui/XYPad";

function Block({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5">
      {title ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </span>
      ) : null}
      {children}
    </div>
  );
}

const VERSOES: { key: VersionKey; label: string; hint: string }[] = [
  {
    key: "institucional",
    label: "Institucional",
    hint: "Frente e verso, como o crachá atual. Cordão roxo padrão, único.",
  },
  {
    key: "enxuta",
    label: "Enxuta",
    hint: "Só frente: foto, nome, cargo, vertical e a frase. Cordão na cor da vertical.",
  },
];

function VersionSwitch() {
  const version = useBadgeStore((s) => s.version);
  const setVersion = useBadgeStore((s) => s.setVersion);
  const hint = VERSOES.find((v) => v.key === version)?.hint;

  return (
    <div className="flex flex-col gap-2.5">
      {/* outer 12px + 4px padding => inner 8px, raios concêntricos */}
      <div
        role="radiogroup"
        aria-label="Versão do crachá"
        className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-1"
      >
        {VERSOES.map((v) => {
          const on = v.key === version;
          return (
            <button
              key={v.key}
              role="radio"
              aria-checked={on}
              onClick={() => setVersion(v.key)}
              className={
                "rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-[background-color,color,scale] duration-150 active:scale-[0.96] " +
                (on
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--text)]")
              }
            >
              {v.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-snug text-[var(--muted)] [text-wrap:pretty]">
        {hint}
      </p>
    </div>
  );
}

/** Amostra da cor do cordão que sai nessa combinação. */
function CordaoHint() {
  const version = useBadgeStore((s) => s.version);
  const vertical = useBadgeStore((s) => s.vertical);
  const cor = corDoCordao(version, vertical);

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="h-4 w-4 flex-shrink-0 rounded-full outline outline-1 -outline-offset-1 outline-white/10"
        style={{ background: cor }}
      />
      <span className="text-[11px] text-[var(--muted)]">
        Cordão {cor.toUpperCase()}
        {version === "institucional" ? " · roxo padrão" : " · cor da vertical"}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const s = useBadgeStore();
  const v = getVertical(s.vertical);

  return (
    <aside className="z-20 flex h-screen w-[340px] flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center border-b border-[var(--border)] px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badge/lockups/grupo-horizontal.svg"
          alt="Grupo Ragga"
          className="h-7 w-auto"
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <Block title="Versão">
          <VersionSwitch />
        </Block>

        <Block title="Vertical">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--muted)]">
              Empresa em que a pessoa está
            </span>
            <div className="relative">
              <select
                value={s.vertical}
                onChange={(e) => s.setVertical(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 pr-9 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
              >
                {VERTICALS.map((vert) => (
                  <option key={vert.key} value={vert.key}>
                    {vert.label}
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

          <CordaoHint />

          {s.version === "institucional" && v.redacaoProposta ? (
            <p className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-[11px] leading-snug text-[var(--muted)] [text-wrap:pretty]">
              A frase “{v.versoLinha2}” do verso é redação nossa — o Rapha
              definiu só Gestão e MKT &amp; Vendas. Falta validar.
            </p>
          ) : null}
        </Block>

        <Block title="Identificação">
          <TextField
            label="Nome completo"
            value={s.fullName}
            onChange={(val) => s.set("fullName", val)}
          />
          <TextField
            label="Cargo"
            value={s.role}
            onChange={(val) => s.set("role", val)}
          />
        </Block>

        <Block title="Foto">
          <PhotoUploader
            src={s.photo.src}
            onChange={(src) => s.setPhoto({ src })}
          />
          <Slider
            label="Zoom"
            value={s.photo.scale}
            min={1}
            max={4}
            step={0.02}
            onChange={(val) => s.setPhoto({ scale: val })}
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

      <div className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-3.5">
        <Link
          href="/conferir"
          className="rounded-lg border border-[var(--border)] py-2.5 text-center text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Conferir frente e verso
        </Link>
        <span className="text-center text-[10px] leading-relaxed text-[var(--muted)] tabular-nums">
          CR80 54 × 86 mm · sangria 3 mm
        </span>
      </div>
    </aside>
  );
}
