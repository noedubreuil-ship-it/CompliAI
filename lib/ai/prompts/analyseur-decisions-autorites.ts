/**
 * Outil « Analyseur de décisions d'autorités » — CompliAI v1.
 * DPA · EDPB · AI Office — profils Professionnel / Étudiant / Rapide.
 */
import { AI_CONFIG } from "../config";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";

const PROMPT_FILE = "analyseur-decisions-autorites-v1.md";

export function getAnalyseurDecisionsAutoritesMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export type AnalyseurDecisionProfil = "professionnel" | "etudiant" | "rapide";

export const ANALYSEUR_DECISIONS_MARKDOWN_RULES = `
## INSTRUCTIONS TECHNIQUES DE SORTIE

- Répondez en **français**, en **markdown structuré** (titres ## / ###, listes, tableaux).
- **Ne produisez pas de JSON** — analyse narrative complète selon le profil.
- **Profil professionnel** : sections 0, 1, 2, 3, 4, 5 (sens/valeur/portée) + section 6 profil professionnel (checklist, outils CompliAI).
- **Profil étudiant** : sections 0, 1, 2, 3, 5 + section 6 profil étudiant (syllogisme, plan, questions — **Règle N1 : ne pas rédiger le commentaire complet**).
- **Profil rapide** : **uniquement** le format PARTIE 8 profil rapide (synthèse 1 page).
- Appliquez **RÈGLES D1–D5** : ne pas inventer montants, références, violations non présentes dans le texte.
- Si information absente du texte fourni : indiquer explicitement et renvoyer vers la source DPA.
`.trim();

export function getAnalyseurDecisionsAutoritesSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getAnalyseurDecisionsAutoritesMarkdown()}\n\n---\n\n${ANALYSEUR_DECISIONS_MARKDOWN_RULES}`,
  );
}

const PROFIL_LABELS: Record<AnalyseurDecisionProfil, string> = {
  professionnel: "Professionnel — Implications compliance, checklist, risques",
  etudiant: "Étudiant — Commentaire guidé, syllogisme, méthode (sans commentaire intégral)",
  rapide: "Rapide — Synthèse exécutive 1 page",
};

export function buildAnalyseurDecisionsUserPrompt(opts: {
  texteDecision: string;
  profil: AnalyseurDecisionProfil;
  reference?: string;
}): string {
  const refBlock =
    opts.reference?.trim() ?
      `\nRéférence indicée par l'utilisateur : ${opts.reference.trim()}\n`
    : "";

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : ANALYSER UNE DÉCISION D'AUTORITÉ

| Paramètre | Valeur |
| --- | --- |
| Profil | ${PROFIL_LABELS[opts.profil]} |

${refBlock}

## Texte / extrait de la décision à analyser

${opts.texteDecision.trim()}

---

Produisez l'analyse markdown complète selon le cahier système et le profil demandé.`;
}

export function analyseurDecisionsAnthropicParams(): {
  model: string;
  max_tokens: number;
  temperature: number;
} {
  const modelEnv =
    typeof process.env.AI_ANALYSEUR_DECISION_MODEL === "string" ?
      process.env.AI_ANALYSEUR_DECISION_MODEL.trim()
    : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_ANALYSEUR_DECISION === "string" ?
      process.env.AI_MAX_TOKENS_ANALYSEUR_DECISION.trim()
    : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_ANALYSEUR_DECISION === "string" ?
      process.env.AI_TEMPERATURE_ANALYSEUR_DECISION.trim()
    : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(8192, Math.floor(Number(mtRaw)))
    : 4500;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.1;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}

/** Extrait une ligne « EN UNE PHRASE » ou le titre H2 initial pour l'en-tête UI. */
export function parseAnalyseurDecisionHeadline(markdown: string): string | null {
  const m =
    markdown.match(/EN UNE PHRASE\s*:\s*\n+([^\n#]+)/i) ||
    markdown.match(/^#\s+(.+)/m) ||
    markdown.match(/Référence\s*:\s*(.+)/i);
  return m ? m[1].trim().slice(0, 200) : null;
}
