/**
 * Injection RAG national pour les outils /api/generate/* (hors consultant chat).
 */

import { detectEuMemberCountriesFromQuestion } from "@/lib/ai/country-detection";
import { buildNationalInstitutionalLawContext } from "@/lib/ai/national-institutional-context";
import {
  buildNationalLegalContext,
  resolveNationalStatuteChunksForChat,
  searchEuCaseLawTexts,
  searchNationalCaseLawTexts,
} from "@/lib/ai/national-rag";
import { resolveNationalCountryCodesForRag } from "@/lib/ai/national-rag-scope";
import { filterOffTopicSources, nationalLegalChunkAccessor } from "@/lib/ai/source-filter";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";

export interface NationalRagForToolOptions {
  query: string;
  /** Codes ISO2 explicites (comparateur, etc.) — sinon détection dans `query`. */
  countryCodes?: string[];
  includeStatutes?: boolean;
  includeNationalCaseLaw?: boolean;
  includeEuCaseLaw?: boolean;
}

export interface NationalRagForToolResult {
  context: string;
  countryCodes: string[];
  statuteHits: number;
  nationalCaseLawHits: number;
  euCaseLawHits: number;
}

function normalizeCountryCodes(codes: string[]): string[] {
  return [...new Set(codes.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].sort();
}

export async function buildNationalRagContextForTool(
  options: NationalRagForToolOptions
): Promise<NationalRagForToolResult> {
  const query = options.query.trim();
  const explicit = options.countryCodes?.length ? normalizeCountryCodes(options.countryCodes) : [];
  const detected = detectEuMemberCountriesFromQuestion(query);
  const countryCodes =
    explicit.length > 0 ? explicit : resolveNationalCountryCodesForRag(query, detected);

  const includeStatutes = options.includeStatutes !== false;
  const includeNationalCaseLaw = options.includeNationalCaseLaw !== false;
  const includeEuCaseLaw = options.includeEuCaseLaw === true;

  const parts: string[] = [];
  let statuteHits = 0;
  let nationalCaseLawHits = 0;
  let euCaseLawHits = 0;

  if (countryCodes.length > 0 && includeStatutes) {
    const n = countryCodes.length;
    const matchCount = n >= 23 ? 12 : n >= 2 ? 8 : 6;
    const threshold = n >= 20 ? 0.5 : 0.48;
    const statutes = filterOffTopicSources(
      await resolveNationalStatuteChunksForChat(query, countryCodes, matchCount, threshold),
      query,
      nationalLegalChunkAccessor
    );
    statuteHits = statutes.length;
    if (statutes.length > 0) {
      parts.push(buildNationalLegalContext(statutes, "Lois nationales indexées (domaine rgpd_nat)."));
    }
  }

  if (countryCodes.length > 0 && includeNationalCaseLaw) {
    const natJp = filterOffTopicSources(
      await searchNationalCaseLawTexts(query, countryCodes, 5, 0.48),
      query,
      nationalLegalChunkAccessor
    );
    nationalCaseLawHits = natJp.length;
    if (natJp.length > 0) {
      parts.push(buildNationalLegalContext(natJp, "Jurisprudence et doctrine nationale indexées."));
    }
  }

  if (countryCodes.length > 0) {
    const institutional = buildNationalInstitutionalLawContext(
      detected.length > 0 ? detected : countryCodes
    );
    if (institutional.trim()) parts.push(institutional);
  }

  if (includeEuCaseLaw) {
    const euJp = filterOffTopicSources(
      await searchEuCaseLawTexts(query, 6, 0.49),
      query,
      nationalLegalChunkAccessor
    );
    euCaseLawHits = euJp.length;
    if (euJp.length > 0) {
      parts.push(buildNationalLegalContext(euJp, "Jurisprudence CJUE indexée (eu_case_law)."));
    }
  }

  return {
    context: parts.join("\n\n"),
    countryCodes,
    statuteHits,
    nationalCaseLawHits,
    euCaseLawHits,
  };
}

/** Panorama UE-27 : tous les codes membres pour le RAG. */
export function getEu27CountryCodesForToolRag(): string[] {
  return getEu27IsoCodesSorted();
}

/** Construit le contexte RAG et l’ajoute à un prompt utilisateur existant. */
export async function enrichPromptWithNationalRag(
  basePrompt: string,
  options: NationalRagForToolOptions
): Promise<string> {
  const rag = await buildNationalRagContextForTool(options);
  return appendNationalRagToUserPrompt(basePrompt, rag.context);
}

export function appendNationalRagToUserPrompt(userPrompt: string, ragContext: string): string {
  if (!ragContext.trim()) {
    return (
      userPrompt +
      "\n\n## Corpus national (RAG)\n\nAucun extrait indexé n'a été retourné pour cette requête. Signalez explicitement les lacunes sur le droit national critique ; ne inventez pas de numéros SAN ni d'articles nationaux non sourcés.\n"
    );
  }
  return (
    userPrompt +
    "\n\n## Corpus national / jurisprudence indexé (RAG CompliAI — priorité factuelle)\n\n" +
    "Utilisez ces extraits en priorité pour le droit des États membres. Ne citez un numéro SAN que s'il figure dans un extrait ci-dessous.\n\n" +
    ragContext +
    "\n"
  );
}
