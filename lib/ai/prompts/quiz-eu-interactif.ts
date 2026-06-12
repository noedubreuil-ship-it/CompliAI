/**
 * Réexport — le quiz dashboard utilise le prompt **étudiants**.
 * @see ./quiz-eu-etudiants.ts
 */
export {
  QUIZ_EU_INTERACTIVE_SYSTEM_PROMPT,
  LEGAL_TOOLS_QUIZ_GENERATION_SYSTEM,
  LEGAL_TOOLS_QUIZ_REFINEMENT_SYSTEM,
  TOOL_QUIZ_ETUDIANTS_CONFIG as TOOL_QUIZ_CONFIG,
  getQuizEuEtudiantsMarkdown,
  getQuizEuEtudiantsSystemPrompt,
  buildQuizEtudiantsUserPrompt,
  quizEtudiantsAnthropicParams,
  type QuizEtudiantNiveau,
  type QuizEtudiantExamMode,
} from "./quiz-eu-etudiants";
