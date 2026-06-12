import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner";
import { useEffect, useState } from "react";
import {
  fetchWorldCupMatches,
  getPlayedMatches,
  PREDICTION_WINDOW_DAYS,
  selectMatchesToPredict,
  type Match,
} from "./fixtures";
import { formatDate, formatDuration, formatUsd, matchLabel } from "./format";
import { LOGO } from "./logo";
import { predictMatch } from "./predict";
import {
  buildMatchQueue,
  getNextPredictionSchedule,
  NEXT_WAVE_DISPLAY_LIMIT,
  type BlockKind,
  type MatchQueueEntry,
  type NextPredictionSchedule,
} from "./schedule";
import { predictionExists, writePrediction } from "./storage";

type Phase = "loading" | "predicting" | "done" | "error";
type ItemStatus = "pending" | "running" | "skipped" | "done" | "failed";

interface ExecutionState {
  status: ItemStatus;
  step: string | null;
  costUsd: number | null;
  durationMs: number | null;
  file: string | null;
  error: string | null;
}

export function App({ footballDataApiKey }: { footballDataApiKey: string }) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("loading");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [queue, setQueue] = useState<MatchQueueEntry[]>([]);
  const [schedule, setSchedule] = useState<NextPredictionSchedule | null>(null);
  const [execution, setExecution] = useState<Map<number, ExecutionState>>(new Map());
  const [startedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  useEffect(() => {
    if (phase === "done" || phase === "error") {
      exit();
    }
  }, [phase, exit]);

  useEffect(() => {
    const updateExecution = (matchId: number, patch: Partial<ExecutionState>) => {
      setExecution((previous) => {
        const current = previous.get(matchId) ?? emptyExecution();
        const next = new Map(previous);
        next.set(matchId, { ...current, ...patch });
        return next;
      });
    };

    const run = async () => {
      const now = new Date();
      const matches = await fetchWorldCupMatches(footballDataApiKey);
      setMatchCount(matches.length);

      const builtQueue = buildMatchQueue(matches, now, predictionExists);
      setQueue(builtQueue);
      setSchedule(getNextPredictionSchedule(builtQueue, now));

      const toPredict = selectMatchesToPredict(matches, { now });
      const initialExecution = new Map<number, ExecutionState>();
      for (const match of toPredict) {
        if (!predictionExists(match)) {
          initialExecution.set(match.id, { ...emptyExecution(), status: "pending" });
        }
      }
      setExecution(initialExecution);
      setPhase("predicting");

      let anyFailed = false;
      for (const match of toPredict) {
        if (predictionExists(match)) {
          continue;
        }
        updateExecution(match.id, { status: "running", step: "Préparation..." });
        try {
          const result = await predictMatch(
            {
              match,
              homeTeamResults: getPlayedMatches(matches, match.homeTeam.id),
              awayTeamResults: getPlayedMatches(matches, match.awayTeam.id),
            },
            (message) => updateExecution(match.id, { step: message }),
          );
          const file = writePrediction(match, result.markdown);
          updateExecution(match.id, {
            status: "done",
            step: null,
            costUsd: result.totalUsd,
            durationMs: result.durationMs,
            file,
          });
        } catch (error) {
          anyFailed = true;
          updateExecution(match.id, {
            status: "failed",
            step: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const updatedQueue = buildMatchQueue(matches, new Date(), predictionExists);
      setQueue(updatedQueue);
      setSchedule(getNextPredictionSchedule(updatedQueue, new Date()));
      setFinishedAt(Date.now());
      setPhase("done");
      if (anyFailed) {
        process.exitCode = 1;
      }
    };

    run().catch((error: unknown) => {
      setFatalError(error instanceof Error ? error.message : String(error));
      setPhase("error");
      process.exitCode = 1;
    });
  }, [footballDataApiKey]);

  const currentWave = queue.filter((entry) => entry.wave === "current");
  const nextWave = queue.filter((entry) => entry.wave === "next").slice(0, NEXT_WAVE_DISPLAY_LIMIT);
  const nextWaveTotal = queue.filter((entry) => entry.wave === "next").length;

  return (
    <Box flexDirection="column" gap={1}>
      <Header />
      {phase === "loading" && (
        <Text>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>{" "}
          Récupération du calendrier de la Coupe du Monde...
        </Text>
      )}
      {phase === "error" && fatalError !== null && (
        <Box borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red">Erreur : {fatalError}</Text>
        </Box>
      )}
      {phase !== "loading" && phase !== "error" && schedule !== null && (
        <>
          <Text dimColor>
            {matchCount} match(s) au calendrier — fenêtre de prédiction : {PREDICTION_WINDOW_DAYS} jours
          </Text>
          <RelaunchPanel schedule={schedule} />
          <QueuePanel title="Matchs à prédire (vague actuelle)" entries={currentWave} execution={execution} />
          <QueuePanel
            title={`Prochaine vague (${nextWave.length}/${nextWaveTotal})`}
            entries={nextWave}
            execution={execution}
            dimmed
          />
          {phase === "done" && (
            <SummaryPanel execution={execution} durationMs={(finishedAt ?? Date.now()) - startedAt} />
          )}
        </>
      )}
    </Box>
  );
}

function Header() {
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {LOGO}
      </Text>
      <Text dimColor>🥂 Prédictions de scores — Coupe du Monde 2026</Text>
    </Box>
  );
}

function RelaunchPanel({ schedule }: { schedule: NextPredictionSchedule }) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">
        Quand relancer le CLI
      </Text>
      <Text>
        Vague actuelle : <ScheduleValue date={schedule.currentWave} readyNow={schedule.hasReadyNow} />
      </Text>
      <Text>
        Prochaine vague : <ScheduleValue date={schedule.nextWave} readyNow={false} />
      </Text>
      <Text bold>
        → Relancer dès :{" "}
        {schedule.hasReadyNow ? (
          <Text color="green">maintenant</Text>
        ) : schedule.earliest !== null ? (
          <Text color="yellow">{formatDate(schedule.earliest)}</Text>
        ) : (
          <Text dimColor>aucune date identifiée</Text>
        )}
      </Text>
    </Box>
  );
}

function ScheduleValue({ date, readyNow }: { date: Date | null; readyNow: boolean }) {
  if (readyNow) {
    return <Text color="green">maintenant</Text>;
  }
  if (date === null) {
    return <Text dimColor>—</Text>;
  }
  return <Text color="yellow">{formatDate(date)}</Text>;
}

function QueuePanel({
  title,
  entries,
  execution,
  dimmed = false,
}: {
  title: string;
  entries: MatchQueueEntry[];
  execution: Map<number, ExecutionState>;
  dimmed?: boolean;
}) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={dimmed ? "gray" : "white"} paddingX={1}>
      <Text bold={!dimmed} dimColor={dimmed}>
        {title}
      </Text>
      {entries.length === 0 ? (
        <Text dimColor>Aucun match.</Text>
      ) : (
        entries.map((entry) => (
          <QueueRow key={entry.match.id} entry={entry} execution={execution.get(entry.match.id)} />
        ))
      )}
    </Box>
  );
}

