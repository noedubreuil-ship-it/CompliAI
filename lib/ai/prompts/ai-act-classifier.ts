import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "ai-act-classifier-v1.md";

export function getAiActClassifierMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

/** Consignes ajoutées pour l’interface CompliAI (sortie strictement JSON). */
const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — FORMAT DE SORTIE API

Répondez **exclusivement** avec un objet JSON valide conforme au schéma transmis dans le message utilisateur.
- Début obligatoire : \`{\`
- Fin obligatoire : \`}\`
- Aucun texte hors JSON ; pas de blocs Markdown ; pas de commentaires dans le JSON.
- La valeur de \`classification\` doit être **exactement** l’une des quatre chaînes autorisées (orthographe et casse).
- Les montants de sanctions sont des **plafonds** légaux ; les coûts sont des **ordres de grandeur indicatifs** (jamais un devis).
- Si des faits essentiels manquent : remplissez \`uncertainty_zones\` et \`intake_followup_questions\` (3 questions max) sans bloquer la classification la plus probable.
`.trim();

export function getAiActClassifierSystemPrompt(): string {
  return withPromptApplicationFooter(`${getAiActClassifierMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}
