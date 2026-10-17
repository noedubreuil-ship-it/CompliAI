import { describe, it, expect } from "vitest";
import {
  scoreConsultantLiabilityAnswer,
  scoreSyllogismStructure,
  CONSULTANT_TRAP_QUESTIONS,
} from "./consultant-answer-scoring";

describe("scoreConsultantLiabilityAnswer — différenciation des branches", () => {
  it("accepte une réponse qui distingue civil et administratif", () => {
    const good =
      "Votre client peut engager votre responsabilité civile sur le fondement de l'article 82 du RGPD pour obtenir réparation du préjudice. Cela est distinct d'une éventuelle sanction administrative prononcée par l'autorité de contrôle au titre de l'article 83 : les deux régimes se cumulent indépendamment.";
    expect(scoreConsultantLiabilityAnswer(good).pass).toBe(true);
  });

  it("rejette une réponse qui confond ou omet un régime", () => {
    const bad = "Vous risquez une amende de l'autorité de contrôle.";
    const r = scoreConsultantLiabilityAnswer(bad);
    expect(r.pass).toBe(false);
    expect(r.failures).toContain("missing_civil_liability_regime");
    expect(r.failures).toContain("regimes_not_differentiated");
  });
});

describe("scoreSyllogismStructure", () => {
  it("accepte un raisonnement syllogistique en prose conclusion-first", () => {
    const good =
      "Votre système constitue un système d'IA à haut risque au sens de l'article 6 du Règlement (UE) 2024/1689. En effet, dès lors qu'il relève de l'annexe III et que chacune des conditions est remplie en l'espèce, le régime haut risque s'applique.";
    const r = scoreSyllogismStructure(good);
    expect(r.pass).toBe(true);
  });

  it("accepte une ouverture de responsabilité civile sous titre markdown (régression faux positif LIVE)", () => {
    // Ouverture réelle capturée par qa:consultant:live sur la question LIABILITY.
    const liability =
      "# Analyse juridique — Responsabilité civile et sanctions administratives\n\n" +
      "Votre client peut engager votre responsabilité civile pour obtenir réparation du préjudice financier subi, sur le fondement du droit commun de la responsabilité contractuelle ou extracontractuelle selon la nature de votre relation. Ce régime, dès lors que la faute et le lien de causalité sont établis, se distingue de la sanction administrative prévue à l'article 99 du Règlement (UE) 2024/1689.";
    const r = scoreSyllogismStructure(liability);
    expect(r.failures).not.toContain("no_conclusion_first");
    expect(r.failures).not.toContain("no_subsumption");
    expect(r.pass).toBe(true);
  });

  it("détecte l'absence de qualification, de subsomption et de base textuelle", () => {
    const bad = "C'est compliqué, cela dépend de votre contexte. 😊";
    const r = scoreSyllogismStructure(bad);
    expect(r.pass).toBe(false);
    expect(r.failures).toContain("no_regime_qualification");
    expect(r.failures).toContain("no_subsumption");
    expect(r.failures).toContain("no_textual_basis");
    expect(r.failures).toContain("emoji_present");
  });
});

describe("CONSULTANT_TRAP_QUESTIONS", () => {
  it("fournit un jeu de questions-pièges avec scorer attaché", () => {
    expect(CONSULTANT_TRAP_QUESTIONS.length).toBeGreaterThanOrEqual(3);
    for (const q of CONSULTANT_TRAP_QUESTIONS) {
      expect(q.question.length).toBeGreaterThan(40);
      expect(typeof q.scorer).toBe("function");
    }
  });
});
