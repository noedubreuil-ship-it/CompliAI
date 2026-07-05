/**
 * GET /api/admin/ai-logs — Dashboard complet des interactions IA (H20 audit v2).
 *
 * Accessible aux admins uniquement. Fournit :
 * - Agrégats par outil (count, latence, taux warnings, taux troncature)
 * - Top 10 questions répétées (par input_hash — même hash = même question)
 * - Distribution des warnings guardrails les plus fréquents
 * - Distribution des latences par modèle (p50, p95)
 * - Dernières interactions avec warnings ou feedback négatif
 * - Distribution des versions de prompt
 */
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "7"), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = getAdmin();

  // Fetch all rows for the period (lightweight columns only)
  const { data: rows } = await admin
    .from("ai_interaction_logs")
    .select("id, tool, model, latency_ms, output_length, warnings, feedback, prompt_version, input_hash, created_at")
    .gte("created_at", since);

  const allRows = rows ?? [];

  // ── Agrégats par outil ────────────────────────────────────────────────────
  const toolStats: Record<string, {
    count: number;
    latencies: number[];
    warningCount: number;
    truncationCount: number;
    citationIssueCount: number;
    needsRewriteCount: number;
    feedbackNeg: number;
    feedbackPos: number;
    models: Set<string>;
  }> = {};

  const warningFrequency: Record<string, number> = {};
  const inputHashCounts: Record<string, { count: number; tool: string; lastSeen: string }> = {};

  for (const row of allRows) {
    const t = row.tool ?? "unknown";
    if (!toolStats[t]) {
      toolStats[t] = {
        count: 0, latencies: [], warningCount: 0, truncationCount: 0,
        citationIssueCount: 0, needsRewriteCount: 0,
        feedbackNeg: 0, feedbackPos: 0, models: new Set(),
      };
    }
    const s = toolStats[t];
    s.count++;
    if (row.latency_ms) s.latencies.push(row.latency_ms);
    if (row.model) s.models.add(row.model);
    if (row.feedback === "negative") s.feedbackNeg++;
    if (row.feedback === "positive") s.feedbackPos++;

    // Warnings
    if (Array.isArray(row.warnings) && row.warnings.length > 0) {
      s.warningCount++;
      for (const w of row.warnings) {
        const key = w.startsWith("citation:") ? "citation_issue" :
                    w.startsWith("suspicious_article_number") ? "suspicious_article" :
                    w.startsWith("injection_pattern") ? "injection_pattern" :
                    w;
        warningFrequency[key] = (warningFrequency[key] ?? 0) + 1;
        if (w === "truncated_max_tokens") s.truncationCount++;
        if (w.startsWith("citation:")) s.citationIssueCount++;
        if (w === "output_unusually_long") s.needsRewriteCount++;
      }
    }

    // input_hash répétés (même question posée plusieurs fois)
    if (row.input_hash) {
      const h = row.input_hash as string;
      if (!inputHashCounts[h]) {
        inputHashCounts[h] = { count: 0, tool: t, lastSeen: row.created_at as string };
      }
      inputHashCounts[h].count++;
      if (row.created_at > inputHashCounts[h].lastSeen) {
        inputHashCounts[h].lastSeen = row.created_at as string;
      }
    }
  }

  const aggregates = Object.entries(toolStats).map(([tool, s]) => {
    const sorted = [...s.latencies].sort((a, b) => a - b);
    return {
      tool,
      count: s.count,
      avg_latency_ms: s.latencies.length > 0 ? Math.round(s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length) : 0,
      p50_latency_ms: percentile(sorted, 50),
      p95_latency_ms: percentile(sorted, 95),
      warning_rate_pct: s.count > 0 ? Math.round((s.warningCount / s.count) * 100) : 0,
      truncation_rate_pct: s.count > 0 ? Math.round((s.truncationCount / s.count) * 100) : 0,
      citation_issue_rate_pct: s.count > 0 ? Math.round((s.citationIssueCount / s.count) * 100) : 0,
      feedback_positive: s.feedbackPos,
      feedback_negative: s.feedbackNeg,
      models: Array.from(s.models),
    };
  }).sort((a, b) => b.count - a.count);

  // ── Top 10 questions répétées ─────────────────────────────────────────────
  const topRepeatedQuestions = Object.entries(inputHashCounts)
    .filter(([, v]) => v.count > 1)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([hash, v]) => ({ hash: hash.slice(0, 12), count: v.count, tool: v.tool, last_seen: v.lastSeen }));

  // ── Top warnings ─────────────────────────────────────────────────────────
  const topWarnings = Object.entries(warningFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([warning, count]) => ({ warning, count }));

  // ── Distribution latences par modèle ─────────────────────────────────────
  const latencyByModel: Record<string, number[]> = {};
  for (const row of allRows) {
    const m = row.model ?? "unknown";
    if (!latencyByModel[m]) latencyByModel[m] = [];
    if (row.latency_ms) latencyByModel[m].push(row.latency_ms);
  }
  const latencyDistribution = Object.entries(latencyByModel).map(([model, lats]) => {
    const sorted = [...lats].sort((a, b) => a - b);
    return {
      model,
      count: lats.length,
      avg_ms: lats.length > 0 ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
      p50_ms: percentile(sorted, 50),
      p95_ms: percentile(sorted, 95),
    };
  }).sort((a, b) => b.count - a.count);

  // ── Dernières interactions avec warnings ou feedback négatif ──────────────
  const { data: recent } = await admin
    .from("ai_interaction_logs")
    .select("id, tool, model, latency_ms, output_length, warnings, feedback, feedback_note, prompt_version, created_at")
    .gte("created_at", since)
    .or("feedback.eq.negative,warnings.not.is.null")
    .order("created_at", { ascending: false })
    .limit(50);

  // ── Versions de prompt ────────────────────────────────────────────────────
  const versionCounts: Record<string, number> = {};
  for (const row of allRows) {
    if (row.prompt_version) {
      const v = row.prompt_version as string;
      versionCounts[v] = (versionCounts[v] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    period_days: days,
    since,
    total_interactions: allRows.length,
    aggregates,
    top_repeated_questions: topRepeatedQuestions,
    top_warnings: topWarnings,
    latency_distribution: latencyDistribution,
    recent_issues: recent ?? [],
    prompt_versions: Object.entries(versionCounts)
      .map(([version, count]) => ({ version, count }))
      .sort((a, b) => b.count - a.count),
  });
}
