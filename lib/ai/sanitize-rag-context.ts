/**
 * Nettoie les extraits RAG avant injection au modèle ou affichage utilisateur.
 */

const METADATA_PATTERNS: ReadonlyArray<RegExp> = [
  /Selon les informations disponibles dans la base de veille de CompliAI,?\s*/gi,
  /Référence registre CompliAI\s*:\s*/gi,
  /\s*\(cache auto[^)]*\)/gi,
  /\s*—\s*partie \d+\/\d+[^.\n]*/gi,
  /\s*partie \d+\/\d+\s*\([^)]*\)/gi,
  /source urn:complai:[^\s\n]+/gi,
  /\brgpd_nat\s*\([A-Z]{2}\)/gi,
  /\(extrait\)\s*—\s*partie \d+\/\d+/gi,
  /Seule la version publiée sur le portail officiel fait foi\.\s*/gi,
  /Cette synthèse CompliAI complète le RGPD[^.]*\.\s*/gi,
  /Synthèse CompliAI[^.]*\.\s*/gi,
  /_Fiche registre CompliAI[^_\n]*_?/gi,
];

export function sanitizeRagTextForModel(text: string): string {
  if (!text) return "";
  let out = text;
  for (const re of METADATA_PATTERNS) {
    out = out.replace(re, " ");
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Extraits courts pour le panneau Sources (côté client). */
export function sanitizeRagExcerptForDisplay(text: string, maxLen = 300): string {
  const clean = sanitizeRagTextForModel(text);
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + "…";
}
