import { DetectedDocument, DocumentType, FetchFn } from "../types";
import { CELLAR_SPARQL_URL, type CellarSparqlResponse } from "./eurlex-cellar";

/**
 * Connecteur jurisprudence CJUE — via CELLAR (SPARQL).
 *
 * POURQUOI CELLAR ET NON LE FLUX RSS DE CURIA
 *
 * Le connecteur historique (`curia-rss.ts`) interrogeait
 * `curia.europa.eu/v/rss.jsp`, qui renvoie un **404** depuis au moins le
 * 2026-07-17 : le flux a ete supprime, pas deplace. Le domaine repond bien
 * (curia.europa.eu/en/content/juris/index.htm → 200) mais plus aucune page du
 * site n'expose de lien RSS/Atom.
 *
 * La jurisprudence est en revanche publiee dans CELLAR sous les CELEX du
 * secteur 6, et cette API fonctionne (verifie le 2026-07-17 : 15 arrets depuis
 * le 1er juin 2026). C'est aussi l'API deja utilisee par `eurlex-cellar.ts` :
 * une source officielle stable plutot qu'un scraping HTML fragile.
 *
 * Types CELEX du secteur 6 :
 *   6YYYYCJnnnn  arret de la Cour de justice
 *   6YYYYCOnnnn  ordonnance de la Cour
 *   6YYYYTJnnnn  arret du Tribunal
 *   6YYYYCCnnnn  conclusions de l'avocat general
 */

/** Prefixe CELEX → DocumentType. */
export function celexToCjeuDocumentType(celex: string): DocumentType {
  if (/^6\d{4}C[JO]/.test(celex)) {
    return /^6\d{4}CJ/.test(celex) ? "cjeu_judgment" : "cjeu_order";
  }
  if (/^6\d{4}TJ/.test(celex)) return "cjeu_judgment";
  if (/^6\d{4}CC/.test(celex)) return "cjeu_referral";
  return "other";
}

/**
 * Types suivis. Les conclusions d'avocat general (CC) sont incluses : elles
 * eclairent l'interpretation et sont regulierement citees, mais elles ne lient
 * pas la Cour — d'ou le type `cjeu_referral`, distinct d'un arret.
 */
export const CURIA_CELEX_PATTERN = "^6[0-9]{4}(CJ|CO|TJ|CC)";

export function buildCuriaSparqlQuery(fromDate: string, limit = 50): string {
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT DISTINCT ?celex ?date ?title WHERE {
  ?doc cdm:resource_legal_id_celex ?celex .
  ?doc cdm:work_date_document ?date .
  OPTIONAL {
    ?doc cdm:expression_title ?title .
    FILTER(LANG(?title) = "fr")
  }
  FILTER(REGEX(STR(?celex), "${CURIA_CELEX_PATTERN}"))
  FILTER(?date >= xsd:date("${fromDate}"))
}
ORDER BY DESC(?date)
LIMIT ${limit}
`.trim();
}

export interface CuriaCellarOptions {
  /** Date ISO 8601 a partir de laquelle chercher. Defaut : 7 jours. */
  fromDate?: string;
  sparqlUrl?: string;
  fetcher?: FetchFn;
  limit?: number;
}

export async function fetchCuriaCellar(
  options: CuriaCellarOptions = {}
): Promise<DetectedDocument[]> {
  const {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    sparqlUrl = CELLAR_SPARQL_URL,
    fetcher = fetch as unknown as FetchFn,
    limit = 50,
  } = options;

  const query = buildCuriaSparqlQuery(fromDate, limit);
  const url = `${sparqlUrl}?query=${encodeURIComponent(
    query
  )}&format=application%2Fsparql-results%2Bjson`;

  const response = await fetcher(url, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!response.ok) {
    throw new Error(`CELLAR SPARQL (CJUE) a retourné HTTP ${response.status}`);
  }

  return parseCuriaCellarResponse(await response.text());
}

/** Exposé séparément pour les tests sur fixture. */
export function parseCuriaCellarResponse(body: string): DetectedDocument[] {
  const parsed = JSON.parse(body) as CellarSparqlResponse;
  const documents: DetectedDocument[] = [];
  const seen = new Set<string>();

  for (const binding of parsed.results?.bindings ?? []) {
    const celex = binding.celex?.value;
    if (!celex || seen.has(celex)) continue;
    seen.add(celex);

    const date = binding.date?.value;
    const parsedDate = date ? new Date(date) : undefined;

    documents.push({
      externalId: celex,
      celex,
      sourceUrl: `https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:${celex}`,
      // Les titres CELLAR sont fréquemment absents : le CELEX sert alors de
      // libellé plutôt que de rejeter un arrêt réellement publié.
      title: binding.title?.value?.trim() || celex,
      documentType: celexToCjeuDocumentType(celex),
      language: "fr",
      country: "EU",
      publicationDate:
        parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : undefined,
    });
  }

  return documents;
}
