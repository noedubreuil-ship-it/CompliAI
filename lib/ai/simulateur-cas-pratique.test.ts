import { describe, expect, it, beforeEach } from "vitest";
import {
  buildSimulateurEvaluateUserPrompt,
  buildSimulateurStartUserPrompt,
  getSimulateurCasPratiqueMarkdown,
  getSimulateurCasPratiqueSystemPrompt,
  parseSimulateurScenarioId,
  parseSimulateurScore,
} from "./prompts/simulateur-cas-pratique";
import { PROMPT_APPLICATION_FOOTER, clearPromptMarkdownCache } from "./prompts/load-prompt-markdown";

describe("simulateur-cas-pratique", () => {
  beforeEach(() => {
    clearPromptMarkdownCache();
  });

  it("charge le cahier métier complet", () => {
    const md = getSimulateurCasPratiqueMarkdown();
    expect(md.length).toBeGreaterThan(20_000);
    expect(md).toMatch(/SIMULATEUR DE CAS PRATIQUE/i);
    expect(md).toMatch(/RÈGLE E1/i);
    expect(md).toMatch(/SCORE TOTAL/i);
    expect(md).toMatch(/SCÉNARIO R-01/i);
  });

  it("system prompt — cahier + footer + règles markdown", () => {
    const sys = getSimulateurCasPratiqueSystemPrompt();
    expect(sys).toContain(getSimulateurCasPratiqueMarkdown());
    expect(sys).toContain(PROMPT_APPLICATION_FOOTER);
    expect(sys).toMatch(/PHASE 1/i);
  });

  it("buildSimulateurStartUserPrompt — action commencer", () => {
    const p = buildSimulateurStartUserPrompt({
      niveau: "M1",
      theme: "rgpd",
      format: "standard",
    });
    expect(p).toMatch(/COMMENCER/i);
    expect(p).toMatch(/PHASE 1/i);
    expect(p).toMatch(/intégralement/i);
  });

  it("buildSimulateurEvaluateUserPrompt — phases 2 à 4", () => {
    const p = buildSimulateurEvaluateUserPrompt({
      niveau: "L2_L3",
      theme: "random",
      format: "court",
      enonce: "x".repeat(100),
      studentAnswer: "Ma réponse avec majeure mineure conclusion.",
    });
    expect(p).toMatch(/PHASES 2, 3 et 4/i);
    expect(p).toContain("Ma réponse");
  });

  it("parseSimulateurScore et scenarioId", () => {
    expect(parseSimulateurScore("SCORE TOTAL : 72/100")).toBe(72);
    expect(parseSimulateurScenarioId("SCÉNARIO A-02 | Niveau M1")).toBe("A-02");
  });
});
