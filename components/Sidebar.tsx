"use client";

import { useBadgeStore, type BgPattern } from "@/store/useBadgeStore";
import { VERTICALS } from "@/lib/verticals";
import Section from "./ui/Section";
import {
  TextField,
  Slider,
  ColorField,
  Segmented,
  Row,
} from "./ui/Field";
import ImageDrop from "./ui/ImageDrop";

const COLOR_PRESETS = [
  "#e85d2a",
  "#0a0a0a",
  "#1d4ed8",
  "#059669",
  "#7c3aed",
  "#db2777",
  "#d97706",
  "#0891b2",
  "#ffffff",
];

const PATTERNS: { value: BgPattern; label: string }[] = [
  { value: "none", label: "Nenhum" },
  { value: "lines", label: "Linhas" },
  { value: "dots", label: "Pontos" },
  { value: "grid", label: "Grade" },
  { value: "diagonal", label: "Diagonal" },
  { value: "noise", label: "Ruído" },
];

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
        {/* 0. Vertical selector */}
        <Section title="Vertical Ragga" icon="🌿" defaultOpen>
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
          <div className="flex flex-wrap gap-2 pt-1">
            {VERTICALS.map((v) => (
              <button
                key={v.key}
                onClick={() => s.setVertical(v.key)}
                title={v.label}
                className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
                  s.vertical === v.key
                    ? "border-white"
                    : "border-transparent opacity-70"
                }`}
                style={{ background: v.color }}
                aria-label={v.label}
              />
            ))}
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            A cor e o logo do cordão seguem a vertical escolhida.
          </p>
        </Section>

        {/* 1. Basic information */}
        <Section title="Informações Básicas" icon="📝">
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
          <TextField
            label="Departamento / Título"
            value={s.department}
            onChange={(v) => s.set("department", v)}
          />
          <TextField
            label="Subtítulo / Slogan"
            value={s.subtitle}
            onChange={(v) => s.set("subtitle", v)}
          />
          <Row>
            <TextField
              label="Rodapé (esquerda)"
              value={s.footerLeft}
              onChange={(v) => s.set("footerLeft", v)}
            />
            <TextField
              label="Rodapé (direita)"
              value={s.footerRight}
              onChange={(v) => s.set("footerRight", v)}
            />
          </Row>
        </Section>

        {/* 2. Person photo */}
        <Section title="Foto da Pessoa" icon="👤">
          <ImageDrop
            src={s.photo.src}
            circular
            onChange={(src) => s.setPhoto({ src })}
          />
          <Slider
            label="Escala"
            value={s.photo.scale}
            min={0.5}
            max={2}
            step={0.01}
            onChange={(v) => s.setPhoto({ scale: v })}
          />
          <Row>
            <Slider
              label="Posição X"
              value={s.photo.posX}
              min={-150}
              max={150}
              onChange={(v) => s.setPhoto({ posX: v })}
            />
            <Slider
              label="Posição Y"
              value={s.photo.posY}
              min={-150}
              max={150}
              onChange={(v) => s.setPhoto({ posY: v })}
            />
          </Row>
          <Slider
            label="Rotação"
            value={s.photo.rotation}
            min={-180}
            max={180}
            unit="°"
            onChange={(v) => s.setPhoto({ rotation: v })}
          />
          <Slider
            label="Arredondamento"
            value={s.photo.borderRadius}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => s.setPhoto({ borderRadius: v })}
          />
          <Slider
            label="Opacidade"
            value={s.photo.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => s.setPhoto({ opacity: v })}
          />
          <ColorField
            label="Cor da Borda"
            value={s.photo.borderColor}
            presets={COLOR_PRESETS}
            onChange={(v) => s.setPhoto({ borderColor: v })}
          />
        </Section>

        {/* 3. Company logo */}
        <Section title="Logo da Empresa" icon="🏷️">
          <ImageDrop src={s.logo.src} onChange={(src) => s.setLogo({ src })} />
          <Slider
            label="Escala"
            value={s.logo.scale}
            min={0.3}
            max={2.5}
            step={0.01}
            onChange={(v) => s.setLogo({ scale: v })}
          />
          <Row>
            <Slider
              label="Posição X"
              value={s.logo.posX}
              min={-200}
              max={200}
              onChange={(v) => s.setLogo({ posX: v })}
            />
            <Slider
              label="Posição Y"
              value={s.logo.posY}
              min={-100}
              max={200}
              onChange={(v) => s.setLogo({ posY: v })}
            />
          </Row>
          <Slider
            label="Rotação"
            value={s.logo.rotation}
            min={-180}
            max={180}
            unit="°"
            onChange={(v) => s.setLogo({ rotation: v })}
          />
          <Slider
            label="Opacidade"
            value={s.logo.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => s.setLogo({ opacity: v })}
          />
        </Section>

        {/* 4. Badge design */}
        <Section title="Design do Crachá" icon="🎨">
          <ColorField
            label="Cor Principal"
            value={s.badgeColor}
            presets={COLOR_PRESETS}
            onChange={(v) => s.set("badgeColor", v)}
          />
          <ColorField
            label="Cor do Texto"
            value={s.textColor}
            presets={COLOR_PRESETS}
            onChange={(v) => s.set("textColor", v)}
          />
          <ColorField
            label="Cor da Borda"
            value={s.borderColor}
            presets={COLOR_PRESETS}
            onChange={(v) => s.set("borderColor", v)}
          />
          <ColorField
            label="Cor do Cordão"
            value={s.lanyardColor}
            presets={COLOR_PRESETS}
            onChange={(v) => s.set("lanyardColor", v)}
          />
          <Segmented
            label="Padrão de Fundo"
            value={s.bgPattern}
            options={PATTERNS}
            onChange={(v) => s.set("bgPattern", v)}
          />
          <Slider
            label="Densidade do Padrão"
            value={s.patternDensity}
            min={4}
            max={40}
            onChange={(v) => s.set("patternDensity", v)}
          />
          <Slider
            label="Opacidade do Padrão"
            value={s.patternOpacity}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => s.set("patternOpacity", v)}
          />
        </Section>

        {/* 5. Physics */}
        <Section title="Física do Cordão" icon="🪢">
          <Slider
            label="Amortecimento (Damping)"
            value={s.physics.damping}
            min={0.2}
            max={6}
            step={0.1}
            onChange={(v) => s.setPhysics({ damping: v })}
          />
          <Slider
            label="Rigidez / Peso (Stiffness)"
            value={s.physics.stiffness}
            min={0.4}
            max={3}
            step={0.05}
            onChange={(v) => s.setPhysics({ stiffness: v })}
          />
          <Slider
            label="Comprimento do Cordão"
            value={s.physics.ropeLength}
            min={0.6}
            max={2}
            step={0.05}
            onChange={(v) => s.setPhysics({ ropeLength: v })}
          />
          <Slider
            label="Resposta ao Balanço"
            value={s.physics.responsiveness}
            min={0.3}
            max={2.5}
            step={0.05}
            onChange={(v) => s.setPhysics({ responsiveness: v })}
          />
          <button
            onClick={s.shuffle}
            className="mt-1 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            ⤬ Balanço Aleatório
          </button>
          <button
            onClick={s.reset}
            className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-4 py-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          >
            ↺ Restaurar Padrões
          </button>
        </Section>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3 text-center text-[10px] text-[var(--muted)]">
        Crachá Ragga · React Three Fiber + Rapier
      </div>
    </aside>
  );
}
