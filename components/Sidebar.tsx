"use client";

import { useBadgeStore } from "@/store/useBadgeStore";
import { VERTICALS } from "@/lib/verticals";
import Section from "./ui/Section";
import { TextField, Slider, Row } from "./ui/Field";
import ImageDrop from "./ui/ImageDrop";
import CameraCapture from "./ui/CameraCapture";

export default function Sidebar() {
  const s = useBadgeStore();

  return (
    <aside className="z-20 flex h-screen w-[340px] flex-shrink-0 flex-col border-l border-[var(--border)] bg-[var(--panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-[0.25em] text-[var(--text)]">
            Personalizar
          </h1>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Configure seu crachá
          </p>
        </div>
        <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
          Ragga
        </span>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto">
        {/* Vertical selector — dropdown only */}
        <Section title="Vertical Ragga" defaultOpen>
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
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                ⌄
              </span>
            </div>
          </label>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            A cor do crachá, do cordão e o logo seguem a vertical escolhida.
          </p>
        </Section>

        {/* Basic information */}
        <Section title="Informações Básicas" defaultOpen>
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
        </Section>

        {/* Person photo */}
        <Section title="Foto da Pessoa" defaultOpen>
          <div className="flex items-start justify-between gap-3">
            <ImageDrop
              src={s.photo.src}
              circular
              onChange={(src) => s.setPhoto({ src })}
            />
            <CameraCapture onCapture={(src) => s.setPhoto({ src })} />
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            O recorte circular é fixo — use o zoom e a posição para enquadrar a
            foto dentro dele.
          </p>
          <Slider
            label="Zoom"
            value={s.photo.scale}
            min={1}
            max={4}
            step={0.02}
            onChange={(v) => s.setPhoto({ scale: v })}
          />
          <Row>
            <Slider
              label="Posição X"
              value={s.photo.posX}
              min={-200}
              max={200}
              onChange={(v) => s.setPhoto({ posX: v })}
            />
            <Slider
              label="Posição Y"
              value={s.photo.posY}
              min={-200}
              max={200}
              onChange={(v) => s.setPhoto({ posY: v })}
            />
          </Row>
        </Section>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3 text-center text-[10px] text-[var(--muted)]">
        Crachá Ragga · React Three Fiber + Rapier
      </div>
    </aside>
  );
}
