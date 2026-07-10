"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Loader2, AlertTriangle, CheckCircle2, XCircle, FileDown } from "lucide-react";
import Link from "next/link";
import ComplianceScore from "@/components/dashboard/ComplianceScore";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-200 bg-red-50 text-red-800",
  high: "border-orange-200 bg-orange-50 text-orange-800",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  low: "border-blue-200 bg-blue-50 text-blue-800",
};

const RECO_COLORS: Record<string, string> = {
  invest_with_conditions: "bg-amber-50 border-amber-200 text-amber-800",
  monitor: "bg-blue-50 border-blue-200 text-blue-800",
  red_flag: "bg-red-50 border-red-200 text-red-800",
};

const RECO_LABELS: Record<string, string> = {
  invest_with_conditions: "✓ Investissement possible sous conditions",
  monitor: "⚡ À surveiller — monitoring recommandé",
  red_flag: "⚠️ Signal d'alarme — risques élevés non couverts",
};

export default function InvestorReportPage() {
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/audits-list").then(r => r.json()).then(d => setAudits(d.audits ?? [])).catch(() => {});
  }, []);

  async function generate() {
    if (!selectedAudit) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/investor-report", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: selectedAudit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title: result.title ?? "Rapport investisseurs",
        subtitle: `Score ${result.compliance_snapshot?.score ?? "—"}/100 · ${result.compliance_snapshot?.verdict ?? ""}`,
        sections: [
          { heading: "Synthèse exécutive", body: result.executive_summary ?? "" },
          ...(result.recommendation ? [{
            heading: "Recommandation",
            body: [
              RECO_LABELS[result.recommendation] ?? result.recommendation,
              ...(result.conditions ?? []).map((c: string) => `• ${c}`),
            ].join("\n"),
          }] : []),
          ...(result.key_risks?.length ? [{
            heading: "Risques clés",
            body: result.key_risks.map((r: { risk: string; impact: string; mitigation: string; severity: string }) =>
              `[${r.severity}] ${r.risk}\nImpact : ${r.impact}\nMitigation : ${r.mitigation}`,
            ).join("\n\n"),
          }] : []),
          ...(result.regulatory_roadmap ? [{ heading: "Plan de conformité", body: result.regulatory_roadmap }] : []),
          ...(result.cost_impact ? [{ heading: "Impact financier", body: result.cost_impact }] : []),
          ...(result.competitive_advantage ? [{ heading: "Avantage compétitif", body: result.competitive_advantage }] : []),
        ],
        filename: "rapport-investisseurs",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" /> Rapport Due Diligence Investisseurs
          </h1>
          <p className="text-sm text-muted-foreground">Score · Risques · Plan d&apos;action · Format VC / PE</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Sélectionner un audit</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {audits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucun audit disponible. Créez d&apos;abord un audit.</p>
                <Link href="/dashboard/projects/new" className="mt-2 inline-block">
                  <Button size="sm" variant="outline">Créer un audit</Button>
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Audit à transformer en rapport investisseurs</label>
                  <div className="space-y-2">
                    {audits.map((a: any) => (
                      <button key={a.id} onClick={() => setSelectedAudit(a.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedAudit === a.id ? "border-indigo-500 bg-indigo-50" : "hover:border-slate-300"
                        }`}>
                        <p className="text-sm font-medium">{a.projects?.name ?? "Projet"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.verdict} · Score {a.compliance_score ?? "—"}/100</p>
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={generate} disabled={loading || !selectedAudit} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours (30-60s)…</> : "Générer le rapport investisseurs"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-bold">{result.title}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouveau rapport</Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-6">
                <ComplianceScore score={result.compliance_snapshot?.score ?? 0} size="lg" />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-slate-700 mb-3">{result.executive_summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium">{result.compliance_snapshot?.verdict}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium">Risque {result.compliance_snapshot?.risk_level}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-medium text-slate-600">{result.compliance_snapshot?.classification}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.recommendation && (
            <div className={`p-4 rounded-xl border font-medium text-sm ${RECO_COLORS[result.recommendation] ?? ""}`}>
              {RECO_LABELS[result.recommendation] ?? result.recommendation}
              {result.conditions?.length > 0 && (
                <ul className="mt-2 space-y-0.5 font-normal">
                  {result.conditions.map((c: string, i: number) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="opacity-60">•</span> {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.key_risks?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Risques identifiés</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.key_risks.map((risk: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[risk.severity] ?? ""}`}>
                    <p className="text-sm font-semibold">{risk.risk}</p>
                    <p className="text-xs mt-1 opacity-80"><strong>Impact :</strong> {risk.impact}</p>
                    <p className="text-xs mt-0.5 opacity-80"><strong>Mitigation :</strong> {risk.mitigation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Plan de conformité</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-700 leading-relaxed">{result.regulatory_roadmap}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Impact financier</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-700 leading-relaxed">{result.cost_impact}</p></CardContent>
            </Card>
          </div>

          {result.competitive_advantage && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader><CardTitle className="text-sm text-green-800">Avantage compétitif</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-green-700 leading-relaxed">{result.competitive_advantage}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
