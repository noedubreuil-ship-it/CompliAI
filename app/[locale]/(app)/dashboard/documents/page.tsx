import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import Fuse from "fuse.js";
import { FileText, Gavel, ClipboardList, Shield, CheckSquare, ArrowRight, FolderOpen, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteDocumentButton } from "./DeleteDocumentButton";
import { ShareDocumentButton } from "@/components/documents/ShareDocumentButton";
import { DocumentsSearchBar } from "./DocumentsSearchBar";
import { IndexSemanticButton } from "@/components/documents/IndexSemanticButton";

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; href?: string }> = {
  dpia: { label: "DPIA", icon: Shield, color: "bg-blue-100 text-blue-700", href: "/dashboard/tools/dpia" },
  ropa: { label: "RoPA", icon: ClipboardList, color: "bg-green-100 text-green-700", href: "/dashboard/tools/ropa" },
  ai_act_classification: { label: "Classifieur AI Act", icon: FileText, color: "bg-purple-100 text-purple-700", href: "/dashboard/tools/classifier" },
  compliance_checklist: { label: "Checklist", icon: CheckSquare, color: "bg-amber-100 text-amber-700", href: "/dashboard/tools/checklist" },
  jurisprudence_analysis: { label: "Jurisprudence", icon: Gavel, color: "bg-indigo-100 text-indigo-700", href: "/dashboard/tools/jurisprudence" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const query = ((await searchParams)?.q ?? "").trim();

  const { data: docs } = await supabase
    .from("generated_documents")
    .select("id, doc_type, title, created_at, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const raw = docs ?? [];
  let filtered = raw;
  if (query.length >= 2) {
    const hay = raw.map((d) => ({
      id: d.id,
      haystack: `${d.title ?? ""} ${d.doc_type ?? ""} ${JSON.stringify(d.content ?? {}).slice(0, 24000)}`,
    }));
    const fuse = new Fuse(hay, { keys: ["haystack"], threshold: 0.35, ignoreLocation: true });
    const ids = new Set(fuse.search(query, { limit: 120 }).map((r) => r.item.id));
    filtered = raw.filter((d) => ids.has(d.id));
  }

  const grouped = filtered.reduce<Record<string, typeof raw>>((acc, doc) => {
    const type = doc!.doc_type ?? "other";
    if (!acc[type]) acc[type] = [];
    acc[type]!.push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-slate-600" />
          Mes documents générés
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Retrouvez tous vos DPIA, RoPA, classifications AI Act, checklists et analyses jurisprudentielles.
        </p>
      </div>

      <Suspense fallback={null}>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <DocumentsSearchBar />
          <IndexSemanticButton />
        </div>
      </Suspense>

      {query.length >= 2 && (
        <p className="text-xs text-muted-foreground -mt-4">
          {filtered.length} résultat(s) pour « {query} »
        </p>
      )}

      {raw.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-200" />
            <p className="text-slate-600 font-medium mb-1">Aucun document généré</p>
            <p className="text-sm text-muted-foreground mb-4">
              Utilisez les outils IA pour générer vos premiers documents de conformité.
            </p>
            <Link href="/dashboard/tools">
              <Button size="sm">Voir les outils IA</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {raw.length > 0 && filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun document ne correspond à votre recherche.
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([type, typeDocs]) => {
        const cfg = DOC_TYPE_CONFIG[type] ?? { label: type, icon: FileText, color: "bg-slate-100 text-slate-600" };
        const Icon = cfg.icon;
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`p-1.5 rounded-lg ${cfg.color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <h2 className="font-semibold text-slate-800">{cfg.label}</h2>
              <span className="text-xs text-muted-foreground">({typeDocs?.length ?? 0})</span>
              {cfg.href && (
                <Link href={cfg.href} className="ml-auto text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Générer nouveau <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              {typeDocs?.map((doc) => {
                const summary = getSummary(doc!.doc_type, doc!.content);
                return (
                  <Card key={doc!.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{doc!.title}</p>
                          {summary && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{summary}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">{formatDate(doc!.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(type === "dpia") && (
                            <a
                              href={`/api/generate/dpia/pdf?id=${doc!.id}`}
                              download
                              title="Télécharger PDF"
                            >
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Download className="h-3 w-3" /> PDF
                              </Button>
                            </a>
                          )}
                          {(type === "ropa") && (
                            <a
                              href={`/api/generate/ropa/pdf?id=${doc!.id}`}
                              download
                              title="Télécharger PDF"
                            >
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Download className="h-3 w-3" /> PDF
                              </Button>
                            </a>
                          )}
                          <ShareDocumentButton docId={doc!.id} />
                          <DeleteDocumentButton docId={doc!.id} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getSummary(docType: string, content: any): string {
  if (!content || typeof content !== "object") return "";
  try {
    if (docType === "dpia" && content.executive_summary) return content.executive_summary;
    if (docType === "ropa" && content.company_overview?.description) return content.company_overview.description;
    if (docType === "ai_act_classification" && content.executive_summary) return content.executive_summary;
    if (docType === "compliance_checklist" && content.summary) return content.summary;
    if (docType === "jurisprudence_analysis" && content.executive_summary) return content.executive_summary;
  } catch {}
  return "";
}
