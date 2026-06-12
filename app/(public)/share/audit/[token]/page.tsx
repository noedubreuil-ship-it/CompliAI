import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, Clock, AlertTriangle } from "lucide-react";
import { VERDICT_COLORS, formatDate } from "@/lib/utils";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function SharedAuditPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: audit } = await admin
    .from("audits")
    .select(
      "id, verdict, compliance_score, ai_act_classification, risk_level, created_at, share_expires_at, share_enabled, raw_response, projects(name, sector)",
    )
    .eq("share_token", token)
    .eq("share_enabled", true)
    .single();

  if (!audit) return notFound();

  if (audit.share_expires_at && new Date(audit.share_expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center space-y-3 max-w-md">
          <Clock className="h-10 w-10 text-slate-400 mx-auto" />
          <h1 className="text-xl font-semibold text-slate-800">Lien expiré</h1>
          <p className="text-sm text-slate-500">Ce rapport d&apos;audit partagé n&apos;est plus accessible.</p>
        </div>
      </div>
    );
  }

  const rawProject = audit.projects as unknown;
  const project = (
    Array.isArray(rawProject) ? rawProject[0]
    : rawProject
  ) as { name: string; sector: string } | null | undefined;
  let summary: { blocking_issues?: Array<{ title: string; severity: string }> } = {};
  try {
    summary = JSON.parse(audit.raw_response ?? "{}");
  } catch {
    /* ignore */
  }

  const issues = summary.blocking_issues ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <Shield className="h-5 w-5" />
          CompliAI — rapport partagé
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="rounded-xl border bg-amber-50 border-amber-200 px-4 py-3 text-xs text-amber-900 flex gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          Document en lecture seule — information juridique générale, non un conseil personnalisé.
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project?.name ?? "Audit de conformité"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {project?.sector} · {formatDate(audit.created_at)}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Verdict</p>
            <span
              className={`inline-block mt-1 text-sm px-2 py-1 rounded-full border font-medium ${VERDICT_COLORS[audit.verdict as keyof typeof VERDICT_COLORS] ?? ""}`}
            >
              {audit.verdict}
            </span>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Score</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {audit.compliance_score != null ? `${audit.compliance_score}%` : "—"}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4 col-span-2">
            <p className="text-xs text-muted-foreground">Classification AI Act</p>
            <p className="text-sm font-medium mt-1">{audit.ai_act_classification ?? "—"}</p>
          </div>
        </div>

        {issues.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Issues bloquantes ({issues.length})</h2>
            <ul className="space-y-2 text-sm">
              {issues.slice(0, 15).map((issue, i) => (
                <li key={i} className="flex gap-2 border-b last:border-0 pb-2">
                  <span className="text-xs text-muted-foreground uppercase w-16 shrink-0">{issue.severity}</span>
                  <span>{issue.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {audit.share_expires_at && (
          <p className="text-xs text-center text-muted-foreground">
            Lien valide jusqu&apos;au{" "}
            {new Date(audit.share_expires_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </main>
    </div>
  );
}
