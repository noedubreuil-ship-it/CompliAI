/**
 * Quiz « Droit européen interactif — Étudiants » — CompliAI v1.
 * System isolé pour `tool === "quiz"` (pas de master consultant).
 */
import { AI_CONFIG } from "../config";
import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "quiz-eu-etudiants-v1.md";

export function getQuizEuEtudiantsMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export type QuizEtudiantNiveau = "L1" | "L2" | "L3" | "M1" | "M2" | "Doctorat" | "L1-L2" | "L3-M1" | "M2-Doc";
export type QuizEtudiantExamMode =
  | "apprentissage"
  | "rapide"
  | "examen_blanc"
  | "revision"
  | "methodologie";

export const QUIZ_ETUDIANTS_JSON_SPEC = `
## SCHÉMA JSON OBLIGATOIRE (UN SEUL OBJET)

Réponse **exclusivement** en JSON valide — pas de markdown autour.

{
  "title": "Quiz — [thème]",
  "level": "L3",
  "exam_mode": "apprentissage",
  "themes": ["RGPD"],
  "questions": [
    {
      "id": 1,
      "theme_hint": "RGPD",
      "level_band": "L3",
      "question_type": "TYPE 3 — Application",
      "question": "Énoncé",
      "options": ["A. …", "B. …", "C. …", "D. …"],
      "correct": 0,
      "article_ref": "Art. X RGPD / CJUE C-… / CEDH …",
      "verbatim_quote": "Citation courte exacte ou chaîne vide",
      "explanation": "Pourquoi cette réponse (3-5 phrases)",
      "why_others_wrong": ["B : …", "C : …", "D : …"],
      "legal_reasoning": {
        "majeure": "Règle applicable (type 3-4-5)",
        "mineure": "Faits qualifiés",
        "conclusion": "Ce qu'on en déduit"
      },
      "common_trap": "Piège fréquent documenté"
    }
  ]
}

Règles :
- \`correct\` : index 0-basé (0=A … 3=D).
- Exactement N questions demandées.
- Varier les types 1-5 selon le niveau ; max 2 questions du même type.
- Mode \`rapide\` : \`why_others_wrong\` peut être raccourci ; \`legal_reasoning\` optionnel si type 1-2.
- Mode \`methodologie\` : privilégier TYPE 5 (sens · valeur · portée).
- Mode \`examen_blanc\` : corrections complètes dans le JSON (affichées en fin côté UI).
- Ne jamais inventer ECLI, attendus ou articles.
`.trim();

export function getQuizEuEtudiantsSystemPrompt(): string {
  return `${getQuizEuEtudiantsMarkdown()}\n\n${QUIZ_ETUDIANTS_JSON_SPEC}`;
}

/** Canal conversationnel / `buildSystemPrompt("quiz")` — sans schéma JSON. */
export function getQuizEuEtudiantsConversationPrompt(): string {
  return withPromptApplicationFooter(getQuizEuEtudiantsMarkdown());
}

/** @deprecated Alias historique — corps pédagogique seul. */
export const QUIZ_EU_INTERACTIVE_SYSTEM_PROMPT = getQuizEuEtudiantsConversationPrompt();

export const LEGAL_TOOLS_QUIZ_GENERATION_SYSTEM =
  withPromptApplicationFooter(getQuizEuEtudiantsMarkdown()) +
  `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSAGE 1 — GÉNÉRATION (température modérée côté serveur)
Répondez UNIQUEMENT avec un objet JSON UTF-8 valide conforme au schéma du message utilisateur.
Variez les types 1-5, les distracteurs (confusions Partie 4), et les corrections pédagogiques détaillées.
`;

export const LEGAL_TOOLS_QUIZ_REFINEMENT_SYSTEM =
  withPromptApplicationFooter(getQuizEuEtudiantsMarkdown()) +
  `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSAGE 2 — RELECTURE JURIDIQUE (température basse côté serveur)
Relecture du brouillon JSON : articles exacts, citations verbatim ou vide, corrections enrichies,
syllogisme pour type 3, pièges documentés. Conserver nombre de questions, ids, ordre.
Sortie : UNIQUEMENT le JSON final, même schéma.
`;

