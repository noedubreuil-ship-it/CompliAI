/**
 * Détection heuristique des États membres mentionnés dans une question consultant.
 * Retourne des codes ISO 3166-1 alpha-2 en **majuscules** pour les États membres UE.
 * Conservateur : évite les acronymes ambigus seuls (ex. « CNPD » sans pays).
 */

import { detectCountryCodesFromEu27Keywords } from "@/lib/data/eu27-registry";

const EU_ALPHA2 = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Normalise pour matching (minuscules, sans accents diacritiques). */
export function normalizeForCountryMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function hasWholeToken(haystackNorm: string, tokenNorm: string): boolean {
  if (!tokenNorm) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(tokenNorm)}(?:[^a-z0-9]|$)`);
  return re.test(haystackNorm);
}

/** Codes ISO2 en **MAJUSCULES** isolés (« siège IE », « flux FR → DE ») — évite « français » ↔ fr. */
function detectExplicitIsoCodesUpper(question: string): string[] {
  const upper = question.toUpperCase().replace(/\s+/g, " ");
  const re =
    /\b(AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE)\b/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(upper)) !== null) {
    const code = m[1];
    if (code && EU_ALPHA2.has(code)) found.add(code);
  }
  return [...found];
}

const KEYWORDS_BY_CODE: Record<string, string[]> = {
  AT: ["autriche", "osterreich", "dsb", "dsb.gv.at"],
  BE: ["belgique", "apd", "autorite de protection des donnees", "gegevensbeschermingsautoriteit"],
  BG: ["bulgarie"],
  HR: ["croatie"],
  CY: ["chypre", "cyprus"],
  CZ: ["republique tcheque", "république tchèque", "czechia"],
  DK: ["danemark", "datatilsynet", "danmark"],
  EE: ["estonie", "eesti"],
  FI: ["finlande", "tietosuoja"],
  FR: ["france", "cnil", "legifrance"],
  DE: ["allemagne", "deutschland", "bfdi", "bdsg", "baylda", "landesdatenschutz"],
  GR: ["grece", "grèce", "hellas"],
  HU: ["hongrie"],
  IE: ["irlande", "dublin", "data protection commission", "dataprotection.ie"],
  IT: ["italie", "garante", "gpdp.it", "garante privacy"],
  LV: ["lettonie"],
  LT: ["lituanie"],
  LU: ["luxembourg", "cnpd.public.lu"],
  MT: ["malte"],
  NL: ["pays-bas", "nederland", "autoriteit persoonsgegevens"],
  PL: ["pologne", "polska", "uodo"],
  PT: ["portugal", "cnpd.pt"],
  RO: ["roumanie"],
  SK: ["slovaquie"],
  SI: ["slovénie", "slovenie"],
  ES: ["espagne", "aepd", "agencia espanola"],
  SE: ["suede", "suède", "imy.se", "sverige"],
};

/**
 * Liste triée sans doublons des codes pays UE détectés dans la question.
 */
export function detectEuMemberCountriesFromQuestion(question: string): string[] {
  const q = question.trim();
  const raw = normalizeForCountryMatch(q);
  if (!raw) return [];

  const out = new Set<string>();

  for (const code of detectExplicitIsoCodesUpper(q)) {
    out.add(code);
  }

  for (const [code, kws] of Object.entries(KEYWORDS_BY_CODE)) {
    if (!EU_ALPHA2.has(code)) continue;
    for (const kw of kws) {
      const kn = normalizeForCountryMatch(kw);
      if (hasWholeToken(raw, kn)) {
        out.add(code);
        break;
      }
    }
  }

  for (const code of detectCountryCodesFromEu27Keywords(q)) {
    if (EU_ALPHA2.has(code)) out.add(code);
  }

  return [...out].sort();
}

/**
 * Question impliquant une comparaison / un raisonnement « tous les États membres » ou l’Union en général
 * (pas seulement un pays nommé) — sert à élargir le RAG national à l’UE-27 en mode `auto`.
 */
export function detectPanEuropeanComplianceQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  const raw = normalizeForCountryMatch(q).replace(/\s+/g, " ");

  if (
    /(etats[\s-]membres|etats[\s-]membres\s+de\s+l|member\s+states|all\s+member\s+states|eu[\s-]?27|ue[\s-]?27|vingt[\s-]?sept|27\s+etats|27\s+member)/i.test(
      q
    )
  ) {
    return true;
  }
  if (
    /(tous\s+les\s+pays\s+(de\s+l['\u2019]?(union\s+europeenne|ue)\b|membres)|chacun\s+des\s+pays\s+(membres\s+)?(de\s+l['\u2019]?ue)?|comparatif\s+entre\s+pays|transposition(s)?\s+nationales)/i.test(
      raw
    )
  ) {
    return true;
  }

  const euLawTopic =
    /\b(rgpd|gdpr|reglement\s+general\s+sur\s+la\s+protection\s+des\s+donnees|donnees\s+personnelles|protection\s+des\s+donnees|ai\s+act|intelligence\s+artificielle|dsa|dma|vie\s+privee|donnees\s+sensibles)\b/i.test(
      q
    );
  const unionRef =
    /\b(union\s+europeenne|european\s+union|marche\s+unique|droit\s+de\s+l['\u2019]union|droit\s+communautaire|communautaire)\b/i.test(q) ||
    /(\bue\b|\beu\b)/i.test(q);
  if (euLawTopic && unionRef) return true;

  return false;
}
