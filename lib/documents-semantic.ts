import { createClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/ai/embeddings";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function documentTextForEmbedding(doc: {
  title?: string | null;
  raw_text?: string | null;
  content?: unknown;
}): string {
  if (doc.raw_text?.trim()) return doc.raw_text.slice(0, 12_000);
  if (doc.title) {
    const contentStr =
      typeof doc.content === "string" ? doc.content
      : doc.content ? JSON.stringify(doc.content).slice(0, 10_000)
      : "";
    return `${doc.title}\n${contentStr}`.slice(0, 12_000);
  }
  return "";
}

/** Indexe ou ré-indexe un document pour la recherche sémantique (M5). */
export async function indexGeneratedDocumentEmbedding(documentId: string): Promise<void> {
  const { data: doc } = await admin()
    .from("generated_documents")
    .select("id, title, raw_text, content")
    .eq("id", documentId)
    .single();

  if (!doc) return;
  const text = documentTextForEmbedding(doc);
  if (text.length < 20) return;

  const embedding = await embedText(text);
  await admin().from("generated_documents").update({ embedding }).eq("id", documentId);
}

export async function searchDocumentsSemantic(
  userId: string,
  query: string,
  limit = 8,
): Promise<Array<{ id: string; doc_type: string; title: string; similarity: number }>> {
  if (query.trim().length < 2) return [];

  const embedding = await embedText(query);
  const { data, error } = await admin().rpc("search_user_documents", {
    query_embedding: embedding,
    p_user_id: userId,
    match_threshold: 0.52,
    match_count: limit,
  });

  if (error) {
    console.error("[documents-semantic]", error.message);
    return [];
  }

  return (data ?? []) as Array<{ id: string; doc_type: string; title: string; similarity: number }>;
}