const NIVEAU_LABELS: Record<string, string> = {
  "L1-L2": "L1 / L2 — fondamentaux, définitions",
  L1: "L1 — fondamentaux",
  L2: "L2 — fondamentaux",
  "L3-M1": "L3 / M1 — application et jurisprudence",
  L3: "L3 — application",
  M1: "M1 — application",
  "M2-Doc": "M2 / Doctorat — analyse critique, sens·valeur·portée",
  M2: "M2 — analyse critique",
  Doctorat: "Doctorat — analyse critique",
};

const MODE_LABELS: Record<QuizEtudiantExamMode, string> = {
  apprentissage: "Apprentissage — correction détaillée après chaque question",
  rapide: "Entraînement rapide — correction courte",
  examen_blanc: "Examen blanc — correction complète dans le JSON (affichage fin de session)",
  revision: "Révision ciblée — renforcer les lacunes typiques du thème",
  methodologie: "Méthodologie — sens · valeur · portée, commentaire d'arrêt",
};

export function buildQuizEtudiantsUserPrompt(opts: {
  topic: string;
  niveau: string;
  count: number;
  examMode?: QuizEtudiantExamMode;
  themes?: string[];
}): string {
  const niveauLabel = NIVEAU_LABELS[opts.niveau] ?? opts.niveau;
  const mode = opts.examMode ?? "apprentissage";
  const themesBlock =
    opts.themes?.length ?
      `Thèmes ciblés : ${opts.themes.join(", ")}`
    : "";

  return `GÉNÉRATION D'UN QUIZ ÉTUDIANTS (sortie JSON).
Appliquez intégralement le cahier métier du message système (types 1-5, règles G1-G7, confusions, formats de correction).

PARAMÈTRES :
• Thème / sujet : "${opts.topic}"
• Niveau : ${niveauLabel} (code : ${opts.niveau})
• Mode d'examen : ${MODE_LABELS[mode]}
• Nombre de questions : ${opts.count}
${themesBlock}

INSTRUCTIONS :
1. Adapter les types de questions (1-5) au niveau — TYPE 5 pour M1/M2/Doctorat ou mode méthodologie.
2. Progression : premières Q plus accessibles, fin plus exigeante.
3. Distracteurs = confusions réelles (Schrems I/II, Art. 5 vs Annexe III, Charte vs CEDH, etc.).
4. Chaque correction cite le texte ou l'arrêt ; \`verbatim_quote\` vide si incertain (ne pas inventer).
5. Remplir \`why_others_wrong\`, \`legal_reasoning\` (type 3+), \`common_trap\` sauf mode rapide (allégé).

Répondez UNIQUEMENT avec le JSON (exactement ${opts.count} questions).`;
}

export function quizEtudiantsAnthropicParams(pass: "generate" | "refine" = "generate") {
  const model =
    typeof process.env.AI_QUIZ_ETUDIANTS_MODEL === "string" && process.env.AI_QUIZ_ETUDIANTS_MODEL ?
      process.env.AI_QUIZ_ETUDIANTS_MODEL
    : AI_CONFIG.model;
  const max_tokens =
    typeof process.env.AI_MAX_TOKENS_QUIZ === "string" && Number(process.env.AI_MAX_TOKENS_QUIZ) > 0 ?
      Math.floor(Number(process.env.AI_MAX_TOKENS_QUIZ))
    : 6144;
  const genTemp =
    typeof process.env.AI_TEMPERATURE_QUIZ === "string" && process.env.AI_TEMPERATURE_QUIZ !== "" ?
      Number(process.env.AI_TEMPERATURE_QUIZ)
    : 0.3;
  const refineTemp =
    typeof process.env.AI_TEMPERATURE_QUIZ_REFINE === "string" && process.env.AI_TEMPERATURE_QUIZ_REFINE !== "" ?
      Number(process.env.AI_TEMPERATURE_QUIZ_REFINE)
    : 0.1;
  return {
    model,
    max_tokens,
    temperature: pass === "refine" ? refineTemp : genTemp,
  };
}

export const TOOL_QUIZ_ETUDIANTS_CONFIG = {
  model: "claude-sonnet-4-5",
  max_tokens: 6144,
  temperature: 0.3,
  refine_temperature: 0.1,
  stream: false,
};
