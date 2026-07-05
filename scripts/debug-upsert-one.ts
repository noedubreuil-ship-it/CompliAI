import { createClient } from "@supabase/supabase-js";
import { embedBatch } from "@/lib/ai/embeddings";
import { upsertChunk } from "@/lib/rag-production-indexer/indexer";

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) as any;
  const DOC_ID = "48dbad02-519d-4e89-ae4a-c9d61a69ddb5";

  const { data: chunks, error } = await sb.from("staging_chunks").select("*").eq("document_id", DOC_ID).eq("validation_status", "approved").limit(1);
  if (error) { console.error("fetch error:", error.message); return; }
  const chunk = chunks?.[0];
  if (!chunk) { console.log("Aucun chunk approuvé trouvé — vérifier statut"); return; }
  console.log("chunk.id:", chunk.id);
  console.log("granularity:", chunk.granularity, "| article_number:", chunk.article_number);
  console.log("content length:", chunk.content?.length);

  const [embedding] = await embedBatch([chunk.content]);
  console.log("embedding OK, dim:", embedding.length);

  const outcome = await upsertChunk({ supabase: sb, stagingChunk: chunk, embedding, documentId: DOC_ID, dryRun: false });
  console.log("outcome:", JSON.stringify(outcome, null, 2));
}

main().catch(console.error);
