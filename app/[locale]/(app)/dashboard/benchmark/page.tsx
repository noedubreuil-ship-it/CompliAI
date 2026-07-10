import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import ComplianceScore from "@/components/dashboard/ComplianceScore";

export const metadata = { title: "Benchmark sectoriel — CompliAI" };

export default async function BenchmarkPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // User's audits with scores
  const { data: userAudits } = await supabase
    .from("audits")
    .select("compliance_score, projects(sector)")
    .eq("user_id", user!.id)
    .not("compliance_score", "is", null)
    .order("created_at", { ascending: false });

  // Sector benchmarks (aggregated anonymously)
  const { data: benchmarks } = await supabase
    .from("sector_benchmarks")
    .select("*")
    .order("avg_score", { ascending: false });

  // Compute user's average score
  const userScores = userAudits?.map(a => a.compliance_score as number) ?? [];
  const userAvg = userScores.length > 0
    ? Math.round(userScores.reduce((a, b) => a + b, 0) / userScores.length)
    : null;

  // Get user's sectors from projects
  const sectorList =
    userAudits
      ?.map((a) => {
        const p = a.projects as unknown;
        if (Array.isArray(p)) return p[0]?.sector ?? "";
        return (p as { sector?: string } | null)?.sector ?? "";
      })
      .filter((s): s is string => typeof s === "string" && s.length > 0) ?? [];
  const userSectors = Array.from(new Set(sectorList));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Benchmark sectoriel
        </h1>
        <p className="text-muted-foreground mt-1">
          Comparez votre score de conformité avec les entreprises de votre secteur (données anonymisées).
        </p>
      </div>

      {userAvg !== null && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-6">
              <ComplianceScore score={userAvg} size="lg" />
              <div>
                <p className="text-lg font-bold text-blue-900">Votre score moyen</p>
                <p className="text-sm text-blue-700">{userAvg}/100 sur {userScores.length} audit(s)</p>
                {userSectors.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">Secteurs : {userSectors.join(", ")}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!benchmarks || benchmarks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Données de benchmark en cours de collecte</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Les données de benchmark seront disponibles dès que suffisamment d&apos;entreprises du même secteur auront réalisé des audits.
              Vos audits contribuent anonymement à alimenter ces statistiques.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Scores moyens par secteur</h2>
          {benchmarks.map((b) => {
            const isUserSector = userSectors.includes(b.sector);
            return (
              <Card key={b.id} className={isUserSector ? "border-blue-300" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <ComplianceScore score={Math.round(b.avg_score ?? 0)} size="sm" showLabel={false} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{b.sector}</p>
                        {isUserSector && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                            Votre secteur
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${b.avg_score ?? 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 flex-shrink-0">
                          {Math.round(b.avg_score ?? 0)}/100 · {b.sample_count} entreprises
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        P25: {Math.round(b.p25_score ?? 0)} · P75: {Math.round(b.p75_score ?? 0)}
                      </p>
                    </div>
                    {userAvg !== null && isUserSector && (
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${userAvg >= (b.avg_score ?? 0) ? "text-green-600" : "text-red-600"}`}>
                          {userAvg >= (b.avg_score ?? 0) ? "+" : ""}{userAvg - Math.round(b.avg_score ?? 0)} pts
                        </p>
                        <p className="text-xs text-slate-400">vs moyenne</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="text-xs text-slate-400 text-center">
        Données anonymisées — aucune entreprise ne peut identifier vos résultats. Minimum 5 entreprises par secteur.
      </div>
    </div>
  );
}
