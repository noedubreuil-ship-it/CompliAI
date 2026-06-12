import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET — return all nodes + edges for the knowledge graph
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all notes (id, title, tags) — lightweight
  const { data: notes } = await supabase
    .from("brain_notes")
    .select("id, title, tags, path, word_count, pinned_at, updated_at")
    .eq("user_id", user.id)
    .eq("status", "active");

  // Fetch all links
  const { data: links } = await supabase
    .from("brain_note_links")
    .select("source_id, target_id")
    .eq("user_id", user.id);

  // Compute link counts per node
  const linkCounts: Record<string, number> = {};
  (links ?? []).forEach(({ source_id, target_id }) => {
    linkCounts[source_id] = (linkCounts[source_id] ?? 0) + 1;
    linkCounts[target_id] = (linkCounts[target_id] ?? 0) + 1;
  });

  const nodes = (notes ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    tags: n.tags ?? [],
    path: n.path,
    wordCount: n.word_count ?? 0,
    isPinned: !!n.pinned_at,
    linkCount: linkCounts[n.id] ?? 0,
    updatedAt: n.updated_at,
  }));

  const edges = (links ?? []).map((l) => ({
    source: l.source_id,
    target: l.target_id,
  }));

  return NextResponse.json({ nodes, edges });
}
