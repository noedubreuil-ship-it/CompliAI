/**
 * Post-traitement des réponses consultant : retire les signatures de marque
 * et garantit une clôture juridique neutre (ajoutée côté backend, pas dans le prompt).
 */

const BRAND_SIGNATURE_PATTERNS: ReadonlyArray<RegExp> = [
  /cette analyse,?\s*élaborée par compliai[^.\n]*[.\n]/gi,
  /élaborée par compliai[^.\n]*[.\n]/gi,
  /produite par compliai[^.\n]*[.\n]/gi,
  /rédigée par compliai[^.\n]*[.\n]/gi,
  /compliai vous (remercie|invite)[^.\n]*[.\n]/gi,
  /l['']équipe compliai[^.\n]*[.\n]/gi,
  /\*?\s*cette analyse,?\s*élaborée par compliai[^*]*\*?/gi,
];

export const NEUTRAL_LEGAL_DISCLAIMER =
  "Cette analyse a vocation à éclairer la décision et ne se substitue pas à un avis juridique délivré par un avocat ayant pris pleine connaissance du dossier.";

function hasClosingDisclaimer(text: string): boolean {
  const tail = text.slice(-600).toLowerCase();
  return /avis juridique|ne se substitue pas|validation.*juriste|confronter.*textes authentiques/i.test(
    tail
  );
}

/** Retire les signatures CompliAI et ajoute la clôture neutre si absente. */
export function sanitizeConsultantResponse(text: string): string {
  let out = text.trim();
  for (const re of BRAND_SIGNATURE_PATTERNS) {
    out = out.replace(re, " ");
  }
  out = out.replace(/\bCompliAI\b/gi, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (!hasClosingDisclaimer(out)) {
    out = `${out}\n\n*${NEUTRAL_LEGAL_DISCLAIMER}*`;
  }
  return out.trim();
}
