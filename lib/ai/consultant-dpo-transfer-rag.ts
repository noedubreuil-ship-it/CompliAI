import { searchEuCaseLawTexts, type NationalLegalText } from "@/lib/ai/national-rag";

const DPO_TRANSFER_RAG_QUERIES = [
  "article 37 RGPD désignation DPO grande échelle WP243",
  "Schrems II transfert données États-Unis clauses contractuelles types C-311/18",
  "article 28 RGPD sous-traitant contrat",
  "article 44 46 transfert pays tiers garanties",
  "SCHUFA scoring décision automatisée C-634/21",
] as const;

export function detectDpoTransferQuestion(question: string): boolean {
  return /\b(dpo|délégué à la protection|délégué protection|externalisé|sous-traitant rh|logiciel rh)\b/i.test(
    question
  ) && /\b(transfert|états-unis|usa|hors ue|pays tiers|hébergé)\b/i.test(question);
}

/** Boost RAG CJUE pour questions DPO + transferts (complète la recherche vectorielle standard). */
export async function fetchDpoTransferCaseLawChunks(
  question: string
): Promise<NationalLegalText[]> {
  const seen = new Set<string>();
  const merged: NationalLegalText[] = [];

  const add = (rows: NationalLegalText[]) => {
    for (const r of rows) {
      const key = r.id ?? `${r.reference}-${r.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  };

  add(await searchEuCaseLawTexts(question, 6, 0.42));
  for (const q of DPO_TRANSFER_RAG_QUERIES.slice(0, 3)) {
    add(await searchEuCaseLawTexts(q, 2, 0.38));
  }

  return merged.slice(0, 10);
}
