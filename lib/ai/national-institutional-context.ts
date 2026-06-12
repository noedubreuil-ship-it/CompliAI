/**
 * Bloc contextualisé : où consulter le **droit positif national** (portails officiels)
 * pour les États membres dont le code pays a été détecté dans la question.
 *
 * Complète le corpus RAG vecteur lorsque disponible mais **sans le remplacer** :
 * ces URL forment un **répertoire institutionnel** indicatif ; seules les versions
 * publiées par les autorités nationales compétentes font foi.
 */

import { UE_LEGISLATION_HUB_BY_COUNTRY } from "@/lib/data/national-legislation-portals";
import { getSourcesByCountry } from "@/lib/data/legal-sources";
import { describeEu27RegistryBlockLines } from "@/lib/data/eu27-registry";

export function buildNationalInstitutionalLawContext(countryCodes: string[]): string {
  const codes = [
    ...new Set(
      countryCodes
        .map((c) => c.trim().toUpperCase())
        .filter((c) => /^[A-Z]{2}$/.test(c))
    ),
  ].sort();

  if (codes.length === 0) return "";

  const lines: string[] = [
    `Répertoire CompliAI — **où chercher les textes de lois nationaux** pour : ${codes.join(", ")}.`,
    "",
    "**Consigne (modèle)** — Exploiter ce bloc pour orienter l’utilisateur vers les **institutions et portails cités** (journaux officiels, bases consolidées, DPA nationales). Préciser que seule la version publiée par l’autorité compétente fait foi et que la consolidation en ligne peut comporter un délai.",
    "Ne pas confondre ce répertoire avec les extraits **jurisprudentiels** ou **législatifs UE** fournis dans les autres blocs « SOURCE ».",
    "",
  ];

  for (const code of codes) {
    const hub = UE_LEGISLATION_HUB_BY_COUNTRY[code];

    lines.push(`### ${code}${hub ? ` — ${hub.paysFr}` : ""}`);

    if (hub) {
      lines.push("_Textes officiels consolidés ou journaux officiels :_");
      for (const row of hub.portals) {
        lines.push(`- **${row.institution}** — ${row.coverageFr}`);
        lines.push(`  ${row.url}`);
      }
    } else {
      lines.push(
        `- Orienter vers le **journal officiel** de l’État membre **${code}**, le **portail gouvernemental** ministériel compétent et les bases **consolidées** officiellement tenues à jour ; poursuivre avec la **DPA nationale** après vérification sur site officiel.`
      );
    }

    const more = getSourcesByCountry(code);
    if (more.length > 0) {
      lines.push("_Autres sources déjà suivies par CompliAI pour ce pays (DPA / régulateurs / accompagnements) — utiles pour dossiers données, marché IA, télécom :_");
      for (const s of more.slice(0, 10)) {
        lines.push(`- **${s.name}** (${s.category}) → ${s.url}`);
      }
    }

    lines.push(...describeEu27RegistryBlockLines(code));
    lines.push("");
  }

  return lines.join("\n");
}
