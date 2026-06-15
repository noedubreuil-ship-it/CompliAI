/**
 * Périmètre RAG national pour le canal consultant chat.
 * N'élargit pas automatiquement à l'UE-27 sur les questions générales AI Act/RGPD.
 */

import { detectPanEuropeanComplianceQuestion } from "@/lib/ai/country-detection";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";
import { getNationalRagScopeFromEnv } from "@/lib/ai/national-rag-scope";

/** Comparaison explicite / transpositions — seul cas où l'auto-mode peut élargir sans pays nommé. */
function asksExplicitMultiMemberStateComparison(question: string): boolean {
  return /(27\s+états|ue-27|eu-27|comparateur|transposition(s)?\s+nationales|tous\s+les\s+pays\s+membres|chacun\s+des\s+états\s+membres|member\s+states)/i.test(
    question
  );
}

/**
 * Codes pays pour le RAG national du consultant.
 * - Pays nommés dans la question → ces pays uniquement ;
 * - `NATIONAL_RAG_SCOPE=eu27` → UE-27 (env explicite) ;
 * - Question comparatiste explicite → UE-27 ;
 * - Sinon → aucun droit national injecté (droit UE seulement).
 */
export function resolveConsultantNationalCountryCodes(
  question: string,
  detectedCountryCodes: string[]
): string[] {
  const detected = [
    ...new Set(
      detectedCountryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ].sort();

  if (detected.length > 0) return detected;

  if (getNationalRagScopeFromEnv() === "eu27") return getEu27IsoCodesSorted();

  if (asksExplicitMultiMemberStateComparison(question) && detectPanEuropeanComplianceQuestion(question)) {
    return getEu27IsoCodesSorted();
  }

  return [];
}

/** Question explicite sur calendrier / échéances AI Act. */
export function asksLegalDeadline(question: string): boolean {
  return /\b(échéance|echeance|délai|delai|calendrier|entrée en application|entree en application|à quelle date|a quelle date|when must|date limite|deadline)\b/i.test(
    question
  );
}

export const AI_ACT_ART113_RAG_QUERY =
  "Règlement UE 2024/1689 AI Act article 113 calendrier application échelonnée annexe III haut risque 2 août 2026 2 février 2025 2 août 2025 2 août 2027";
