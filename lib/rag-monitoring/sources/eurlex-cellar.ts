import { DetectedDocument, DocumentType, FetchFn } from "../types";

export const CELLAR_SPARQL_URL =
  "https://publications.europa.eu/webapi/rdf/sparql";

/** Requête SPARQL : récupère les règlements et directives FR publiés depuis une date */
function buildSparqlQuery(fromDate: string): string {
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX dc: <http://purl.org/dc/elements/1.1/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?celex ?title ?date ?docUrl ?resourceType WHERE {
  ?doc cdm:resource_legal_id_celex ?celex .
  ?doc dc:title ?title .
  ?doc cdm:work_date_document ?date .
  ?doc cdm:resource_legal_published_in_ojl "true"^^xsd:boolean .
  OPTIONAL { ?doc cdm:resource_legal_type ?resourceType . }
  OPTIONAL {
    ?doc cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/FRA> .
    ?doc cdm:manifestation_manifests_expression_type ?docUrl .
  }
  FILTER(LANG(?title) = "fr")
  FILTER(?date >= xsd:date("${fromDate}"))
  FILTER(STRSTARTS(STR(?celex), "3202"))
}
ORDER BY DESC(?date)
LIMIT 50
`.trim();
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

    if (!celex || !title) continue;

    const sourceUrl =
      docUrl ??
      `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}`;

    documents.push({
      externalId: celex,
      celex,
      sourceUrl,
      title: title.trim(),
      documentType: celexToDocumentType(celex),
      language: "fr",
      country: "EU",
      publicationDate: date ? new Date(date) : undefined,
    });
  }

  return documents;
}
