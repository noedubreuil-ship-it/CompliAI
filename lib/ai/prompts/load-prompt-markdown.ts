/**
 * Chargeur unique des prompts métier (.md) — garantit l'injection intégrale
 * du cahier utilisateur dans le system prompt (sans troncature).
 * Serveur uniquement (fs).
 */
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cache = new Map<string, string>();

export type PromptIntegrityRule = {
  /** Chaînes qui doivent figurer dans le markdown (sections clés du cahier). */
  mustInclude: string[];
  /** Taille minimale en caractères (détecte les résumés trop courts). */
  minChars?: number;
};

export const PROMPT_INTEGRITY: Record<string, PromptIntegrityRule> = {
  "resume-arrets-etudiants-v2.md": {
    minChars: 15_000,
    mustInclude: ["sens · valeur · portée", "MODE F", "RÈGLE N1", "PARTIE 3"],
  },
  "quiz-eu-etudiants-v1.md": {
    minChars: 8_000,
    mustInclude: ["examinateur pédagogique", "TYPE 5", "RÈGLE G1", "PARTIE 4"],
  },
  "recherche-jurisprudentielle-eu-v1.md": {
    minChars: 10_000,
    mustInclude: ["CJUE", "panorama", "RÈGLE R1"],
  },
  "scanner-page-web-v1.md": {
    minChars: 10_000,
    mustInclude: ["LIMITES ABSOLUES", "RGPD"],
  },
  "ropa-registre-art30-v1.md": {
    minChars: 4_000,
    mustInclude: ["article 30", "RoPA", "Art. 30"],
  },
  "jurisprudence-eu-commentaire-addendum-v2.md": {
    minChars: 10_000,
    mustInclude: ["SENS", "VALEUR", "PORTÉE"],
  },
  "ai-act-classifier-v1.md": {
    minChars: 20_000,
    mustInclude: ["CLASSIFIEUR AI ACT", "Annexe III", "Article 5"],
  },
  "art11-annex-iv-v1.md": {
    minChars: 15_000,
    mustInclude: ["Annexe IV", "Article 11"],
  },
  "employee-policy-ia-v1.md": {
    minChars: 15_000,
    mustInclude: ["Article 4", "littératie"],
  },
  "third-party-contract-analysis-v1.md": {
    minChars: 8_000,
    mustInclude: ["Article 28", "RGPD"],
  },
  "fria-art27-ai-act-v1.md": {
    minChars: 4_000,
    mustInclude: ["Article 27", "FRIA"],
  },
  "compliance-checklist-interactive-v1.md": {
    minChars: 10_000,
    mustInclude: ["CHECKLIST DE CONFORMITÉ", "QUESTIONNAIRE"],
  },
  "simulateur-cas-pratique-v1.md": {
    minChars: 20_000,
    mustInclude: ["SIMULATEUR DE CAS PRATIQUE", "RÈGLE E1", "SCORE TOTAL", "SYLLOGISME"],
  },
  "comparateur-legislations-eu27-v1.md": {
    minChars: 8_000,
    mustInclude: ["COMPARATEUR DE LÉGISLATIONS", "RÈGLE N1", "TABLEAU DES 27 DPA", "RÈGLE N5"],
  },
  "generateur-clauses-ia-v1.md": {
    minChars: 15_000,
    mustInclude: ["GÉNÉRATEUR DE CLAUSES", "Art. 28 RGPD", "NIVEAU STANDARD", "CHECKLIST"],
  },
  "analyseur-decisions-autorites-v1.md": {
    minChars: 12_000,
    mustInclude: ["ANALYSEUR DE DÉCISIONS", "RÈGLE D1", "Art. 83(2)", "SENS / VALEUR / PORTÉE"],
  },
  "memoire-conformite-user-v1.md": {
    minChars: 800,
    mustInclude: ["Mémoire de conformité", "synthese_executive", "tableau_risques"],
  },
  "audit-qr-user-v1.md": {
    minChars: 600,
    mustInclude: ["auditeur réglementaire", "preparation_conseils", "questions"],
  },
  "plan-memoire-user-v1.md": {
    minChars: 500,
    mustInclude: ["directeur de thèse", "bibliographie", "conseils_directeur"],
  },
  "explication-article-user-v1.md": {
    minChars: 400,
    mustInclude: ["professeur de droit", "niveau_3", "jurisprudence_cle"],
  },
  "investor-report-user-v1.md": {
    minChars: 600,
    mustInclude: ["due diligence", "key_risks", "compliance_snapshot"],
  },
};

export function loadPromptMarkdown(filename: string, options?: { skipIntegrity?: boolean }): string {
  if (!cache.has(filename)) {
    const path = join(process.cwd(), "lib/ai/prompts/data", filename);
    const content = readFileSync(path, "utf8");
    if (!options?.skipIntegrity) {
      assertPromptIntegrity(filename, content);
    }
    cache.set(filename, content);
  }
  return cache.get(filename)!;
}

export function assertPromptIntegrity(filename: string, content: string): void {
  const rule = PROMPT_INTEGRITY[filename];
  if (!rule) return;
  if (rule.minChars && content.length < rule.minChars) {
    throw new Error(
      `[prompt] ${filename} trop court (${content.length} < ${rule.minChars} car.). ` +
        `Relancez: python3 scripts/extract-tool-prompts-from-transcript.py`
    );
  }
  for (const needle of rule.mustInclude) {
    if (!content.includes(needle)) {
      throw new Error(
        `[prompt] ${filename} incomplet — section manquante: « ${needle} ». ` +
          `Mettez à jour lib/ai/prompts/data/${filename} avec le cahier complet.`
      );
    }
  }
}

/** Réinitialise le cache (tests uniquement). */
export function clearPromptMarkdownCache(): void {
  cache.clear();
}

/** Rappel injecté en fin de system prompt — le modèle doit appliquer tout le cahier. */
export const PROMPT_APPLICATION_FOOTER = `
---
## RAPPEL D'APPLICATION (obligatoire)

Appliquez **intégralement** le cahier métier ci-dessus : toutes les parties, règles, formats et checklists pertinentes pour la requête.
Ne résumez pas ce prompt système ; ne contournez pas les règles anti-hallucination ni les structures imposées.
`.trim();

export function withPromptApplicationFooter(markdown: string): string {
  return `${markdown}\n\n${PROMPT_APPLICATION_FOOTER}`;
}

/** Rappel en tête du message utilisateur — complète le footer système. */
export const USER_PROMPT_CAHIER_REMINDER =
  "Appliquez intégralement le cahier métier du message système (toutes les parties, règles et formats pertinents pour cette requête).\n\n";
