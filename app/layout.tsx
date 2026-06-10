import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crachá Ragga — Lanyard Studio",
  description:
    "Gerador 3D de crachás com simulação física de cordão (lanyard) realista — Grupo Ragga.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
