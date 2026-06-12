/**
 * Re-exports + table d'aiguillage des prompts par outil.
 *
 * Toute route IA doit, dans la mesure du possible, passer par
 * `lib/ai/client.callClaude({ tool, … })` qui consulte cette table.
 */

import { MASTER_SYSTEM_PROMPT } from "./master";
import { UNIVERSAL_CONSULTANT_PROTOCOL } from "./universal-protocol";
import { JURISPRUDENCE_VERIFICATION_PROTOCOL } from "./jurisprudence-verification";
import { CONSULTANT_DEFINITIVE_PROTOCOL } from "./consultant-definitive-protocol";
import {
  CONSULTANT_PROMPT,
  SCANNER_PROMPT,
  DOC_ART11_PROMPT,
  DOC_FRIA_PROMPT,
  DOC_MEMOIRE_PROMPT,
  CERVEAU_PROMPT,
} from "./tools";
import { ARRETS_GUIDE_SYSTEM_PROMPT } from "./arrets-guide";
import { getQuizEuEtudiantsConversationPrompt } from "./quiz-eu-etudiants";

export { MASTER_SYSTEM_PROMPT } from "./master";
export { ARRETS_GUIDE_SYSTEM_PROMPT } from "./arrets-guide";
export { QUIZ_EU_INTERACTIVE_SYSTEM_PROMPT, getQuizEuEtudiantsConversationPrompt } from "./quiz-eu-etudiants";
export { UNIVERSAL_CONSULTANT_PROTOCOL } from "./universal-protocol";
export { JURISPRUDENCE_VERIFICATION_PROTOCOL } from "./jurisprudence-verification";
export { CONSULTANT_DEFINITIVE_PROTOCOL } from "./consultant-definitive-protocol";
export {
  CONSULTANT_PROMPT,
  SCANNER_PROMPT,
  DOC_ART11_PROMPT,
  DOC_FRIA_PROMPT,
  DOC_MEMOIRE_PROMPT,
  CERVEAU_PROMPT,
} from "./tools";

export type ToolName =
  | "consultant"
  | "scanner"
  | "doc_art11"
  | "doc_fria"
  | "doc_memoire"
  | "cerveau"
  | "quiz"
  | "arrets_guide";

/**
 * Mapping outil → prompt spécialisé (sans le master prompt).
 * Pour `arrets_guide` et `quiz`, le texte ci-dessous correspond au corps du system prompt dédié
 * (voir buildSystemPrompt : ces outils n'héritent pas du master consultant).
 */
export const TOOL_PROMPTS: Record<ToolName, string> = {
  consultant: CONSULTANT_PROMPT,
  scanner: SCANNER_PROMPT,
  doc_art11: DOC_ART11_PROMPT,
  doc_fria: DOC_FRIA_PROMPT,
  doc_memoire: DOC_MEMOIRE_PROMPT,
  cerveau: CERVEAU_PROMPT,
  quiz: getQuizEuEtudiantsConversationPrompt(),
  arrets_guide: ARRETS_GUIDE_SYSTEM_PROMPT,
};

/**
 * Construit le system prompt final en combinant, dans cet ordre :
 *   1. MASTER_SYSTEM_PROMPT — identité, registre, anti-hallucination, clôture,
 *      règle § 4 bis (jurisprudence obligatoire sous chaque article).
 *   2. UNIVERSAL_CONSULTANT_PROTOCOL — protocole opérationnel v2.0 (qualification
 *      universelle, citations, anti-hallucination renforcé, règles par texte).
 *   3. JURISPRUDENCE_VERIFICATION_PROTOCOL — 4 contrôles avant citation,
 *      liste noire des affaires fréquemment mal utilisées, recommandations
 *      par domaine, séries CNIL, sources RAG à filtrer, formule de repli.
 *   4. CONSULTANT_DEFINITIVE_PROTOCOL (**consultant uniquement**) — synthèse
 *      « prompt universel » : qualification préalable, conclusions intangibles,
 *      structures-types, clôture longue développée pour le canal chat.
 *   5. TOOL_PROMPTS[tool] — mission spécifique de l'outil.
 *
 * Les protocoles **1 à 3** s'appliquent à **tous** les outils **sauf**
 * `arrets_guide` et `quiz` (prompts pédagogiques / examinateur autonomes).
 * Le **4** uniquement au **consultant** chat.
 */
export function buildSystemPrompt(tool: ToolName): string {
  if (tool === "arrets_guide") {
    return ARRETS_GUIDE_SYSTEM_PROMPT;
  }
  if (tool === "quiz") {
    return getQuizEuEtudiantsConversationPrompt();
  }
  let body =
    `${MASTER_SYSTEM_PROMPT}\n\n` +
    `${UNIVERSAL_CONSULTANT_PROTOCOL}\n\n` +
    `${JURISPRUDENCE_VERIFICATION_PROTOCOL}`;
  if (tool === "consultant") {
    body += `\n\n${CONSULTANT_DEFINITIVE_PROTOCOL}`;
  }
  body += `\n\n${TOOL_PROMPTS[tool]}`;
  return body;
}
