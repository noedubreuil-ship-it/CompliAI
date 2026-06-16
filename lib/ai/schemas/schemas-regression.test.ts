import { describe, it, expect } from "vitest";
import { ComplianceChecklistSchema } from "./compliance-checklist";
import { ComparateurClientSchema } from "./comparateur";
import { JurisprudenceEuAnalyzerSchema } from "./jurisprudence-eu-analyzer";

describe("ai output schemas (regression)", () => {
  it("ComplianceChecklistSchema accepts minimal valid shape", () => {
    const minimal = {
      checklist_id: "abc",
      title: "Checklist test",
      executive_summary: undefined,
      categories: [
        {
          id: "URGENT_AI_ACT",
          name: "Urgences",
          items: [
            {
              id: "B-001",
              canonical_ref: "B001",
              title: "Item",
              priority: "critique",
              effort: "medium",
            },
          ],
        },
      ],
    };
    const parsed = ComplianceChecklistSchema.safeParse(minimal);
    expect(parsed.success).toBe(true);
  });

  it("ComparateurClientSchema accepts normalized arrays", () => {
    const out = ComparateurClientSchema.parse({ tableau: [], points_convergence: [] });
    expect(Array.isArray(out.sources)).toBe(true);
    expect(Array.isArray(out.limitations)).toBe(true);
  });

  it("JurisprudenceEuAnalyzerSchema requires core fields", () => {
    const ok = {
      reference: "C-311/18",
      limitations_sources: ["Texte partiel"],
      title: "Schrems II",
      juridiction: "CJUE",
      executive_summary: "Résumé",
      commentaire_axes: {
        section_1_identification_contexte: "ctx",
        section_2_faits_procedure_eu: "faits",
        section_3_sens: {},
        section_3bis_valeur: {},
        section_3ter_portee: {},
        section_4_dispositions_interpretées_table: [],
      },
    };
    expect(JurisprudenceEuAnalyzerSchema.safeParse(ok).success).toBe(true);

    expect(JurisprudenceEuAnalyzerSchema.safeParse({ reference: "x" }).success).toBe(false);
  });
});

