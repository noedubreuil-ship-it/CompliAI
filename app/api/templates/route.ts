import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase
    .from("document_templates")
    .select("id, doc_type, name, description, is_default, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const { doc_type, name, description, template } = body as Record<string, unknown>;

  const allowed = ["dpia", "ropa", "fria", "policy", "contract", "checklist"];
  if (!allowed.includes(String(doc_type))) {
    return NextResponse.json({ error: "doc_type invalide" }, { status: 400 });
  }
  if (!name || typeof name !== "string") return NextResponse.json({ error: "name requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("document_templates")
    .insert({
      user_id: user.id,
      doc_type,
      name: String(name).trim(),
      description: typeof description === "string" ? description : null,
      template: typeof template === "object" && template !== null ? template : {},
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const { error } = await supabase.from("document_templates").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
