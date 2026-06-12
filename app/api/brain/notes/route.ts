import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Extract [[WikiLinks]] from content
function extractWikiLinks(content: string): { text: string; target: string }[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: { text: string; target: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push({ target: match[1].trim(), text: (match[2] || match[1]).trim() });
  }
  return links;
}

// Extract #tags from content
function extractTags(content: string): string[] {
  const regex = /#([\w/\-]+)/g;
  const tags = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    tags.add(match[1]);
  }
  return Array.from(tags);
}

// GET — list all notes for user
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("q");
  const tag = searchParams.get("tag");
  const limit = parseInt(searchParams.get("limit") ?? "100");

  let query = supabase
    .from("brain_notes")
    .select("id, title, content, path, tags, status, pinned_at, created_at, updated_at, word_count")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

// POST — create a new note
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title = "Note sans titre", content = "", path = "/", properties = {} } = body;

  const tags = extractTags(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const { data, error } = await supabase
    .from("brain_notes")
    .insert({
      user_id: user.id,
      title,
      content,
      path,
      tags,
      properties,
      word_count: wordCount,
      char_count: content.length,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
