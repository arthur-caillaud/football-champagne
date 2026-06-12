import { describe, expect, it } from "vitest";
import { formatDuration, formatUsd } from "./format";

describe("formatDuration", () => {
  it("formate les secondes", () => {
    expect(formatDuration(12_000)).toBe("12s");
  });

  it("formate les minutes", () => {
    expect(formatDuration(92_000)).toBe("1m 32s");
  });
});

describe("formatUsd", () => {
  it("formate avec 4 décimales", () => {
    expect(formatUsd(0.3679)).toBe("$0.3679");
  });
});
