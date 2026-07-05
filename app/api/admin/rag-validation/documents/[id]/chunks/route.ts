/**
 * GET /api/admin/rag-validation/documents/[id]/chunks
 *
 * Retourne les chunks de staging pour un document donné.
 * Query params :
 *   - sample : "true" → 5 chunks aléatoires pour validation rapide
 *   - status : "pending" | "approved" | "rejected" | "all" (défaut: "all")
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export interface StagingChunkRow {
  id: string;
  document_id: string;
  regulation: string;
  article_number: string | null;
  paragraph_number: string | null;
  point_letter: string | null;
  article_title: string | null;
  chapter: string | null;
  content: string;
  language: string;
  country: string;
  text_type: string;
  source_type: string | null;
  source_url: string | null;
  eurlex_url: string | null;
  publication_date: string | null;
  validation_status: "pending" | "approved" | "rejected" | "correction_needed";
  rejection_reason: string | null;
  chunk_hash: string | null;
  parsed_at: string;
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = params;
  const url = new URL(request.url);
  const sample = url.searchParams.get("sample") === "true";
  const statusFilter = url.searchParams.get("status") ?? "all";

  const admin = getAdmin();

  // Vérifier que le document existe et est en staging
  const { data: doc, error: docError } = await admin
    .from("pending_documents")
    .select("id, status, title, document_type, celex, ecli, source_url, language")
    .eq("id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  let query = admin
    .from("staging_chunks")
    .select(
      "id, document_id, regulation, article_number, paragraph_number, point_letter, article_title, chapter, content, language, country, text_type, source_type, source_url, eurlex_url, publication_date, validation_status, rejection_reason, chunk_hash, parsed_at"
    )
    .eq("document_id", id);

  if (statusFilter !== "all") {
    query = query.eq("validation_status", statusFilter);
  }

  if (sample) {
    // 5 chunks aléatoires — ORDER BY RANDOM() via Postgres
    // Supabase JS ne supporte pas RANDOM() directement, on utilise RPC ou on charge tout et on tire
    query = query.limit(200); // charger jusqu'à 200 chunks puis tirer 5 au hasard côté serveur
  } else {
    query = query.order("parsed_at", { ascending: true });
  }

  const { data: chunks, error: chunksError } = await query;

  if (chunksError) {
    return NextResponse.json({ error: chunksError.message }, { status: 500 });
  }

  let result = (chunks ?? []) as StagingChunkRow[];

  if (sample && result.length > 5) {
    // Sélection aléatoire de 5 chunks — priorité aux pending
    const pending = result.filter((c) => c.validation_status === "pending");
    const pool = pending.length >= 5 ? pending : result;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    result = shuffled.slice(0, 5);
  }

  return NextResponse.json({
    document: {
      id: doc.id,
      title: doc.title,
      document_type: doc.document_type,
      celex: doc.celex,
      ecli: doc.ecli,
      source_url: doc.source_url,
      language: doc.language,
    },
    chunks: result,
    total: (chunks ?? []).length,
    is_sample: sample,
  });
}
