import { detectPanEuropeanComplianceQuestion } from "@/lib/ai/country-detection";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";

export type NationalRagScopeMode = "eu27" | "detected_only" | "auto";

export function getNationalRagScopeFromEnv(): NationalRagScopeMode {
  const v = (process.env.NATIONAL_RAG_SCOPE || "auto").trim().toLowerCase();
  if (v === "eu27" || v === "all" || v === "eu-27") return "eu27";
  if (v === "detected" || v === "detected_only") return "detected_only";
  return "auto";
}

/**
 * Codes pays utilisés pour filtrer `national_legal_texts` (lois nationales + JP nationale indexée).
 * - `eu27` : toujours les 27 États membres ;
 * - `detected_only` : uniquement les pays détectés dans le libellé ;
 * - `auto` : pays détectés si au moins un ; sinon UE-27 si question paneuropéenne ; sinon tableau vide.
 */
export function resolveNationalCountryCodesForRag(question: string, detectedCountryCodes: string[]): string[] {
  const mode = getNationalRagScopeFromEnv();
  const all = getEu27IsoCodesSorted();

  if (mode === "eu27") return [...all];

  const detected = [
    ...new Set(
      detectedCountryCodes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ].sort();

  if (mode === "detected_only") return detected;

  if (detected.length > 0) return detected;
  if (detectPanEuropeanComplianceQuestion(question)) return [...all];
  return [];
}
