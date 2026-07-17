import { SupabaseClient } from "@supabase/supabase-js";
import { DetectedDocument, MonitoringRunResult } from "./types";
import { fetchEurlexRss } from "./sources/eurlex-rss";
import { fetchEurlexCellar } from "./sources/eurlex-cellar";
import { fetchCuriaRss } from "./sources/curia-rss";
import { fetchEdpbDocuments } from "./sources/edpb-scraping";
import { fetchAiOfficeDocuments } from "./sources/ai-office-rss";
import { fetchEpProcedures } from "./sources/ep-procedures";
import { fetchApDocuments } from "./sources/ap-scraping";
import { fetchDpcDecisions } from "./sources/dpc-scraping";
import { fetchGaranteDocuments } from "./sources/garante-scraping";
import { fetchIpsiDocuments } from "./sources/ipsi-scraping";
import { fetchCnilDocuments } from "./sources/cnil-rss";
import { fetchAepdDocuments } from "./sources/aepd-rss";

export interface WorkerRunOptions {
  dryRun: boolean;
  supabase: SupabaseClient;
  /** Noms des sources à traiter (champ `name` dans monitoring_sources). Toutes si absent. */
  sourceIds?: string[];
  /** Délai inter-source en ms (ignoré si le cron gère lui-même le throttle). */
  throttleMs?: number;
}

interface MonitoringSourceRow {
  id: string;
  name: string;
  source_type: string;
  url: string;
  authority: string | null;
  country: string | null;
  language: string | null;
  last_checked_at: string | null;
  page_structure_hash: string | null;
  config: Record<string, unknown>;
}

/**
 * Vérifie que les tables du pipeline sont accessibles.
 * Lance une erreur si une table est absente ou inaccessible.
 */
export async function assertMonitoringDatabaseReady(
  supabase: SupabaseClient
): Promise<void> {
  const checks = [
    supabase.from("monitoring_sources").select("id").limit(1),
    supabase.from("pending_documents").select("id").limit(1),
    supabase.from("monitoring_log").select("id").limit(1),
  ];

  const results = await Promise.all(checks);

  for (const result of results) {
    if (result.error) {
      throw new Error(
        `Base de données monitoring inaccessible : ${result.error.message}`
      );
    }
  }
}

/**
 * Dispatch vers la bonne fonction de fetch selon le source_type et le nom de la source.
 */
async function fetchDocumentsForSource(
  source: MonitoringSourceRow
): Promise<DetectedDocument[]> {
  const { source_type, name, url } = source;
  const nameLower = name.toLowerCase();

  switch (source_type) {
    case "eurlex_rss":
      if (nameLower.includes("cellar")) {
        return fetchEurlexCellar({ sparqlUrl: url || undefined });
      }
      return fetchEurlexRss({ url: url || undefined });

    // `curia_scraping` est accepté par la contrainte SQL (migration 042) et
    // présent dans la table de throttle du cron : sans ce case, une source
    // enregistrée avec ce type tombait dans `default` et jetait une erreur.
    case "curia_rss":
    case "curia_scraping":
      return fetchCuriaRss({ url: url || undefined });

    case "edpb_scraping": {
      const result = await fetchEdpbDocuments({ url: url || undefined });
      return result.documents;
    }

    case "ai_office_scraping":
      return fetchAiOfficeDocuments({ url: url || undefined });

    case "ep_procedure_api":
      return fetchEpProcedures({ url: url || undefined });

    case "national_authority_rss":
    case "national_authority_scraping": {
      // Dispatch par nom de source
      if (nameLower.includes("cnil")) {
        return fetchCnilDocuments({ url: url || undefined });
      }
      if (nameLower.includes("aepd")) {
        return fetchAepdDocuments({ url: url || undefined });
      }
      if (nameLower.includes("ap-nl") || nameLower.includes("ap_nl") || nameLower === "ap") {
        return fetchApDocuments({ url: url || undefined });
      }
      if (nameLower.includes("dpc")) {
        return fetchDpcDecisions({ url: url || undefined });
      }
      if (nameLower.includes("garante")) {
        return fetchGaranteDocuments({ url: url || undefined });
      }
      if (nameLower.includes("ip-si") || nameLower.includes("ip_si") || nameLower.includes("ipsi")) {
        return fetchIpsiDocuments({ url: url || undefined });
      }
      throw new Error(
        `Source nationale non reconnue : ${name} (source_type=${source_type}). Aucun connecteur disponible.`
      );
    }

    default:
      throw new Error(
        `source_type inconnu : ${source_type} pour la source ${name}`
      );
  }
}

/**
 * Déduplique les documents détectés par rapport à ceux déjà en base.
 * Retourne les documents réellement nouveaux.
 */
