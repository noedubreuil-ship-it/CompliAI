import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildThirdPartyContractAnalysisUserPrompt } from "./generators";
import {
  getThirdPartyContractAnalysisMarkdown,
  getThirdPartyContractAnalysisSystemPrompt,
} from "./prompts/third-party-contract-analysis";

describe("prompt analyse contrat tiers (sous-traitance IA)", () => {
  it("fichier données — Art. 28, AI Act, pondération", () => {
    const md = readFileSync(
      join(process.cwd(), "lib/ai/prompts/data", "third-party-contract-analysis-v1.md"),
      "utf8",
    );
    expect(md.length).toBeGreaterThan(2800);
    expect(md).toContain("Art. 28");
    expect(md).toContain("AI Act");
    expect(md).toMatch(/Non[-‑]entraîn|Non-utilisation des données pour entraînement/i);
    expect(md).toContain("15");
    expect(md).toContain("25");
    expect(md).toContain("A1");
  });

  it("chargeur système avec enveloppe JSON", () => {
    expect(getThirdPartyContractAnalysisSystemPrompt()).toContain(getThirdPartyContractAnalysisMarkdown().slice(0, 42));
    expect(getThirdPartyContractAnalysisSystemPrompt()).toContain("INTERFACE COMPLIAI");
  });

  it("prompt utilisateur contient intake et schéma score_global", () => {
    const p = buildThirdPartyContractAnalysisUserPrompt({
      providerName: "TestCo",
      contractText: "Clause 1.",
      sector: "Finance",
    });
    expect(p).toContain("TestCo");
    expect(p).toContain("Finance");
    expect(p).toContain('"score_global"');
    expect(p).toContain("gdpr_art28_clauses");
  });
});
