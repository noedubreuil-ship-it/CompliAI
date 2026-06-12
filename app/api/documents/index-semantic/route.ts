/**
 * POST — Indexe les documents sans embedding (backfill M5, max 25 / appel).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { indexGeneratedDocumentEmbedding } from "@/lib/documents-semantic";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: docs } = await admin
    .from("generated_documents")
    .select("id")
    .eq("user_id", user.id)
    .is("embedding", null)
    .order("created_at", { ascending: false })
    .limit(25);

  let indexed = 0;
  const errors: string[] = [];

  for (const doc of docs ?? []) {
    try {
      await indexGeneratedDocumentEmbedding(doc.id);
      indexed++;
    } catch (e) {
      errors.push(`${doc.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    indexed,
    remaining: (docs?.length ?? 0) - indexed,
    errors: errors.slice(0, 5),
  });
}
