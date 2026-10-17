import { describe, expect, it } from "vitest";

import { CONSULTANT_PRODUCTION_RULES } from "@/lib/ai/prompts/consultant-production-rules";
import { sanitizeRagTextForModel } from "@/lib/ai/sanitize-rag-context";
import { classifyConsultantQuestion } from "@/lib/ai/consultant-tokens";
import {
  DPO_EXTERNALISED_QUESTION,
  CV_PRESELECTION_QUESTION,
  scoreConsultantDpoRegressionAnswer,
  scoreConsultantCvRegressionAnswer,
} from "@/lib/ai/consultant-answer-scoring";

// Ré-export pour compat (d'autres tests importent ces symboles depuis ici).
export {
  DPO_EXTERNALISED_QUESTION,
  CV_PRESELECTION_QUESTION,
  scoreConsultantDpoRegressionAnswer,
  scoreConsultantCvRegressionAnswer,
};

describe("consultant production rules prompt", () => {
  it("contient les garde-fous anti-remplissage jurisprudentiel et style prose", () => {
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/PRIORITÉ ABSOLUE/i);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/2 août 2026/);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/article 113/);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/Schecke/);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/chiffres romains/i);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/aucune signature/i);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/WP243|grande échelle/i);
    expect(CONSULTANT_PRODUCTION_RULES).toMatch(/une seule illustration nationale/i);
  });
});

describe("sanitize RAG context", () => {
  it("retire les métadonnées d'ingestion", () => {
    const raw =
      "Selon les informations disponibles dans la base de veille de CompliAI, le §26 BDSG… (cache auto - www.gesetze-im-internet.de) — partie 81/100 rgpd_nat (DE)";
    const out = sanitizeRagTextForModel(raw);
    expect(out).not.toMatch(/CompliAI|cache auto|partie 81|rgpd_nat/i);
    expect(out).toMatch(/BDSG/);
  });
});

describe("consultant question classification — échéances", () => {
  it("classe la question CV présélection comme complexe (budget tokens complet)", () => {
    expect(classifyConsultantQuestion(CV_PRESELECTION_QUESTION)).toBe("complex");
  });
});

describe("DPO externalisé — critères de régression réponse", () => {
  it("accepte une réponse prudente sur la désignation DPO", () => {
    const good = `
Pour une PME de 80 salariés traitant les données RH de ses salariés, la désignation d'un DPO n'est en principe pas automatiquement obligatoire au sens de l'article 37 : il faut vérifier l'activité de base et le critère de grande échelle (WP243). L'externalisation du rôle ne crée pas à elle seule l'obligation. En revanche, le contrat avec le prestataire DPO et le logiciel RH US relève de l'article 28 (sous-traitance) et des transferts (articles 44 et 46, Schrems II). Base légale RH et données de santé à documenter séparément.
`.trim();
    expect(scoreConsultantDpoRegressionAnswer(good).pass).toBe(true);
  });
});

describe("CV présélection — critères de régression réponse", () => {
  it("accepte une réponse type conforme", () => {
    const good = `
Oui, votre logiciel relève très probablement d'un système d'IA à haut risque au sens de l'annexe III, point 4, de l'AI Act, dès lors qu'il analyse et classe des candidatures. Les obligations des articles 8 à 15 s'appliquent ; l'article 113 fixe au 2 août 2026 l'entrée en application pour les systèmes visés à l'annexe III. Cumul RGPD : base légale, information des candidats, AIPD si profilage significatif. Des règles nationales peuvent s'ajouter selon l'État membre — précisez votre juridiction de déploiement pour un développement national.
`.trim();
    expect(scoreConsultantCvRegressionAnswer(good).pass).toBe(true);
  });

  it("rejette une réponse avec défauts observés en production", () => {
    const bad = `
I. QUALIFICATION
Jurisprudence applicable : CJUE, Volker und Markus Schecke, C-92/09…
Selon les informations disponibles dans la base de veille de CompliAI, le §26 BDSG…
`;
    const { pass, failures } = scoreConsultantCvRegressionAnswer(bad);
    expect(pass).toBe(false);
    expect(failures.length).toBeGreaterThan(2);
  });
});
