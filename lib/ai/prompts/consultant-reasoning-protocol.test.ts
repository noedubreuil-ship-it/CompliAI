import { describe, it, expect } from "vitest";
import { CONSULTANT_REASONING_PROTOCOL } from "./consultant-reasoning-protocol";
import { buildConsultantSystemPrompt } from "./build-consultant-system-prompt";

describe("CONSULTANT_REASONING_PROTOCOL", () => {
  it("réintroduit la méthode de qualification du fondateur", () => {
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/SYLLOGISME/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/ratione materiae/);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/ratione personae/);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/ratione temporis/);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/interdiction/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/spécialité/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/lex posterior/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/primauté/i);
  });

  it("qualifie explicitement les régimes (administratif, civil, pénal, droits fondamentaux)", () => {
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/administratif/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/responsabilité civile/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/pénal/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/droits fondamentaux/i);
  });

  it("impose la discipline de fiabilité des sources de la bibliothèque", () => {
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/=== SOURCE/);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/pertinent/i);
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/à vérifier sur EUR-Lex/i);
  });

  it("NE réintroduit PAS les défauts proscrits (filler jurisprudentiel, chiffres romains)", () => {
    // L'en-tête « Jurisprudence applicable » est interdit par le validateur de citations.
    expect(CONSULTANT_REASONING_PROTOCOL).not.toMatch(/Jurisprudence applicable/i);
    // Pas de structure imposée en chiffres romains (scorer CV roman_numeral_structure).
    expect(CONSULTANT_REASONING_PROTOCOL).not.toMatch(/\bI\.\s*QUALIFICATION/i);
    // La pyramide inversée (prose, conclusion d'abord) doit rester la règle.
    expect(CONSULTANT_REASONING_PROTOCOL).toMatch(/prose articulée/i);
  });
});

describe("buildConsultantSystemPrompt", () => {
  it("injecte le protocole de raisonnement dans la pile du chat", () => {
    const prompt = buildConsultantSystemPrompt();
    expect(prompt).toMatch(/PROTOCOLE DE RAISONNEMENT/);
    expect(prompt).toMatch(/ratione materiae/);
    // Les règles de production restent présentes et en amont (priorité absolue).
    expect(prompt.indexOf("PRIORITÉ ABSOLUE")).toBeLessThan(prompt.indexOf("PROTOCOLE DE RAISONNEMENT"));
  });
});
