/**
 * Outil « Générateur de clauses contractuelles IA » — CompliAI v1.
 * Art. 28 RGPD · Art. 25-30 AI Act · 7 types · 3 niveaux.
 */
import { AI_CONFIG } from "../config";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";
import { CLAUSES_IA_AVERTISSEMENT } from "./generateur-clauses-ia.constants";

export { CLAUSES_IA_AVERTISSEMENT } from "./generateur-clauses-ia.constants";

const PROMPT_FILE = "generateur-clauses-ia-v1.md";

export function getGenerateurClausesIaMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export type ClausesIaType =
  | "responsabilite_ia"
  | "transparence_algo"
  | "dpa_rgpd"
  | "conformite_ai_act"
  | "audit"
  | "propriete_intellectuelle"
  | "portabilite"
  | "package_complet";

export type ClausesIaNiveau = "essentielle" | "standard" | "renforcee";

export const CLAUSES_IA_JSON_OUTPUT_SPEC = `
## SCHÉMA JSON OBLIGATOIRE (réponse exclusive — pas de markdown autour)

{
  "type_clause": "Libellé du type demandé",
  "niveau": "essentielle | standard | renforcee",
  "avertissement_professionnel": "${CLAUSES_IA_AVERTISSEMENT.replace(/"/g, '\\"')}",
  "clauses": [
    {
      "numero": "ARTICLE [X]",
      "titre": "Titre de la clause",
      "texte": "Texte contractuel complet, prêt à insérer (langage juridique formel)",
      "base_legale": "Art. 28 RGPD / Art. 25 AI Act / …",
      "commentaire": "Note de personnalisation et points de négociation",
      "variante": "Variante optionnelle si pertinent",
      "niveau": "essentielle | standard | renforcee",
      "placeholders": ["[30] jours", "[À ADAPTER]"]
    }
  ],
  "notes_personnalisation": ["NOTE 1 — …", "NOTE 2 — …"],
  "annexes_recommandees": ["Annexe A — …"],
  "checklist_livraison": ["□ …"],
  "notes_negociation": "Synthèse négociation (3-5 phrases)",
  "risques_sans_clause": "Risques si clause absente ou imprécise",
  "disclaimer": "Reprise de l'avertissement professionnel"
}

Règles :
- Respecter le **catalogue PARTIE 2** et le **niveau** demandé (Essentielle / Standard / Renforcée).
- Mode **package_complet** : produire les 7 familles de clauses (responsabilité, transparence, DPA, AI Act, audit, PI, portabilité) au niveau demandé.
- Citer **uniquement** des articles EU certains ; délais entre crochets si non fournis par l'utilisateur.
- Inclure l'**interdiction d'entraînement** pour DPA et PI si applicable.
- Mentionner l'articulation **RGPD + AI Act** (Art. 2(7) AI Act) le cas échéant.
- Ne pas inventer de numéros d'articles.
`.trim();

export function getGenerateurClausesIaSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getGenerateurClausesIaMarkdown()}\n\n---\n\n${CLAUSES_IA_JSON_OUTPUT_SPEC}`,
  );
}

const TYPE_LABELS: Record<ClausesIaType, string> = {
  responsabilite_ia: "Responsabilité IA — Limitation, indemnisation, garanties",
  transparence_algo: "Transparence algorithmique — Logique, biais, explication",
  dpa_rgpd: "Sous-traitance RGPD (DPA) — Art. 28 RGPD complet",
  conformite_ai_act: "Conformité AI Act — Obligations fournisseur / déployeur",
  audit: "Droit d'audit — Accès logs, documentation, systèmes",
  propriete_intellectuelle: "Propriété intellectuelle IA — Outputs, modèles, données",
  portabilite: "Portabilité des données — Restitution en fin de contrat",
  package_complet: "Package complet — Toutes les clauses du catalogue",
};

const NIVEAU_LABELS: Record<ClausesIaNiveau, string> = {
  essentielle: "Essentielle — Clauses minimales légalement requises",
  standard: "Standard — Équilibre protection / praticabilité",
  renforcee: "Renforcée — Protection maximale (B2B à enjeux élevés)",
};

export type ClausesIaIntake = {
  clauseType: ClausesIaType;
  niveau: ClausesIaNiveau;
  partieA?: string;
  roleA?: string;
  partieB?: string;
  roleB?: string;
  contractType?: string;
  domain?: string;
  personalData?: string;
  aiClassification?: string;
  applicableLaw?: string;
  language?: string;
  contextExtra?: string;
};

export function buildGenerateurClausesIaUserPrompt(opts: ClausesIaIntake): string {
  const cell = (v: string | undefined, fallback = "[Non précisé — adapter]") =>
    v && v.trim() ? v.trim() : fallback;

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : GÉNÉRER DES CLAUSES CONTRACTUELLES IA

Appliquez intégralement le cahier système (PARTIES 1 à 5), le catalogue PARTIE 2 et la checklist PARTIE 5.

| Paramètre | Valeur |
| --- | --- |
| Type de clause | ${TYPE_LABELS[opts.clauseType]} |
| Niveau de protection | ${NIVEAU_LABELS[opts.niveau]} |
| Partie A (Prestataire / fournisseur) | ${cell(opts.partieA, "le Prestataire")} |
| Rôle AI Act — Partie A | ${cell(opts.roleA)} |
| Partie B (Client / utilisateur) | ${cell(opts.partieB, "le Client")} |
| Rôle AI Act — Partie B | ${cell(opts.roleB)} |
| Type de contrat | ${cell(opts.contractType)} |
| Domaine d'usage | ${cell(opts.domain)} |
| Données personnelles | ${cell(opts.personalData)} |
| Classification AI Act | ${cell(opts.aiClassification, "Inconnu")} |
| Droit applicable | ${cell(opts.applicableLaw, "Français")} |
| Langue des clauses | ${cell(opts.language, "Français")} |

## Contexte complémentaire

${cell(opts.contextExtra, "(aucun)")}

---

Produisez **uniquement** le JSON selon le schéma système.
- Reprenez les formulations du catalogue pour le type et le niveau demandés.
- Remplissez les crochets [X], [Y], délais et emails là où l'intake le permet ; sinon laissez [À ADAPTER] dans \`placeholders\`.
- \`avertissement_professionnel\` et \`disclaimer\` : texte obligatoire du cahier.`;
}

export function generateurClausesIaAnthropicParams(): {
  model: string;
  max_tokens: number;
  temperature: number;
} {
  const modelEnv =
    typeof process.env.AI_CLAUSES_MODEL === "string" ? process.env.AI_CLAUSES_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_CLAUSES === "string" ? process.env.AI_MAX_TOKENS_CLAUSES.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_CLAUSES === "string" ? process.env.AI_TEMPERATURE_CLAUSES.trim() : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(8192, Math.floor(Number(mtRaw)))
    : 4000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.1;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}
