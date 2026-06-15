import { describe, expect, it } from "vitest";

import { CV_PRESELECTION_QUESTION } from "@/lib/ai/consultant-quality-regression.test";
import {
  validateConsultantCitations,
  buildConsultantRewritePrompt,
} from "@/lib/ai/consultant-citation-validator";
import { detectRecruitmentAiActQuestion, seedsForRecruitmentFallback } from "@/lib/ai/consultant-recruitment-detect";

describe("validateConsultantCitations", () => {
  const ragWithSchufa =
    "=== SOURCE ===\nSCHUFA C-634/21 ECLI:EU:C:2023:957 arrêt du 7 décembre 2023\n=== FIN SOURCE ===";

  it("rejette « Jurisprudence applicable »", () => {
    const r = validateConsultantCitations(
      "Article 10.\n*Jurisprudence applicable : Schecke…*",
      ragWithSchufa
    );
    expect(r.ok).toBe(false);
    expect(r.needsRewrite).toBe(true);
    expect(r.issues).toContain("forbidden_header_jurisprudence_applicable");
  });

  it("détecte incohérence date / ECLI Elite Taxi", () => {
    const bad =
      "Asociación Profesional Elite Taxi, arrêt du 11 décembre 2019, affaire C-434/15, ECLI:EU:C:2017:981.";
    const r = validateConsultantCitations(bad, ragWithSchufa);
    expect(r.issues.some((i) => i.startsWith("ecli_date_mismatch"))).toBe(true);
    expect(r.needsRewrite).toBe(true);
  });

  it("accepte ECLI présent dans le RAG", () => {
    const good =
      "Sur le RGPD cumulatif, l'arrêt SCHUFA (C-634/21, ECLI:EU:C:2023:957, 7 décembre 2023) éclaire l'article 22.";
    const r = validateConsultantCitations(good, ragWithSchufa);
    expect(r.issues.filter((i) => i.startsWith("ecli_not_in_rag"))).toHaveLength(0);
  });

  it("buildConsultantRewritePrompt mentionne les problèmes", () => {
    const p = buildConsultantRewritePrompt("test", ["forbidden_header_jurisprudence_applicable"]);
    expect(p).toMatch(/Jurisprudence applicable/);
    expect(p).toMatch(/forbidden_header/);
  });
});

describe("consultant recruitment RAG", () => {
  it("détecte la question CV présélection", () => {
    expect(detectRecruitmentAiActQuestion(CV_PRESELECTION_QUESTION)).toBe(true);
  });

  it("expose les seeds SCHUFA et Meta en fallback", () => {
    const seeds = seedsForRecruitmentFallback();
    expect(seeds.some((s) => s.celex === "62021CJ0634")).toBe(true);
    expect(seeds.some((s) => s.ecli === "ECLI:EU:C:2023:957")).toBe(true);
  });
});
