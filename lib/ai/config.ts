/**
 * Configuration centralisée des appels Claude pour CompliAI.
 *
 * - `AI_CONFIG.model` : modèle Claude par défaut (Sonnet). Le routage par plan
 *   (`resolveModelApiId`) surcharge ce défaut côté serveur ; Opus est réservé
 *   aux outils premium Pro. Surcharge globale via `AI_DEFAULT_MODEL`.
 *
 * - `TOOL_CONFIGS` : max_tokens et température par outil, conformément à
 *   la configuration comportementale fournie par le fondateur.
 */

import type { ToolName } from "./prompts";

export interface AIConfig {
  model: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

const env = (key: string, fallback: string): string =>
  (typeof process !== "undefined" && process.env?.[key]) || fallback;

const envNumber = (key: string, fallback: number): number => {
  const raw = env(key, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const AI_CONFIG: AIConfig = {
  model: env("AI_DEFAULT_MODEL", "claude-sonnet-4-5"),
  defaultTemperature: envNumber("AI_DEFAULT_TEMPERATURE", 0.1),
  defaultMaxTokens: envNumber("AI_MAX_TOKENS_DEFAULT", 2000),
};

export interface ToolConfig {
  maxTokens: number;
  temperature: number;
}

/**
 * Paramètres par outil (= `max_tokens` et `temperature` côté API Anthropic ;
 * propriété TypeScript {@link ToolConfig.maxTokens}).
 *
 * **Réglage unique** : surcharge optionnelle par variables `AI_MAX_TOKENS_*` (.env).
 * Consultant : plan **payant** = tout le plafond ci-dessous en `max_tokens` sortie (défaut **8192**) ;
 * **gratuit** : plafond de sortie par défaut aligné sur le consultant (voir `consultant-tokens.ts` +
 * `AI_MAX_TOKENS_CONSULTANT_FREE`) ; budgets plus bas sur les questions courtes uniquement.
 */
export const TOOL_CONFIGS: Record<ToolName, ToolConfig> = {
  consultant: {
    // Plafond sortie utilisé **en totalité** pour les plans payants (défaut 8192 : réponses type note de cabinet).
    // Plan gratuit : plafond et budgets adaptatifs dans `consultant-tokens.ts`.
    maxTokens: envNumber("AI_MAX_TOKENS_CONSULTANT", 8192),
    temperature: 0.1,
  },
  scanner: {
    maxTokens: envNumber("AI_MAX_TOKENS_SCANNER", 2500),
    temperature: envNumber("AI_TEMPERATURE_SCANNER", 0.1),
  },
  doc_art11: {
    maxTokens: envNumber("AI_MAX_TOKENS_DOC_ART11", 4500),
    temperature: 0.1,
  },
  doc_fria: {
    maxTokens: envNumber("AI_MAX_TOKENS_DOC_FRIA", 16384),
    temperature: envNumber("AI_TEMPERATURE_DOC_FRIA", 0.1),
  },
  doc_memoire: {
    maxTokens: envNumber("AI_MAX_TOKENS_DOC_MEMOIRE", 3500),
    temperature: 0.1,
  },
  cerveau: {
    maxTokens: envNumber("AI_MAX_TOKENS_CERVEAU", 1500),
    temperature: 0.2,
  },
  quiz: {
    // Génération quiz : 1er appel puis relecture à `QUIZ_LEGAL_TOOLS_REFINE_TEMPERATURE`.
    maxTokens: envNumber("AI_MAX_TOKENS_QUIZ", 6144),
    temperature: 0.3,
  },
  arrets_guide: {
    maxTokens: envNumber("AI_MAX_TOKENS_ARRETS_GUIDE", 4000),
    temperature: 0.2,
  },
};

const rawQuizRefineTemp = process.env.AI_TEMPERATURE_QUIZ_REFINE;
export const QUIZ_LEGAL_TOOLS_REFINE_TEMPERATURE =
  rawQuizRefineTemp !== undefined && rawQuizRefineTemp !== "" ?
    (Number.isFinite(Number(rawQuizRefineTemp)) ? Number(rawQuizRefineTemp) : 0.1)
  : 0.1;

/**
 * Plafonds de quota IA par utilisateur — exposés ici pour pouvoir être
 * lus depuis `lib/rate-limit.ts` ou un futur middleware.
 */
export const AI_RATE_LIMITS = {
  perUserPerHour: envNumber("AI_RATE_LIMIT_PER_USER_PER_HOUR", 50),
  freeTierPerHour: envNumber("AI_RATE_LIMIT_FREE_TIER", 10),
};
