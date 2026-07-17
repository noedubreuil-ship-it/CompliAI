import { DetectedDocument, FetchFn } from "../types";

export const EP_API_BASE = "https://data.europarl.europa.eu/api/v2";
export const EP_PROCEDURES_URL = `${EP_API_BASE}/procedures`;

/**
 * Types de procédure suivis.
 * COD = procédure législative ordinaire (co-décision) — l'essentiel du droit
 *       numérique européen (AI Act, DSA, DMA, CRA, Data Act, CSAR…).
 * APP = procédure d'approbation.
 * Les NLE (accords internationaux) et INI (rapports d'initiative) sont exclus :
 * ils ne produisent pas d'obligations pour les clients.
 */
export const EP_TRACKED_PROCESS_TYPES = ["COD", "APP"];

/**
 * Mots-clés de pertinence, appliqués au titre FR et EN de la procédure.
 * Volontairement larges : un faux positif coûte une ligne de veille,
 * un faux négatif coûte un texte manqué (cf. Chat Control, 2026-07-09).
 */
export const EP_RELEVANCE_KEYWORDS = [
  // FR
  "intelligence artificielle",
  "données",
  "numérique",
  "plateforme",
  "ligne",
  "cybersécurité",
  "cyber",
  "chiffrement",
  "vie privée",
  "communications électroniques",
  "services numériques",
  "marchés numériques",
  "identité électronique",
  "informatique en nuage",
  // EN
  "artificial intelligence",
  "data",
  "digital",
  "platform",
  "online",
  "cybersecurity",
  "encryption",
  "privacy",
  "electronic communications",
  "cloud",
  "child sexual abuse",
];

/** Réponse JSON-LD de l'API du Parlement européen. */
interface EpApiResponse<T> {
  data?: T[];
}

interface EpProcedureListItem {
  process_id?: string;
  process_type?: string;
  label?: string;
}

interface EpActivity {
  activity_id?: string;
  activity_date?: string;
  had_activity_type?: string;
}

interface EpProcedureDetail {
  process_id?: string;
  label?: string;
  process_title?: Record<string, string>;
  current_stage?: string;
  consists_of?: EpActivity[];
}

/** "def/ep-procedure-types/COD" → "COD" */
export function extractProcessType(raw: string | undefined): string {
  return (raw ?? "").split("/").pop() ?? "";
}

/** "def/ep-activities/PLENARY_VOTE" → "PLENARY_VOTE" */
export function extractActivityType(raw: string | undefined): string {
  return (raw ?? "").split("/").pop() ?? "";
}

/**
 * ".../procedure-phase/RDG2" → "RDG2"
 * Le stade courant est reporté dans le titre pour que la veille indique
 * sans ambiguïté où en est le texte (RDG1/RDG2 = lecture, pas adoption).
 */
export function extractStage(raw: string | undefined): string {
  return (raw ?? "").split("/").pop() ?? "";
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
 * Actes du périmètre CompliAI, désignés par leur numéro.
 *
 * Indispensable en complément des mots-clés : un acte modificatif ne décrit pas
 * son objet, il cite le règlement modifié. Le titre réel de 2025/0429(COD) est
 * « Modification du règlement (UE) 2021/1232 en ce qui concerne la prolongation
 * de sa période d'application » — aucun mot-clé thématique n'y figure. Sans
 * cette table, toute modification de l'AI Act, du DSA ou du RGPD passerait
 * inaperçue.
 */
export const EP_TRACKED_ACTS = [
  "2021/1232", // dérogation ePrivacy / CSAM
  "2002/58", // directive ePrivacy
  "2016/679", // RGPD
  "2018/1725", // RGPD institutions
  "2024/1689", // AI Act
  "2022/2065", // DSA
  "2022/1925", // DMA
  "2023/2854", // Data Act
  "2022/868", // Data Governance Act
  "2024/2847", // Cyber Resilience Act
  "2022/2555", // NIS2
  "910/2014", // eIDAS
  "2019/1150", // P2B
];

export function isEpProcedureRelevant(
  title: Record<string, string> | undefined
): boolean {
  const haystack = [title?.fr, title?.en]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!haystack) return false;
  if (EP_TRACKED_ACTS.some((act) => haystack.includes(act))) return true;
  return EP_RELEVANCE_KEYWORDS.some((k) => haystack.includes(k.toLowerCase()));
}

