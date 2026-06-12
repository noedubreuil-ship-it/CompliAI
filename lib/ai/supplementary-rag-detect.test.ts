import { describe, expect, it } from "vitest";

import {
  detectAiGovernanceTopic,
  detectIntlStandardsQuestion,
  detectUkRegulatorQuestion,
} from "@/lib/ai/supplementary-rag-detect";

describe("supplementary-rag-detect", () => {
  it("détecte ICO / Royaume-Uni", () => {
    expect(detectUkRegulatorQuestion("Quelles obligations pour l’ICO sur les cookies ?")).toBe(true);
    expect(detectUkRegulatorQuestion("UK GDPR après Brexit")).toBe(true);
    expect(detectUkRegulatorQuestion("CNIL France")).toBe(false);
  });

  it("détecte normes internationales", () => {
    expect(detectIntlStandardsQuestion("Comment se positionner sur ISO 42001 ?")).toBe(true);
    expect(detectIntlStandardsQuestion("NIST AI RMF vs AI Act")).toBe(true);
    expect(detectIntlStandardsQuestion("RGPD art. 6")).toBe(false);
  });

  it("détecte gouvernance IA", () => {
    expect(detectAiGovernanceTopic("FRIA pour système à haut risque")).toBe(true);
    expect(detectAiGovernanceTopic("Durée conservation factures")).toBe(false);
  });
});
