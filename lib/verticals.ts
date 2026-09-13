// Verticais do Grupo Ragga — cores, lockups oficiais e o conteúdo
// institucional que cada crachá carrega.
//
// As cores vêm dos SVGs oficiais em
// 000_DESIGN/GRUPO RAGGA/Assets-Manual/SVG, não de aproximações: o gerador
// anterior usava azul #1E40AF (Tailwind) no lugar do #2B4899 da marca.

export type VersionKey = "institucional" | "enxuta";

export interface IconItem {
  /** chave em lib/badgeIcons.ts */
  icon: string;
  label: string;
}

export interface Vertical {
  key: string;
  /** rótulo do seletor */
  label: string;
  /** tempero da vertical, quando definido nos áudios do Rapha */
  tempero: string | null;
  color: string;
  /** 2ª linha do verso, na cor rebaixada ("GESTÃO QUE TRANSFORMA.") */
  versoLinha2: string | null;
  /** parágrafo do verso */
  versoTexto: string;
  /** frase da tarja branca da frente (v1) */
  fraseFrente: string;
  iconesFrente: IconItem[];
  iconesVerso: IconItem[];
  /** true = a 2ª linha do verso é redação nossa, ainda a validar */
  redacaoProposta?: boolean;
}

/** Frase única da versão enxuta — slogan da camiseta. */
export const FRASE_ENXUTA = "OS TEMPEROS QUE FALTAVAM";

/** Tarja branca do verso, igual em todas as verticais. */
export const FRASE_VERSO = "SOMOS UM TIME.\nSOMOS RAGGA.";

const FRASE_PADRAO = "GENTE QUE ALIMENTA SONHOS\nE TRANSFORMA RESULTADOS";

const TEXTO_PADRAO =
  "Aqui, cada pessoa faz parte de algo maior. Juntos, servimos mais do " +
  "que refeições: entregamos experiências e geramos impacto dentro e " +
  "fora de campo.";

const ICONES_FRENTE_PADRAO: IconItem[] = [
  { icon: "rocket", label: "Dominância" },
  { icon: "megaphone", label: "Influência" },
  { icon: "messages-square", label: "Presença e Escuta" },
  { icon: "handshake", label: "Apoio e Colaboração" },
];

const ICONES_VERSO_PADRAO: IconItem[] = [
  { icon: "shield-check", label: "Jogamos Juntos" },
  { icon: "star", label: "Assumimos o Resultado" },
  { icon: "trending-up", label: "Evoluímos Sempre" },
  { icon: "heart", label: "Impactamos Vidas" },
];

function padrao(
  key: string,
  label: string,
  color: string,
  tempero: string | null,
  versoLinha2: string | null,
  redacaoProposta = false
): Vertical {
  return {
    key,
    label,
    tempero,
    color,
    versoLinha2,
    versoTexto: TEXTO_PADRAO,
    fraseFrente: FRASE_PADRAO,
    iconesFrente: ICONES_FRENTE_PADRAO,
    iconesVerso: ICONES_VERSO_PADRAO,
    redacaoProposta,
  };
}

export const VERTICALS: Vertical[] = [
  // Roxo master do Grupo — a regra do Rapha: quem atende o grupo inteiro
  // não recebe cor de vertical.
  padrao("grupo", "Grupo Ragga", "#2D1B4E", null, null),
  padrao("gestao", "Gestão", "#2B4899", "Louro", "GESTÃO QUE TRANSFORMA."),
  padrao(
    "educacao",
    "Educação & Treinamento",
    "#35632A",
    null,
    "EDUCAÇÃO QUE FORMA.",
    true
  ),
  padrao(
    "mkt-vendas",
    "MKT & Vendas",
    "#E96821",
    "Pimenta",
    "MKT & VENDAS QUE MOVIMENTA."
  ),
  {
    key: "restaurantes",
    label: "Restaurantes",
    tempero: "Sal",
    color: "#B81D22",
    versoLinha2: null,
    versoTexto:
      "Servir com excelência experiências que alimentam pessoas e " +
      "constroem memórias todos os dias.",
    fraseFrente: "SERVIR COM EXCELÊNCIA.\nFAZER ACONTECER.",
    iconesFrente: [
      { icon: "target", label: "Foco no Resultado" },
      { icon: "users", label: "Liderança" },
      { icon: "trending-up", label: "Excelência Operacional" },
      { icon: "shield", label: "Padrão e Disciplina" },
    ],
    iconesVerso: [
      { icon: "heart", label: "Gente em Primeiro Lugar" },
      { icon: "flame", label: "Paixão pelo que Fazemos" },
      { icon: "award", label: "Excelência sem Atalhos" },
      { icon: "handshake", label: "Juntos Somos Mais Fortes" },
    ],
  },
  padrao("insumos", "Insumos", "#D4A011", null, "INSUMOS QUE ABASTECEM.", true),
  padrao(
    "franquia",
    "Franquia",
    "#93B628",
    null,
    "FRANQUIA QUE MULTIPLICA.",
    true
  ),
  padrao("social", "Social", "#8A2241", null, "SOCIAL QUE DEVOLVE.", true),
];

export function getVertical(key: string): Vertical {
  return VERTICALS.find((v) => v.key === key) ?? VERTICALS[0];
}

/** Roxo do cordão padrão — o único cordão da versão institucional. */
export const CORDAO_PADRAO = "#2D1B4E";

/**
 * Cor do cordão. A v1 mantém o cordão roxo único, como o Rapha pediu nos
 * áudios ("a fita, toda, sempre a roxa"); a v2 é a nossa proposta, com o
 * cordão acompanhando a cor da vertical.
 */
export function corDoCordao(version: VersionKey, verticalKey: string): string {
  return version === "enxuta" ? getVertical(verticalKey).color : CORDAO_PADRAO;
}

// -------------------------------------------------------------------- cor
//
// Franquia (#93B628) e Insumos (#D4A011) sao claras demais para texto branco:
// dao ~2,4:1 de contraste, reprovado em qualquer tamanho. Nessas duas a tinta
// vira uma versao escurecida da propria cor da vertical, que mantem a
// harmonia sem perder legibilidade impressa.

function srgbToLinear(c: number) {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbOf(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
}

/** Luminancia relativa (WCAG). */
export function luminance(hex: string) {
  const [r, g, b] = rgbOf(hex);
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

export function darken(hex: string, f: number) {
  const [r, g, b] = rgbOf(hex);
  const to = (c: number) =>
    Math.round(c * (1 - f))
      .toString(16)
      .padStart(2, "0");
  return "#" + to(r) + to(g) + to(b);
}

export function alpha(hex: string, a: number) {
  const [r, g, b] = rgbOf(hex);
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

const CLARO = 0.34;

/** Tinta do conteudo sobre a cor da vertical. */
export function inkFor(color: string) {
  return luminance(color) > CLARO ? darken(color, 0.72) : "#ffffff";
}

/** Cor do texto da tarja branca do rodape. */
export function bandInkFor(color: string) {
  return luminance(color) > CLARO ? darken(color, 0.45) : color;
}

