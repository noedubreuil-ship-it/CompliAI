import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, FolderSearch, MessageSquare, Users, Download, Bell } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { AuditTrailExportButton } from "./ExportButton";

const ACTION_ICONS: Record<string, React.ElementType> = {
  audit_created: FolderSearch,
  document_generated: FileText,
  contract_analyzed: FileText,
  issue_updated: Shield,
  chat_session: MessageSquare,
  register_entry: Users,
  pdf_exported: Download,
  alert_read: Bell,
};

const ACTION_LABELS: Record<string, string> = {
  audit_created: "Audit créé",
  document_generated: "Document généré",
  contract_analyzed: "Contrat analysé",
  issue_updated: "Issue mise à jour",
  chat_session: "Session de consultation",
  register_entry: "Entrée registre IA",
  pdf_exported: "PDF exporté",
  alert_read: "Alerte lue",
};

export const metadata = { title: "Audit Trail — CompliAI" };

export default async function AuditTrailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: trail } = await supabase
    .from("audit_trail")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Audit Trail
          </h1>
          <p className="text-muted-foreground mt-1">
            Journal immuable de toutes les actions — Art. 12 AI Act. Exportable pour démontrer la bonne foi à l&apos;autorité compétente.
          </p>
        </div>
        {trail && trail.length > 0 && <AuditTrailExportButton />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{trail?.length ?? 0} événements enregistrés</CardTitle>
        </CardHeader>
        <CardContent>
          {!trail || trail.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucune action enregistrée pour l&apos;instant.</p>
              <p className="text-xs mt-1">Les actions (audits, documents, consultations…) apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {trail.map((entry) => {
                const Icon = ACTION_ICONS[entry.action] ?? Shield;
                return (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                        {entry.entity_name && (
                          <span className="text-slate-500 font-normal"> — {entry.entity_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{entry.entity_type}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
