import { describe, expect, it } from "vitest";

import { isExploitableStatutePlaintext } from "@/lib/ai/national-statute-plaintext";

describe("isExploitableStatutePlaintext", () => {
  it("rejette les textes trop courts", () => {
    expect(isExploitableStatutePlaintext("court")).toBe(false);
  });

  it("rejette les coques SPA", () => {
    const shell = "Se încarcă ".repeat(200);
    expect(isExploitableStatutePlaintext(shell)).toBe(false);
  });

  it("accepte un texte législatif dense", () => {
    const law =
      "Article 1. Objet. ".repeat(40) +
      "Article 2. Champ d'application. ".repeat(40) +
      "Section 3. Principes de traitement. ".repeat(40);
    expect(isExploitableStatutePlaintext(law)).toBe(true);
  });

  it("accepte les paragraphes allemands (§)", () => {
    const bdsg = Array.from({ length: 30 }, (_, i) => `§ ${i + 1} BDSG Anwendungsbereich des Gesetzes.`).join(
      "\n\n"
    );
    expect(isExploitableStatutePlaintext(bdsg)).toBe(true);
  });
});
