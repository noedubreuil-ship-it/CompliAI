import { SupabaseClient } from "@supabase/supabase-js";
import { DetectedDocument, MonitoringRunResult } from "./types";
import { fetchEurlexRss } from "./sources/eurlex-rss";
import { fetchEurlexCellar } from "./sources/eurlex-cellar";
import { fetchCuriaCellar } from "./sources/curia-cellar";
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

  // Ne PAS se contenter de l'absence d'erreur : sous RLS, une clé insuffisante
  // (anon au lieu de service_role) renvoie zéro ligne sans la moindre erreur.
  // Constaté le 2026-07-18 : le cron GitHub tournait en vert depuis l'activation
  // des RLS, voyait 0 source active alors que la base en contient 6, et se
  // terminait en `no_active_sources`. Trois semaines de veille perdues en
  // silence. En production, `monitoring_sources` n'est jamais vide : une table
  // qui paraît vide signale un problème de droits, pas une base sans sources.
  if ((results[0].data ?? []).length === 0) {
    throw new Error(
      "monitoring_sources est illisible ou vide : aucune ligne visible alors " +
        "que la table doit en contenir. Cause la plus probable : la clé utilisée " +
        "n'est pas une clé `service_role` et les RLS filtrent tout " +
        "silencieusement. Vérifier SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

/**
 * Dispatch vers la bonne fonction de fetch selon le source_type et le nom de la source.
 */
async function fetchDocumentsForSource(
  source: MonitoringSourceRow
): Promise<DetectedDocument[]> {
  const { source_type, name, url, config } = source;
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
      // `url` est volontairement ignoré : la colonne contient encore le flux
      // RSS historique (curia.europa.eu/v/rss.jsp), supprimé par la CJUE et
      // qui renvoie 404. La jurisprudence passe désormais par CELLAR, qui la
      // publie sous les CELEX du secteur 6. Voir curia-cellar.ts.
      return fetchCuriaCellar();

    case "edpb_scraping": {
      const result = await fetchEdpbDocuments({ url: url || undefined });
      return result.documents;
    }

    case "ai_office_scraping":
      return fetchAiOfficeDocuments({ url: url || undefined });

    case "ep_procedure_api": {
      // La watchlist peut être surchargée sans redéploiement via le config
      // jsonb : { "procedures": ["2025-0429", …] }. Sinon EP_DEFAULT_WATCHLIST.
      const configured = config?.procedures;
      const processIds =
        Array.isArray(configured) && configured.every((v) => typeof v === "string")
          ? (configured as string[])
          : undefined;
      return fetchEpProcedures({ url: url || undefined, processIds });
    }

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

  // `external_id` ne porte pas de contrainte globale : on le compare au sein
  // de la source uniquement.
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

  // `celex`, `ecli` et `source_url` portent des contraintes UNIQUE GLOBALES
  // (migration 033), donc valables toutes sources confondues. Les comparer
  // seulement au sein de la source laissait passer les recouvrements
  // legitimes entre sources : EUR-Lex CELLAR et EUR-Lex JO RSS publient les
  // memes CELEX. L'INSERT partait alors en violation de contrainte et Supabase
  // rejetait le LOT ENTIER — 42 documents perdus d'un coup le 2026-07-18 a
  // cause d'un seul doublon.
  const collect = (key: "celex" | "ecli" | "sourceUrl"): string[] =>
    documents
      .map((d) => d[key])
      .filter((v): v is string => typeof v === "string" && v !== "");

  const globallyTaken: Record<"celex" | "ecli" | "source_url", Set<string>> = {
    celex: new Set(),
    ecli: new Set(),
    source_url: new Set(),
  };

  for (const [column, values] of [
    ["celex", collect("celex")],
    ["ecli", collect("ecli")],
    ["source_url", collect("sourceUrl")],
  ] as const) {
    if (values.length === 0) continue;
    const { data } = await supabase
      .from("pending_documents")
      .select(column)
      .in(column, values);
    for (const row of (data ?? []) as Record<string, string | null>[]) {
      const value = row[column];
      if (value) globallyTaken[column].add(value);
    }
  }

  // Un lot peut aussi se contredire lui-meme (deux entrees, meme CELEX) :
  // la contrainte se declencherait sur l'insert, sans qu'aucune ligne
  // n'existe encore en base.
  const seenInBatch: Record<"celex" | "ecli" | "source_url", Set<string>> = {
    celex: new Set(),
    ecli: new Set(),
    source_url: new Set(),
  };

  return documents.filter((doc) => {
    if (doc.externalId && existingExternalIds.has(doc.externalId)) return false;
    if (existingUrls.has(doc.sourceUrl)) return false;

    if (globallyTaken.source_url.has(doc.sourceUrl)) return false;
    if (doc.celex && globallyTaken.celex.has(doc.celex)) return false;
    if (doc.ecli && globallyTaken.ecli.has(doc.ecli)) return false;

    if (seenInBatch.source_url.has(doc.sourceUrl)) return false;
    if (doc.celex && seenInBatch.celex.has(doc.celex)) return false;
    if (doc.ecli && seenInBatch.ecli.has(doc.ecli)) return false;

    seenInBatch.source_url.add(doc.sourceUrl);
    if (doc.celex) seenInBatch.celex.add(doc.celex);
    if (doc.ecli) seenInBatch.ecli.add(doc.ecli);
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
  if (!error) return;

  // Un INSERT groupe est atomique : une seule ligne en conflit fait perdre tout
  // le lot (42 documents le 2026-07-18). La deduplication en amont couvre les
  // cas connus, mais une course entre deux sources ou une contrainte non
  // anticipee reste possible. On rejoue alors ligne par ligne pour ne perdre
  // que le document reellement fautif.
  const failures: string[] = [];
  for (const row of rows) {
    const { error: rowError } = await supabase.from("pending_documents").insert(row);
    if (rowError) failures.push(`${row.external_id ?? row.source_url} (${rowError.message})`);
  }

  if (failures.length === rows.length) {
    throw new Error(
      `Erreur insertion pending_documents : ${error.message} — aucune ligne inseree`
    );
  }
  if (failures.length > 0) {
    console.error(
      `[worker] ${failures.length}/${rows.length} document(s) rejete(s) : ${failures
        .slice(0, 3)
        .join(", ")}`
    );
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
