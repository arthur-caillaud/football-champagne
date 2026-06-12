import type { ResponseUsage } from "openai/resources/responses/responses";

/** Tarifs OpenAI pour gpt-5 (USD par million de tokens) et web search (USD par appel). */
const GPT5_INPUT_PER_M = 1.25;
const GPT5_CACHED_INPUT_PER_M = 0.125;
const GPT5_OUTPUT_PER_M = 10;
const WEB_SEARCH_PER_CALL = 0.01;

export interface PredictionCost {
  model: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  inputUsd: number;
  cachedInputUsd: number;
  outputUsd: number;
  webSearchUsd: number;
  totalUsd: number;
}

export function estimatePredictionCost(
  model: string,
  usage: ResponseUsage | undefined,
  output: unknown,
): PredictionCost {
  const inputTokens = usage?.input_tokens ?? 0;
  const cachedInputTokens = usage?.input_tokens_details.cached_tokens ?? 0;
  const billableInputTokens = Math.max(0, inputTokens - cachedInputTokens);
  const outputTokens = usage?.output_tokens ?? 0;
  const reasoningTokens = usage?.output_tokens_details.reasoning_tokens ?? 0;
  const webSearchCalls = countWebSearchCalls(output);

  const inputUsd = (billableInputTokens / 1_000_000) * GPT5_INPUT_PER_M;
  const cachedInputUsd = (cachedInputTokens / 1_000_000) * GPT5_CACHED_INPUT_PER_M;
  const outputUsd = (outputTokens / 1_000_000) * GPT5_OUTPUT_PER_M;
  const webSearchUsd = webSearchCalls * WEB_SEARCH_PER_CALL;

  return {
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    webSearchCalls,
    inputUsd,
    cachedInputUsd,
    outputUsd,
    webSearchUsd,
    totalUsd: inputUsd + cachedInputUsd + outputUsd + webSearchUsd,
  };
}

export function formatCostMarkdown(cost: PredictionCost): string {
  return `## Coût de la prédiction

*Estimation basée sur les tarifs OpenAI au ${new Date().toISOString().slice(0, 10)} (${cost.model} + web search).*

| Poste | Détail | Coût (USD) |
| --- | --- | --- |
| Tokens entrée | ${formatTokens(cost.inputTokens - cost.cachedInputTokens)} | ${formatUsd(cost.inputUsd)} |
| Tokens entrée (cache) | ${formatTokens(cost.cachedInputTokens)} | ${formatUsd(cost.cachedInputUsd)} |
| Tokens sortie | ${formatTokens(cost.outputTokens)}${cost.reasoningTokens > 0 ? ` (dont ${formatTokens(cost.reasoningTokens)} raisonnement)` : ""} | ${formatUsd(cost.outputUsd)} |
| Recherches web | ${cost.webSearchCalls} appel${cost.webSearchCalls > 1 ? "s" : ""} | ${formatUsd(cost.webSearchUsd)} |
| **Total** | | **${formatUsd(cost.totalUsd)}** |`;
}

function countWebSearchCalls(output: unknown): number {
  if (!Array.isArray(output)) {
    return 0;
  }
  let count = 0;
  for (const item of output) {
    if (isRecord(item) && item.type === "web_search_call") {
      count++;
    }
  }
  return count;
}

function formatTokens(count: number): string {
  return count.toLocaleString("fr-FR");
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
