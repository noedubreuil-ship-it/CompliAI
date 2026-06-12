import { describe, expect, it } from "vitest";
import { detectEuMemberCountriesFromQuestion, normalizeForCountryMatch } from "./country-detection";

describe("detectEuMemberCountriesFromQuestion", () => {
  it("détecte la France à partir du qualificatif territorial", () => {
    expect(detectEuMemberCountriesFromQuestion("Ma société opère depuis la France pour la partie RGPD biométrique.")).toContain("FR");
  });

  it("détecte la France lorsque CNIL est citée", () => {
    expect(detectEuMemberCountriesFromQuestion("Quelle ligne CNIL pour AIPD ?")).toContain("FR");
  });

  it("détecte l'Allemagne (BfDI / Allemagne)", () => {
    expect(detectEuMemberCountriesFromQuestion("Comparatif BfDI et données employeur en Allemagne.")).toContain("DE");
  });

  it("capture les codes ISO2 en majuscules isolés sans confondre « français » avec FR", () => {
    expect(detectEuMemberCountriesFromQuestion("Nous opérons en FR uniquement mais texte français.")).toContain("FR");
    expect(detectEuMemberCountriesFromQuestion("Une réponse générale en français sur le RGPD.")).not.toContain("FR");
  });

  it("retourne plusieurs pays lorsque plusieurs indices cumulés", () => {
    expect(
      detectEuMemberCountriesFromQuestion("Conformité groupe en France et Belgique pour salariés en Allemagne.")
        .sort()
    ).toEqual(["BE", "DE", "FR"].sort());
  });

  it("retourne [] sans ancre nationale", () => {
    expect(detectEuMemberCountriesFromQuestion("Qu'est-ce que l'article 22 du RGPD ?")).toEqual([]);
  });

  it("enrichit la détection via le registre UE-27 (mots-clés DPA/villes)", () => {
    expect(detectEuMemberCountriesFromQuestion("Conformité DPA avec bureau à Munich.")).toContain("DE");
    expect(detectEuMemberCountriesFromQuestion("Représentant à Varsovie et loi nationale polonaise.")).toContain(
      "PL"
    );
  });
});

describe("normalizeForCountryMatch", () => {
  it("retire les accents pour les tests de tokens", () => {
    expect(normalizeForCountryMatch("Français")).toContain("francais");
  });
});
