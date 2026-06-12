import { describe, expect, it, beforeEach } from "vitest";
import {
  buildComparateurCompareUserPrompt,
  buildComparateurPanoramaUserPrompt,
  getComparateurLegislationsMarkdown,
  getComparateurLegislationsSystemPrompt,
} from "./prompts/comparateur-legislations";
import { PROMPT_APPLICATION_FOOTER, clearPromptMarkdownCache } from "./prompts/load-prompt-markdown";

describe("comparateur-legislations UE-27", () => {
  beforeEach(() => {
    clearPromptMarkdownCache();
  });

  it("charge le cahier métier complet", () => {
    const md = getComparateurLegislationsMarkdown();
    expect(md.length).toBeGreaterThan(8_000);
    expect(md).toMatch(/COMPARATEUR DE LÉGISLATIONS/i);
    expect(md).toMatch(/RÈGLE N1/i);
    expect(md).toMatch(/TABLEAU DES 27 DPA/i);
  });

  it("system prompt — cahier + JSON + footer", () => {
    const sys = getComparateurLegislationsSystemPrompt();
    expect(sys).toContain(getComparateurLegislationsMarkdown());
    expect(sys).toContain(PROMPT_APPLICATION_FOOTER);
    expect(sys).toMatch(/bilateral \| panorama/i);
  });

  it("buildComparateurCompareUserPrompt — registre injecté", () => {
    const p = buildComparateurCompareUserPrompt({
      countryCodes: ["FR", "DE"],
      focus: "rgpd",
    });
    expect(p).toMatch(/COMPARAISON BILATÉRALE/i);
    expect(p).toMatch(/REGISTRE EU-27 COMPLIAI/i);
    expect(p).toMatch(/CNIL|France/i);
    expect(p).toMatch(/BfDI|Allemagne/i);
  });

  it("buildComparateurPanoramaUserPrompt — 27 pays", () => {
    const p = buildComparateurPanoramaUserPrompt({ focus: "nis2" });
    expect(p).toMatch(/PANORAMA UE-27/i);
    expect(p).toMatch(/NIS2/i);
  });
});
