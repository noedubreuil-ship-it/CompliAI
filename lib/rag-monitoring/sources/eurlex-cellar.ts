import { DetectedDocument, DocumentType, FetchFn } from "../types";
import { EURLEX_RELEVANCE_KEYWORDS, matchesKeyword } from "./eurlex-rss";

export const CELLAR_SPARQL_URL =
  "https://publications.europa.eu/webapi/rdf/sparql";

/**
 * Requête SPARQL : règlements et directives publiés depuis une date.
 *
 * DEUX CONTRAINTES ONT ÉTÉ RETIRÉES LE 2026-07-17 — elles ramenaient le
 * résultat à zéro, et la source paraissait donc silencieuse alors que CELLAR
 * répondait normalement. Mesuré sur la fenêtre du 2026-06-27, même filtre
 * CELEX et même date :
 *
 *   requête sans ces contraintes .......... 20 résultats
 *   + resource_legal_published_in_ojl ..... 0
 *   + titre FR en jointure obligatoire .... 0
 *
 * 1. `cdm:resource_legal_published_in_ojl "true"^^xsd:boolean` : le prédicat
 *    ne matche plus rien. Le filtre CELEX `3202*` suffit à cibler les actes
 *    législatifs.
 * 2. `dc:title` : mauvais prédicat. Le titre est porté par l'EXPRESSION
 *    (version linguistique), pas par l'œuvre — d'où la jointure
 *    `expression_belongs_to_work` + `expression_uses_language` +
 *    `expression_title`, corrigée le 2026-07-18. Elle reste OPTIONAL : un acte
 *    sans titre FR doit être détecté quand même, mieux vaut un titre manquant
 *    qu'un acte manqué.
 */
function buildSparqlQuery(fromDate: string): string {
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?celex ?title ?date ?docUrl ?resourceType WHERE {
  ?doc cdm:resource_legal_id_celex ?celex .
  ?doc cdm:work_date_document ?date .
  OPTIONAL {
    ?expr cdm:expression_belongs_to_work ?doc .
    ?expr cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/FRA> .
    ?expr cdm:expression_title ?title .
  }
  OPTIONAL { ?doc cdm:resource_legal_type ?resourceType . }
  OPTIONAL {
    ?doc cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/FRA> .
    ?doc cdm:manifestation_manifests_expression_type ?docUrl .
  }
  FILTER(?date >= xsd:date("${fromDate}"))
  FILTER(STRSTARTS(STR(?celex), "3202"))
}
ORDER BY DESC(?date)
LIMIT 50
`.trim();
}

/**
 * Un acte est retenu s'il touche au périmètre CompliAI.
 *
 * CELLAR ne filtre que sur `STRSTARTS(celex, "3202")` : SANS ce tri, la source
 * remonte les 50 derniers actes européens quel que soit leur sujet. Constaté le
 * 2026-07-18 : un rectificatif au règlement 794/2004 (aides d'État) a ete
 * ingéré et parsé par Claude — hors périmètre, tokens dépensés pour rien.
 *
 * Un acte sans titre FR est conservé : on ne peut pas juger de sa pertinence,
 * et manquer du droit applicable coûte plus cher qu'un faux positif à trier.
 */
export function isCellarRelevant(title: string | undefined): boolean {
  if (!title?.trim()) return true;
  const normalized = title.toLowerCase();
  return EURLEX_RELEVANCE_KEYWORDS.some((kw) => matchesKeyword(normalized, kw));
}

/** Détermine le DocumentType à partir du type CELEX */
function celexToDocumentType(celex: string): DocumentType {
  if (/^[03]\d{4}R/.test(celex)) return "eu_regulation";
  if (/^[03]\d{4}L/.test(celex)) return "eu_directive";
  if (/^[03]\d{4}D/.test(celex)) return "eu_decision";
  return "other";
}

export interface CellarBinding {
  celex?: { value: string };
  title?: { value: string };
  date?: { value: string };
  docUrl?: { value: string };
  resourceType?: { value: string };
}

export interface CellarSparqlResponse {
  results: {
    bindings: CellarBinding[];
  };
}

export interface EurlexCellarOptions {
  /** Date ISO 8601 à partir de laquelle chercher (ex. "2024-01-01") */
  fromDate?: string;
  sparqlUrl?: string;
  fetcher?: FetchFn;
}

/**
 * Connecteur EUR-Lex CELLAR SPARQL.
 * Récupère les métadonnées de règlements et directives publiés depuis fromDate.
 * Complémentaire au RSS : couvre les consolidations et les actes modificatifs.
 */
export async function fetchEurlexCellar(
  options: EurlexCellarOptions = {}
): Promise<DetectedDocument[]> {
  const {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    sparqlUrl = CELLAR_SPARQL_URL,
    fetcher = fetch as unknown as FetchFn,
  } = options;

  const query = buildSparqlQuery(fromDate);
  const encodedQuery = encodeURIComponent(query);
  const url = `${sparqlUrl}?query=${encodedQuery}&format=application%2Fsparql-results%2Bjson`;

  const response = await fetcher(url, {
    headers: { Accept: "application/sparql-results+json" },
  });

  if (!response.ok) {
    throw new Error(`CELLAR SPARQL returned HTTP ${response.status}`);
  }

  const json = (await response.text().then(JSON.parse)) as CellarSparqlResponse;
  const bindings = json?.results?.bindings ?? [];

  const documents: DetectedDocument[] = [];

  for (const binding of bindings) {
    const celex = binding.celex?.value;
    const title = binding.title?.value;
    const date = binding.date?.value;
    const docUrl = binding.docUrl?.value;

    // Le titre est OPTIONAL depuis le 2026-07-17 : l'exiger ici reviendrait à
    // réintroduire par la porte de derrière le filtre qui rendait la source
    // muette. Le CELEX sert de libellé de repli.
    if (!celex) continue;
    if (!isCellarRelevant(title)) continue;

    const sourceUrl =
      docUrl ??
      `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}`;

    documents.push({
      externalId: celex,
      celex,
      sourceUrl,
      title: title?.trim() || celex,
      documentType: celexToDocumentType(celex),
      language: "fr",
      country: "EU",
      publicationDate: date ? new Date(date) : undefined,
    });
  }

  return documents;
}
