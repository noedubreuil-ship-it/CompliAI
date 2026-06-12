import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Shield, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Clock, BarChart3, FileText, CalendarDays, ArrowRight,
} from "lucide-react";
import { EU_CALENDAR_EVENTS } from "@/lib/data/eu-calendar";
import { AnalyticsPrintButton } from "@/components/dashboard/AnalyticsPrintButton";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 80) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}
function scoreBg(score: number) {
  if (score >= 80) return "bg-green-100";
  if (score >= 50) return "bg-amber-100";
  return "bg-red-100";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return notFound();

  const [
    { data: audits },
    { data: projects },
    { data: issues },
    { data: documents },
    { data: alerts, count: alertCount },
  ] = await Promise.all([
    supabase
      .from("audits")
      .select("id, compliance_score, verdict, ai_act_classification, created_at, projects(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("projects")
      .select("id, name, status, sector, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("blocking_issues")
      .select("id, title, severity, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("generated_documents")
      .select("id, doc_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const scoredAudits = (audits ?? []).filter((a) => a.compliance_score != null);
  const avgScore = scoredAudits.length
    ? Math.round(scoredAudits.reduce((s, a) => s + (a.compliance_score ?? 0), 0) / scoredAudits.length)
    : null;

  const latestScore = scoredAudits[0]?.compliance_score ?? null;
  const previousScore = scoredAudits[1]?.compliance_score ?? null;
  const scoreDelta = latestScore != null && previousScore != null ? latestScore - previousScore : null;

  const openIssues = (issues ?? []).filter((i) => i.status === "open");
  const criticalIssues = openIssues.filter((i) => i.severity === "critical" || i.severity === "high");

  // Verdicts
  const verdictCounts = (audits ?? []).reduce<Record<string, number>>((acc, a) => {
    const v = a.verdict ?? "unknown";
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});

  // Risk levels
  const riskCounts = (audits ?? []).reduce<Record<string, number>>((acc, a) => {
    const r = a.ai_act_classification ?? "Non classifié";
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});

  // Documents par type
  const docTypeCounts = (documents ?? []).reduce<Record<string, number>>((acc, d) => {
    acc[d.doc_type] = (acc[d.doc_type] ?? 0) + 1;
    return acc;
  }, {});

  // Score history (last 10)
  const scoreHistory = scoredAudits
    .slice(0, 10)
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      score: a.compliance_score as number,
      project: (a.projects as unknown as { name: string } | null)?.name ?? "",
    }));

  // Deadlines imminentes (< 60 jours)
  const now = new Date();
  const upcomingDeadlines = EU_CALENDAR_EVENTS
    .filter((e) => {
      const days = Math.ceil((new Date(e.date).getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 60 && (e.importance === "critique" || e.importance === "haute");
    })
    .slice(0, 4);

  const maxScore = Math.max(...scoreHistory.map((s) => s.score), 100);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord DPO</h1>
          <p className="text-sm text-gray-500 mt-1">Vue synthétique de votre conformité — à partager avec votre COMEX</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <AnalyticsPrintButton />
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Nouvel audit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 mb-1">Score moyen</p>
          <p className={`text-3xl font-bold ${avgScore != null ? scoreColor(avgScore) : "text-gray-400"}`}>
            {avgScore != null ? `${avgScore}%` : "—"}
          </p>
          {scoreDelta != null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${scoreDelta >= 0 ? "text-green-600" : "text-red-500"}`}>
              {scoreDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {scoreDelta >= 0 ? "+" : ""}{scoreDelta}% vs audit précédent
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 mb-1">Projets actifs</p>
          <p className="text-3xl font-bold text-gray-900">{projects?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">{audits?.length ?? 0} audits réalisés</p>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 mb-1">Issues ouvertes</p>
          <p className={`text-3xl font-bold ${openIssues.length > 0 ? "text-red-600" : "text-green-600"}`}>
            {openIssues.length}
          </p>
          {criticalIssues.length > 0 && (
            <p className="text-xs text-red-500 mt-1">{criticalIssues.length} critiques</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 mb-1">Documents générés</p>
          <p className="text-3xl font-bold text-gray-900">{documents?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">
            {alertCount ?? 0} alertes non lues
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution du score */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" /> Évolution du score de conformité
          </h2>
          {scoreHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun audit avec score disponible</p>
          ) : (
            <div className="space-y-3">
              {scoreHistory.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-14 flex-shrink-0">{s.date}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        s.score >= 80 ? "bg-green-400" : s.score >= 50 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${(s.score / maxScore) * 100}%` }}
                    />
                    <span className="absolute right-2 top-0 text-xs font-semibold text-gray-700 leading-5">
                      {s.score}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 w-28 truncate flex-shrink-0 text-right">{s.project}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Répartition par risque */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-500" /> Niveaux de risque AI Act
          </h2>
          {Object.keys(riskCounts).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(riskCounts).map(([risk, count]) => {
                const total = audits?.length ?? 1;
                const pct = Math.round((count / total) * 100);
                const color = risk.toLowerCase().includes("haut") || risk.toLowerCase().includes("interdit")
                  ? "bg-red-400"
                  : risk.toLowerCase().includes("limité")
                  ? "bg-amber-400"
                  : risk.toLowerCase().includes("minimal")
                  ? "bg-green-400"
                  : "bg-gray-300";
                return (
                  <div key={risk} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate max-w-[140px]">{risk}</span>
                      <span className="font-medium text-gray-800">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues critiques */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Issues ouvertes
            </h2>
            <Link href="/dashboard/projects" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          {openIssues.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm py-4">
              <CheckCircle2 className="h-4 w-4" /> Aucune issue ouverte
            </div>
          ) : (
            <div className="space-y-2">
              {openIssues.slice(0, 5).map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    issue.severity === "critical" ? "bg-red-500" :
                    issue.severity === "high" ? "bg-orange-400" :
                    issue.severity === "medium" ? "bg-amber-400" : "bg-gray-300"
                  }`} />
                  <p className="text-sm text-gray-700 flex-1 truncate">{String(issue.title ?? "")}</p>
                  <span className="text-xs text-gray-400">
                    {new Date(issue.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents générés */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Documents générés
            </h2>
            <Link href="/dashboard/documents" className="text-xs text-blue-600 hover:underline">Voir tout</Link>
          </div>
          {Object.keys(docTypeCounts).length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Aucun document généré</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(docTypeCounts).map(([type, count]) => (
                <div key={type} className={`rounded-lg p-3 ${scoreBg(50)}`}>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-xs text-gray-600 capitalize">{type.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deadlines réglementaires imminentes */}
      {upcomingDeadlines.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-500" /> Deadlines réglementaires à venir (60 jours)
            </h2>
            <Link href="/dashboard/calendar" className="text-xs text-blue-600 hover:underline">Calendrier complet</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingDeadlines.map((e) => {
              const days = Math.ceil((new Date(e.date).getTime() - now.getTime()) / 86400000);
              return (
                <div key={e.id} className={`rounded-lg border p-4 ${e.importance === "critique" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{e.title.slice(0, 60)}{e.title.length > 60 ? "…" : ""}</p>
                    <span className={`text-xs font-bold flex-shrink-0 ${days <= 14 ? "text-red-600" : "text-amber-700"}`}>J-{days}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{e.regulation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verdicts */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-green-500" /> Répartition des verdicts d&apos;audit
        </h2>
        {Object.keys(verdictCounts).length === 0 ? (
          <p className="text-sm text-gray-400">Aucun audit réalisé</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {Object.entries(verdictCounts).map(([v, c]) => (
              <div key={v} className={`rounded-lg px-4 py-3 ${
                v === "conforme" ? "bg-green-50 border border-green-200" :
                v === "non_conforme" ? "bg-red-50 border border-red-200" :
                "bg-amber-50 border border-amber-200"
              }`}>
                <p className="text-2xl font-bold text-gray-900">{c}</p>
                <p className="text-xs text-gray-600 capitalize">{v.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