/**
 * Événement le plus récent de la procédure, qui porte la détection.
 *
 * L'externalId d'une procédure est `${process_id}:${activity_id}` et NON le
 * seul process_id : une procédure vit des années et chaque nouvel événement
 * doit être détecté. Avec un externalId figé sur le process_id, le vote du
 * 9 juillet 2026 sur 2025/0429(COD) serait passé pour un doublon de la
 * procédure déjà connue et n'aurait jamais remonté.
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
 * Exposé séparément pour les tests sur fixture.
 */
export function buildProcedureDocument(
  detail: EpProcedureDetail
): DetectedDocument | undefined {
  const processId = detail.process_id;
  if (!processId) return undefined;
  if (!isEpProcedureRelevant(detail.process_title)) return undefined;

  const activity = latestActivity(detail.consists_of);
  if (!activity?.activity_id) return undefined;

  const { text, language } = pickProcedureTitle(detail.process_title);
  const stage = extractStage(detail.current_stage);
  const activityType = extractActivityType(activity.had_activity_type);
  const label = detail.label ?? processId;

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
  /** Année suivie. Par défaut l'année courante. */
  year?: number;
  /** Pause entre deux appels détail, pour rester sous 500 req / 5 min. */
  throttleMs?: number;
  limit?: number;
}

async function fetchJson<T>(
  fetcher: FetchFn,
  url: string
): Promise<EpApiResponse<T>> {
  const response = await fetcher(url, {
    headers: { Accept: "application/ld+json" },
  });
  if (!response.ok) {
    throw new Error(`API Parlement européen a retourné HTTP ${response.status} sur ${url}`);
  }
  return JSON.parse(await response.text()) as EpApiResponse<T>;
}

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connecteur « procédures législatives du Parlement européen » — API officielle.
 *
 * Source : https://data.europarl.europa.eu/api/v2/procedures
 * Langue : "fr" (repli "en")
 * Cadence : hebdomadaire
 *
 * VEILLE UNIQUEMENT — n'alimente pas le corpus. Les documents portent le type
 * `legislative_procedure`, absent de SUPPORTED_DOCUMENT_TYPES : le pipeline
 * d'ingestion les écarte donc, et rien n'atteint `legal_chunks`. C'est
 * délibéré : une proposition en négociation n'est pas du droit applicable et
 * ne doit jamais être citée au client comme une obligation en vigueur.
 *
 * Quota API : 500 requêtes / 5 min sur un même endpoint (throttle par défaut
 * 700 ms, soit ~430 requêtes sur 5 min dans le pire cas).
 */
export async function fetchEpProcedures(
  options: EpProceduresOptions = {}
): Promise<DetectedDocument[]> {
  const {
    url = EP_PROCEDURES_URL,
    fetcher = fetch as unknown as FetchFn,
    year = new Date().getFullYear(),
    throttleMs = 700,
    limit = 200,
  } = options;

  const list = await fetchJson<EpProcedureListItem>(
    fetcher,
    `${url}?year=${year}&limit=${limit}`
  );

  const candidates = (list.data ?? []).filter((item) =>
    EP_TRACKED_PROCESS_TYPES.includes(extractProcessType(item.process_type))
  );

  const documents: DetectedDocument[] = [];
  for (const [index, candidate] of candidates.entries()) {
    if (!candidate.process_id) continue;
    if (index > 0 && throttleMs > 0) await sleep(throttleMs);

    // Une procédure illisible ne doit pas faire échouer tout le run :
    // les autres candidates restent exploitables.
    try {
      const detail = await fetchJson<EpProcedureDetail>(
        fetcher,
        `${url}/${candidate.process_id}`
      );
      const procedure = detail.data?.[0];
      if (!procedure) continue;
      const document = buildProcedureDocument(procedure);
      if (document) documents.push(document);
    } catch {
      continue;
    }
  }

  return documents;
}
