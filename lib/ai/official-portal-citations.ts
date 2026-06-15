/**
 * Citations « journal officiel » par pays — équivalent Légifrance pour chaque État membre
 * lorsque un portail national est répertorié (UE_LEGISLATION_HUB + registre UE-27).
 */

import { EU27 } from "@/lib/data/eu27-registry";
import { UE_LEGISLATION_HUB_BY_COUNTRY } from "@/lib/data/national-legislation-portals";
import type { LegalCitation } from "@/lib/types/legal";

function normalizeCodes(countryCodes: string[]): string[] {
  return [
    ...new Set(
      countryCodes
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ].sort();
}

/**
 * Construit les liens vers les portails législatifs officiels et, le cas échéant,
 * vers le texte stabilisé de la loi nationale de transposition RGPD.
 */
export function buildOfficialLegislationPortalCitations(countryCodes: string[]): LegalCitation[] {
  const codes = normalizeCodes(countryCodes);
  const out: LegalCitation[] = [];
  const seenUrls = new Set<string>();

  const push = (cite: LegalCitation) => {
    const url = cite.eurlex_url?.trim();
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    out.push(cite);
  };

  for (const code of codes) {
    const hub = UE_LEGISLATION_HUB_BY_COUNTRY[code];
    const reg = EU27[code];
    const paysFr = hub?.paysFr ?? reg?.name_fr ?? code;

    if (hub) {
      for (const portal of hub.portals) {
        push({
          regulation: `${paysFr} — ${portal.institution}`,
          article_number: code,
          article_title: "Portail officiel du droit national",
          excerpt: portal.coverageFr,
          eurlex_url: portal.url,
          source: "official_portal",
        });
      }
    }

    if (reg) {
      const law = reg.gdpr_law;
      if (law.fetch_url?.trim()) {
        push({
          regulation: `${paysFr} — ${law.title}`,
          article_number: law.reference,
          article_title: "Loi nationale RGPD (lien consolidé indicatif)",
          excerpt:
            `Loi nationale de transposition du RGPD (${law.reference}, ${law.year}). ` +
            `Version officielle sur le portail législatif national.`,
          eurlex_url: law.fetch_url.trim(),
          source: "official_portal",
        });
      } else if (law.portal_url?.trim() && !hub) {
        push({
          regulation: `${paysFr} — ${law.title}`,
          article_number: law.reference,
          article_title: "Loi nationale RGPD — portail législatif",
          excerpt: `Portail : ${law.portal_url}. Référence : ${law.reference}.`,
          eurlex_url: law.portal_url.trim(),
          source: "official_portal",
        });
      }

      if (reg.dpa.decisions_url?.trim()) {
        push({
          regulation: `${paysFr} — ${reg.dpa.acronym} (décisions)`,
          article_number: reg.dpa.acronym,
          article_title: "Autorité de protection des données — décisions publiques",
          excerpt: `${reg.dpa.name} — consultez les sanctions et délibérations sur le site officiel.`,
          eurlex_url: reg.dpa.decisions_url.trim(),
          source: "official_portal",
        });
      }
    }
  }

  return out;
}
