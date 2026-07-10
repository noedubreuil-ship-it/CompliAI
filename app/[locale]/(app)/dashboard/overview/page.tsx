import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Bell,
  Plus,
} from "lucide-react";
import { formatDate, VERDICT_COLORS } from "@/lib/utils";
import ComplianceScore from "@/components/dashboard/ComplianceScore";
import ScoreHistory from "@/components/dashboard/ScoreHistory";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import { ProductOnboardingStepper } from "@/components/dashboard/ProductOnboardingStepper";

export const metadata = {
  title: "Vue d'ensemble — CompliAI",
};

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed, product_funnel_completed_at")
    .eq("id", user!.id)
    .single();

  const needsOnboarding = !profile?.onboarding_completed;

  const [
    { data: projects },
    { data: recentAudits },
    { data: openIssues },
    { data: unreadAlerts },
    { data: auditHistory },
    { count: totalAuditsCount },
    { count: projectsCount },
    { count: chatSessionsCount },
  ] = await Promise.all([
    supabase.from("projects").select("id, name, status").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("audits")
      .select("id, project_id, verdict, ai_act_classification, compliance_score, created_at, projects(name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("blocking_issues").select("id", { count: "exact" }).eq("status", "open"),
    supabase
      .from("regulatory_alerts")
      .select("id", { count: "exact" })
      .eq("user_id", user!.id)
      .eq("is_read", false),
    supabase
      .from("audits")
      .select("compliance_score, created_at, projects(name)")
      .not("compliance_score", "is", null)
      .order("created_at", { ascending: true })
      .limit(20),
    supabase.from("audits").select("*", { count: "exact", head: true }),
    supabase.from("projects").select("*", { count: "exact", head: true }),
    supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
  ]);

  const scoredAudits = recentAudits?.filter((a: { compliance_score?: number | null }) => a.compliance_score != null) ?? [];
  const avgScore =
    scoredAudits.length > 0
      ? Math.round(
          scoredAudits.reduce((sum: number, a: { compliance_score: number }) => sum + a.compliance_score, 0) /
            scoredAudits.length,
        )
      : null;

  const stats = [
    {
      label: "Projets actifs",
      value: projects?.length ?? 0,
      icon: FolderSearch,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/dashboard/projects",
    },
    {
      label: "Issues bloquantes",
      value: openIssues?.length ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/dashboard/projects",
    },
    {
      label: "Alertes non lues",
      value: unreadAlerts?.length ?? 0,
      icon: Bell,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/dashboard/alerts",
    },
    {
      label: "Audits réalisés",
      value: totalAuditsCount ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/dashboard/projects",
    },
  ];

  const historyPoints = (auditHistory ?? []).map((a: any) => ({
    date: a.created_at,
    score: a.compliance_score,
    projectName: a.projects?.name ?? "Projet",
  }));

  return (
    <div className="space-y-8">
      {needsOnboarding && <OnboardingWizard userName={profile?.full_name ?? ""} />}

      {!needsOnboarding && (
        <ProductOnboardingStepper
          hasProject={(projectsCount ?? 0) > 0}
          hasAudit={(totalAuditsCount ?? 0) > 0}
          hasChat={(chatSessionsCount ?? 0) > 0}
          serverCompleted={Boolean(profile?.product_funnel_completed_at)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vue d&apos;ensemble</h1>
          <p className="text-muted-foreground mt-1">Score, audits et indicateurs de conformité</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nouvel audit
          </Button>
        </Link>
      </div>

      <Card className="border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-6">
            <ComplianceScore score={avgScore} size="lg" showLabel={true} />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">Score de conformité global</h2>
              {avgScore != null ? (
                <p className="text-sm text-muted-foreground mt-1">
                  Moyenne sur {scoredAudits.length} audit{scoredAudits.length > 1 ? "s" : ""} récent
                  {scoredAudits.length > 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  Lancez un audit pour obtenir votre score
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Audits récents</CardTitle>
            <Link href="/dashboard/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentAudits && recentAudits.length > 0 ? (
              <div className="space-y-3">
                {recentAudits.map((audit: any) => (
                  <Link
                    key={audit.id}
                    href={`/dashboard/projects/${audit.project_id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{audit.projects?.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDate(audit.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {audit.compliance_score != null && (
                        <ComplianceScore score={audit.compliance_score} size="sm" showLabel={false} />
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full border font-medium ${VERDICT_COLORS[audit.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}
                      >
                        {audit.verdict}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucun audit réalisé</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { href: "/dashboard/chat", title: "Consultant IA", desc: "Posez une question juridique" },
              { href: "/dashboard/projects/new", title: "Nouvel audit", desc: "Verdict AI Act & RGPD" },
              { href: "/dashboard/tools", title: "Outils juridiques", desc: "DPIA, RoPA, comparateur…" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {historyPoints.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du score</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreHistory audits={historyPoints} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
