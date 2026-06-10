"use client";

import { useState, type ReactNode } from "react";

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
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-[var(--text)]">
          {icon && <span className="text-base opacity-80">{icon}</span>}
          {title}
        </span>
        <span
          className={`text-[var(--muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ⌄
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 px-5 pb-5 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
