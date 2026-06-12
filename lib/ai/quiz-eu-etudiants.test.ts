import { describe, expect, it } from "vitest";
import {
  buildQuizEtudiantsUserPrompt,
  getQuizEuEtudiantsMarkdown,
  getQuizEuEtudiantsConversationPrompt,
} from "./prompts/quiz-eu-etudiants";
import { normalizeQuizEtudiantsForClient } from "./generators";

describe("quiz-eu-etudiants", () => {
  it("charge le prompt markdown étudiants", () => {
    const md = getQuizEuEtudiantsMarkdown();
    expect(md).toMatch(/examinateur pédagogique/i);
    expect(md).toMatch(/TYPE 5/i);
    expect(md).toMatch(/sens · valeur · portée/i);
  });

  it("conversation prompt sans schéma JSON embarqué", () => {
    const conv = getQuizEuEtudiantsConversationPrompt();
    expect(conv).not.toMatch(/SCHÉMA JSON OBLIGATOIRE/);
  });

  it("buildQuizEtudiantsUserPrompt — mode méthodologie", () => {
    const p = buildQuizEtudiantsUserPrompt({
      topic: "Méthode commentaire",
      niveau: "M2",
      count: 5,
      examMode: "methodologie",
    });
    expect(p).toMatch(/Méthodologie/);
    expect(p).toMatch(/TYPE 5/);
  });

  it("normalizeQuizEtudiantsForClient", () => {
    const out = normalizeQuizEtudiantsForClient({
      questions: [{ question: "Q?", why_others_wrong: ["A: …"] }],
    });
    const qs = out.questions as Record<string, unknown>[];
    expect(Array.isArray(qs[0].why_others_wrong)).toBe(true);
  });
});
