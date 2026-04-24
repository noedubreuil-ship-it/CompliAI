import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", user!.id)
    .single();

  const needsOnboarding = !profile?.onboarding_completed;

  const [{ data: projects }, { data: recentAudits }, { data: openIssues }, { data: unreadAlerts }, { data: auditHistory }] =
    await Promise.all([
      supabase.from("projects").select("id, name, status").eq("user_id", user!.id).limit(5),
      supabase
        .from("audits")
        .select("id, project_id, verdict, ai_act_classification, compliance_score, created_at, projects(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("blocking_issues")
        .select("id", { count: "exact" })
        .eq("user_id", user!.id)
        .eq("status", "open"),
      supabase
        .from("regulatory_alerts")
        .select("id", { count: "exact" })
        .eq("user_id", user!.id)
        .eq("is_read", false),
      supabase
        .from("audits")
        .select("compliance_score, created_at, projects(name)")
        .eq("user_id", user!.id)
        .not("compliance_score", "is", null)
        .order("created_at", { ascending: true })
        .limit(20),
    ]);

  // Calcul du score moyen sur les audits avec un score
  const scoredAudits = recentAudits?.filter((a: any) => a.compliance_score != null) ?? [];
  const avgScore = scoredAudits.length > 0
    ? Math.round(scoredAudits.reduce((sum: number, a: any) => sum + a.compliance_score, 0) / scoredAudits.length)
    : null;

  const stats = [
    {
      label: "Projets actifs",
      value: projects?.length ?? 0,
      icon: FolderSearch,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Issues bloquantes",
      value: openIssues?.length ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Alertes non lues",
      value: unreadAlerts?.length ?? 0,
      icon: Bell,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Audits réalisés",
      value: recentAudits?.length ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">
            Vue d&apos;ensemble de votre conformité réglementaire
          </p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nouvel audit
          </Button>
        </Link>
      </div>

      {/* Score de conformité global */}
      <Card className="border-2 border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-6">
            <ComplianceScore score={avgScore ?? 0} size="lg" showLabel={true} />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900">Score de conformité global</h2>
              {avgScore != null ? (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    Moyenne calculée sur {scoredAudits.length} audit{scoredAudits.length > 1 ? "s" : ""} récent{scoredAudits.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Relancez un audit pour mettre à jour votre score
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    Aucun score disponible — lancez un audit pour obtenir votre score
                  </p>
                  <Link href="/dashboard/projects/new">
                    <Button size="sm" className="mt-3">
                      <Plus className="h-4 w-4" /> Lancer un audit
                    </Button>
                  </Link>
                </>
              )}
            </div>
            <div className="hidden md:grid grid-cols-2 gap-3 text-center">
              <div className="bg-white border rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-orange-600">{openIssues?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Issues bloquantes</p>
              </div>
              <div className="bg-white border rounded-lg px-4 py-3">
                <p className="text-2xl font-bold text-blue-600">{recentAudits?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Audits réalisés</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                <Link href="/dashboard/projects/new">
                  <Button variant="link" size="sm" className="mt-1">
                    Lancer votre premier audit
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Démarrer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                href: "/dashboard/projects/new",
                icon: FolderSearch,
                title: "Auditer un projet IA",
                desc: "Obtenez un verdict de conformité AI Act & RGPD en 5 minutes.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                href: "/dashboard/chat",
                icon: CheckCircle2,
                title: "Consulter le juriste IA",
                desc: "Posez une question sur le droit européen du numérique.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                href: "/dashboard/register",
                icon: Bell,
                title: "Registre des systèmes IA",
                desc: "Créez votre registre obligatoire AI Act Annexe III.",
                color: "bg-green-50 text-green-600",
              },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors group"
              >
                <div className={`p-2 rounded-lg ${action.color} flex-shrink-0`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium group-hover:text-primary">{action.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Score History */}
      {historyPoints.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du score de conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreHistory audits={historyPoints} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
