/**
 * Outil « Simulateur de cas pratique » — CompliAI v1.
 * Méthode du cas pratique (syllogisme, barème /100, scénarios aléatoires).
 */
import { AI_CONFIG } from "../config";
import {
  USER_PROMPT_CAHIER_REMINDER,
  loadPromptMarkdown,
  withPromptApplicationFooter,
} from "./load-prompt-markdown";

const PROMPT_FILE = "simulateur-cas-pratique-v1.md";

export function getSimulateurCasPratiqueMarkdown(): string {
  return loadPromptMarkdown(PROMPT_FILE);
}

export type SimulateurNiveau = "L2_L3" | "M1" | "M2_Bar";
export type SimulateurTheme =
  | "rgpd"
  | "ai_act"
  | "dsa_dma"
  | "droits_fondamentaux"
  | "transferts"
  | "biometrie"
  | "random";
export type SimulateurFormat = "court" | "standard" | "intensif";

export const SIMULATEUR_MARKDOWN_OUTPUT_RULES = `
## INSTRUCTIONS TECHNIQUES DE SORTIE (complément interface)

- Répondez en **français**, vouvoiement, en **markdown structuré** (titres, listes, blocs encadrés comme dans le cahier).
- **Ne produisez pas de JSON** sauf demande explicite ultérieure.
- **Action « commencer » (Phase 1)** : afficher le rappel méthodologique (PARTIE 1), puis le cas tiré du pool (PARTIE 3) adapté au niveau/thème/format ; terminer par l'invitation à rédiger la réponse. Ne pas encore noter l'étudiant.
- **Action « évaluer » (Phases 2 à 4)** : évaluation selon le barème PARTIE 5 (A/B/C/D + SCORE TOTAL /100), retour pédagogique PARTIE 3, corrigé type PARTIE 4, puis proposition de variation (RÈGLE E7).
- Respectez les **RÈGLES E1–E7** ; ne citez que des articles et jurisprudence **certains** (RÈGLE E6).
- Si l'étudiant demande « nouveau cas » / « plus difficile » : nouveau tirage conforme aux paramètres de session.
`.trim();

export function getSimulateurCasPratiqueSystemPrompt(): string {
  return withPromptApplicationFooter(
    `${getSimulateurCasPratiqueMarkdown()}\n\n---\n\n${SIMULATEUR_MARKDOWN_OUTPUT_RULES}`,
  );
}

const THEME_LABELS: Record<SimulateurTheme, string> = {
  rgpd: "RGPD (données personnelles)",
  ai_act: "AI Act (intelligence artificielle)",
  dsa_dma: "DSA / DMA (plateformes numériques)",
  droits_fondamentaux: "Droits fondamentaux (Charte EU + CEDH)",
  transferts: "Transferts internationaux de données",
  biometrie: "Biométrie / IA au travail",
  random: "ALÉATOIRE (tirage dans le pool)",
};

const NIVEAU_LABELS: Record<SimulateurNiveau, string> = {
  L2_L3: "L2 / L3 — Articles fondamentaux RGPD + Charte EU",
  M1: "M1 — Applications jurisprudence + AI Act + DSA",
  M2_Bar: "M2 / Bar — Analyse critique · cumul de normes · nuances",
};

const FORMAT_LABELS: Record<SimulateurFormat, string> = {
  court: "Court — 1 problème de droit unique",
  standard: "Standard — 2 problèmes de droit distincts",
  intensif: "Intensif — 3 problèmes de droit + interférences",
};

