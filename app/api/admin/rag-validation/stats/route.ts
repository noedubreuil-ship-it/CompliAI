/**
 * GET /api/admin/rag-validation/stats
 *
 * Indicateur de couverture pour le dashboard RAG Validation.
 * Retourne le nombre de documents en attente par type de document.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface RagValidationStats {
  total_staged: number;
  total_pending_chunks: number;
  by_type: Record<string, { documents: number; pending_chunks: number }>;
  last_validation?: string;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const admin = getAdmin();

  // Documents en statut "staged" (parsés, en attente de validation)
  const { data: docs, error: docsError } = await admin
    .from("pending_documents")
    .select("id, document_type")
    .eq("status", "staged");

  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }

  const docIds = (docs ?? []).map((d) => d.id);

  // Chunks en attente de validation pour ces documents
  const { data: chunks, error: chunksError } = docIds.length > 0
    ? await admin
        .from("staging_chunks")
        .select("document_id, validation_status")
        .in("document_id", docIds)
    : { data: [], error: null };

  if (chunksError) {
    return NextResponse.json({ error: chunksError.message }, { status: 500 });
  }

  // Dernière action de validation
  const { data: lastLog } = await admin
    .from("validation_log")
    .select("performed_at")
    .order("performed_at", { ascending: false })
    .limit(1)
    .single();

  // Agrégation par type de document
  const byType: Record<string, { documents: number; pending_chunks: number }> = {};
  const chunkCountByDoc: Record<string, number> = {};

  for (const chunk of chunks ?? []) {
    if (chunk.validation_status === "pending") {
      chunkCountByDoc[chunk.document_id] = (chunkCountByDoc[chunk.document_id] ?? 0) + 1;
    }
  }

  for (const doc of docs ?? []) {
    const type = doc.document_type ?? "other";
    if (!byType[type]) byType[type] = { documents: 0, pending_chunks: 0 };
    byType[type].documents++;
    byType[type].pending_chunks += chunkCountByDoc[doc.id] ?? 0;
  }

  const totalPendingChunks = Object.values(chunkCountByDoc).reduce((a, b) => a + b, 0);

  const stats: RagValidationStats = {
    total_staged: (docs ?? []).length,
    total_pending_chunks: totalPendingChunks,
    by_type: byType,
    last_validation: lastLog?.performed_at ?? undefined,
  };

  return NextResponse.json(stats);
}
