import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LegalCitation } from "@/lib/types/legal";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  if (!sessions?.length) {
    return NextResponse.json({ conversations: [] });
  }

  const sessionIds = sessions.map((s) => s.id);
  const { data: rows, error: messagesError } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, citations, created_at")
    .eq("user_id", user.id)
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const messagesBySession = new Map<string, typeof rows>();
  for (const row of rows ?? []) {
    const list = messagesBySession.get(row.session_id) ?? [];
    list.push(row);
    messagesBySession.set(row.session_id, list);
  }

  const conversations = sessions.map((s) => ({
    id: s.id,
    sessionId: s.id,
    title: s.title ?? "Conversation",
    createdAt: s.updated_at ?? s.created_at,
    messages: (messagesBySession.get(s.id) ?? []).map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: (m.citations as LegalCitation[] | null) ?? undefined,
    })),
  }));

  return NextResponse.json({ conversations });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id requis" }, { status: 400 });
  }

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
