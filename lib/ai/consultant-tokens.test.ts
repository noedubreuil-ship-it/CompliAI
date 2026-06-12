import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyConsultantQuestion,
  resolveConsultantOutputMaxTokens,
  resolveConsultantBriefOutputMaxTokens,
} from "./consultant-tokens";

describe("classifyConsultantQuestion", () => {
  it("détecte une question courte de définition comme simple", () => {
    expect(classifyConsultantQuestion("Qu'est-ce que l'article 22 du RGPD ?")).toBe(
      "simple"
    );
  });

  it("classe analyse longue comme complexe", () => {
    expect(
      classifyConsultantQuestion(
        "Je déploie un dispositif de pointage biométrique en sous-traitance : analyse complète RGPD avec bases légales, mesures organisationnelles, documentation et exposition des risques pour un groupe de 200 salariés en France."
      )
    ).toBe("complex");
  });

  it("mention « puis-je » déclenche complexe même si texte court", () => {
    expect(classifyConsultantQuestion("Puis-je filmer le hall d'entrée avec reconnaissance faciale ?")).toBe(
      "complex"
    );
  });
});

describe("resolveConsultantOutputMaxTokens — plans", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mode brief : plafond sortie par défaut 2048", () => {
    vi.stubEnv("AI_MAX_TOKENS_CONSULTANT_BRIEF", "");
    expect(resolveConsultantBriefOutputMaxTokens()).toBe(2048);
  });

  it("mode brief : respecte AI_MAX_TOKENS_CONSULTANT_BRIEF", () => {
    vi.stubEnv("AI_MAX_TOKENS_CONSULTANT_BRIEF", "1536");
    expect(resolveConsultantBriefOutputMaxTokens()).toBe(1536);
  });

  it("plafonne le gratuit à freeCap même si la config paid est haute", () => {
    vi.stubEnv("AI_MAX_TOKENS_CONSULTANT_FREE", "1500");
    vi.stubEnv("AI_CONSULTANT_TOKENS_COMPLEX", "5000");

    expect(
      resolveConsultantOutputMaxTokens(
        "Analyse très longue " + "x".repeat(400),
        "free",
        5000
      )
    ).toBe(1500);
  });

  it("gratuit : question complexe atteint le plafond consultant (défaut env)", () => {
    expect(
      resolveConsultantOutputMaxTokens(
        "Je déploie un dispositif de pointage biométrique en sous-traitance : analyse complète RGPD avec bases légales, mesures organisationnelles, documentation et exposition des risques pour un groupe de 200 salariés en France.",
        "free",
        8192
      )
    ).toBe(8192);
  });

  it("paid complex atteint le plafond consultant", () => {
    vi.stubEnv("AI_CONSULTANT_TOKENS_COMPLEX", "99999");
    expect(
      resolveConsultantOutputMaxTokens(
        "Analyse complète RGPD biométrie " + "z".repeat(350),
        "pro",
        8192
      )
    ).toBe(8192);
  });

  it("plans payants : plafond complet même pour une question courte", () => {
    vi.stubEnv("AI_CONSULTANT_TOKENS_SIMPLE", "800");
    expect(
      resolveConsultantOutputMaxTokens(
        "Définition : qu'est-ce que le AI Act ?",
        "starter",
        8192
      )
    ).toBe(8192);
  });
});
