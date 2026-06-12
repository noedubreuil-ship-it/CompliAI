import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAiActClassifierMarkdown, getAiActClassifierSystemPrompt } from "./prompts/ai-act-classifier";

describe("prompt classificateur AI Act", () => {
  it("fichier données présent avec sections clés", () => {
    const md = readFileSync(
      join(process.cwd(), "lib/ai/prompts/data", "ai-act-classifier-v1.md"),
      "utf8",
    );
    expect(md.length).toBeGreaterThan(2000);
    expect(md).toContain("ÉTAPE 0 — EST-CE UN SYSTÈME D'IA");
    expect(md).toContain("Art. 5(1)(g)");
    expect(md).toContain("PARTIE 8 — ANTI-HALLUCINATION");
  });

  it("chargeur inclut la coquille JSON produit", () => {
    const full = getAiActClassifierSystemPrompt();
    expect(full).toContain(getAiActClassifierMarkdown().slice(0, 80));
    expect(full).toContain("INTERFACE COMPLIAI");
    expect(full).toContain("JSON");
  });
});
