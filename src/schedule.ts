import {
  getCurrentWaveMatches,
  getNextMatchesAfterCurrentWave,
  getPredictionWindowOpensAt,
  getUpcomingMatches,
  isWithinPredictionWindow,
  PREDICTION_WINDOW_DAYS,
  type Match,
} from "./fixtures";
import { formatDate, matchLabel } from "./format";

export const NEXT_WAVE_DISPLAY_LIMIT = 5;

export type BlockKind = "ready" | "already_predicted" | "outside_window" | "waiting_first_matches";

export interface MatchQueueEntry {
  match: Match;
  wave: "current" | "next";
  kind: BlockKind;
  detail: string;
  availableAt: Date | null;
}

export interface NextPredictionSchedule {
  currentWave: Date | null;
  nextWave: Date | null;
  earliest: Date | null;
  hasReadyNow: boolean;
}

export function buildMatchQueue(
  matches: Match[],
  now: Date,
  hasPrediction: (match: Match) => boolean,
): MatchQueueEntry[] {
  const current = getCurrentWaveMatches(matches).map((match) =>
    describeCurrentWaveMatch(match, now, hasPrediction),
  );
  const next = getNextMatchesAfterCurrentWave(matches).map((match) =>
    describeNextWaveMatch(match, matches, now, hasPrediction),
  );
  return [...current, ...next];
}

export function getNextPredictionSchedule(
  queue: MatchQueueEntry[],
  now: Date,
): NextPredictionSchedule {
  const readyNow = queue.some((entry) => entry.kind === "ready");
  const currentWave = nextDateForWave(queue, "current", now);
  const nextWave = nextDateForWave(queue, "next", now);
  const futureDates = [currentWave, nextWave].filter((date): date is Date => date !== null);
  const earliest = readyNow ? null : futureDates.length > 0 ? minDate(futureDates) : null;

  return { currentWave, nextWave, earliest, hasReadyNow: readyNow };
}

function describeCurrentWaveMatch(
  match: Match,
  now: Date,
  hasPrediction: (match: Match) => boolean,
): MatchQueueEntry {
  if (hasPrediction(match)) {
    return {
      match,
      wave: "current",
      kind: "already_predicted",
      detail: "Prédiction déjà générée",
      availableAt: null,
    };
  }
  if (!isWithinPredictionWindow(match, now)) {
    const opensAt = getPredictionWindowOpensAt(match);
    return {
      match,
      wave: "current",
      kind: "outside_window",
      detail: `Hors fenêtre (${PREDICTION_WINDOW_DAYS} jours) — disponible dès le ${formatDate(opensAt)}`,
      availableAt: opensAt,
    };
  }
  return {
    match,
    wave: "current",
    kind: "ready",
    detail: "Prête à prédire",
    availableAt: now,
  };
}

function describeNextWaveMatch(
  match: Match,
  allMatches: Match[],
  now: Date,
  hasPrediction: (match: Match) => boolean,
): MatchQueueEntry {
  if (hasPrediction(match)) {
    return {
      match,
      wave: "next",
      kind: "already_predicted",
      detail: "Prédiction déjà générée",
      availableAt: null,
    };
  }

  const blocking = getUnfinishedFirstMatches(match, allMatches);
  const windowOpens = getPredictionWindowOpensAt(match);
  const availableAt = computeAvailableAt(windowOpens, blocking);

  if (blocking.length > 0) {
    const labels = blocking.map((blocked) => matchLabel(blocked)).join(", ");
    return {
      match,
      wave: "next",
      kind: "waiting_first_matches",
      detail: `En attente du premier match : ${labels}`,
      availableAt,
    };
  }

  if (!isWithinPredictionWindow(match, now)) {
    return {
      match,
      wave: "next",
      kind: "outside_window",
      detail: `Hors fenêtre (${PREDICTION_WINDOW_DAYS} jours) — disponible dès le ${formatDate(windowOpens)}`,
      availableAt: windowOpens,
    };
  }

  return {
    match,
    wave: "next",
    kind: "ready",
    detail: "Prête à prédire",
    availableAt: now,
  };
}

function getUnfinishedFirstMatches(match: Match, allMatches: Match[]): Match[] {
  const upcoming = getUpcomingMatches(allMatches);
  const matchById = new Map(allMatches.map((entry) => [entry.id, entry]));
  const blocking: Match[] = [];

  for (const teamId of [match.homeTeam.id, match.awayTeam.id]) {
    const first = upcoming.find(
      (candidate: Match) => candidate.homeTeam.id === teamId || candidate.awayTeam.id === teamId,
    );
    if (first === undefined || first.id === match.id) {
      continue;
    }
    const status = matchById.get(first.id)?.status;
    if (status !== "FINISHED") {
      blocking.push(first);
    }
  }

  return uniqueById(blocking);
}

function computeAvailableAt(windowOpens: Date, blocking: Match[]): Date {
  const timestamps = [windowOpens.getTime(), ...blocking.map((match) => new Date(match.utcDate).getTime())];
  return new Date(Math.max(...timestamps));
}

function nextDateForWave(queue: MatchQueueEntry[], wave: "current" | "next", now: Date): Date | null {
  const entries = queue.filter((entry) => entry.wave === wave);
  if (entries.some((entry) => entry.kind === "ready")) {
    return null;
  }

  const dates = entries
    .filter((entry) => entry.kind !== "already_predicted" && entry.availableAt !== null)
    .map((entry) => entry.availableAt!)
    .filter((date) => date.getTime() > now.getTime());

  return dates.length > 0 ? minDate(dates) : null;
}

function minDate(dates: Date[]): Date {
  return new Date(Math.min(...dates.map((date) => date.getTime())));
}

function uniqueById(matches: Match[]): Match[] {
  const seen = new Set<number>();
  const unique: Match[] = [];
  for (const match of matches) {
    if (seen.has(match.id)) {
      continue;
    }
    seen.add(match.id);
    unique.push(match);
  }
  return unique;
}
