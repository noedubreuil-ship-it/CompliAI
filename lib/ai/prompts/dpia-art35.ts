import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "dpia-art35-rgpd-v1.md";

export function getDpiaArt35Markdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — FORMAT DE SORTIE API

Répondez **exclusivement** avec un objet JSON valide conforme au schéma décrit en Partie 2.
- Début obligatoire : \`{\`
- Fin obligatoire : \`}\`
- Aucun texte hors JSON ; pas de blocs Markdown ; pas de commentaires dans le JSON.
- La valeur de \`overall_risk_level\` doit être exactement : low | medium | high | critical.
- La valeur de \`likelihood\`, \`severity\`, \`residual_risk\` dans \`risks[]\` : low | medium | high | critical.
- Le champ \`consultation_required\` est obligatoire et booléen.
- Le tableau \`action_plan\` contient au minimum 3 actions concrètes avec responsable et délai.
- Ne jamais citer un article RGPD inexistant (ex. "Art. 35bis", "Art. 7 RGPD §3a").
`.trim();

export function getDpiaArt35SystemPrompt(): string {
  return withPromptApplicationFooter(`${getDpiaArt35Markdown()}\n\n${PRODUCT_JSON_SHELL}`);
}
