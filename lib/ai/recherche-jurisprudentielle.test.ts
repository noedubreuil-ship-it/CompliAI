import { describe, expect, it } from "vitest";
import {
  buildRechercheJurisprudentiellePrompt,
  normalizeRechercheJpForClient,
} from "./generators";
import { getRechercheJurisprudentielleSystemPrompt } from "./prompts/recherche-jurisprudentielle";

describe("recherche jurisprudentielle EU", () => {
  it("system prompt contient panorama et anti-hallucination", () => {
    const s = getRechercheJurisprudentielleSystemPrompt();
    expect(s).toMatch(/decisions/);
    expect(s).toMatch(/lacunes/);
  });

  it("user prompt intègre le RAG", () => {
    const p = buildRechercheJurisprudentiellePrompt({
      requete: "Art. 22 RGPD",
      filtres: "CJUE",
      rag_context: "[C-634/21] extrait test",
    });
    expect(p).toContain("Art. 22 RGPD");
    expect(p).toContain("C-634/21");
  });

  it("normalizeRechercheJpForClient mappe les fiches", () => {
    const out = normalizeRechercheJpForClient({
      etat_du_droit: ["Point A"],
      decisions: [
        {
          reference: "C-634/21 SCHUFA",
          importance: 3,
          implication_pratique: "Droit intervention humaine",
        },
      ],
    });
    const dec = (out.decisions as Record<string, unknown>[])[0];
    expect(dec.portee).toBe("Droit intervention humaine");
    expect(out.synthese_thematique).toBe("Point A");
  });
});
