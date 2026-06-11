"use client";

import { useCallback, useRef, useState } from "react";

export default function ImageDrop({
  src,
  onChange,
  circular = false,
}: {
  src: string | null;
  onChange: (dataUrl: string | null) => void;
  circular?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFile = useCallback(
    (file?: File) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden bg-[var(--panel-2)] transition active:scale-[0.97] ${
          circular ? "rounded-full" : "rounded-xl"
        } ${
          src
            ? "ring-1 ring-inset ring-white/10"
            : `border-2 border-dashed ${
                over ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="px-1 text-center text-[10px] leading-tight text-[var(--muted)]">
            Solte ou clique
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)] active:scale-[0.96]"
        >
          Enviar imagem
        </button>
        {src && (
          <button
            onClick={() => onChange(null)}
            className="text-left text-xs text-[var(--muted)] transition hover:text-red-400"
          >
            Remover
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
