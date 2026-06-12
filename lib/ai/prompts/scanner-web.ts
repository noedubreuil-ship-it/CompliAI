import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "scanner-page-web-v1.md";

export function getScannerWebMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const OUTPUT_SHELL = `
---

## INSTRUCTIONS DE RÉPONSE

- Langue : **français**.
- Format : **uniquement du Markdown** (titres \`##\` / \`###\`, tableaux, listes). **Aucun** JSON ; pas de blocs \`\`\`json.
- Longueur : rapport **complet** couvrant les blocs 1 à 6, la synthèse globale, les recommandations, et la section « non vérifiable » — reste proportionné (pas de remplissage inutile).
- Cohérence : intègre **explicitement** les indices de l’analyse automatique fournis dans le message utilisateur ; complète-les avec ton expertise, sans les contredire sans justification.
`.trim();

/** Prompt système dédié au scanner page web (sans passer par le master consultant complet). */
export function getScannerWebSystemPrompt(): string {
  return withPromptApplicationFooter(`${getScannerWebMarkdown()}\n\n${OUTPUT_SHELL}`);
}
