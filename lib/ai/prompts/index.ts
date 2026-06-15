/**
 * Re-exports + table d'aiguillage des prompts par outil.
 *
 * Toute route IA doit, dans la mesure du possible, passer par
 * `lib/ai/client.callClaude({ tool, … })` qui consulte cette table.
 */

import { MASTER_SYSTEM_PROMPT } from "./master";
import { UNIVERSAL_CONSULTANT_PROTOCOL } from "./universal-protocol";
import { JURISPRUDENCE_VERIFICATION_PROTOCOL } from "./jurisprudence-verification";
import { buildConsultantSystemPrompt } from "./build-consultant-system-prompt";
import { CONSULTANT_PRODUCTION_RULES } from "./consultant-production-rules";
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
export { buildConsultantSystemPrompt } from "./build-consultant-system-prompt";
export { CONSULTANT_PRODUCTION_RULES } from "./consultant-production-rules";
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
 * Construit le system prompt final.
 * **Consultant** : stack court dédié (sans master § 4 bis ni protocoles contradictoires).
 * **Autres outils** : master + protocoles transverses + outil.
 */
export function buildSystemPrompt(tool: ToolName): string {
  if (tool === "arrets_guide") {
    return ARRETS_GUIDE_SYSTEM_PROMPT;
  }
  if (tool === "quiz") {
    return getQuizEuEtudiantsConversationPrompt();
  }
  if (tool === "consultant") {
    return buildConsultantSystemPrompt();
  }
  let body =
    `${MASTER_SYSTEM_PROMPT}\n\n` +
    `${UNIVERSAL_CONSULTANT_PROTOCOL}\n\n` +
    `${JURISPRUDENCE_VERIFICATION_PROTOCOL}`;
  body += `\n\n${TOOL_PROMPTS[tool]}`;
  return body;
}