async function filterNewDocuments(
  supabase: SupabaseClient,
  sourceDbId: string,
  documents: DetectedDocument[]
): Promise<DetectedDocument[]> {
  if (documents.length === 0) return [];

  // Récupère les external_id et source_url existants pour cette source
  const { data: existing } = await supabase
    .from("pending_documents")
    .select("external_id, source_url")
    .eq("source_id", sourceDbId);

  const existingExternalIds = new Set(
    (existing ?? []).map((r: { external_id: string | null }) => r.external_id).filter(Boolean)
  );
  const existingUrls = new Set(
    (existing ?? []).map((r: { source_url: string | null }) => r.source_url).filter(Boolean)
  );

  return documents.filter((doc) => {
    if (doc.externalId && existingExternalIds.has(doc.externalId)) return false;
    if (existingUrls.has(doc.sourceUrl)) return false;
    return true;
  });
}

/**
 * Insère les nouveaux documents dans pending_documents.
 */
async function insertNewDocuments(
  supabase: SupabaseClient,
  sourceDbId: string,
  documents: DetectedDocument[]
): Promise<void> {
  if (documents.length === 0) return;

  const rows = documents.map((doc) => ({
    source_id: sourceDbId,
    external_id: doc.externalId || null,
    celex: doc.celex || null,
    ecli: doc.ecli || null,
    source_url: doc.sourceUrl,
    title: doc.title,
    document_type: doc.documentType,
    language: doc.language,
    country: doc.country || "EU",
    publication_date: doc.publicationDate
      ? doc.publicationDate.toISOString().split("T")[0]
      : null,
    status: "pending",
  }));

  const { error } = await supabase.from("pending_documents").insert(rows);
  if (error) {
    throw new Error(`Erreur insertion pending_documents : ${error.message}`);
  }
}

/**
 * Log un cycle de monitoring dans monitoring_log.
 */
async function logMonitoringRun(
  supabase: SupabaseClient,
  sourceDbId: string,
  result: Omit<MonitoringRunResult, "sourceId" | "detectedDocuments" | "alerts">
): Promise<void> {
  const { error } = await supabase.from("monitoring_log").insert({
    source_id: sourceDbId,
    executed_at: result.executedAt.toISOString(),
    duration_ms: result.durationMs,
    documents_found: result.documentsFound,
    documents_new: result.documentsNew,
    documents_duplicate: result.documentsDuplicate,
    retry_count: result.retryCount ?? 0,
    error_message: result.error || null,
  });

  if (error) {
    // Non bloquant : le log peut échouer sans bloquer le cycle
    console.error(`[worker] Erreur log monitoring_log : ${error.message}`);
  }
}

/**
 * Met à jour last_checked_at et last_document_detected_at dans monitoring_sources.
 */
async function updateSourceLastChecked(
  supabase: SupabaseClient,
  sourceDbId: string,
  hasNewDocuments: boolean
): Promise<void> {
  const update: Record<string, unknown> = {
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (hasNewDocuments) {
    update.last_document_detected_at = new Date().toISOString();
  }

  await supabase.from("monitoring_sources").update(update).eq("id", sourceDbId);
}

/**
 * Exécute un cycle de monitoring pour les sources demandées.
 *
 * @param options.dryRun  Si true, détecte mais n'insère pas en base.
 * @param options.sourceIds  Noms des sources. Toutes les sources actives si absent.
 */
export async function runMonitoringCycle(
  options: WorkerRunOptions
): Promise<MonitoringRunResult[]> {
  const { dryRun, supabase, sourceIds } = options;
  const results: MonitoringRunResult[] = [];

  // Charge les sources depuis la DB
  let query = supabase
    .from("monitoring_sources")
    .select("id, name, source_type, url, authority, country, language, last_checked_at, page_structure_hash, config")
    .eq("active", true);

  if (sourceIds && sourceIds.length > 0) {
    query = query.in("name", sourceIds);
  }

  const { data: sources, error: sourcesError } = await query;

  if (sourcesError) {
    throw new Error(`Impossible de charger monitoring_sources : ${sourcesError.message}`);
  }

  const sourceRows = (sources ?? []) as MonitoringSourceRow[];

  for (const source of sourceRows) {
    const startedAt = Date.now();
    const executedAt = new Date();
    let detectedDocuments: DetectedDocument[] = [];
    let newDocuments: DetectedDocument[] = [];
    let runError: string | undefined;

    try {
      detectedDocuments = await fetchDocumentsForSource(source);

      newDocuments = await filterNewDocuments(
        supabase,
        source.id,
        detectedDocuments
      );

      if (!dryRun && newDocuments.length > 0) {
        await insertNewDocuments(supabase, source.id, newDocuments);
      }
    } catch (err) {
      runError = err instanceof Error ? err.message : String(err);
    }

    const durationMs = Date.now() - startedAt;
    const result: MonitoringRunResult = {
      sourceId: source.name,
      executedAt,
      durationMs,
      status: runError ? "error" : "ok",
      documentsFound: detectedDocuments.length,
      documentsNew: newDocuments.length,
      documentsDuplicate: detectedDocuments.length - newDocuments.length,
      detectedDocuments,
      alerts: [],
      retryCount: 0,
      error: runError,
    };

    if (!dryRun) {
      await logMonitoringRun(supabase, source.id, result);
      await updateSourceLastChecked(supabase, source.id, newDocuments.length > 0);
    }

    results.push(result);
  }

  return results;
}
