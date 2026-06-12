import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function randomSecret() {
  return randomBytes(24).toString("base64url");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ webhooks: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { url, events } = body as { url?: string; events?: string[] };
  if (!url || typeof url !== "string") return NextResponse.json({ error: "url requis" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("proto");
  } catch {
    return NextResponse.json({ error: "URL HTTP(S) invalide" }, { status: 400 });
  }

  const signingSecret = randomSecret();
  const { data, error } = await supabase
    .from("webhook_endpoints")
    .insert({
      user_id: user.id,
      url: parsed.toString(),
      events: events?.length ? events : ["blocking_issue.created"],
      signing_secret: signingSecret,
    })
    .select("id, url, events, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    webhook: data,
    /** Secret affiché une seule fois — à stocker pour vérifier X-CompliAI-Signature */
    signing_secret: signingSecret,
  });
}

/** Body: { id: string } — supprime le webhook */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const { error } = await supabase.from("webhook_endpoints").delete().eq("id", id).eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
