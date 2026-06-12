import type { Match } from "./fixtures";

export function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function matchLabel(match: Match): string {
  return `${match.homeTeam.name} vs ${match.awayTeam.name} (${match.utcDate.slice(0, 10)})`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}
