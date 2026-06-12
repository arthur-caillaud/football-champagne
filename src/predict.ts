import OpenAI from "openai";
import type { ResponseTextDeltaEvent } from "openai/resources/responses/responses";
import { estimatePredictionCost, formatCostMarkdown } from "./cost";
import type { Match } from "./fixtures";

const MODEL = "gpt-5";

export interface PredictionInput {
  match: Match;
  homeTeamResults: Match[];
  awayTeamResults: Match[];
}

export interface PredictionResult {
  markdown: string;
  totalUsd: number;
  durationMs: number;
}

/**
 * Lance l'agent OpenAI : recherche web (forme récente, blessures, analyses,
 * confrontations directes) puis prédiction de score, retournée en markdown.
 */
export async function predictMatch(
  input: PredictionInput,
  onProgress?: (message: string) => void,
): Promise<PredictionResult> {
  const startedAt = Date.now();
  const report = (message: string) => onProgress?.(message);

  const client = new OpenAI();
  const stream = client.responses.stream({
    model: MODEL,
    tools: [{ type: "web_search" }],
    input: buildPrompt(input),
  });

  let webSearchCount = 0;
  let webSearchReported = false;
  let writingReported = false;
  let streamedText = "";

  stream.on("response.web_search_call.searching", () => {
    webSearchCount++;
    if (!webSearchReported) {
      webSearchReported = true;
      report("Recherches web en cours...");
    }
  });
  stream.on("response.output_text.delta", (event: ResponseTextDeltaEvent) => {
    streamedText += event.delta;
    if (!writingReported) {
      writingReported = true;
      if (webSearchCount > 0) {
        report(`${webSearchCount} recherche${webSearchCount > 1 ? "s" : ""} web effectuée${webSearchCount > 1 ? "s" : ""}`);
      }
      report("Rédaction de la prédiction...");
    }
  });

  report("Connexion à l'agent OpenAI...");
  const response = await stream.finalResponse();

  const markdown = extractResponseText(response, streamedText).trim();
  if (markdown.length === 0) {
    throw new Error("L'agent OpenAI a retourné une réponse vide");
  }

  const cost = estimatePredictionCost(MODEL, response.usage, response.output);
  return {
    markdown: `${markdown}\n\n${formatCostMarkdown(cost)}`,
    totalUsd: cost.totalUsd,
    durationMs: Date.now() - startedAt,
  };
}

function buildPrompt({ match, homeTeamResults, awayTeamResults }: PredictionInput): string {
  const home = match.homeTeam.name;
  const away = match.awayTeam.name;
  const phase = match.group === null ? match.stage : `${match.stage} (${match.group})`;

  return `Tu es un analyste football expert chargé de prédire le score d'un match de la Coupe du Monde 2026.

## Match à prédire

- Affiche : ${home} vs ${away}
- Date (UTC) : ${match.utcDate}
- Phase : ${phase}

## Résultats déjà joués dans cette édition

${formatResults(home, homeTeamResults)}

${formatResults(away, awayTeamResults)}

## Ta mission

Effectue des recherches sur le web pour rassembler un maximum d'éléments récents et fiables :
- forme récente et résultats des deux sélections (y compris hors Coupe du Monde) ;
- blessures, suspensions et compositions probables ;
- analyses et pronostics de spécialistes ;
- historique des confrontations directes ;
- contexte (enjeu, lieu, conditions).

Puis produis ta prédiction. Réponds UNIQUEMENT avec un document markdown en français, sans texte autour.

Règles de formattage :
- Utilise des titres markdown (##, ###, ####) pour structurer le contenu ; évite les listes à puces comme substitut de titres.
- Paragraphes courts, listes à puces uniquement pour des éléments factuels (résultats, blessures, sources).
- Liens inline [texte](url) dans le corps du texte quand tu cites une source.

Suis exactement cette structure :

# ${home} vs ${away} — Prédiction

## ${home} X - Y ${away}

(2 à 3 phrases de synthèse : pourquoi ce score, quels facteurs décisifs — lisibles sans lire l'analyse détaillée)

---

## Vainqueur

(nom de l'équipe gagnante, ou "Match nul")

## Niveau de confiance

**Faible** | **Moyen** | **Élevé**

(garde uniquement le niveau pertinent, en gras sur sa propre ligne ; ne mélange pas le niveau et la justification)

(1 à 2 phrases de justification du niveau choisi, sur le paragraphe suivant)

## Analyse

### Contexte et enjeu

(paragraphe sur la phase, le lieu, l'enjeu du match)

### Forme récente

#### ${home}

(résultats et tendances)

#### ${away}

(résultats et tendances)

### Effectifs et disponibilité

#### ${home}

(blessures, suspensions, doutes)

#### ${away}

(blessures, suspensions, doutes)

### Compositions probables

(description des systèmes et joueurs clés attendus)

### Clés tactiques

(ce qui fera basculer le match)

### Confrontations directes

(historique H2H ou mention s'il n'y en a pas)

### Avis des experts

(synthèse des pronostics et analyses trouvés sur le web)

## Sources

(liste à puces avec liens : [nom de la source](url))`;
}

/** Extrait le texte final : output_text, deltas streamés, ou contenu des messages. */
export function extractResponseText(
  response: { output_text?: string; output: unknown },
  streamedText: string,
): string {
  if (typeof response.output_text === "string" && response.output_text.length > 0) {
    return response.output_text;
  }
  if (streamedText.length > 0) {
    return streamedText;
  }
  return extractTextFromOutput(response.output);
}

function extractTextFromOutput(output: unknown): string {
  if (!Array.isArray(output)) {
    return "";
  }
  const texts: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    for (const part of item.content) {
      if (isRecord(part) && part.type === "output_text" && typeof part.text === "string") {
        texts.push(part.text);
      }
    }
  }
  return texts.join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatResults(teamName: string, results: Match[]): string {
  if (results.length === 0) {
    return `${teamName} : aucun match encore joué dans cette édition.`;
  }
  const lines = results.map(
    (m) =>
      `- ${m.utcDate.slice(0, 10)} (${m.stage}) : ${m.homeTeam.name} ${m.fullTimeScore.home ?? "?"} - ${m.fullTimeScore.away ?? "?"} ${m.awayTeam.name}`,
  );
  return `${teamName} :\n${lines.join("\n")}`;
}
