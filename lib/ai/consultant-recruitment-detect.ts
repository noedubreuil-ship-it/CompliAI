/**
 * Détection questions recrutement / CV et catalogue seeds CJUE (sans dépendance Supabase).
 */

import { EU_CASE_LAW_SEEDS } from "@/lib/data/eu-case-law-seeds";
import type { EuCaseLawSeed } from "@/lib/data/eu-case-law-seed-type";

const RECRUITMENT_HINT =
  /\b(recrutement|pr[eé]s[eé]lection|cv|candidat|scoring|embauche|haut risque|annexe\s*iii|employment|hiring|resume)\b/i;

export const RECRUITMENT_PRIORITY_CELEX = [
  "62021CJ0634",
  "62021CJ0446",
  "62023CJ0021",
  "62021CJ0548",
  "62017CJ0434",
  "62021CJ0252",
] as const;

export const RECRUITMENT_JP_RAG_QUERIES = [
  "SCHUFA Holding C-634/21 ECLI:EU:C:2023:957 article 22 RGPD décision automatisée scoring recrutement",
  "Meta Platforms C-446/21 publicités personnalisées profilage RGPD",
  "Lindenapotheke C-21/23 médicament en ligne marquage CE",
  "Bezirkshauptmannschaft Landeck C-548/21 marquage CE procédure conformité",
  "jurisprudence CJUE recrutement présélection candidats supervision humaine art 22 RGPD",
] as const;

export function detectRecruitmentAiActQuestion(question: string): boolean {
  const q = question.trim();
  if (!RECRUITMENT_HINT.test(q)) return false;
  return /\b(ai act|2024\/1689|intelligence artificielle|ia\b|rgpd|2016\/679)\b/i.test(q);
}

export function seedsForRecruitmentFallback(): EuCaseLawSeed[] {
  const byCelex = new Map(EU_CASE_LAW_SEEDS.map((s) => [s.celex, s]));
  const out: EuCaseLawSeed[] = [];
  for (const celex of RECRUITMENT_PRIORITY_CELEX) {
    const s = byCelex.get(celex);
    if (s) out.push(s);
  }
  return out;
}
