import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Match } from "./fixtures";

const PREDICTIONS_DIR = resolve(import.meta.dirname, "..", "predictions");

export function predictionExists(match: Match): boolean {
  return existsSync(matchDir(match));
}

/** Écrit la prédiction dans predictions/<slug>/prediction.md et retourne le chemin du fichier. */
export function writePrediction(match: Match, markdown: string): string {
  const dir = matchDir(match);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "prediction.md");
  writeFileSync(file, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
  return file;
}

export function matchSlug(match: Match): string {
  return `${match.utcDate.slice(0, 10)}_${slugify(match.homeTeam.name)}-vs-${slugify(match.awayTeam.name)}`;
}

function matchDir(match: Match): string {
  return join(PREDICTIONS_DIR, matchSlug(match));
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
