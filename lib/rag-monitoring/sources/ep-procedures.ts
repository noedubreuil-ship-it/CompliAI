import { DetectedDocument, FetchFn } from "../types";

export const EP_API_BASE = "https://data.europarl.europa.eu/api/v2";
export const EP_PROCEDURES_URL = `${EP_API_BASE}/procedures`;

/**
 * Procédures législatives suivies, par identifiant.
 *
 * POURQUOI UNE LISTE FIGÉE ET NON UNE DÉCOUVERTE AUTOMATIQUE
 *
 * Les endpoints de découverte de l'API sont inexploitables (verifié le
 * 2026-07-17 sur données réelles) :
 *  - `GET /procedures` n'accepte aucun filtre par année — la spec OpenAPI ne
 *    documente que `process-type`, `offset` et `limit`. Un `?year=` est
 *    silencieusement ignoré.
 *  - son index est incomplet : 2025/0429(COD) n'apparaît sur aucune page
 *    (717 procédures lues jusqu'au HTTP 204), alors que le endpoint de détail
 *    la sert parfaitement.
 *  - `GET /procedures/feed`, prévu pour ça, renvoie 0 procédure mise à jour
 *    sur un mois, tous types confondus.
 *
 * En revanche `GET /procedures/{id}` est fiable. D'où cette liste : on
 * interroge des procédures connues plutôt que d'espérer les découvrir.
 *
 * MAINTENANCE : ajouter ici l'identifiant d'un texte quand une nouvelle
 * proposition entre en négociation. La liste par défaut peut être surchargée
 * sans redéploiement via le `config` jsonb de la source :
 *   { "procedures": ["2025-0429", "2021-0106"] }
 *
 * Les 13 identifiants ci-dessous ont été vérifiés un à un contre l'API.
 */
export const EP_DEFAULT_WATCHLIST = [
  "2025-0429", // Chat Control 1.0 — prolongation de la dérogation ePrivacy
  "2022-0155", // CSAR — Chat Control 2.0 (cadre permanent, en trilogue)
  "2021-0106", // AI Act
  "2020-0361", // DSA
  "2020-0374", // DMA
  "2022-0047", // Data Act
  "2020-0340", // Data Governance Act
  "2022-0272", // Cyber Resilience Act
  "2020-0359", // NIS2
  "2021-0136", // eIDAS 2
  "2017-0003", // Règlement ePrivacy (proposition)
  "2022-0303", // Directive responsabilité IA
  "2022-0302", // Directive responsabilité du fait des produits défectueux
];

/** Réponse JSON-LD de l'API du Parlement européen. */
interface EpApiResponse<T> {
  data?: T[];
}

/**
 * En JSON-LD, toute propriété peut être unique ou multiple. Observé sur données
 * réelles : 2025/0803 porte une double base juridique et expose `label` sous
 * forme de tableau. Sans normalisation, un `.split()` sur un tableau fait
 * échouer tout le run.
 */
type OneOrMany<T> = T | T[];

