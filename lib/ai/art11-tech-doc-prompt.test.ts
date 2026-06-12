import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getArt11AnnexIvMarkdown, getArt11TechnicalDocSystemPrompt } from "./prompts/art11-technical-doc";

describe("prompt documentation Art. 11 / Annexe IV", () => {
  it("fichier données avec 9 sections et règle G1", () => {
    const md = readFileSync(join(process.cwd(), "lib/ai/prompts/data", "art11-annex-iv-v1.md"), "utf8");
    expect(md.length).toBeGreaterThan(3000);
    expect(md).toContain("SECTION 9 — SURVEILLANCE POST-COMMERCIALISATION");
    expect(md).toContain("RÈGLE G1 — COMPLÉTER SANS INVENTER");
    expect(md).toContain("2 août 2026");
  });

  it("prompt API inclut enveloppe JSON CompliAI", () => {
    expect(getArt11TechnicalDocSystemPrompt()).toContain(getArt11AnnexIvMarkdown().slice(0, 50));
    expect(getArt11TechnicalDocSystemPrompt()).toContain("INTERFACE COMPLIAI");
  });
});