function QueueRow({ entry, execution }: { entry: MatchQueueEntry; execution?: ExecutionState }) {
  const isRunning = execution?.status === "running";
  const isDone = execution?.status === "done";
  const isFailed = execution?.status === "failed";

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <BlockIcon kind={entry.kind} running={isRunning} done={isDone} failed={isFailed} />
        <Text bold={isRunning}>{matchLabel(entry.match)}</Text>
        {isDone && execution.durationMs !== null && execution.costUsd !== null && (
          <Text color="green">
            {formatDuration(execution.durationMs)} — {formatUsd(execution.costUsd)}
          </Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text dimColor={entry.kind !== "ready"} color={blockColor(entry.kind)}>
          └ {isFailed && execution.error !== null ? execution.error : entry.detail}
        </Text>
      </Box>
      {isRunning && execution.step !== null && (
        <Box marginLeft={2}>
          <Text dimColor>└ {execution.step}</Text>
        </Box>
      )}
      {isDone && execution.file !== null && (
        <Box marginLeft={2}>
          <Text dimColor>└ {execution.file}</Text>
        </Box>
      )}
    </Box>
  );
}

function BlockIcon({
  kind,
  running,
  done,
  failed,
}: {
  kind: BlockKind;
  running: boolean;
  done: boolean;
  failed: boolean;
}) {
  if (running) {
    return (
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
    );
  }
  if (done) {
    return <Text color="green">✓</Text>;
  }
  if (failed) {
    return <Text color="red">✗</Text>;
  }
  switch (kind) {
    case "ready":
      return <Text color="green">◉</Text>;
    case "already_predicted":
      return <Text color="yellow">↷</Text>;
    case "outside_window":
      return <Text color="blue">◷</Text>;
    case "waiting_first_matches":
      return <Text color="magenta">⏳</Text>;
  }
}

function blockColor(kind: BlockKind): "green" | "yellow" | "blue" | "magenta" | undefined {
  switch (kind) {
    case "ready":
      return "green";
    case "already_predicted":
      return "yellow";
    case "outside_window":
      return "blue";
    case "waiting_first_matches":
      return "magenta";
  }
}

function SummaryPanel({
  execution,
  durationMs,
}: {
  execution: Map<number, ExecutionState>;
  durationMs: number;
}) {
  const states = [...execution.values()];
  const predicted = states.filter((state) => state.status === "done").length;
  const failed = states.filter((state) => state.status === "failed").length;
  const totalCostUsd = states.reduce((sum, state) => sum + (state.costUsd ?? 0), 0);

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={failed > 0 ? "red" : "green"} paddingX={1}>
      <Text bold>Terminé en {formatDuration(durationMs)}</Text>
      <Text>
        <Text color="green">{predicted} générée(s)</Text>
        {failed > 0 && (
          <>
            {" "}
            · <Text color="red">{failed} échec(s)</Text>
          </>
        )}
      </Text>
      {totalCostUsd > 0 && <Text>Coût total : {formatUsd(totalCostUsd)}</Text>}
    </Box>
  );
}

function emptyExecution(): ExecutionState {
  return {
    status: "pending",
    step: null,
    costUsd: null,
    durationMs: null,
    file: null,
    error: null,
  };
}
