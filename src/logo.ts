export const LOGO_LINES = [
  "         __________  ____  __________  ___    __    __",
  "        / ____/ __ \\/ __ \\/_  __/ __ )/   |  / /   / /",
  "       / /_  / / / / / / / / / / __  / /| | / /   / /",
  "     / __/ / /_/ / /_/ / / / / /_/ / ___ |/ /___/ /___",
  "    /_/    \\____/\\____/ /_/ /_____/_/  |_/_____/_____/",
  "   ________  _____    __  _______  ___   _______   ________",
  "  / ____/ / / /   |  /  |/  / __ \\/   | / ____/ | / / ____/",
  "  / /   / /_/ / /| | / /|_/ / /_/ / /| |/ / __/  |/ / __/",
  " / /___/ __  / ___ |/ /  / / ____/ ___ / /_/ / /|  / /___",
  " \\____/_/ /_/_/  |_/_/  /_/_/   /_/  |_\\____/_/ |_/_____/",
] as const;

/** Dégradé "champagne" (or pâle pétillant → ambre chaud), une couleur par ligne. */
export const LOGO_COLORS = [
  "#FFF6D5",
  "#FFEEAE",
  "#FFE684",
  "#FFDD5C",
  "#FCCF3C",
  "#F7C948",
  "#F0B429",
  "#E5A615",
  "#DB9B0C",
  "#D08A07",
] as const;

export const TAGLINE = "🥂  Prédictions de scores · Coupe du Monde 2026  ⚽";

/** Version texte brut (README, sorties non colorées). */
export const LOGO = [...LOGO_LINES, "", TAGLINE].join("\n");
