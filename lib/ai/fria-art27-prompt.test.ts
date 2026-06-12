import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FRIA_27_OUTPUT_JSON_SPEC, getFRIA27Markdown, getFRIA27SystemPrompt } from "./prompts/fria-art27";

describe("prompt FRIA Art. 27 AI Act", () => {
  it("fichier métier — honesté, distinction FRIA/AIPD, 2 août 2026", () => {
    const md = readFileSync(join(process.cwd(), "lib/ai/prompts/data", "fria-art27-ai-act-v1.md"), "utf8");
    expect(md.length).toBeGreaterThan(2800);
    expect(md).toContain("Article 27");
    expect(md).toContain("AIPD");
    expect(md).toContain("EU AIDA");
    expect(md).toContain("2026");
    expect(md).toContain("G1");
  });

  it("prompt système + schéma JSON exporté", () => {
    expect(getFRIA27SystemPrompt()).toContain(getFRIA27Markdown().slice(0, 40));
    expect(getFRIA27SystemPrompt()).toContain("INTERFACE COMPLIAI");
    expect(getFRIA27SystemPrompt()).toMatch(/objet racine|Concision/);
    expect(FRIA_27_OUTPUT_JSON_SPEC).toContain("section3_fundamental_rights");
    expect(FRIA_27_OUTPUT_JSON_SPEC).toContain("deployment_recommendation");
  });
});
