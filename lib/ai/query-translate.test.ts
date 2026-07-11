import { describe, it, expect } from "vitest";
import { detectLanguage } from "./query-translate";

describe("detectLanguage — langue de réponse du consultant", () => {
  const fr = [
    "Quelles sont les obligations d'un système d'IA à haut risque ?",
    "Résume l'article 5 de l'AI Act",
    "Explique l'article 22 du RGPD",
    "Mon chatbot doit-il informer l'utilisateur ?",
    "Qu'est-ce que le RGPD ?",
    "Combien de temps pour notifier une violation de données ?",
    "Dois-je nommer un DPO ?",
  ];
  it.each(fr)("détecte le français : %s", (q) => {
    expect(detectLanguage(q)).toBe("fr");
  });

  const en = [
    "What are the obligations of a high-risk AI system?",
    "Summarize article 5 of the AI Act",
    "Is a DPO mandatory for my company?",
  ];
  it.each(en)("détecte l'anglais : %s", (q) => {
    expect(detectLanguage(q)).toBe("en");
  });

  it("détecte l'allemand", () => {
    expect(detectLanguage("Welche Pflichten hat ein Hochrisiko-KI-System?")).toBe("de");
  });
  it("détecte l'espagnol", () => {
    expect(detectLanguage("Cuales son las obligaciones segun el reglamento?")).toBe("es");
  });
});
