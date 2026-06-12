import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  FolderSearch,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDate, VERDICT_COLORS } from "@/lib/utils";
import BlockingIssuesKanban from "@/components/dashboard/BlockingIssuesKanban";
import { AuditSnapshotCompare } from "@/components/dashboard/AuditSnapshotCompare";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: audits } = await supabase
    .from("audits")
    .select("id, verdict, ai_act_classification, compliance_score, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: snapshots } = await supabase
    .from("audit_snapshots")
    .select("id, version, compliance_score, verdict, created_at, audit_id")
    .eq("project_id", id)
    .order("version", { ascending: false })
    .limit(12);

  const { data: blockingIssues } = await supabase
    .from("blocking_issues")
    .select("*")
    .eq("project_id", id)
    .order("severity", { ascending: false });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const canTrack =
    profile?.subscription_tier === "starter" ||
    profile?.subscription_tier === "pro" ||
    profile?.subscription_tier === "enterprise";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.sector}</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" /> Nouvel audit
          </Button>
        </Link>
      </div>

      {/* Project Info */}
      <Card>
        <CardContent className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            ["Secteur", project.sector],
            ["Public cible", project.target_audience],
            ["Modèle IA", project.ai_model_type],
            ["Données perso", project.uses_personal_data ? "Oui" : "Non"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderSearch className="h-4 w-4" />
            Historique des audits ({audits?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {audits && audits.length > 0 ? (
            <div className="space-y-2">
              {audits.map((audit: any) => (
                <Link
                  key={audit.id}
                  href={`/dashboard/projects/${id}/audit/${audit.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{formatDate(audit.created_at)}</p>
                      <p className="text-xs text-muted-foreground flex flex-wrap gap-2">
                        <span>{audit.ai_act_classification}</span>
                        {audit.compliance_score != null && (
                          <span className="font-medium text-slate-700">{audit.compliance_score}%</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${VERDICT_COLORS[audit.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}>
                      {audit.verdict}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun audit pour ce projet.</p>
          )}
        </CardContent>
      </Card>

      {snapshots && snapshots.length >= 2 && (
        <AuditSnapshotCompare snapshots={snapshots} />
      )}

      {/* Snapshots versionnés (évolution dans le temps) */}
      {snapshots && snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Historique versionné (snapshots) — {snapshots.length} version{snapshots.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50 text-sm"
                >
                  <div>
                    <span className="font-semibold">v{s.version}</span>
                    <span className="text-muted-foreground ml-2">{formatDate(s.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.compliance_score != null && (
                      <span className="text-xs font-medium tabular-nums">{s.compliance_score}%</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${VERDICT_COLORS[s.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}>
                      {s.verdict}
                    </span>
                    <Link href={`/dashboard/projects/${id}/audit/${s.audit_id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Voir l&apos;audit</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocking Issues Kanban */}
      {canTrack ? (
        <BlockingIssuesKanban
          projectId={id}
          initialIssues={blockingIssues ?? []}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm font-medium">Suivi des issues bloquantes</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Disponible dès le plan Starter — suivez l&apos;avancement de vos actions de mise en conformité.
            </p>
            <Link href="/dashboard/upgrade">
              <Button size="sm">Passer au plan Starter</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
