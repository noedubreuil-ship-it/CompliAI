import { describe, expect, it } from "vitest";

import { EU27 } from "@/lib/data/eu27-registry";
import { stripConsultantMarkdownForPdf } from "@/lib/pdf/consultant-memo";

describe("Produit consultant — registre UE-27 fetch_url nationale", () => {
  const codes = ["BG", "HR", "CY", "LT", "HU", "MT"];

  it.each(codes)("pays %s : fetch_url assez longue pour ingestion auto / agent", (code) => {
    const fetchUrl = EU27[code]?.gdpr_law?.fetch_url?.trim();
    expect(fetchUrl && fetchUrl.length > 16).toBe(true);
  });
});

describe("Consultant markdown → PDF brut", () => {
  it("retire titres markdown et empilements doubles astérisques", () => {
    const raw = "### Titre\n\n**Mot** important et `[lien](/x)`.";
    expect(stripConsultantMarkdownForPdf(raw)).not.toContain("###");
    expect(stripConsultantMarkdownForPdf(raw)).not.toContain("**");
  });
});
