# Crachá Ragga 🪢

Gerador 3D de crachás com simulação física **realista de cordão (lanyard)** — feito para o **Grupo Ragga**.

Construído com **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **React Three Fiber** e **@react-three/rapier**.

## ✨ Recursos

- **Física realista do cordão** — corrente de `RigidBody`s ligados por `useRopeJoint` + `useSphericalJoint`, com gravidade, inércia, amortecimento e balanço natural.
- **Arraste com mouse e toque** — segure e arraste o crachá; ao soltar, ele continua balançando com movimento suave. Leve rotação 3D durante o arraste.
- **Parâmetros ajustáveis** — amortecimento, rigidez/peso, comprimento do cordão e resposta ao balanço, além de botão de balanço aleatório.
- **Painel "Personalizar"** com seções recolhíveis:
  1. Informações básicas (nome, cargo, departamento, subtítulo, rodapés)
  2. Foto da pessoa (upload drag & drop, escala, posição, rotação, arredondamento, borda, opacidade)
  3. Logo da empresa (upload, escala, posição, rotação, opacidade)
  4. Design do crachá (cores principal/texto/borda/cordão, padrão de fundo com densidade e opacidade)
  5. Física do cordão
- **Iluminação dramática + environment map** para reflexos realistas no plástico e brilho metálico no clipe.
- **Download PNG** em alta resolução da cena 3D atual.
- **Responsivo** — otimizado para desktop, funcional em tablet.

## 🚀 Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## 🏗️ Build

```bash
npm run build
npm start
```

## 🧱 Estrutura

```
app/                 App Router (layout, página, estilos globais)
components/          Scene (Canvas+luz), Lanyard (física), Badge (visual), Sidebar
components/ui/       Section recolhível, campos de formulário, upload de imagem
lib/badgeTexture.ts  Renderização da face do crachá em canvas → CanvasTexture
store/               Estado global (zustand)
```

---

Grupo Ragga · 2026
