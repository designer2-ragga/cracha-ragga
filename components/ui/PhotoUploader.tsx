"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.5" r="3.6" fill="currentColor" />
      <path
        d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"
        fill="currentColor"
      />
    </svg>
  );
}

const btn =
  "flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)] active:scale-[0.96]";

export default function PhotoUploader({
  src,
  onChange,
}: {
  src: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const readFile = useCallback(
    (file?: File) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  // ---- camera ----
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  const closeCam = useCallback(() => {
    stopCam();
    setCamOpen(false);
    setCamError(null);
  }, [stopCam]);
  const openCam = useCallback(async () => {
    setCamError(null);
    setCamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCamError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, []);
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      c.width,
      c.height
    );
    onChange(c.toDataURL("image/jpeg", 0.92));
    closeCam();
  }, [onChange, closeCam]);
  useEffect(() => stopCam, [stopCam]);

  return (
    <div className="flex flex-col items-center gap-3.5">
      {/* avatar / dropzone */}
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
          readFile(e.dataTransfer.files?.[0]);
        }}
        className={`relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[var(--panel-2)] transition active:scale-[0.97] ${
          over
            ? "ring-2 ring-[var(--accent)]"
            : "ring-1 ring-inset ring-white/10"
        }`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="foto" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[var(--muted)]">
            <PersonIcon />
          </span>
        )}
      </div>

      {/* actions */}
      <div className="grid w-full grid-cols-2 gap-2">
        <button onClick={() => inputRef.current?.click()} className={btn}>
          <UploadIcon /> Enviar
        </button>
        <button onClick={openCam} className={btn}>
          <CameraIcon /> Câmera
        </button>
      </div>
      {src && (
        <button
          onClick={() => onChange(null)}
          className="text-xs text-[var(--muted)] transition-colors hover:text-red-400"
        >
          Remover foto
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => readFile(e.target.files?.[0])}
      />

      {/* camera modal */}
      {camOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[360px] max-w-[90vw] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
              Tirar foto
            </h3>
            {camError ? (
              <p className="py-8 text-center text-xs text-red-400">{camError}</p>
            ) : (
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black ring-1 ring-inset ring-white/10">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={closeCam} className={`flex-1 ${btn}`}>
                Cancelar
              </button>
              {!camError && (
                <button
                  onClick={capture}
                  className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-[0.96]"
                >
                  Capturar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
