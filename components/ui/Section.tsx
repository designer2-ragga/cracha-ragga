"use client";

import { useState, type ReactNode } from "react";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-[var(--muted)] transition-[transform,color] duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:text-[var(--text)]"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        willChange: "transform",
      }}
    >
      <path
        d="M6 9.5 12 15.5 18 9.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Section({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-200 ease-out hover:bg-white/[0.025]"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[var(--text)]">
          {icon && <span className="text-base opacity-80">{icon}</span>}
          {title}
        </span>
        <Chevron open={open} />
      </button>

      {/* height animates via grid-rows 0fr↔1fr; content fades + lifts subtly */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className="flex flex-col gap-4 px-5 pb-5 pt-1 transition-[opacity,transform] duration-200 ease-out"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(-4px)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
