import { describe, expect, it } from "vitest";

import { CONSULTANT_PRODUCTION_RULES } from "@/lib/ai/prompts/consultant-production-rules";
import { sanitizeRagTextForModel } from "@/lib/ai/sanitize-rag-context";
import { classifyConsultantQuestion } from "@/lib/ai/consultant-tokens";

/** Question de régression — DPO externalisé PME + transfert USA. */
export const DPO_EXTERNALISED_QUESTION =
  "Nous recrutons un DPO externalisé pour une PME de 80 salariés qui traite des données de santé via un logiciel RH hébergé aux États-Unis. Quelles sont nos obligations RGPD (base légale, contrat, transfert hors UE) et quels risques si nous ne le faisons pas ?";

/** Question de régression produit (présélection CV / AI Act). */
export const CV_PRESELECTION_QUESTION =
  "Notre entreprise développe un logiciel de présélection de CV qui attribue un score aux candidats à partir de leur expérience et de leurs compétences, mais c'est toujours un recruteur humain qui prend la décision finale d'embauche. Sommes-nous concernés par l'AI Act ? Si oui, quelles sont nos obligations principales et à quelle échéance ?";

export function scoreConsultantDpoRegressionAnswer(answer: string): {
  pass: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const a = answer.toLowerCase();

  if (/dpo.*obligatoire|désignation.*obligatoire.*dpo/i.test(answer) && !/probablement pas|pas automatiquement|à clarifier|selon les critères|wp243|grande échelle/i.test(a)) {
    failures.push("dpo_mandatory_without_qualification");
  }
  if (!/article\s*28|art\.\s*28|sous-traitant|contrat/i.test(a)) {
    failures.push("missing_processor_contract");
  }
  if (!/transfert|pays tiers|article\s*44|article\s*46|schrems|clauses contractuelles/i.test(a)) {
    failures.push("missing_transfer_analysis");
  }
  if (/base de veille de compliai|référence registre compliai|cache auto|urn:complai/i.test(answer)) {
    failures.push("metadata_leak");
  }
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }

  return { pass: failures.length === 0, failures };
}

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

/** Critères automatisables sur une réponse consultant (matcher post-génération). */
export function scoreConsultantCvRegressionAnswer(answer: string): {
  pass: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  const a = answer.toLowerCase();

  if (!/2\s*ao[ûu]t\s*2026|2\/08\/2026|02\.08\.2026/.test(a)) {
    failures.push("missing_deadline_2026_08_02");
  }
  if (/élaborée par compliai|produite par compliai/i.test(answer)) {
    failures.push("brand_signature_leak");
  }
  if (/jurisprudence applicable/i.test(answer)) {
    failures.push("repeated_jurisprudence_header");
  }
  if (/orange rom[aâ]nia/i.test(a) && /article\s*13|art\.\s*13/i.test(a)) {
    failures.push("forbidden_orange_romania_analogy");
  }
  if (/(discord|san-cnil)/i.test(a) && /article\s*15|art\.\s*15/i.test(a)) {
    failures.push("forbidden_discord_cnil_analogy");
  }
  if (/volker und markus schecke|schecke.*c-92\/09|c-92\/09.*schecke/i.test(a)) {
    failures.push("forbidden_schecke_citation");
  }
  const scheckeHits = (answer.match(/schecke|c-92\/09|c-93\/09/gi) ?? []).length;
  if (scheckeHits > 1) {
    failures.push("duplicate_schecke_citation");
  }
  if (/kommission.*c\.\s*allemagne|c-100\/13.*dispositifs médicaux/i.test(a)) {
    failures.push("forbidden_kommission_medical_devices");
  }
  if (/\bbdsg\b|\bzvop-2\b|\bslovénie\b.*zakon|\ballemagne\b.*§\s*26/i.test(a) && !/précisez votre juridiction|juridiction de déploiement/i.test(a)) {
    failures.push("unsolicited_national_law_development");
  }
  if (/^#{0,3}\s*[IVXLC]+\.\s/m.test(answer) || /\nI\.\sQUALIFICATION/i.test(answer)) {
    failures.push("roman_numeral_structure");
  }

  return { pass: failures.length === 0, failures };
}

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
