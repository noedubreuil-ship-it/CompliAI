import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "third-party-contract-analysis-v1.md";

export function getThirdPartyContractAnalysisMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — SORTIE JSON

Répondez **exclusivement** avec un objet JSON valide conforme au schéma envoyé dans le **message utilisateur**.

- Début par \`{\` · fin par \`}\`
- Aucune prose hors JSON. Aucun bloc \`\`\` autour.
- Respectez Parties 2 à 8 du prompt métier (pondération § Partie 4, règles A1–A6).
`.trim();

export function getThirdPartyContractAnalysisSystemPrompt(): string {
  return withPromptApplicationFooter(`${getThirdPartyContractAnalysisMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}
