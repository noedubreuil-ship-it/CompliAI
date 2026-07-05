"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, AlertTriangle, Clock, TrendingUp, RefreshCw, Zap, BarChart2, Hash, MessageSquare } from "lucide-react";

interface ToolAggregate {
  tool: string;
  count: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  warning_rate_pct: number;
  truncation_rate_pct: number;
  citation_issue_rate_pct: number;
  feedback_positive: number;
  feedback_negative: number;
  models: string[];
}

interface RecentIssue {
  id: string;
  tool: string;
  model: string;
  latency_ms: number;
  output_length: number;
  warnings: string[] | null;
  feedback: string | null;
  feedback_note: string | null;
  prompt_version: string | null;
  created_at: string;
}

interface PromptVersion {
  version: string;
  count: number;
}

interface RepeatedQuestion {
  hash: string;
  count: number;
  tool: string;
  last_seen: string;
}

interface TopWarning {
  warning: string;
  count: number;
}

interface LatencyByModel {
  model: string;
  count: number;
  avg_ms: number;
  p50_ms: number;
  p95_ms: number;
}

interface DashboardData {
  period_days: number;
  since: string;
  total_interactions: number;
  aggregates: ToolAggregate[];
  top_repeated_questions: RepeatedQuestion[];
  top_warnings: TopWarning[];
  latency_distribution: LatencyByModel[];
  recent_issues: RecentIssue[];
  prompt_versions: PromptVersion[];
}

export default function AdminAiLogsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ai-logs?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard IA — Interactions</h1>
          <p className="text-sm text-gray-500 mt-1">Qualité et observabilité du moteur IA</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="text-sm border rounded-lg px-3 py-2 bg-white"
          >
            <option value={1}>24 heures</option>
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{data.total_interactions.toLocaleString("fr-FR")}</p>
            <p className="text-xs text-gray-400 mt-1">sur {data.period_days}j</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">p95 consultant</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data.aggregates.find(a => a.tool === "consultant")?.p95_latency_ms
                ? `${((data.aggregates.find(a => a.tool === "consultant")!.p95_latency_ms) / 1000).toFixed(1)}s`
                : "—"}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Warnings</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data.aggregates.find(a => a.tool === "consultant")?.warning_rate_pct ?? "0"}%
            </p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-red-500" />
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Troncatures</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {data.aggregates.find(a => a.tool === "consultant")?.truncation_rate_pct ?? "0"}%
            </p>
          </div>
        </div>
      )}

      {/* Agrégats par outil */}
      {data && data.aggregates.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Par outil</h2>
          <div className="bg-white rounded-xl border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Outil</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Calls</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">p50</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">p95</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Warnings</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Troncatures</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Citations ⚠</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">👍 / 👎</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.aggregates.map(row => (
                  <tr key={row.tool} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.tool}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.count.toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right text-gray-500 text-xs">{(row.p50_latency_ms / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3 text-right text-gray-700">{(row.p95_latency_ms / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.warning_rate_pct > 20 ? "bg-red-100 text-red-700" :
                        row.warning_rate_pct > 10 ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      }`}>{row.warning_rate_pct}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.truncation_rate_pct > 5 ? "bg-red-100 text-red-700" :
                        row.truncation_rate_pct > 0 ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{row.truncation_rate_pct}%</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.citation_issue_rate_pct > 10 ? "bg-red-100 text-red-700" :
                        row.citation_issue_rate_pct > 0 ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{row.citation_issue_rate_pct}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {row.feedback_positive > 0 && <span className="text-green-600">+{row.feedback_positive}</span>}
                      {row.feedback_positive > 0 && row.feedback_negative > 0 && " / "}
                      {row.feedback_negative > 0 && <span className="text-red-600">-{row.feedback_negative}</span>}
                      {row.feedback_positive === 0 && row.feedback_negative === 0 && "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Top questions répétées + Top warnings — côte à côte */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top questions répétées */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Top questions répétées
              <span className="text-xs font-normal text-gray-400">(même hash = même question)</span>
            </h2>
            {data.top_repeated_questions.length === 0 ? (
              <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400">
                Aucune question répétée sur cette période.
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Hash (12 car.)</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Outil</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">×</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.top_repeated_questions.map(q => (
                      <tr key={q.hash} className="hover:bg-gray-50">
                        <td className="px-4 py-2"><code className="text-xs font-mono text-gray-600">{q.hash}</code></td>
                        <td className="px-4 py-2 text-xs text-gray-500">{q.tool}</td>
                        <td className="px-4 py-2 text-right font-semibold text-blue-700">{q.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Top warnings */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Top warnings guardrails
            </h2>
            {data.top_warnings.length === 0 ? (
              <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400">
                Aucun warning sur cette période.
              </div>
            ) : (
              <div className="space-y-2">
                {data.top_warnings.map(w => {
                  const maxCount = data.top_warnings[0]?.count ?? 1;
                  const pct = Math.round((w.count / maxCount) * 100);
                  return (
                    <div key={w.warning} className="bg-white border rounded-lg px-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs font-mono text-amber-700">{w.warning}</code>
                        <span className="text-xs font-bold text-gray-700">{w.count}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Latences par modèle */}
      {data && data.latency_distribution.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-500" />
            Distribution des latences par modèle
          </h2>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Modèle</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Calls</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Moy.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">p50</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">p95</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.latency_distribution.map(m => (
                  <tr key={m.model} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 font-mono text-xs">{m.model}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{m.count.toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{(m.avg_ms / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3 text-right text-gray-700">{(m.p50_ms / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.p95_ms > 15000 ? "bg-red-100 text-red-700" :
                        m.p95_ms > 8000 ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      }`}>{(m.p95_ms / 1000).toFixed(1)}s</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Versions de prompt */}
      {data && data.prompt_versions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Hash className="h-5 w-5 text-gray-400" />
            Versions du prompt consultant
            <span className="text-xs font-normal text-gray-400">(SHA-256 tronqué 16 car.)</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.prompt_versions.map(pv => (
              <div key={pv.version} className="bg-white border rounded-lg px-4 py-2">
                <code className="text-xs font-mono text-blue-700">{pv.version}</code>
                <span className="ml-2 text-xs text-gray-500">{pv.count} appels</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Derniers problèmes */}
      {data && data.recent_issues.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Dernières interactions avec warnings ou feedback négatif
          </h2>
          <div className="space-y-3">
            {data.recent_issues.map(issue => (
              <div key={issue.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{issue.tool}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500 font-mono">{issue.model}</span>
                      {issue.feedback === "negative" && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          👎 Feedback négatif
                        </span>
                      )}
                    </div>
                    {issue.feedback_note && (
                      <p className="text-xs text-red-600 mb-1 italic">"{issue.feedback_note}"</p>
                    )}
                    {issue.warnings && issue.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {issue.warnings.map((w, i) => (
                          <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded border border-amber-100 font-mono">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {new Date(issue.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{(issue.latency_ms / 1000).toFixed(1)}s · {issue.output_length} car.</p>
                    {issue.prompt_version && (
                      <code className="text-xs font-mono text-gray-400 mt-0.5 block">v: {issue.prompt_version}</code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-gray-300 animate-spin" />
        </div>
      )}

      {data && data.total_interactions === 0 && (
        <div className="text-center py-20 text-gray-400">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune interaction sur cette période.</p>
        </div>
      )}
    </div>
  );
}
