const WORLD_CUP_MATCHES_URL = "https://api.football-data.org/v4/competitions/WC/matches";

const UPCOMING_STATUSES = new Set(["SCHEDULED", "TIMED"]);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PREDICTION_WINDOW_DAYS = 2;

export interface Team {
  id: number;
  name: string;
}

export interface FullTimeScore {
  home: number | null;
  away: number | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: Team;
  awayTeam: Team;
  fullTimeScore: FullTimeScore;
}

export interface SelectMatchesOptions {
  now?: Date;
  maxDaysAhead?: number;
}

export async function fetchWorldCupMatches(apiKey: string): Promise<Match[]> {
  const response = await fetch(WORLD_CUP_MATCHES_URL, {
    headers: { "X-Auth-Token": apiKey },
  });
  if (!response.ok) {
    throw new Error(`football-data.org a répondu ${response.status} : ${await response.text()}`);
  }
  const payload: unknown = await response.json();
  return parseMatches(payload);
}

/**
 * Sélectionne les matchs à prédire : uniquement le prochain match à venir de
 * chaque équipe, dans une fenêtre de [maxDaysAhead] jours avant le coup d'envoi.
 */
export function selectMatchesToPredict(matches: Match[], options: SelectMatchesOptions = {}): Match[] {
  const now = options.now ?? new Date();
  const maxDaysAhead = options.maxDaysAhead ?? PREDICTION_WINDOW_DAYS;
  const upcoming = getUpcomingMatches(matches).filter((match) =>
    isWithinPredictionWindow(match, now, maxDaysAhead),
  );
  return selectMatchesFromPool(upcoming);
}

/** Prochains matchs à prédire par équipe (sans filtre de fenêtre). */
export function getCurrentWaveMatches(matches: Match[]): Match[] {
  return selectMatchesFromPool(getUpcomingMatches(matches));
}

/**
 * Prochaine vague de matchs à prédire une fois le premier match à venir de
 * chaque équipe joué (même algorithme, mais en excluant ces premiers matchs).
 */
export function getNextMatchesAfterCurrentWave(matches: Match[]): Match[] {
  const upcoming = getUpcomingMatches(matches);
  const firstMatchIds = new Set(getFirstUpcomingMatchPerTeam(upcoming).values().map((match) => match.id));
  const afterFirstWave = upcoming.filter((match) => !firstMatchIds.has(match.id));
  return selectMatchesFromPool(afterFirstWave);
}

/** Date à partir de laquelle un match entre dans la fenêtre de prédiction. */
export function getPredictionWindowOpensAt(match: Match, maxDaysAhead = PREDICTION_WINDOW_DAYS): Date {
  const kickoff = new Date(match.utcDate);
  return new Date(kickoff.getTime() - maxDaysAhead * MS_PER_DAY);
}

export function isWithinPredictionWindow(
  match: Match,
  now: Date,
  maxDaysAhead = PREDICTION_WINDOW_DAYS,
): boolean {
  const kickoff = new Date(match.utcDate);
  const msUntilKickoff = kickoff.getTime() - now.getTime();
  return msUntilKickoff >= 0 && msUntilKickoff <= maxDaysAhead * MS_PER_DAY;
}

/** Matchs terminés d'une équipe dans cette édition, par date croissante. */
export function getPlayedMatches(matches: Match[], teamId: number): Match[] {
  return matches
    .filter(
      (match) =>
        match.status === "FINISHED" && (match.homeTeam.id === teamId || match.awayTeam.id === teamId),
    )
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}

export function getUpcomingMatches(matches: Match[]): Match[] {
  return matches
    .filter((match) => UPCOMING_STATUSES.has(match.status))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}

function getFirstUpcomingMatchPerTeam(upcoming: Match[]): Map<number, Match> {
  const first = new Map<number, Match>();
  for (const match of upcoming) {
    if (!first.has(match.homeTeam.id)) {
      first.set(match.homeTeam.id, match);
    }
    if (!first.has(match.awayTeam.id)) {
      first.set(match.awayTeam.id, match);
    }
  }
  return first;
}

/**
 * Parcourt les matchs par date croissante et retient un match seulement si
 * aucune de ses deux équipes n'a déjà un match retenu.
 */
function selectMatchesFromPool(upcoming: Match[]): Match[] {
  const teamsWithSelectedMatch = new Set<number>();
  const selected: Match[] = [];
  for (const match of upcoming) {
    if (teamsWithSelectedMatch.has(match.homeTeam.id) || teamsWithSelectedMatch.has(match.awayTeam.id)) {
      continue;
    }
    teamsWithSelectedMatch.add(match.homeTeam.id);
    teamsWithSelectedMatch.add(match.awayTeam.id);
    selected.push(match);
  }
  return selected;
}

function parseMatches(payload: unknown): Match[] {
  if (!isRecord(payload) || !Array.isArray(payload.matches)) {
    throw new Error("Réponse inattendue de football-data.org : champ `matches` manquant");
  }
  const matches: Match[] = [];
  for (const raw of payload.matches) {
    const match = parseMatch(raw);
    if (match !== null) {
      matches.push(match);
    }
  }
  return matches;
}

/**
 * Retourne null pour les matchs dont les équipes ne sont pas encore connues
 * (phases à élimination directe pas encore déterminées).
 */
function parseMatch(raw: unknown): Match | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, utcDate, status, stage, group, homeTeam, awayTeam, score } = raw;
  if (
    typeof id !== "number" ||
    typeof utcDate !== "string" ||
    typeof status !== "string" ||
    typeof stage !== "string"
  ) {
    return null;
  }
  const home = parseTeam(homeTeam);
  const away = parseTeam(awayTeam);
  if (home === null || away === null) {
    return null;
  }
  return {
    id,
    utcDate,
    status,
    stage,
    group: typeof group === "string" ? group : null,
    homeTeam: home,
    awayTeam: away,
    fullTimeScore: parseFullTimeScore(score),
  };
}

function parseTeam(raw: unknown): Team | null {
  if (!isRecord(raw)) {
    return null;
  }
  const { id, name } = raw;
  if (typeof id !== "number" || typeof name !== "string") {
    return null;
  }
  return { id, name };
}

function parseFullTimeScore(raw: unknown): FullTimeScore {
  if (isRecord(raw) && isRecord(raw.fullTime)) {
    const { home, away } = raw.fullTime;
    return {
      home: typeof home === "number" ? home : null,
      away: typeof away === "number" ? away : null,
    };
  }
  return { home: null, away: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
