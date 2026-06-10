"use client";

import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";

// The 3D scene must only render on the client (WebGL + rapier WASM).
const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
      <div className="animate-pulse text-sm tracking-widest">
        CARREGANDO CENA 3D…
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="relative flex h-screen w-screen overflow-hidden bg-[var(--bg)]">
      <div className="relative flex-1">
        <Scene />
      </div>
      <Sidebar />
    </main>
  );
}
