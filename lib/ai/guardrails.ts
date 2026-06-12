/**
 * Guardrails côté serveur pour les appels IA :
 *  - validation des entrées utilisateur (longueur, patterns d'injection),
 *  - détection des questions hors-champ (médical, financier, etc.),
 *  - validation grossière des sorties (longueur, numéros d'article).
 *
 * Aucune dépendance externe ; jamais utilisé pour bloquer dur le flux
 * sans logique d'erreur explicite — les warnings sont remontés dans le
 * log (`ai_interaction_logs.warnings`).
 */

export interface InputValidationResult {
  valid: boolean;
  reason?: string;
  warnings: string[];
}

const MAX_USER_INPUT_LENGTH = 8000;
const MIN_USER_INPUT_LENGTH = 2;

export interface ValidateUserInputOptions {
  /** Surcharge du plafond (ex. outil pédagogique avec collage d'extrait jurisprudentiel). */
  maxLength?: number;
}

/**
 * Patterns d'injection courants (FR + EN). On reste volontairement
 * conservateurs : un faux positif vaut mieux qu'une fuite de prompt.
 */
const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /ignore (?:all )?(?:previous|prior|above) (?:instructions?|rules?|prompts?)/i,
  /ignore (?:tout|toutes|toute|l[ae]s?) (?:instructions?|consignes?|règles?|prompts?)/i,
  /forget (?:everything|all (?:previous )?instructions?)/i,
  /oublie (?:tout|toutes? (?:tes )?(?:instructions?|consignes?))/i,
  /(?:disregard|override) (?:all )?(?:previous|prior|above|system) (?:instructions?|prompts?)/i,
  /tu (?:n'es|nes) plus (?:un|une) (?:juriste|avocat|assistant)/i,
  /you are (?:no longer|not) (?:a )?(?:lawyer|jurist|assistant|compli\s*ai)/i,
  /(?:reveal|print|show|display)\s+(?:the )?(?:system\s+)?(?:prompt|instructions?)/i,
  /(?:montre|affiche|donne)[- ]moi (?:le|ton) (?:prompt|système|système prompt)/i,
  /\bDAN\b.{0,40}(?:mode|jailbreak)/i,
  /jailbreak/i,
];

export function validateUserInput(
  input: unknown,
  options?: ValidateUserInputOptions
): InputValidationResult {
  const warnings: string[] = [];
  const maxLen = options?.maxLength ?? MAX_USER_INPUT_LENGTH;

  if (typeof input !== "string") {
    return { valid: false, reason: "Entrée non textuelle reçue.", warnings };
  }

  const trimmed = input.trim();

  if (trimmed.length < MIN_USER_INPUT_LENGTH) {
    return { valid: false, reason: "Question vide ou trop courte.", warnings };
  }

  if (trimmed.length > maxLen) {
    return {
      valid: false,
      reason: `Question trop longue (${trimmed.length} caractères > ${maxLen}).`,
      warnings,
    };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      warnings.push(`injection_pattern_detected:${pattern.source.slice(0, 40)}`);
      // On ne refuse pas, mais on signale : la sortie sera surveillée.
    }
  }

  return { valid: true, warnings };
}

// ─── Détection hors-champ ────────────────────────────────────────────────────
const OUT_OF_SCOPE_KEYWORDS: ReadonlyArray<{ topic: string; patterns: RegExp[] }> = [
  {
    topic: "médical",
    patterns: [
      /\b(?:diagnostic|posologie|ordonnance|symptômes?|maladie|traitement médical|prescription médicale)\b/i,
      /\b(?:medical diagnosis|prescription|dosage|symptoms?|disease)\b/i,
    ],
  },
  {
    topic: "financier",
    patterns: [
      /\b(?:conseil (?:en )?investissement|stock\s*picking|signal de trading|recommandation d'achat (?:d'actions?|de cryptomonnaies?))\b/i,
      /\b(?:investment advice|trading signal|stock pick)\b/i,
    ],
  },
  {
    topic: "pénal général",
    patterns: [
      /\b(?:comment commettre|aide.moi à frauder|évader (?:l[ae]s? )?(?:impôt|fisc)|blanchiment d'argent)\b/i,
    ],
  },
];

export function isOutOfScope(input: string): { outOfScope: boolean; topic?: string } {
  for (const entry of OUT_OF_SCOPE_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(input))) {
      return { outOfScope: true, topic: entry.topic };
    }
  }
  return { outOfScope: false };
}

export const OUT_OF_SCOPE_MESSAGE = `Cette question dépasse le périmètre de l'analyse pour lequel CompliAI a été conçu, à savoir le droit européen du numérique — au premier rang duquel le Règlement (UE) 2024/1689 (AI Act), le Règlement (UE) 2016/679 (RGPD), la Directive (UE) 2022/2555 (NIS2), les Règlements (UE) 2022/2065 (DSA) et 2022/1925 (DMA), ainsi que les instruments connexes.

Pour le sujet que vous évoquez, il convient de vous tourner vers un professionnel relevant du domaine concerné (par exemple : médecin pour une question médicale, conseiller en investissements financiers agréé par l'AMF pour une recommandation d'investissement, avocat pénaliste pour une question de droit pénal général).

*Cette indication, élaborée par CompliAI, constitue une information de cadrage. Elle ne se substitue pas à un avis professionnel adapté à votre situation.*`;

// ─── Validation des sorties IA ───────────────────────────────────────────────
export interface OutputValidationResult {
  valid: boolean;
  warnings: string[];
}

const MAX_OUTPUT_LENGTH = 32_000;
const MIN_OUTPUT_LENGTH = 8;

/**
 * Bornes officielles pour la cohérence des numéros d'article.
 * - AI Act (Règlement (UE) 2024/1689) : articles 1 à 113.
 * - RGPD (Règlement (UE) 2016/679) : articles 1 à 99.
 *
 * Ce contrôle est volontairement laxiste : on ne bloque pas la réponse,
 * on remonte un warning si un numéro d'article paraît hors plage.
 */
const ARTICLE_RANGES: Record<string, number> = {
  ai_act: 113,
  rgpd: 99,
};

export function validateAIOutput(output: string): OutputValidationResult {
  const warnings: string[] = [];

  if (typeof output !== "string" || output.length < MIN_OUTPUT_LENGTH) {
    return { valid: false, warnings: ["output_empty_or_too_short"] };
  }
  if (output.length > MAX_OUTPUT_LENGTH) {
    warnings.push(`output_unusually_long:${output.length}`);
  }

  // Recherche grossière : "article 152 (...) AI Act" → warning si > 113.
  const aiActPattern = /article\s+(\d{1,3})[^.]{0,140}?(?:AI\s*Act|2024\s*\/\s*1689)/gi;
  let m: RegExpExecArray | null;
  while ((m = aiActPattern.exec(output)) !== null) {
    const n = Number(m[1]);
    if (n > ARTICLE_RANGES.ai_act) {
      warnings.push(`suspicious_article_number_ai_act:${n}`);
    }
  }

  const rgpdPattern = /article\s+(\d{1,3})[^.]{0,140}?(?:RGPD|2016\s*\/\s*679|GDPR)/gi;
  while ((m = rgpdPattern.exec(output)) !== null) {
    const n = Number(m[1]);
    if (n > ARTICLE_RANGES.rgpd) {
      warnings.push(`suspicious_article_number_rgpd:${n}`);
    }
  }

  return { valid: true, warnings };
}