function toArray<T>(value: OneOrMany<T> | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

interface EpActivity {
  activity_id?: string;
  activity_date?: string;
  had_activity_type?: string;
}

interface EpProcedureDetail {
  process_id?: string;
  label?: OneOrMany<string>;
  process_title?: Record<string, string>;
  current_stage?: string;
  consists_of?: EpActivity[];
}

/** "def/ep-activities/PLENARY_VOTE" → "PLENARY_VOTE" */
export function extractActivityType(raw: string | undefined): string {
  return (raw ?? "").split("/").pop() ?? "";
}

/**
 * ".../procedure-phase/RDG2" → "RDG2"
 * Le stade est reporté dans le titre pour que la veille indique sans ambiguïté
 * où en est le texte (RDG1/RDG2 = lecture, pas adoption).
 */
export function extractStage(raw: string | undefined): string {
  return (raw ?? "").split("/").pop() ?? "";
}

/** Libellé de la procédure ; le premier en cas de double base juridique. */
export function pickLabel(raw: OneOrMany<string> | undefined, fallback: string): string {
  return toArray(raw)[0] ?? fallback;
}

/**
 * Titre de la procédure, en français si disponible, sinon anglais,
 * sinon la première langue renvoyée par l'API.
 */
export function pickProcedureTitle(
  title: Record<string, string> | undefined
): { text: string; language: string } {
  if (!title) return { text: "", language: "fr" };
  if (title.fr) return { text: title.fr, language: "fr" };
  if (title.en) return { text: title.en, language: "en" };
  const [language, text] = Object.entries(title)[0] ?? ["fr", ""];
  return { text, language };
}

/**
 * Événement le plus récent de la procédure, qui porte la détection.
 *
 * L'externalId est `${process_id}:${activity_id}` et NON le seul process_id :
 * une procédure suivie est réinterrogée chaque semaine pendant des années, et
 * seul un identifiant ancré sur l'événement permet de distinguer un nouveau
 * vote d'une procédure déjà connue. Avec un externalId figé, le vote du
 * 2026-07-09 sur 2025/0429(COD) serait passé pour un doublon.
 */
export function latestActivity(
  activities: EpActivity[] | undefined
): EpActivity | undefined {
  const dated = (activities ?? []).filter((a) => a.activity_date);
  if (dated.length === 0) return undefined;
  return dated.reduce((latest, current) =>
    (current.activity_date ?? "") > (latest.activity_date ?? "") ? current : latest
  );
}

export function parseEpDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Construit le document de veille à partir du détail d'une procédure.
 *
 * Aucun filtrage de pertinence ici : une procédure de la watchlist est suivie
 * délibérément, donc pertinente par définition.
 */
export function buildProcedureDocument(
  detail: EpProcedureDetail
): DetectedDocument | undefined {
  const processId = detail.process_id;
  if (!processId) return undefined;

  const activity = latestActivity(detail.consists_of);
  if (!activity?.activity_id) return undefined;

  const { text, language } = pickProcedureTitle(detail.process_title);
  const stage = extractStage(detail.current_stage);
  const activityType = extractActivityType(activity.had_activity_type);
  const label = pickLabel(detail.label, processId);

  return {
    externalId: `${processId}:${activity.activity_id}`,
    sourceUrl: `https://oeil.europarl.europa.eu/oeil/popups/ficheprocedure.do?reference=${encodeURIComponent(label)}`,
    // Le titre porte le stade et le type d'événement : une procédure n'est pas
    // du droit applicable, et la veille doit le dire d'un coup d'œil.
    title: `[${label} — ${stage || "en cours"} — ${activityType}] ${text}`,
    documentType: "legislative_procedure",
    language,
    country: "EU",
    publicationDate: parseEpDate(activity.activity_date),
  };
}

export interface EpProceduresOptions {
  url?: string;
  fetcher?: FetchFn;
  /** Procédures suivies. Par défaut EP_DEFAULT_WATCHLIST. */
  processIds?: string[];
  /** Pause entre deux appels, pour rester sous 500 req / 5 min. */
  throttleMs?: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connecteur « procédures législatives du Parlement européen » — API officielle.
 *
 * Source : https://data.europarl.europa.eu/api/v2/procedures/{id}
 * Langue : "fr" (repli "en")
 * Cadence : hebdomadaire — une requête par procédure suivie (~13).
 *
 * VEILLE UNIQUEMENT — n'alimente pas le corpus. Les documents portent le type
 * `legislative_procedure`, absent de SUPPORTED_DOCUMENT_TYPES : le pipeline
 * d'ingestion les écarte, et rien n'atteint `legal_chunks`. C'est délibéré :
 * une proposition en négociation n'est pas du droit applicable et ne doit
 * jamais être citée au client comme une obligation en vigueur.
 *
 * Quota API : 500 requêtes / 5 min sur un même endpoint.
 */
export async function fetchEpProcedures(
  options: EpProceduresOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = EP_PROCEDURES_URL,
    fetcher = fetch as unknown as FetchFn,
    processIds = EP_DEFAULT_WATCHLIST,
    throttleMs = 400,
  } = options;

  const documents: DetectedDocument[] = [];

  for (const [index, processId] of processIds.entries()) {
    if (index > 0 && throttleMs > 0) await sleep(throttleMs);

    // Une procédure illisible ne doit pas faire échouer tout le run : les
    // autres restent exploitables.
    try {
      const response = await fetcher(`${url}/${processId}`, {
        headers: { Accept: "application/ld+json" },
      });
      if (!response.ok) continue;

      const body = await response.text();
      if (!body.trim()) continue;

      const parsed = JSON.parse(body) as EpApiResponse<EpProcedureDetail>;
      const detail = parsed.data?.[0];
      if (!detail) continue;

      const document = buildProcedureDocument(detail);
      if (document) documents.push(document);
    } catch {
      continue;
    }
  }

  return documents;
}
