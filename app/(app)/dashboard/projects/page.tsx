import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FolderSearch, ArrowRight } from "lucide-react";
import { formatDate, VERDICT_COLORS } from "@/lib/utils";

export const metadata = { title: "Mes projets — CompliAI" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, sector, status, created_at, audits(id, verdict, created_at)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes projets</h1>
          <p className="text-muted-foreground mt-1">{projects?.length ?? 0} projet(s) audité(s)</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button><Plus className="h-4 w-4" /> Nouvel audit</Button>
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4">
          {projects.map((project: any) => {
            const latestAudit = project.audits?.[0];
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="hover:border-slate-400 transition-colors cursor-pointer">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-slate-100 rounded-lg flex-shrink-0">
                          <FolderSearch className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.sector} · {formatDate(project.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {latestAudit && (
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${VERDICT_COLORS[latestAudit.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}>
                            {latestAudit.verdict}
                          </span>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderSearch className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-medium">Aucun projet audité</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Lancez votre premier audit de conformité AI Act &amp; RGPD.
            </p>
            <Link href="/dashboard/projects/new">
              <Button><Plus className="h-4 w-4" /> Créer mon premier audit</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
