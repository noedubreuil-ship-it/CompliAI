/**
 * Registre UE-27 CompliAI — exposition publique pour détection pays, liste blanche domaines
 * et fiches synthétiques injectées au consultant.
 */

export type {
  Eu27AiActAuthority,
  Eu27DpaAuthority,
  Eu27GdprImplementingLaw,
  Eu27Nis2,
  EU27Country,
  Eu27AiActDesignation,
  Nis2TransposeStatus,
} from "./eu27-registry-types";

import type { EU27Country } from "./eu27-registry-types";
import { EU27_REGISTRY_CORE } from "./eu27-registry-data";
import { getAlternateFetchUrlsForCountry } from "./eu27-alternate-fetch-urls";

/** Ensemble des États membres couverts (référence unique). */
export const EU27: Record<string, EU27Country> = EU27_REGISTRY_CORE;

/** Domaines institutionnels européens autorisés pour un futur accès HTTP contrôlé. */
export const EU_STANDARD_FETCH_DOMAINS: string[] = [
  "eur-lex.europa.eu",
  "publications.europa.eu",
  "edpb.europa.eu",
  "edps.europa.eu",
  "digital-strategy.ec.europa.eu",
  "commission.europa.eu",
  "curia.europa.eu",
  "enisa.europa.eu",
];

function normalizeAccentStrip(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWholeToken(haystackNorm: string, tokenNorm: string): boolean {
  if (!tokenNorm) return false;
  const re = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(tokenNorm)}(?:[^a-z0-9]|$)`);
  return re.test(haystackNorm);
}

/**
 * Associe une question aux codes pays UE-27 lorsque les mots-clés du registre matchent.
 * Conservateur pour les suites courtes sans point (≥ 4 caractères ou « host » avec un point).
 */
export function detectCountryCodesFromEu27Keywords(question: string): string[] {
  const trimmed = question.trim();
  const norm = normalizeAccentStrip(trimmed);
  const found = new Set<string>();

  for (const [code, row] of Object.entries(EU27)) {
    for (let kw of row.detection_keywords) {
      kw = kw.trim();
      if (!kw) continue;
      const kn = normalizeAccentStrip(kw);
      if (!kn.includes(".") && kn.length <= 3) continue;
      if (kn.includes(".") || /\s/.test(kn)) {
        if (norm.includes(kn)) found.add(code);
      } else if (hasWholeToken(norm, kn)) {
        found.add(code);
      }
    }
  }

  return [...found].sort();
}

/** Alias explicite (même comportement que detectCountryCodesFromEu27Keywords). */
export function detectCountriesEU27(question: string): string[] {
  return detectCountryCodesFromEu27Keywords(question);
}

export const ALL_ALLOWED_DOMAINS: string[] = [
  ...EU_STANDARD_FETCH_DOMAINS,
  ...Object.values(EU27).flatMap((c) => c.allowed_domains),
].filter((value, idx, arr) => arr.indexOf(value) === idx);

export function getDPASummary(countryCodes: string[]): string {
  return countryCodes
    .map((c) => c.trim().toUpperCase())
    .filter((c) => EU27[c])
    .map((c) => {
      const country = EU27[c];
      return `${country.name_fr} (${c}) → ${country.dpa.name} (${country.dpa.acronym}) : ${country.dpa.url}`;
    })
    .join("\n");
}

/** URLs candidates pour l'ingestion HTTP du texte de loi national (dédupliquées). */
export function getNationalStatuteFetchCandidates(countryCode: string): string[] {
  const code = countryCode.trim().toUpperCase();
  const row = EU27[code];
  if (!row) return [];

  const urls = [
    row.gdpr_law.fetch_url,
    row.gdpr_law.portal_url,
    ...getAlternateFetchUrlsForCountry(code),
  ]
    .map((u) => u?.trim())
    .filter((u): u is string => !!u && u.length > 12);

  return [...new Set(urls)];
}

export function getNationalLawSummary(countryCodes: string[]): string {
  return countryCodes
    .map((c) => c.trim().toUpperCase())
    .filter((c) => EU27[c])
    .map((c) => {
      const row = EU27[c];
      const ai = row.ai_act_authority;
      return `
${row.name_fr} (${c}) :
  Loi nationale (RGPD) : ${row.gdpr_law.title}
  Référence : ${row.gdpr_law.reference}
  Portail : ${row.gdpr_law.portal_url}
  NIS2 : ${row.nis2.status}${row.nis2.law_title ? ` (${row.nis2.law_title})` : ""}
  AI Act (autorité nationale) : ${ai.status}${ai.name ? ` — ${ai.name}` : ""}`;
    })
    .join("\n");
}

export function getNIS2TranspositionStatus(): string {
  const transposed = Object.entries(EU27)
    .filter(([, c]) => c.nis2.status === "transposed")
    .map(([code]) => code);
  const partial = Object.entries(EU27)
    .filter(([, c]) => c.nis2.status === "partial")
    .map(([code]) => code);
  const pending = Object.entries(EU27)
    .filter(([, c]) => c.nis2.status === "pending")
    .map(([code]) => code);

  return `
NIS2 — Synthèse indicatives des états rapportés (${new Date().getFullYear()}) :
  Statut « transposed » (${transposed.length}) : ${transposed.join(", ")}
  Statut « partial » (${partial.length}) : ${partial.join(", ")}
  Statut « pending » (${pending.length}) : ${pending.join(", ")}
`;
}

/** Lignes markdown pour enrichir le répertoire institutionnel quand un code pays est connu. */
export function describeEu27RegistryBlockLines(code: string): string[] {
  const c = EU27[code.trim().toUpperCase()];
  if (!c) return [];

  const lines: string[] = [
    `_Fiche registre CompliAI (UE-27 — ${c.code}) :_`,
    `- **État / nom local** — ${c.name_fr} (${c.name_local}).`,
    `- **DPA** — ${c.dpa.name} (${c.dpa.acronym}) — ${c.dpa.url} — décisions : ${c.dpa.decisions_url}`,
    `- **Loi nationale (mise en œuvre RGPD)** — ${c.gdpr_law.reference} — ${c.gdpr_law.title}`,
    `  • Portail législatif : ${c.gdpr_law.portal_url}`,
  ];
  if (c.gdpr_law.fetch_url) {
    lines.push(`  • Lien stabilisé (indicatif) : ${c.gdpr_law.fetch_url}`);
  }
  if (c.gdpr_law.key_articles.length > 0) {
    lines.push(`  • Articles ou sections souvent mobilisés (repère, sans préjuger consolidation) : ${c.gdpr_law.key_articles.join(", ")}`);
  }
  lines.push(
    `- **NIS2 (repère registre)** — ${c.nis2.status}${c.nis2.law_title ? ` — ${c.nis2.law_title}` : ""}${c.nis2.date ? ` (${c.nis2.date})` : ""}${c.nis2.portal_url ? ` — ${c.nis2.portal_url}` : ""}`
  );
  if (c.nis2.notes) lines.push(`  • Note : ${c.nis2.notes}`);
  lines.push(
    `- **AI Act — autorités nationales (repère registre)** — ${c.ai_act_authority.status}${c.ai_act_authority.name ? ` — ${c.ai_act_authority.name}` : ""}`
  );
  if (c.ai_act_authority.notes) lines.push(`  • Note : ${c.ai_act_authority.notes}`);
  lines.push(
    "_Ne pas citer verbatim un article national ni une décision DPA précise tant que ce n’est pas confirmé dans le corpus RAG national ou jurisprudentiel fourni._"
  );
  return lines;
}
