/**
 * Classement des chunks RAG — logique pure, sans effet de bord ni I/O.
 *
 * Isolé de rag.ts (qui instancie les clients OpenAI/Supabase au chargement) pour
 * être testable sans clé ni réseau, et pour que le classement — surface sensible
 * du produit — ait ses propres tests unitaires.
 */
import type { LegalChunk } from "@/lib/types/legal";

/**
 * Score un chunk par recouvrement de mots-clés (60 %) + boost si la requête cite
 * explicitement son numéro d'article (40 %).
 */
export function keywordScore(query: string, chunk: LegalChunk): number {
  const words = query
    .toLowerCase()
    .replace(/[^a-zéèêëàâùûüôîïç\s]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const bodyScore = (() => {
    if (words.length === 0) return 0;
    const target = `${chunk.regulation ?? ""} ${chunk.article_title ?? ""} ${chunk.content}`.toLowerCase();
    const matches = words.filter((w) => target.includes(w)).length;
    return matches / words.length;
  })();

  const articleBoost = (() => {
    const artNum = chunk.article_number?.trim();
    if (!artNum) return 0;
    const artPattern = new RegExp(`\\bart\\.?\\s*${artNum}\\b|\\barticle\\s+${artNum}\\b`, "i");
    return artPattern.test(query) ? 0.4 : 0;
  })();

  return bodyScore * 0.6 + articleBoost;
}

/**
 * Autorités nationales de protection des données : leurs décisions préfixent le
 * champ `regulation` de leur nom (« AEPD — … », « CNIL — Délibération … »).
 */
export const NATIONAL_AUTHORITY_PREFIXES = [
  "aepd",
  "cnil",
  "garante",
  "bfdi",
  "dpc",
  "autoriteit",
  "autoridad",
  "ip-si",
  "ipsi",
  "datatilsynet",
  "uodo",
];

/**
 * Démotion douce des décisions d'autorités nationales.
 *
 * Le corpus contient beaucoup de décisions nationales (AEPD en tête, héritage des
 * premiers runs). Le modèle d'embedding matche à travers les langues : une
 * décision AEPD en espagnol sur « transferencias internacionales » remonte sur
 * une question française générale sur les transferts et sature la réponse au
 * détriment du droit primaire. Constaté le 2026-07-19.
 *
 * Hiérarchie appliquée : droit primaire UE, CJUE et EDPB priment ; une sanction
 * nationale est une illustration, pas une source primaire — accessible, mais
 * derrière. Démotion DOUCE (0.82, pas de filtre) : une décision nationale très
 * pertinente remonte encore, elle cesse seulement de dominer à pertinence égale.
 * Choix applicatif — la fonction SQL protégée par le golden set n'est pas touchée.
 */
export const NATIONAL_SOURCE_WEIGHT = 0.82;

export function isNationalAuthorityChunk(chunk: LegalChunk): boolean {
  const reg = (chunk.regulation ?? "").toLowerCase();
  return NATIONAL_AUTHORITY_PREFIXES.some(
    (p) => reg.startsWith(p) || reg.startsWith(`décision ${p}`) || reg.includes(`— ${p}`)
  );
}

export function rerankChunks(query: string, chunks: LegalChunk[]): LegalChunk[] {
  return chunks
    .map((chunk) => {
      const base = (chunk.similarity ?? 0) * 0.7 + keywordScore(query, chunk) * 0.3;
      const weight = isNationalAuthorityChunk(chunk) ? NATIONAL_SOURCE_WEIGHT : 1;
      return { chunk, score: base * weight };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ chunk }) => chunk);
}
