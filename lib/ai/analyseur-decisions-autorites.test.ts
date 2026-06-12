import { describe, expect, it, beforeEach } from "vitest";
import {
  buildAnalyseurDecisionsUserPrompt,
  getAnalyseurDecisionsAutoritesMarkdown,
  getAnalyseurDecisionsAutoritesSystemPrompt,
  parseAnalyseurDecisionHeadline,
  analyseurDecisionsAnthropicParams,
} from "./prompts/analyseur-decisions-autorites";
import { PROMPT_APPLICATION_FOOTER, clearPromptMarkdownCache } from "./prompts/load-prompt-markdown";

describe("analyseur-decisions-autorites", () => {
  beforeEach(() => {
    clearPromptMarkdownCache();
  });

  it("charge le cahier métier complet", () => {
    const md = getAnalyseurDecisionsAutoritesMarkdown();
    expect(md.length).toBeGreaterThan(12_000);
    expect(md).toMatch(/ANALYSEUR DE DÉCISIONS/i);
    expect(md).toMatch(/RÈGLE D1/i);
    expect(md).toMatch(/Art\. 83\(2\)/i);
    expect(md).toMatch(/SENS \/ VALEUR \/ PORTÉE/i);
  });

  it("system prompt — cahier + règles markdown + footer", () => {
    const sys = getAnalyseurDecisionsAutoritesSystemPrompt();
    expect(sys).toContain(getAnalyseurDecisionsAutoritesMarkdown());
    expect(sys).toContain(PROMPT_APPLICATION_FOOTER);
    expect(sys).toMatch(/RÈGLES D1–D5/i);
    expect(sys).toMatch(/profil rapide/i);
  });

  it("buildAnalyseurDecisionsUserPrompt — profil et texte", () => {
    const p = buildAnalyseurDecisionsUserPrompt({
      texteDecision: "La CNIL a prononcé une amende de 20 000 000 euros contre X pour violation de l'article 6.",
      profil: "professionnel",
      reference: "SAN-2021-023",
    });
    expect(p).toMatch(/intégralement/i);
    expect(p).toMatch(/Professionnel/i);
    expect(p).toMatch(/SAN-2021-023/i);
    expect(p).toMatch(/20 000 000 euros/i);
  });

  it("analyseurDecisionsAnthropicParams — défauts prompt v1", () => {
    const params = analyseurDecisionsAnthropicParams();
    expect(params.max_tokens).toBe(4500);
    expect(params.temperature).toBe(0.1);
  });

  it("parseAnalyseurDecisionHeadline — EN UNE PHRASE ou titre", () => {
    expect(
      parseAnalyseurDecisionHeadline("EN UNE PHRASE :\nLa CNIL a sanctionné X."),
    ).toBe("La CNIL a sanctionné X.");
    expect(parseAnalyseurDecisionHeadline("# Section 0")).toBe("Section 0");
    expect(parseAnalyseurDecisionHeadline("texte sans titre")).toBeNull();
  });
});
