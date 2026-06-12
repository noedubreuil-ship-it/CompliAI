/**
 * Vérifie que le texte extrait d'une page officielle correspond bien à l'acte
 * attendu dans le registre UE-27 (évite d'indexer une page d'accueil ou un shell SPA).
 */

export interface GdprLawRegistryHints {
  title?: string | null;
  reference?: string | null;
  year?: number | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Retourne true si le corps extrait contient des signaux suffisants de l'acte visé.
 */
export function statutePlaintextMatchesRegistry(
  hints: GdprLawRegistryHints,
  plaintext: string
): boolean {
  const body = normalize(plaintext);
  if (body.length < 80) return false;

  const ref = (hints.reference ?? "").trim();
  const title = (hints.title ?? "").trim();

  if (ref.length >= 3) {
    const refNorm = normalize(ref);
    if (body.includes(refNorm)) return true;

    const digits = ref.replace(/\D/g, "");
    if (digits.length >= 4) {
      const yearPart = digits.slice(-4);
      const numPart = digits.slice(0, -4) || digits;
      if (yearPart.length === 4 && body.includes(yearPart) && body.includes(numPart.slice(0, 4))) {
        return true;
      }
      if (body.includes(digits)) return true;
    }

    const slashForm = ref.replace(/\s/g, "");
    if (slashForm.includes("/") && body.includes(normalize(slashForm))) return true;
  }

  if (typeof hints.year === "number" && hints.year >= 1990 && hints.year <= 2100) {
    const yearStr = String(hints.year);
    if (body.includes(yearStr)) {
      const titleTokens = normalize(title)
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 6);
      if (titleTokens.some((t) => body.includes(t))) return true;
    }
  }

  const parenAcronym = title.match(/\(([A-Z]{2,12})\)/);
  if (parenAcronym?.[1] && body.includes(parenAcronym[1].toLowerCase())) return true;

  if (title.length >= 8) {
    const titleTokens = normalize(title)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 7);
    const hits = titleTokens.filter((t) => body.includes(t)).length;
    if (hits >= 2) return true;
    if (hits >= 1 && titleTokens.length === 1) return true;
  }

  if (/bdsg|bundesdatenschutzgesetz/i.test(body) && /bdsg|bundesdatenschutz/i.test(title)) {
    return true;
  }

  return false;
}
