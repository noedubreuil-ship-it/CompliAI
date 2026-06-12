import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  return links;
}

function extractTags(content: string): string[] {
  const regex = /#([\w/\-]+)/g;
  const tags = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1]);
  }
  return Array.from(tags);
}

// GET — get a single note with backlinks
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: note, error } = await supabase
    .from("brain_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Backlinks: notes that link TO this note
  const { data: backlinks } = await supabase
    .from("brain_note_links")
    .select("source_id, link_text, context, brain_notes!source_id(id, title, path)")
    .eq("target_id", id)
    .eq("user_id", user.id);

  // Outlinks: notes this note links TO
  const { data: outlinks } = await supabase
    .from("brain_note_links")
    .select("target_id, link_text, context, brain_notes!target_id(id, title, path)")
    .eq("source_id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ note, backlinks: backlinks ?? [], outlinks: outlinks ?? [] });
}

// PATCH — update note content + re-extract links/tags
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.path !== undefined) updates.path = body.path;
  if (body.status !== undefined) updates.status = body.status;
  if (body.pinned_at !== undefined) updates.pinned_at = body.pinned_at;
  if (body.properties !== undefined) updates.properties = body.properties;

  if (body.content !== undefined) {
    updates.content = body.content;
    updates.tags = extractTags(body.content);
    updates.word_count = body.content.split(/\s+/).filter(Boolean).length;
    updates.char_count = body.content.length;
  }

  const { data: note, error } = await supabase
    .from("brain_notes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-sync WikiLinks if content changed
  if (body.content !== undefined) {
    const wikiLinks = extractWikiLinks(body.content);

    // Delete old outlinks from this note
    await supabase.from("brain_note_links").delete().eq("source_id", id).eq("user_id", user.id);

    // Re-create links by resolving note titles
    if (wikiLinks.length > 0) {
      const { data: targetNotes } = await supabase
        .from("brain_notes")
        .select("id, title")
        .eq("user_id", user.id)
        .in("title", wikiLinks);

      if (targetNotes && targetNotes.length > 0) {
        await supabase.from("brain_note_links").insert(
          targetNotes.map((t) => ({
            user_id: user.id,
            source_id: id,
            target_id: t.id,
            link_text: t.title,
          }))
        );
      }
    }
  }

  return NextResponse.json({ note });
}

// DELETE — delete note
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("brain_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
