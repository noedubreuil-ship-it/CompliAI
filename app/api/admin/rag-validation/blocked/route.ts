/**
 * GET /api/admin/rag-validation/blocked
 *
 * Liste les documents détectés par le monitoring que le pipeline n'a PAS pu
 * ingérer automatiquement (statut `error`).
 *
 * Ces documents ne sont pas perdus : ils restent en base avec la raison de
 * l'échec, pour arbitrage manuel. Un document peut échouer parce que la page
 * cible est protégée par un anti-bot, parce qu'il n'a aucune valeur juridique
 * (communiqué de presse, annonce d'événement), ou parce que le parsing a
 * bute sur un cas non prévu.
 *
 * Route distincte de `/documents` : un document en erreur n'a pas de chunks,
 * donc aucune des statistiques de validation ne s'y applique.
 *
 * Query params :
 *   - type  : filtrer par document_type
 *   - page  : numéro de page (défaut 1)
 *   - limit : par page (défaut 20, max 50)
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";
import { classifyError, type BlockedDocument } from "@/lib/rag-validation/classify-error";

export const runtime = "nodejs";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const admin = getAdmin();

  let query = admin
    .from("pending_documents")
    .select(
      "id, title, document_type, source_url, detected_at, language, country, error_message",
      { count: "exact" }
    )
    .eq("status", "error")
    .order("detected_at", { ascending: false });

  if (type) query = query.eq("document_type", type);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents: BlockedDocument[] = (data ?? []).map((d) => ({
    ...(d as Omit<BlockedDocument, "reason" | "hint">),
    ...classifyError((d as { error_message: string | null }).error_message),
  }));

  // Répartition par cause, pour l'en-tête de l'onglet.
  const { data: all } = await admin
    .from("pending_documents")
    .select("error_message")
    .eq("status", "error");

  const byReason: Record<string, number> = {};
  for (const row of (all ?? []) as { error_message: string | null }[]) {
    const { reason } = classifyError(row.error_message);
    byReason[reason] = (byReason[reason] ?? 0) + 1;
  }

  return NextResponse.json({
    documents,
    total: count ?? 0,
    page,
    limit,
    byReason,
  });
}
