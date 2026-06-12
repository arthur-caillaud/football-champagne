import { describe, expect, it } from "vitest";
import { extractResponseText } from "./predict";

describe("extractResponseText", () => {
  it("utilise output_text quand il est présent", () => {
    const text = extractResponseText({ output_text: "Depuis output_text", output: [] }, "");
    expect(text).toBe("Depuis output_text");
  });

  it("utilise le texte accumulé pendant le streaming", () => {
    const text = extractResponseText({ output: [] }, "Texte streamé");
    expect(text).toBe("Texte streamé");
  });

  it("extrait le texte depuis les messages de la réponse", () => {
    const text = extractResponseText(
      {
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "Prédiction finale" }],
          },
        ],
      },
      "",
    );
    expect(text).toBe("Prédiction finale");
  });
});
