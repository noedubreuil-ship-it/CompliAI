import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function escapeCsv(value: string | null | undefined): string {
  const str = value ?? "";
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: trail, error } = await supabase
    .from("audit_trail")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = ["Date", "Action", "Entité", "Détail", "Type entité"].join(",");
  const rows = (trail ?? []).map((entry) => {
    const date = new Date(entry.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
    const action = ACTION_LABELS[entry.action] ?? entry.action;
    return [
      escapeCsv(date),
      escapeCsv(action),
      escapeCsv(entry.entity_name),
      escapeCsv(entry.details ? JSON.stringify(entry.details) : ""),
      escapeCsv(entry.entity_type),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
