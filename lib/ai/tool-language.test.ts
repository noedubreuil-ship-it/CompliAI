import { describe, it, expect } from "vitest";
import { buildToolLanguageAddendum, detectLanguageOrNull } from "./query-translate";

/** Langue demandée par l'addendum, ou "fr" si aucun addendum (= prompt FR par défaut). */
function addendumLang(addendum: string): string {
  if (addendum === "") return "fr";
  return addendum.match(/s'exprime en (\w+)/)?.[1] ?? "?";
}

describe("detectLanguageOrNull", () => {
  it("renvoie null quand aucun marqueur ne matche (pas de repli 'en')", () => {
    expect(detectLanguageOrNull("Acme Corp ChatGPT, Claude")).toBeNull();
  });
  it("détecte le français", () => {
    expect(detectLanguageOrNull("Notre entreprise utilise ChatGPT pour les données")).toBe("fr");
  });
  it("détecte l'allemand", () => {
    expect(detectLanguageOrNull("Unsere Firma nutzt ChatGPT und werden die Daten nicht")).toBe("de");
  });
});

describe("buildToolLanguageAddendum — langue du document généré", () => {
  it("saisie sans marqueur + UI française → document français (régression corrigée)", () => {
    expect(addendumLang(buildToolLanguageAddendum("Acme Corp Tech / SaaS ChatGPT, Claude", "fr"))).toBe("fr");
  });

  it("saisie sans marqueur + UI anglaise → document anglais", () => {
    expect(addendumLang(buildToolLanguageAddendum("Acme Corp Tech / SaaS ChatGPT, Claude", "en"))).toBe("anglais");
  });

  it("texte français explicite l'emporte sur une UI anglaise", () => {
    expect(addendumLang(buildToolLanguageAddendum("Notre entreprise utilise ChatGPT pour les données clients", "en"))).toBe("fr");
  });

  it("texte allemand explicite l'emporte sur une UI française", () => {
    expect(addendumLang(buildToolLanguageAddendum("Unsere Firma nutzt ChatGPT und werden die Daten nicht", "fr"))).toBe("allemand");
  });

  it("sans locale ni marqueur → français par défaut", () => {
    expect(addendumLang(buildToolLanguageAddendum("Acme Corp"))).toBe("fr");
  });
});
