"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function CameraCapture({
  onCapture,
}: {
  onCapture: (dataUrl: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const close = useCallback(() => {
    stop();
    setOpen(false);
    setError(null);
  }, [stop]);

  const start = useCallback(async () => {
    setError(null);
    setOpen(true);
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
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    // center-crop square + mirror (selfie)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height
    );
    onCapture(canvas.toDataURL("image/jpeg", 0.92));
    close();
  }, [onCapture, close]);

  useEffect(() => stop, [stop]);

  return (
    <>
      <button
        onClick={start}
        className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
      >
        Abrir câmera
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[360px] max-w-[90vw] rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text)]">
              Tirar foto
            </h3>
            {error ? (
              <p className="py-8 text-center text-xs text-red-400">{error}</p>
            ) : (
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="h-full w-full -scale-x-100 object-cover"
                />
                <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/30" />
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={close}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
              >
                Cancelar
              </button>
              {!error && (
                <button
                  onClick={capture}
                  className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                >
                  Capturar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
