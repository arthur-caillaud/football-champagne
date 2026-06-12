import { describe, expect, it } from "vitest";
import {
  getNextMatchesAfterCurrentWave,
  getPlayedMatches,
  isWithinPredictionWindow,
  selectMatchesToPredict,
  type Match,
} from "./fixtures";

const now = new Date("2026-06-12T12:00:00Z");

describe("selectMatchesToPredict", () => {
  it("retient au plus un match (le prochain) par équipe", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal }),
      makeMatch({ id: 2, utcDate: "2026-06-18T18:00:00Z", home: france, away: norway }),
      makeMatch({ id: 3, utcDate: "2026-06-18T21:00:00Z", home: senegal, away: norway }),
    ];

    const selected = selectMatchesToPredict(matches, { now, maxDaysAhead: 7 });

    expect(selected.map((m) => m.id)).toEqual([1]);
  });

  it("retient le match d'équipes dont le précédent match a déjà été joué", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal, status: "FINISHED" }),
      makeMatch({ id: 2, utcDate: "2026-06-18T18:00:00Z", home: france, away: norway }),
      makeMatch({ id: 3, utcDate: "2026-06-18T21:00:00Z", home: senegal, away: brazil }),
    ];

    const selected = selectMatchesToPredict(matches, { now, maxDaysAhead: 7 });

    expect(selected.map((m) => m.id)).toEqual([2, 3]);
  });

  it("exclut les matchs terminés ou en cours", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal, status: "FINISHED" }),
      makeMatch({ id: 2, utcDate: "2026-06-13T21:00:00Z", home: norway, away: brazil, status: "IN_PLAY" }),
    ];

    expect(selectMatchesToPredict(matches, { now })).toEqual([]);
  });

  it("retourne les matchs triés par date croissante", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-18T18:00:00Z", home: norway, away: brazil }),
      makeMatch({ id: 2, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal }),
    ];

    const selected = selectMatchesToPredict(matches, { now, maxDaysAhead: 7 });

    expect(selected.map((m) => m.id)).toEqual([2, 1]);
  });

  it("exclut les matchs à plus de 2 jours", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal }),
      makeMatch({ id: 2, utcDate: "2026-06-16T18:00:00Z", home: norway, away: brazil }),
    ];

    const selected = selectMatchesToPredict(matches, { now, maxDaysAhead: 2 });

    expect(selected.map((m) => m.id)).toEqual([1]);
  });

  it("inclut un match exactement à 2 jours", () => {
    const matches = [makeMatch({ id: 1, utcDate: "2026-06-14T12:00:00Z", home: france, away: senegal })];

    expect(isWithinPredictionWindow(matches[0]!, now, 2)).toBe(true);
    expect(selectMatchesToPredict(matches, { now, maxDaysAhead: 2 }).map((m) => m.id)).toEqual([1]);
  });
});

describe("getNextMatchesAfterCurrentWave", () => {
  it("retourne la vague suivante une fois les premiers matchs joués", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal }),
      makeMatch({ id: 2, utcDate: "2026-06-14T18:00:00Z", home: norway, away: brazil }),
      makeMatch({ id: 3, utcDate: "2026-06-18T18:00:00Z", home: france, away: norway }),
      makeMatch({ id: 4, utcDate: "2026-06-18T21:00:00Z", home: senegal, away: brazil }),
    ];

    const nextWave = getNextMatchesAfterCurrentWave(matches);

    expect(nextWave.map((m) => m.id)).toEqual([3, 4]);
  });
});

describe("getPlayedMatches", () => {
  it("retourne uniquement les matchs terminés de l'équipe, par date croissante", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-18T18:00:00Z", home: senegal, away: france, status: "FINISHED" }),
      makeMatch({ id: 2, utcDate: "2026-06-13T18:00:00Z", home: france, away: norway, status: "FINISHED" }),
      makeMatch({ id: 3, utcDate: "2026-06-14T18:00:00Z", home: senegal, away: brazil, status: "FINISHED" }),
      makeMatch({ id: 4, utcDate: "2026-06-23T18:00:00Z", home: france, away: brazil }),
    ];

    const played = getPlayedMatches(matches, france.id);

    expect(played.map((m) => m.id)).toEqual([2, 1]);
  });
});

const france = { id: 773, name: "France" };
const senegal = { id: 776, name: "Senegal" };
const norway = { id: 1080, name: "Norway" };
const brazil = { id: 764, name: "Brazil" };
interface MatchOverrides {
  id: number;
  utcDate: string;
  home: { id: number; name: string };
  away: { id: number; name: string };
  status?: string;
}

function makeMatch({ id, utcDate, home, away, status = "TIMED" }: MatchOverrides): Match {
  return {
    id,
    utcDate,
    status,
    stage: "GROUP_STAGE",
    group: "Group A",
    homeTeam: home,
    awayTeam: away,
    fullTimeScore: { home: null, away: null },
  };
}
