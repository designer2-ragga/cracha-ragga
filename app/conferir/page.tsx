"use client";

// Conferência da arte: frente e verso achatados, sem o 3D no caminho. É a
// única forma de ver o verso antes de baixar o PDF.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { drawFront, drawBack, TEX_W, TEX_H } from "@/lib/badgeTexture";
import { useBadgeStore } from "@/store/useBadgeStore";
import { VERTICALS, getVertical } from "@/lib/verticals";

function Face({
  draw,
  label,
  nonce,
}: {
  draw: typeof drawFront;
  label: string;
  nonce: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const render = () => draw(ctx, useBadgeStore.getState(), render, {});
    render();
  }, [draw, nonce]);

  return (
    <figure className="m-0 flex flex-col items-center gap-2.5">
      <canvas
        ref={ref}
        width={TEX_W}
        height={TEX_H}
        className="block rounded-[22px] outline outline-1 -outline-offset-1 outline-white/10"
        style={{ width: TEX_W / 2.4, height: TEX_H / 2.4 }}
      />
      <figcaption className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </figcaption>
    </figure>
  );
}

export default function Conferir() {
  const [ready, setReady] = useState(false);
  const s = useBadgeStore();
  const v = getVertical(s.vertical);

  useEffect(() => {
    const list = [
      new FontFace("Instrument Sans", "url(/fonts/InstrumentSans-latin.woff2)", {
        weight: "400 700",
      }),
      new FontFace(
        "Instrument Sans",
        "url(/fonts/InstrumentSans-latin-ext.woff2)",
        { weight: "400 700" }
      ),
      new FontFace(
        "Dotties Vanilla",
        "url(/fonts/DottiesVanilla-ExtraBold.woff2)",
        { weight: "800" }
      ),
    ];
    Promise.all(list.map((f) => f.load()))
      .then((loaded) => {
        loaded.forEach((f) => document.fonts.add(f));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  return (
    <main className="min-h-screen bg-[var(--bg)] px-8 py-8 text-[var(--text)]">
      <header className="mb-7 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="m-0 text-lg font-semibold tracking-tight [text-wrap:balance]">
            Conferir arte
          </h1>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {v.label} · versão {s.version} · CR80 54 × 86 mm
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Voltar ao gerador
        </Link>
      </header>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        {VERTICALS.map((vert) => {
          const on = vert.key === s.vertical;
          return (
            <button
              key={vert.key}
              onClick={() => s.setVertical(vert.key)}
              className={
                "rounded-lg border px-3 py-2 text-xs font-medium transition-colors active:scale-[0.96] " +
                (on
                  ? "border-transparent text-white"
                  : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]")
              }
              style={on ? { background: vert.color } : undefined}
            >
              {vert.label}
            </button>
          );
        })}
      </div>

      {ready ? (
        <div className="flex flex-wrap gap-8">
          <Face draw={drawFront} label="Frente" nonce={s.rev} />
          <Face draw={drawBack} label="Verso" nonce={s.rev} />
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Carregando fontes…</p>
      )}
    </main>
  );
}