export function buildSimulateurStartUserPrompt(opts: {
  niveau: SimulateurNiveau;
  theme: SimulateurTheme;
  format: SimulateurFormat;
  playedScenarioIds?: string[];
}): string {
  const played =
    opts.playedScenarioIds?.length ?
      opts.playedScenarioIds.join(", ")
    : "(aucun pour cette session)";

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : COMMENCER UNE SIMULATION

L'étudiant a validé la configuration et tape « commencer ».

| Paramètre | Valeur |
| --- | --- |
| Niveau | ${NIVEAU_LABELS[opts.niveau]} |
| Thème | ${THEME_LABELS[opts.theme]} |
| Format | ${FORMAT_LABELS[opts.format]} |
| Scénarios déjà joués (éviter répétition) | ${played} |

**Consignes :**
1. Appliquez intégralement le cahier système (PARTIES 1 à 8).
2. Tirez **un** scénario du pool PARTIE 3 (ou adaptez-en un) cohérent avec niveau, thème et nombre de problèmes de droit.
3. Indiquez en tête l'identifiant du scénario (ex. \`R-02\`, \`A-03\`) pour suivi UI.
4. Produisez **uniquement la PHASE 1** (présentation du cas + rappel méthodologique + consignes de travail).
5. N'évaluez pas encore la réponse de l'étudiant.`;
}

export function buildSimulateurEvaluateUserPrompt(opts: {
  niveau: SimulateurNiveau;
  theme: SimulateurTheme;
  format: SimulateurFormat;
  scenarioId?: string;
  enonce: string;
  studentAnswer: string;
}): string {
  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : ÉVALUER LA RÉPONSE DE L'ÉTUDIANT

| Paramètre | Valeur |
| --- | --- |
| Niveau | ${NIVEAU_LABELS[opts.niveau]} |
| Thème | ${THEME_LABELS[opts.theme]} |
| Format | ${FORMAT_LABELS[opts.format]} |
| Scénario | ${opts.scenarioId || "non précisé"} |

## Énoncé du cas (Phase 1 déjà présentée)

${opts.enonce.trim()}

---

## Réponse de l'étudiant

${opts.studentAnswer.trim()}

---

**Consignes :** Produisez les **PHASES 2, 3 et 4** dans l'ordre (évaluation barème /100, retour pédagogique, corrigé type complet). Appliquez RÈGLES E1–E7. Terminez par la proposition de variation du cas (RÈGLE E7).`;
}

export function buildSimulateurFollowUpUserPrompt(opts: {
  niveau: SimulateurNiveau;
  theme: SimulateurTheme;
  format: SimulateurFormat;
  command: "nouveau_cas" | "plus_difficile";
  playedScenarioIds?: string[];
}): string {
  const cmdLabel =
    opts.command === "nouveau_cas" ?
      "Nouveau cas aléatoire (même niveau / thème / format)"
    : "Même thème, niveau supérieur ou format plus exigeant";

  return `${USER_PROMPT_CAHIER_REMINDER}# ACTION : ${cmdLabel.toUpperCase()}

| Paramètre | Valeur |
| --- | --- |
| Niveau | ${NIVEAU_LABELS[opts.niveau]} |
| Thème | ${THEME_LABELS[opts.theme]} |
| Format | ${FORMAT_LABELS[opts.format]} |
| Scénarios déjà joués | ${opts.playedScenarioIds?.join(", ") || "(aucun)"} |

Produisez une **nouvelle PHASE 1** uniquement (nouveau cas du pool, autre identifiant).`;
}

/** Extrait le score /100 du markdown d'évaluation si présent. */
export function parseSimulateurScore(markdown: string): number | null {
  const m = markdown.match(/SCORE\s+TOTAL\s*:\s*(\d{1,3})\s*\/\s*100/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

/** Extrait l'identifiant scénario (R-01, A-02, …) en tête de la Phase 1. */
export function parseSimulateurScenarioId(markdown: string): string | null {
  const m = markdown.match(/SCÉNARIO\s+([A-Z]-\d{2})/i) || markdown.match(/\b([RDAPS]-\d{2})\b/);
  return m ? m[1].toUpperCase() : null;
}

export function simulateurAnthropicParams(): { model: string; max_tokens: number; temperature: number } {
  const modelEnv =
    typeof process.env.AI_SIMULATEUR_MODEL === "string" ? process.env.AI_SIMULATEUR_MODEL.trim() : "";
  const mtRaw =
    typeof process.env.AI_MAX_TOKENS_SIMULATEUR === "string" ? process.env.AI_MAX_TOKENS_SIMULATEUR.trim() : "";
  const tempRaw =
    typeof process.env.AI_TEMPERATURE_SIMULATEUR === "string" ?
      process.env.AI_TEMPERATURE_SIMULATEUR.trim()
    : "";

  const max_tokens =
    mtRaw && Number.isFinite(Number(mtRaw)) && Number(mtRaw) > 0 ?
      Math.min(8192, Math.floor(Number(mtRaw)))
    : 3000;

  const temperature =
    tempRaw !== "" && Number.isFinite(Number(tempRaw)) && Number(tempRaw) >= 0 && Number(tempRaw) <= 1 ?
      Number(tempRaw)
    : 0.35;

  return { model: modelEnv || AI_CONFIG.model, max_tokens, temperature };
}
