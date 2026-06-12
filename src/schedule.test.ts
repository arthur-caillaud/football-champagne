import { describe, expect, it } from "vitest";
import type { Match } from "./fixtures";
import { buildMatchQueue, getNextPredictionSchedule, NEXT_WAVE_DISPLAY_LIMIT } from "./schedule";

const now = new Date("2026-06-12T12:00:00Z");
const france = { id: 773, name: "France" };
const senegal = { id: 776, name: "Senegal" };
const norway = { id: 1080, name: "Norway" };
const brazil = { id: 764, name: "Brazil" };

describe("buildMatchQueue", () => {
  it("marque un match hors fenêtre dans la vague actuelle", () => {
    const matches = [makeMatch({ id: 1, utcDate: "2026-06-16T18:00:00Z", home: france, away: senegal })];
    const queue = buildMatchQueue(matches, now, () => false);
    const current = queue.find((entry) => entry.wave === "current");

    expect(current?.kind).toBe("outside_window");
    expect(current?.detail).toContain("Hors fenêtre");
  });

  it("marque un match prêt dans la vague actuelle", () => {
    const matches = [makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal })];
    const queue = buildMatchQueue(matches, now, () => false);
    const current = queue.find((entry) => entry.wave === "current");

    expect(current?.kind).toBe("ready");
  });

  it("marque la prochaine vague en attente du premier match", () => {
    const matches = [
      makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal }),
      makeMatch({ id: 2, utcDate: "2026-06-14T18:00:00Z", home: norway, away: brazil }),
      makeMatch({ id: 3, utcDate: "2026-06-18T18:00:00Z", home: france, away: norway }),
    ];
    const queue = buildMatchQueue(matches, now, () => false);
    const next = queue.find((entry) => entry.wave === "next" && entry.match.id === 3);

    expect(next?.kind).toBe("waiting_first_matches");
    expect(next?.detail).toContain("France vs Senegal");
  });
});

describe("getNextPredictionSchedule", () => {
  it("indique maintenant s'il y a des matchs prêts", () => {
    const matches = [makeMatch({ id: 1, utcDate: "2026-06-13T18:00:00Z", home: france, away: senegal })];
    const queue = buildMatchQueue(matches, now, () => false);
    const schedule = getNextPredictionSchedule(queue, now);

    expect(schedule.hasReadyNow).toBe(true);
    expect(schedule.earliest).toBeNull();
  });

  it("calcule la date de la vague actuelle hors fenêtre", () => {
    const matches = [makeMatch({ id: 1, utcDate: "2026-06-16T18:00:00Z", home: france, away: senegal })];
    const queue = buildMatchQueue(matches, now, () => false);
    const schedule = getNextPredictionSchedule(queue, now);

    expect(schedule.currentWave?.toISOString().slice(0, 10)).toBe("2026-06-14");
    expect(schedule.hasReadyNow).toBe(false);
  });

  it("limite l'affichage de la prochaine vague à 5", () => {
    expect(NEXT_WAVE_DISPLAY_LIMIT).toBe(5);
  });
});

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
