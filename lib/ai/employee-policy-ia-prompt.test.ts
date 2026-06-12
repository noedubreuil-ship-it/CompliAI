import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getEmployeePolicyIaMarkdown, getEmployeePolicyIaSystemPrompt } from "./prompts/employee-policy-ia";

describe("prompt politique IA employés", () => {
  it("fichier données avec Art. 4 et anti-hallucination délais", () => {
    const md = readFileSync(join(process.cwd(), "lib/ai/prompts/data", "employee-policy-ia-v1.md"), "utf8");
    expect(md.length).toBeGreaterThan(2500);
    expect(md).toContain("article 4 du Règlement (UE) 2024/1689");
    expect(md).toContain("RÈGLE AH1");
    expect(md).toContain("2 août 2026");
  });

  it("chargeur inclut enveloppe JSON CompliAI", () => {
    expect(getEmployeePolicyIaSystemPrompt()).toContain(getEmployeePolicyIaMarkdown().slice(0, 40));
    expect(getEmployeePolicyIaSystemPrompt()).toContain("INTERFACE COMPLIAI");
  });
});
