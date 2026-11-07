import { describe, it, expect } from "vitest";
import {
  extractGroundedSources,
  buildProvenanceBody,
  buildProvenanceSection,
} from "./document-provenance";

const CTX =
  "=== SOURCE === Règlement (UE) 2016/679 article 35 ; Règlement (UE) 2024/1689 article 27. " +
  "Arrêt ECLI:EU:C:2020:559 (Schrems II). === FIN ===";

describe("extractGroundedSources", () => {
  it("extrait règlements et ECLI du contexte", () => {
    const s = extractGroundedSources(CTX);
    expect(s.regulations).toContain("Règlement (UE) 2016/679");
    expect(s.regulations).toContain("Règlement (UE) 2024/1689");
    expect(s.eclis).toContain("ECLI:EU:C:2020:559");
  });

  it("ne duplique pas une source répétée", () => {
    const s = extractGroundedSources(CTX + " " + CTX);
    expect(s.regulations.filter((r) => r === "Règlement (UE) 2016/679")).toHaveLength(1);
  });
});

describe("buildProvenanceBody", () => {
  it("date et réserve toujours présentes", () => {
    const body = buildProvenanceBody({ generatedAt: new Date("2026-11-07T10:00:00Z") });
    expect(body).toMatch(/généré le 7 novembre 2026/);
    expect(body).toMatch(/Droit applicable arrêté à cette date/);
    expect(body).toMatch(/ne se substitue pas à une consultation/);
  });

  it("liste les sources quand le contexte en contient", () => {
    const body = buildProvenanceBody({ sourceContext: CTX, generatedAt: new Date("2026-11-07") });
    expect(body).toMatch(/Textes mobilisés/);
    expect(body).toMatch(/Règlement \(UE\) 2024\/1689/);
    expect(body).toMatch(/ECLI:EU:C:2020:559/);
  });

  it("reste valide sans contexte", () => {
    const body = buildProvenanceBody();
    expect(body).toMatch(/Document généré le/);
    expect(body).not.toMatch(/Textes mobilisés/);
  });
});

describe("buildProvenanceSection", () => {
  it("renvoie une section { heading, body }", () => {
    const s = buildProvenanceSection();
    expect(s.heading).toBe("Provenance et références");
    expect(s.body.length).toBeGreaterThan(20);
  });
});
