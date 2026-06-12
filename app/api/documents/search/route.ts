import { NextResponse } from "next/server";
import Fuse from "fuse.js";
import { createClient } from "@/lib/supabase/server";

function flattenDocContent(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  try {
    return JSON.stringify(content).slice(0, 20000);
  } catch {
    return "";
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "Paramètre q requis (min. 2 caractères)" }, { status: 400 });
  }

  const { data: docs, error } = await supabase
    .from("generated_documents")
    .select("id, doc_type, title, created_at, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items =
    docs?.map((d) => ({
      id: d.id,
      doc_type: d.doc_type,
      title: d.title,
      created_at: d.created_at,
      haystack: `${d.title} ${d.doc_type} ${flattenDocContent(d.content)}`,
    })) ?? [];

  const fuse = new Fuse(items, {
    keys: ["title", "haystack"],
    threshold: 0.35,
    ignoreLocation: true,
  });

  const matches = fuse.search(q, { limit: 25 }).map((r) => ({
    id: r.item.id,
    doc_type: r.item.doc_type,
    title: r.item.title,
    created_at: r.item.created_at,
    score: r.score,
  }));

  return NextResponse.json({ query: q, results: matches });
}
