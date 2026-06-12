import { describe, expect, it } from "vitest";
import { generateDPIAPDF } from "./dpia";

describe("generateDPIAPDF", () => {
  it("produit un flux PDF avec charge utile type API DPIA", async () => {
    const minimal = {
      title: "DPIA — Test smoke",
      dpia_required: true,
      executive_summary: "Résumé smoke.",
      overall_risk_level: "medium",
      consultation_required: false,
      processing_description: {
        purposes_assessment: "Fins.",
        legal_basis: "Art. 6(1)(f) RGPD",
        proportionality: "Prop.",
        necessity: "Nécessité.",
      },
      risks: [
        {
          risk: "Fuite données",
          threat: "Compromission",
          likelihood: "low",
          severity: "high",
          residual_risk: "medium",
          measures: "Chiffrement.",
        },
      ],
      measures: [
        {
          category: "Technique",
          measure: "MFA admin",
          article_ref: "Art. 32 RGPD",
          status: "implemented",
        },
      ],
      action_plan: ["Formaliser DPIA.", "Informer Art. 13–14."],
      data_subject_rights: { information: "Bandeau", access: "Portail", rectification: "Email", erasure: "Demandes", portability: "Export", opposition: "Lien STOP" },
    };

    const buf = await generateDPIAPDF(minimal, "Traitement smoke");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(800);
    expect(buf.subarray(0, 4).toString("binary")).toBe("%PDF");
  });
});
