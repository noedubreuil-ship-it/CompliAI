import { describe, expect, it } from "vitest";
import {
  buildJurisprudenceAnalyzerPrompt,
  getJurisprudenceAnalyzerSystemPrompt,
  getJurisprudenceEuCommentaireMarkdown,
} from "./prompts/jurisprudence-eu-analyzer";

describe("jurisprudence EU analyzer", () => {
  it("markdown et system prompt mentionnent sens valeur portée", () => {
    expect(getJurisprudenceEuCommentaireMarkdown()).toMatch(/Sens|valeur|portée/i);
    expect(getJurisprudenceAnalyzerSystemPrompt()).toMatch(/commentaire_axes/);
  });

  it("buildJurisprudenceAnalyzerPrompt inclut schéma commentaire_axes", () => {
    const p = buildJurisprudenceAnalyzerPrompt({
      reference: "C-123/99",
      text: "Texte décision fictif minimal.",
      analysis_focus: "",
    });
    expect(p).toContain("commentaire_axes");
    expect(p).toContain("syllogisme");
    expect(p).toContain("section_3bis_valeur");
  });
});
