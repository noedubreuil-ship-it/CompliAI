import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "art11-annex-iv-v1.md";

export function getArt11AnnexIvMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

const PRODUCT_JSON_SHELL = `
---

## INTERFACE COMPLIAI — FORMAT DE SORTIE API

Répondez **exclusivement** avec un objet JSON valide conforme au schéma transmis dans le message utilisateur.

- Début : \`{\` — Fin : \`}\`
- Aucune prose hors JSON ; pas de blocs Markdown autour du JSON.
- Respectez strictement les règles G1 à G6 (Partie 3) du prompt : \`[À COMPLÉTER]\` lorsque les faits ou chiffres ne sont pas fournis ; ⚠️ sur les sous-sections critiques incomplètes ; **aucune donnée métrique inventée**.
- Distinction fournisseur / déployeur : expresse dans \`provider_role_note\`.

`.trim();

export function getArt11TechnicalDocSystemPrompt(): string {
  return withPromptApplicationFooter(`${getArt11AnnexIvMarkdown()}\n\n${PRODUCT_JSON_SHELL}`);
}
