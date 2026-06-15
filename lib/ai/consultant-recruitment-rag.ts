/**
 * Boost RAG jurisprudence CJUE pour questions recrutement / présélection CV / AI Act annexe III.
 */

import type { EuCaseLawSeed } from "@/lib/data/eu-case-law-seed-type";
import type { NationalLegalText } from "@/lib/ai/national-rag";
import { searchEuCaseLawTexts, buildNationalLegalContext } from "@/lib/ai/national-rag";
import {
  RECRUITMENT_JP_RAG_QUERIES,
  seedsForRecruitmentFallback,
} from "@/lib/ai/consultant-recruitment-detect";

export {
  detectRecruitmentAiActQuestion,
  seedsForRecruitmentFallback,
  RECRUITMENT_PRIORITY_CELEX,
  RECRUITMENT_JP_RAG_QUERIES,
} from "@/lib/ai/consultant-recruitment-detect";

export function buildInlineCaseLawFallbackContext(seeds: EuCaseLawSeed[]): string {
  if (seeds.length === 0) return "";
  const pseudo: NationalLegalText[] = seeds.map((s) => ({
    id: `seed-${s.celex}`,
    country_code: "EU",
    country_name: "Union européenne",
    domain: "eu_case_law",
    title: s.title,
    reference: s.reference_line,
    content: s.body,
    source_url: s.source_url,
    ecli: s.ecli ?? null,
    court: s.court ?? "Cour de justice de l'Union européenne",
    language: s.language,
    text_type: "cjeu_judgment_seed",
  }));

  return buildNationalLegalContext(
    pseudo,
    "Arrêts CJUE de référence (extraits indexés — ECLI et dates vérifiables ; ne citer que si ECLI présent ci-dessous)."
  );
}

export async function fetchRecruitmentCaseLawChunks(
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

  add(await searchEuCaseLawTexts(question, 6, 0.44));
  for (const q of RECRUITMENT_JP_RAG_QUERIES.slice(0, 3)) {
    add(await searchEuCaseLawTexts(q, 2, 0.4));
  }

  return merged.slice(0, 10);
}
