"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  ArrowLeft,
  ExternalLink,
  Euro,
  BookOpen,
  Gavel,
} from "lucide-react";
import { VERDICT_COLORS, RISK_LEVEL_COLORS, SEVERITY_COLORS } from "@/lib/utils";
import type { RoadmapPhase } from "@/lib/types/audit";

interface AuditResultProps {
  audit: {
    id: string;
    verdict: string;
    ai_act_classification: string;
    risk_level: string;
    roadmap: RoadmapPhase[];
    cost_estimate: { initial: string; recurring_annual: string; details: string };
    lawyer_needed: boolean;
    created_at: string;
    raw_response: string;
    projects: { name: string; sector: string } | null;
    blocking_issues: Array<{
      id: string;
      title: string;
      description: string;
      regulation: string;
      article?: string;
      severity: string;
      phase: string;
      status: string;
    }>;
  };
  projectId: string;
  canDownloadPdf: boolean;
}

const VERDICT_ICONS = {
  "Conforme": CheckCircle2,
  "Attention requise": Clock,
  "Risque élevé": AlertTriangle,
  "Non conforme": XCircle,
};

export default function AuditResult({ audit, projectId, canDownloadPdf }: AuditResultProps) {
  const parsedRaw = (() => {
    try { return JSON.parse(audit.raw_response); } catch { return null; }
  })();
  const summary = parsedRaw?.summary ?? "";
  const VerdictIcon = VERDICT_ICONS[audit.verdict as keyof typeof VERDICT_ICONS] ?? Shield;

  async function downloadPdf() {
    const res = await fetch(`/api/pdf/${audit.id}`);
    if (!res.ok) return alert("Erreur lors de la génération du PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliai-rapport-${audit.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Rapport d&apos;audit</h1>
            <p className="text-sm text-muted-foreground">{audit.projects?.name}</p>
          </div>
        </div>
        {canDownloadPdf ? (
          <Button onClick={downloadPdf} variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
        ) : (
          <Link href="/dashboard/upgrade">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              PDF (Pro)
            </Button>
          </Link>
        )}
      </div>

      {/* Verdict Hero */}
      <Card className={`border-2 ${VERDICT_COLORS[audit.verdict as keyof typeof VERDICT_COLORS]}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <VerdictIcon className="h-10 w-10 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold">{audit.verdict}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${RISK_LEVEL_COLORS[audit.risk_level as keyof typeof RISK_LEVEL_COLORS]}`}>
                  Risque {audit.risk_level}
                </span>
              </div>
              <p className="text-sm font-medium mt-1 opacity-75">{audit.ai_act_classification}</p>
              {summary && <p className="text-sm mt-3 opacity-90">{summary}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blocking Issues */}
      {audit.blocking_issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Issues bloquantes ({audit.blocking_issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {audit.blocking_issues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-lg border ${SEVERITY_COLORS[issue.severity as keyof typeof SEVERITY_COLORS]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{issue.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 font-medium capitalize flex-shrink-0">
                    {issue.severity}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-80">{issue.description}</p>
                {issue.regulation && (
                  <p className="text-xs mt-2 font-medium opacity-70">
                    {issue.regulation}{issue.article && ` — Art. ${issue.article}`}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Roadmap */}
      {audit.roadmap && audit.roadmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Roadmap de conformité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {audit.roadmap.map((phase: RoadmapPhase, phaseIdx: number) => (
              <div key={phaseIdx} className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {phaseIdx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{phase.phase}</p>
                    {phase.duration && (
                      <p className="text-xs text-muted-foreground">{phase.duration}</p>
                    )}
                  </div>
                </div>
                <div className="ml-10 space-y-2">
                  {phase.actions?.map((action, actionIdx) => (
                    <div key={actionIdx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{action.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          action.effort === "high" ? "bg-red-100 text-red-700" :
                          action.effort === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {action.effort === "high" ? "Effort élevé" : action.effort === "medium" ? "Effort moyen" : "Effort faible"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                      {action.regulation && (
                        <p className="text-xs mt-1.5 text-slate-500 font-medium">
                          {action.regulation}{action.article && ` — Art. ${action.article}`}
                          {action.cost_estimate && (
                            <span className="ml-2 text-blue-600">≈ {action.cost_estimate}</span>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Cost Estimate */}
      {audit.cost_estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Estimation des coûts de conformité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Coût initial</p>
                <p className="text-xl font-bold mt-1">{audit.cost_estimate.initial}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Récurrent / an</p>
                <p className="text-xl font-bold mt-1">{audit.cost_estimate.recurring_annual}</p>
              </div>
            </div>
            {audit.cost_estimate.details && (
              <p className="text-sm text-muted-foreground">{audit.cost_estimate.details}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lawyer warning */}
      {audit.lawyer_needed && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3">
          <Gavel className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Validation juridique recommandée</p>
            <p className="text-xs text-amber-700 mt-1">
              Au vu du niveau de risque identifié, nous recommandons fortement de faire valider ce rapport par un avocat 
              spécialisé en droit du numérique avant tout déploiement. Ce rapport constitue une <strong>information juridique</strong> et non un <strong>conseil juridique</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-muted-foreground">
        <strong>Avertissement légal :</strong> Les analyses de CompliAI sont générées par intelligence artificielle 
        sur la base des textes juridiques européens en vigueur. Elles constituent des <em>informations juridiques générales</em> et 
        non des conseils juridiques personnalisés. CompliAI ne peut être tenu responsable des décisions prises 
        sur la base de ces analyses. Pour toute décision engageant la responsabilité de votre entreprise, 
        consultez un avocat qualifié.{" "}
        <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener" className="underline hover:text-foreground inline-flex items-center gap-0.5">
          EUR-Lex <ExternalLink className="h-3 w-3 inline" />
        </a>
      </div>
    </div>
  );
}
