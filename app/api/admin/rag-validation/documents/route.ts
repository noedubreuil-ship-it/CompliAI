/**
 * GET /api/admin/rag-validation/documents
 *
 * Liste les documents en statut "staged" avec statistiques de validation.
 * Query params :
 *   - type   : filtrer par document_type (ex: "eu_regulation")
 *   - sort   : "date" (défaut) | "type"
 *   - page   : page number (défaut: 1)
 *   - limit  : par page (défaut: 20, max: 50)
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export interface DocumentWithStats {
  id: string;
  title: string | null;
  document_type: string;
  celex: string | null;
  ecli: string | null;
  source_url: string;
  publication_date: string | null;
  detected_at: string;
  language: string;
  country: string;
  total_chunks: number;
  pending_chunks: number;
  approved_chunks: number;
  rejected_chunks: number;
}

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
  const sort = url.searchParams.get("sort") ?? "date";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(url.searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const admin = getAdmin();

  // Récupérer les documents staged (avec filtre optionnel par type)
  let query = admin
    .from("pending_documents")
    .select("id, title, document_type, celex, ecli, source_url, publication_date, detected_at, language, country")
    .eq("status", "staged");

  if (type) query = query.eq("document_type", type);

  if (sort === "type") {
    query = query.order("document_type", { ascending: true }).order("detected_at", { ascending: false });
  } else {
    query = query.order("detected_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: docs, error: docsError } = await query;

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json({ documents: [], total: 0 });
  }

  // Récupérer les stats de validation pour chaque document
  const docIds = docs.map((d) => d.id);
  const { data: chunks } = await admin
    .from("staging_chunks")
    .select("document_id, validation_status")
    .in("document_id", docIds);

  // Agréger par document
  const stats: Record<string, { total: number; pending: number; approved: number; rejected: number }> = {};
  for (const id of docIds) {
    stats[id] = { total: 0, pending: 0, approved: 0, rejected: 0 };
  }
  for (const chunk of chunks ?? []) {
    const s = stats[chunk.document_id];
    if (!s) continue;
    s.total++;
    if (chunk.validation_status === "pending") s.pending++;
    else if (chunk.validation_status === "approved") s.approved++;
    else if (chunk.validation_status === "rejected") s.rejected++;
  }

  // Compter le total pour la pagination
  let countQuery = admin
    .from("pending_documents")
    .select("id", { count: "exact", head: true })
    .eq("status", "staged");
  if (type) countQuery = countQuery.eq("document_type", type);
  const { count } = await countQuery;

  const documents: DocumentWithStats[] = docs.map((d) => ({
    ...d,
    total_chunks: stats[d.id]?.total ?? 0,
    pending_chunks: stats[d.id]?.pending ?? 0,
    approved_chunks: stats[d.id]?.approved ?? 0,
    rejected_chunks: stats[d.id]?.rejected ?? 0,
  }));

  return NextResponse.json({ documents, total: count ?? 0, page, limit });
}
