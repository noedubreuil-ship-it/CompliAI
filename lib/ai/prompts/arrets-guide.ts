/**
 * Outil « Résumé d'arrêts et commentaires guidés » — CompliAI v2.
 * Prompt pédagogique isolé du master consultant (cf. `prompts/index.ts`).
 */
import { AI_CONFIG } from "../config";
import { loadPromptMarkdown, withPromptApplicationFooter } from "./load-prompt-markdown";

const PROMPT_FILE = "resume-arrets-etudiants-v2.md";

export function getResumeArretsEtudiantsMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

/** Canal conversationnel (`/api/arrets-guide`, tool `arrets_guide`). */
export function getArretsGuideSystemPrompt(): string {
  return withPromptApplicationFooter(getResumeArretsEtudiantsMarkdown());
}

/** @deprecated Alias — préférer `getArretsGuideSystemPrompt()`. */
export const ARRETS_GUIDE_SYSTEM_PROMPT = getArretsGuideSystemPrompt();

export type ResumeArretMode = "F" | "C" | "E" | "M" | "T" | "FC";
export type ResumeArretNiveau =
  | "L1"
  | "L2"
  | "L3"
  | "M1"
  | "M2"
  | "Doctorat"
  | "Professionnel"
  | "auto";

export const RESUME_ARRET_JSON_OUTPUT_SPEC = `
## SORTIE JSON (génération structurée depuis un texte collé)

Répondez **uniquement** avec un objet JSON UTF-8 valide — pas de markdown autour.
Ne pas inventer d'ECLI, de dates, d'attendus ou d'articles de doctrine.
Ne pas rédiger le commentaire intégral (Règle N1) : plan, pistes et questions uniquement.

Schéma selon \`mode_demande\` :

### mode_demande = "F" (fiche seule)
{
  "mode_demande": "F",
  "niveau": "L3",
  "fiche": {
    "reference": "",
    "formation": "",
    "domaines": [],
    "juridiction": "",
    "date": "",
    "parties": "",
    "mots_cles": [],
    "faits": "",
    "procedure": "",
    "question_droit": "",
    "solution_dispositif": "",
    "solution_motifs": "",
    "textes_appliques": []
  },
  "sens_valeur_portee": {
    "sens": "",
    "valeur_juridique": "",
    "valeur_extra_juridique": "",
    "portee": "",
    "questions_reflexion": []
  },
  "pour_aller_plus_loin": [],
  "cloture_pedagogique": ""
}

### mode_demande = "C" (commentaire guidé seul)
{
  "mode_demande": "C",
  "niveau": "L3",
  "reference": "",
  "commentaire": {
    "problematique": "",
    "etapes": {
      "lecture": [],
      "probleme_droit": "",
      "analyse_axes": []
    },
    "plan": [
      {
        "partie": "I. Titre-thèse",
        "chapeau": "",
        "sous_parties": [
          { "titre": "A. …", "idees": [], "articles_eu": [] }
        ]
      }
    ],
    "introduction": {
      "accroche": "",
      "contexte": "",
      "faits_procedure": "",
      "probleme_droit": "",
      "annonce_plan": ""
    },
    "references_doctrinales": [],
    "conseils": "",
    "questions_reflexion": []
  },
  "cloture_pedagogique": ""
}

### mode_demande = "FC" (fiche + guide commentaire — défaut UI « texte collé »)
{
  "mode_demande": "FC",
  "niveau": "L3",
  "fiche": { "...": "comme mode F" },
  "sens_valeur_portee": { "...": "comme mode F" },
  "commentaire": { "...": "comme mode C" },
  "pour_aller_plus_loin": [],
  "cloture_pedagogique": ""
}

Compatibilité UI historique : si \`mode_demande\` = "FC", remplir aussi
\`fiche.solution\` (dispositif + motifs), \`fiche.portee\` (synthèse courte),
\`commentaire.problematique\`, \`commentaire.plan\` (2 parties, titres-thèses).
`.trim();

