import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_CHECKLIST_JSON_SPEC,
  getComplianceChecklistMarkdown,
  getComplianceChecklistSystemPrompt,
} from "./prompts/compliance-checklist";
import { buildChecklistPrompt, normalizeComplianceChecklistBody } from "./generators";

describe("Compliance checklist métier prompt", () => {
  it("documentation md non vide avec mots-clés applicabilité", () => {
    const md = getComplianceChecklistMarkdown();
    expect(md.length).toBeGreaterThan(1500);
    expect(md).toMatch(/sélection|ITEMS NON APPLICABLES|tool_link/i);
    expect(md).toMatch(/A-001|B-001|AI4-001/i);
    expect(md).toMatch(/BANQUE COMPLÈTE/i);
  });

  it("system prompt concatène le métier et le bloc JSON artefact", () => {
    const sys = getComplianceChecklistSystemPrompt();
    expect(sys).toMatch(/INTERFACE COMPLIAI/);
    expect(sys.includes(getComplianceChecklistMarkdown())).toBe(true);
  });

  it("COMPLIANCE_CHECKLIST_JSON_SPEC contient les clés critiques UI", () => {
    expect(COMPLIANCE_CHECKLIST_JSON_SPEC).toMatch(/non_applicable_exclusions/);
    expect(COMPLIANCE_CHECKLIST_JSON_SPEC).toMatch(/tool_link_slug/);
    expect(COMPLIANCE_CHECKLIST_JSON_SPEC).toMatch(/canonical_ref/);
    expect(COMPLIANCE_CHECKLIST_JSON_SPEC).toMatch(/deadline_iso/);
  });
});

describe("Compliance checklist generators", () => {
  it("normalise les alias d’intake (pays, ressources)", () => {
    const n = normalizeComplianceChecklistBody({
      organization_primary_country: "BE",
      resources_available: "DPO",
      sector: "Fin",
    });
    expect(n.ops_country).toBe("BE");
    expect(n.compliance_resources).toBe("DPO");
  });

  it("buildChecklistPrompt injecte intake et schéma JSON", () => {
    const p = buildChecklistPrompt({
      regulation: "RGPD (UE 2016/679)",
      company_size: "10-49",
      sector: "Santé",
      specific_context: "Hôpital test",
    });
    expect(p).toMatch(/SCHÉMA JSON|## SCHÉMA JSON/);
    expect(p).toContain("Santé");
    expect(p).toContain("Hôpital test");
  });
});
