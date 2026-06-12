import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "employee-policy-ia-v1.md";

export function getEmployeePolicyIaMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — SORTIE JSON

Répondez **exclusivement** avec un objet JSON valide suivant le schéma du message utilisateur.

- Début : \`{\` · Fin : \`}\`
- Pas de prose hors JSON. Pas de \`\`\` autour du JSON.
- Respectez les Parties 3 à 7 du prompt métier ([À COMPLÉTER], formulations positives/négatives, pas de sanctions chiffrées inventées, dates AI Act précises partie 5).
`.trim();

export function getEmployeePolicyIaSystemPrompt(): string {
  return withPromptApplicationFooter(`${getEmployeePolicyIaMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}