export function getResumeArretJsonSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getResumeArretsEtudiantsMarkdown()}\n\n${RESUME_ARRET_JSON_OUTPUT_SPEC}`
  );
}

/** System pour génération JSON structurée (résumé d'arrêt). */
export const LEGAL_TOOLS_RESUME_ARRET_JSON_SYSTEM = getResumeArretJsonSystemPrompt();

export function resumeArretAnthropicParams() {
  const model =
    typeof process.env.AI_ARRETS_ETUDIANTS_MODEL === "string" && process.env.AI_ARRETS_ETUDIANTS_MODEL ?
      process.env.AI_ARRETS_ETUDIANTS_MODEL
    : AI_CONFIG.model;
  const max_tokens =
    typeof process.env.AI_MAX_TOKENS_ARRETS_GUIDE === "string" && Number(process.env.AI_MAX_TOKENS_ARRETS_GUIDE) > 0 ?
      Math.floor(Number(process.env.AI_MAX_TOKENS_ARRETS_GUIDE))
    : 4000;
  const temperature =
    typeof process.env.AI_TEMPERATURE_ARRETS_GUIDE === "string" && process.env.AI_TEMPERATURE_ARRETS_GUIDE !== "" ?
      Number(process.env.AI_TEMPERATURE_ARRETS_GUIDE)
    : 0.2;
  return { model, max_tokens, temperature: Number.isFinite(temperature) ? temperature : 0.2 };
}

const MODE_LABELS: Record<ResumeArretMode, string> = {
  F: "Fiche structurée (§1–5 + sens · valeur · portée)",
  C: "Commentaire guidé (plan et pistes — sans rédaction intégrale)",
  E: "Explication pédagogique (3 niveaux de technicité)",
  M: "Mise en contexte jurisprudentiel",
  T: "Entraînement socratique (examen)",
  FC: "Fiche complète + guide de commentaire",
};

export function buildResumeArretUserPrompt(opts: {
  text: string;
  mode: ResumeArretMode;
  niveau?: ResumeArretNiveau;
  reference?: string;
}): string {
  const niveau = opts.niveau && opts.niveau !== "auto" ? opts.niveau : "à déduire du contexte ou L3 par défaut";
  const refBlock =
    opts.reference?.trim() ?
      `\nRéférence fournie par l'étudiant : ${opts.reference.trim()}\n`
    : "";

  if (opts.mode === "E" || opts.mode === "M" || opts.mode === "T") {
    return `MODE DEMANDÉ : ${opts.mode} — ${MODE_LABELS[opts.mode]}
NIVEAU ÉTUDIANT : ${niveau}
${refBlock}
TEXTE OU CONTEXTE :
${opts.text}

MISSION : produire une réponse en markdown structurée selon le format Mode ${opts.mode} du prompt système.
Respecter la Règle N1 (ne pas rédiger un commentaire d'examen complet).
Terminer par la clôture pédagogique (CURIA · HUDOC · pas un avis juridique).`;
  }

  const jsonMode = opts.mode === "FC" ? "FC" : opts.mode;
  return `Appliquez intégralement le cahier métier du message système (toutes les parties pertinentes).

MODE DEMANDÉ : ${jsonMode} — ${MODE_LABELS[opts.mode]}
NIVEAU ÉTUDIANT : ${niveau}
${refBlock}
TEXTE DE LA DÉCISION (source exclusive — ne pas inventer d'attendus absents) :

${opts.text}

MISSION : produire la sortie JSON pour \`mode_demande\` = "${jsonMode}".
- Faits : neutres, sans qualification juridique.
- §5 / sens_valeur_portee : développer sens, valeur (juridique + extra-juridique), portée selon le niveau.
- Commentaire : titres-thèses uniquement ; 1–2 questions de réflexion sans y répondre.
Répondez UNIQUEMENT avec le JSON.`;
}

/** Enveloppe dialogue : contexte collé + mode/niveau explicites. */
export function buildArretsGuideDialoguePrefix(opts: {
  caseText?: string;
  mode?: ResumeArretMode;
  niveau?: ResumeArretNiveau;
}): string {
  const parts: string[] = [];
  if (opts.niveau && opts.niveau !== "auto") parts.push(`[Niveau : ${opts.niveau}]`);
  if (opts.mode) parts.push(`[Mode souhaité : ${opts.mode}]`);
  if (opts.caseText?.trim()) {
    parts.push(`[Texte d'arrêt fourni — analyser ce texte en priorité]\n${opts.caseText.trim().slice(0, 12000)}`);
  }
  return parts.length ? `${parts.join("\n")}\n\n` : "";
}

export const TOOL_ARRETS_CONFIG = {
  model: "claude-sonnet-4-5",
  max_tokens: 4000,
  temperature: 0.2,
  stream: true,
};
