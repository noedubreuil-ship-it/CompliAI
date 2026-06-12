import { normalizeForCountryMatch } from "@/lib/ai/country-detection";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeToken(haystackNorm: string, tokenNorm: string): boolean {
  if (!tokenNorm) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(tokenNorm)}(?:[^a-z0-9]|$)`);
  return re.test(haystackNorm);
}

/** Question évoquant le Royaume-Uni, l’ICO ou le UK GDPR. */
export function detectUkRegulatorQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  const raw = normalizeForCountryMatch(q);
  if (hasWholeToken(raw, "ico")) return true;
  return /(royaume[\s-]uni|united\s+kingdom|\buk\b|\bgb\b|uk\s+gdpr|brexit|angleterre|grande[\s-]bretagne|information\s+commissioner)/i.test(
    q
  );
}

/** Question évoquant ISO 42001, NIST AI RMF, OCDE IA, ou normes/gouvernance IA internationales. */
export function detectIntlStandardsQuestion(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return /(iso[\s\/]?(iec[\s\/])?42001|nist\s+ai|ai\s+rmf|risk\s+management\s+framework|oecd.*\bia\b|principes\s+oecd|norme\s+ia|management\s+(de\s+)?l['\u2019]?ia|gouvernance\s+ia\s+internationale|curia\b)/i.test(
    q
  );
}

/** IA, conformité produit ou gouvernance — inclut un filet léger vers le corpus intl. */
export function detectAiGovernanceTopic(question: string): boolean {
  const q = question.trim();
  if (!q) return false;
  return /(ai\s+act|intelligence\s+artificielle|systeme\s+a\s+haut\s+risque|fria|dpia\s+ia|modele\s+generatif|llm|chatgpt|gouvernance\s+ia)/i.test(
    q
  );
}
