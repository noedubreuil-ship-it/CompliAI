import { describe, expect, it } from "vitest";
import {
  buildResumeArretUserPrompt,
  getArretsGuideSystemPrompt,
  getResumeArretsEtudiantsMarkdown,
} from "./prompts/arrets-guide";
import { PROMPT_APPLICATION_FOOTER } from "./prompts/load-prompt-markdown";
import { normalizeResumeArretForClient } from "./generators";

describe("resume-arrets-etudiants v2", () => {
  it("charge le prompt markdown v2 avec sens · valeur · portée", () => {
    const md = getResumeArretsEtudiantsMarkdown();
    expect(md).toMatch(/sens · valeur · portée/i);
    expect(md).toMatch(/MODE F/);
    expect(md).toMatch(/\[F\] Fiche structurée/);
    expect(md).toMatch(/professeur de droit européen/i);
  });

  it("buildResumeArretUserPrompt — mode FC JSON", () => {
    const p = buildResumeArretUserPrompt({
      text: "x".repeat(60),
      mode: "FC",
      niveau: "M1",
    });
    expect(p).toMatch(/mode_demande.*FC/);
    expect(p).toMatch(/NIVEAU ÉTUDIANT : M1/);
    expect(p).toMatch(/UNIQUEMENT avec le JSON/);
  });

  it("buildResumeArretUserPrompt — mode E prose", () => {
    const p = buildResumeArretUserPrompt({ text: "arrêt test", mode: "E", niveau: "L2" });
    expect(p).toMatch(/MODE DEMANDÉ : E/);
    expect(p).toMatch(/markdown structurée/);
    expect(p).not.toMatch(/UNIQUEMENT avec le JSON/);
  });

  it("normalizeResumeArretForClient — solution et portée", () => {
    const out = normalizeResumeArretForClient({
      fiche: {
        solution_dispositif: "Dispositif",
        solution_motifs: "Motifs",
      },
      sens_valeur_portee: { portee: "Portée ratione materiae" },
    });
    const fiche = out.fiche as Record<string, unknown>;
    expect(fiche.solution).toContain("Dispositif");
    expect(fiche.portee).toBe("Portée ratione materiae");
  });

  it("getArretsGuideSystemPrompt — cahier complet + rappel d'application", () => {
    const sys = getArretsGuideSystemPrompt();
    expect(sys).toContain(getResumeArretsEtudiantsMarkdown());
    expect(sys).toContain(PROMPT_APPLICATION_FOOTER);
  });
});
