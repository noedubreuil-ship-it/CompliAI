/**
 * Cron RAG Monitoring — Phase 1.
 *
 * Commande d'exécution :
 *   npx tsx --env-file=.env.local scripts/cron-monitoring.ts
 *
 * Fréquence recommandée :
 *   Quotidienne, par exemple 06:00 UTC.
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Variables optionnelles :
 *   RAG_MONITORING_SOURCE_NAMES  Liste de sources séparées par des virgules
 *   RAG_MONITORING_THROTTLE_MS   Override global du délai inter-source en ms
 *
 * Sortie :
 *   JSON Lines vers stdout, compatible avec un collecteur de logs.
 *
 * Code de sortie :
 *   0 = cycle terminé sans erreur source critique
 *   1 = au moins une source en erreur ou configuration invalide
 */

import { createClient } from "@supabase/supabase-js";
import {
  assertMonitoringDatabaseReady,
  runMonitoringCycle,
  type WorkerRunOptions,
} from "../lib/rag-monitoring/worker";

type LogLevel = "info" | "warn" | "error";

interface MonitoringSourceRow {
  name: string;
  source_type: string;
}

const DEFAULT_THROTTLE_MS_BY_SOURCE_TYPE: Record<string, number> = {
  eurlex_rss: 1200,
  curia_rss: 2000,
  curia_scraping: 2000,
  edpb_scraping: 5000,
  ai_office_scraping: 1200,
  // Le connecteur EP se throttle déjà en interne (700 ms entre appels détail) ;
  // cette valeur ne joue qu'entre deux sources du run.
  ep_procedure_api: 2000,
  national_authority_rss: 1200,
  national_authority_scraping: 2000,
};

function logJson(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  process.stdout.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "rag-cron-monitoring",
      event,
      ...fields,
    })}\n`
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseSourceNameFilter(): string[] | null {
  const raw = process.env.RAG_MONITORING_SOURCE_NAMES;
  if (!raw?.trim()) return null;
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

function getThrottleMs(sourceType: string): number {
  const rawOverride = process.env.RAG_MONITORING_THROTTLE_MS;
  if (rawOverride !== undefined && rawOverride.trim() !== "") {
    const override = Number(rawOverride);
    if (Number.isFinite(override) && override >= 0) return override;
  }
  return DEFAULT_THROTTLE_MS_BY_SOURCE_TYPE[sourceType] ?? 1200;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variables requises manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key);
}

async function fetchActiveSources(): Promise<MonitoringSourceRow[]> {
  const supabase = createServiceClient();
  const sourceFilter = parseSourceNameFilter();

  let query = supabase
    .from("monitoring_sources")
    .select("name, source_type")
    .eq("active", true)
    .order("source_type", { ascending: true })
    .order("name", { ascending: true });

  if (sourceFilter && sourceFilter.length > 0) {
    query = query.in("name", sourceFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Impossible de charger monitoring_sources : ${error.message}`);
  }

  return (data ?? []) as MonitoringSourceRow[];
}

/**
 * Simulation : detecte et journalise sans rien ecrire en base.
 *
 * Le projet compliai-staging ayant ete abandonne le 17/07/2026, il n'existe
 * plus de base de repetition : `--dry-run` est le seul filet avant un run reel.
 * La valeur etait codee en dur a `false`, rendant la simulation impossible.
 */
/**
 * Erreur réseau transitoire : la source se rétablira au cycle suivant, donc ne
 * doit pas faire échouer le run. HTTP 429 (rate-limit), 5xx (indisponibilité
 * serveur), timeouts, coupures réseau.
 */
function isTransientSourceError(error: string | undefined): boolean {
  const m = (error ?? "").toLowerCase();
  return (
    m.includes("429") ||
    m.includes("rate limit") ||
    m.includes("500") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504") ||
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("econnreset") ||
    m.includes("etimedout") ||
    m.includes("fetch failed")
  );
}

const DRY_RUN = process.argv.includes("--dry-run");

async function main(): Promise<void> {
  const startedAt = Date.now();
  const supabase = createServiceClient();
  await assertMonitoringDatabaseReady(
    supabase as NonNullable<WorkerRunOptions["supabase"]>
  );
  const sources = await fetchActiveSources();
  let criticalErrors = 0;
  let transientErrors = 0;
  let totalDocumentsFound = 0;
  let totalDocumentsNew = 0;

  logJson("info", "cycle_started", {
    dryRun: DRY_RUN,
    sourcesCount: sources.length,
    sourceNames: sources.map((source) => source.name),
  });

  if (sources.length === 0) {
    logJson("warn", "no_active_sources");
    return;
  }

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const sourceStartedAt = Date.now();

    if (i > 0) {
      const throttleMs = getThrottleMs(source.source_type);
      logJson("info", "source_throttle", {
        sourceName: source.name,
        sourceType: source.source_type,
        throttleMs,
      });
      await sleep(throttleMs);
    }

    logJson("info", "source_started", {
      sourceName: source.name,
      sourceType: source.source_type,
    });

    try {
      const results = await runMonitoringCycle({
        dryRun: DRY_RUN,
        supabase: supabase as WorkerRunOptions["supabase"],
        sourceIds: [source.name],
        throttleMs: 0,
      });

      if (results.length === 0) {
        criticalErrors++;
        logJson("error", "source_not_registered_in_worker", {
          sourceName: source.name,
          sourceType: source.source_type,
        });
        continue;
      }

      const result = results[0];
      totalDocumentsFound += result.documentsFound;
      totalDocumentsNew += result.documentsNew;

      // Un échec réseau TRANSITOIRE (rate-limit, indisponibilité passagère,
      // timeout) ne doit pas faire échouer tout le run : la source se rétablit
      // au cycle suivant. Constaté à répétition sur l'EDPB (HTTP 429/503).
      // Sans ce tri, un 429 sur une source rendait rouges 5 sources vertes —
      // du bruit d'alerte qui masque les vrais problèmes.
      if (result.status === "error") {
        if (isTransientSourceError(result.error)) {
          transientErrors++;
        } else {
          criticalErrors++;
        }
      }

      logJson(result.status === "error" ? "error" : "info", "source_completed", {
        sourceName: source.name,
        status: result.status,
        durationMs: Date.now() - sourceStartedAt,
        documentsFound: result.documentsFound,
        documentsNew: result.documentsNew,
        documentsDuplicate: result.documentsDuplicate,
        retryCount: result.retryCount ?? 0,
        alerts: result.alerts,
        error: result.error,
      });
    } catch (error) {
      const msg = errorMessage(error);
      if (isTransientSourceError(msg)) transientErrors++;
      else criticalErrors++;
      logJson(isTransientSourceError(msg) ? "warn" : "error", "source_failed", {
        sourceName: source.name,
        sourceType: source.source_type,
        durationMs: Date.now() - sourceStartedAt,
        error: msg,
      });
    }
  }

  logJson(criticalErrors > 0 ? "error" : transientErrors > 0 ? "warn" : "info", "cycle_completed", {
    transientErrors,
    status: criticalErrors > 0 ? "error" : "ok",
    durationMs: Date.now() - startedAt,
    sourcesCount: sources.length,
    criticalErrors,
    totalDocumentsFound,
    totalDocumentsNew,
  });

  if (criticalErrors > 0) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  logJson("error", "cycle_failed", {
    error: errorMessage(error),
  });
  process.exitCode = 1;
});
