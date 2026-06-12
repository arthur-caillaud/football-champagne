import { describe, expect, it } from "vitest";
import { estimatePredictionCost, formatCostMarkdown } from "./cost";

describe("estimatePredictionCost", () => {
  it("calcule le coût tokens + web search", () => {
    const cost = estimatePredictionCost(
      "gpt-5",
      {
        input_tokens: 1_000_000,
        input_tokens_details: { cached_tokens: 200_000 },
        output_tokens: 500_000,
        output_tokens_details: { reasoning_tokens: 100_000 },
        total_tokens: 1_500_000,
      },
      [{ type: "web_search_call" }, { type: "web_search_call" }, { type: "message" }],
    );

    expect(cost.inputUsd).toBeCloseTo(1.0);
    expect(cost.cachedInputUsd).toBeCloseTo(0.025);
    expect(cost.outputUsd).toBeCloseTo(5.0);
    expect(cost.webSearchCalls).toBe(2);
    expect(cost.webSearchUsd).toBeCloseTo(0.02);
    expect(cost.totalUsd).toBeCloseTo(6.045);
  });
});

describe("formatCostMarkdown", () => {
  it("inclut une section Coût de la prédiction", () => {
    const cost = estimatePredictionCost("gpt-5", undefined, []);
    const markdown = formatCostMarkdown(cost);

    expect(markdown).toContain("## Coût de la prédiction");
    expect(markdown).toContain("**$0.0000**");
  });
});
