import { describe, expect, it, beforeEach } from "vitest";
import {
  buildGenerateurClausesIaUserPrompt,
  CLAUSES_IA_AVERTISSEMENT,
  getGenerateurClausesIaMarkdown,
  getGenerateurClausesIaSystemPrompt,
} from "./prompts/generateur-clauses-ia";
import { PROMPT_APPLICATION_FOOTER, clearPromptMarkdownCache } from "./prompts/load-prompt-markdown";

describe("generateur-clauses-ia", () => {
  beforeEach(() => {
    clearPromptMarkdownCache();
  });

  it("charge le cahier métier complet", () => {
    const md = getGenerateurClausesIaMarkdown();
    expect(md.length).toBeGreaterThan(15_000);
    expect(md).toMatch(/GÉNÉRATEUR DE CLAUSES/i);
    expect(md).toMatch(/Art\. 28 RGPD/i);
    expect(md).toMatch(/NIVEAU STANDARD/i);
  });

  it("system prompt — catalogue + JSON + footer", () => {
    const sys = getGenerateurClausesIaSystemPrompt();
    expect(sys).toContain(getGenerateurClausesIaMarkdown());
    expect(sys).toContain(PROMPT_APPLICATION_FOOTER);
    expect(sys).toMatch(/package_complet/i);
  });

  it("buildGenerateurClausesIaUserPrompt — intake structuré", () => {
    const p = buildGenerateurClausesIaUserPrompt({
      clauseType: "dpa_rgpd",
      niveau: "renforcee",
      partieA: "TechCo SAS",
      roleA: "Fournisseur",
      partieB: "Client SA",
      roleB: "Déployeur",
      contractType: "SaaS",
      domain: "RH",
      personalData: "Oui — CV et profils",
      aiClassification: "Haut risque",
    });
    expect(p).toMatch(/intégralement/i);
    expect(p).toMatch(/Art\. 28 RGPD/i);
    expect(p).toMatch(/Renforcée/i);
    expect(p).toMatch(/TechCo SAS/i);
  });

  it("avertissement professionnel défini", () => {
    expect(CLAUSES_IA_AVERTISSEMENT).toMatch(/avocat/i);
    expect(CLAUSES_IA_AVERTISSEMENT).toMatch(/CompliAI/i);
  });
});
