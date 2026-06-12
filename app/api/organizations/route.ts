import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Liste les organisations dont l'utilisateur est membre (+ code d'invitation pour les admins) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "role, joined_at, organizations (id, name, invite_code, created_by, created_at)"
    )
    .eq("user_id", user.id);

  if (error)
    return NextResponse.json({ error: error.message, hint: migrationHint(error.message) }, { status: 500 });

  const memberships =
    data?.map((row) => {
      const raw = row.organizations as unknown;
      const o = Array.isArray(raw)
        ? (raw[0] as Record<string, string> | undefined)
        : (raw as Record<string, string> | null | undefined);
      const organization =
        o && o.id
          ? {
              id: String(o.id),
              name: String(o.name ?? ""),
              invite_code: String(o.invite_code ?? ""),
              created_by: String(o.created_by ?? ""),
              created_at: String(o.created_at ?? ""),
            }
          : null;
      return { role: row.role as string, joined_at: row.joined_at, organization };
    }) ?? [];

  return NextResponse.json({ memberships });
}

/** Crée une organisation dont vous êtes l'admin (trigger → organization_members admin) */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { name } = await request.json();
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nom d'organisation requis (2 caractères min.)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("organizations")
    .insert({ name: name.trim(), created_by: user.id })
    .select("id, name, invite_code, created_at")
    .single();

  if (error)
    return NextResponse.json({ error: error.message, hint: migrationHint(error.message) }, { status: 500 });

  return NextResponse.json({ organization: data });
}

function migrationHint(msg: string) {
  if (msg.includes("relation") || msg.includes("does not exist")) {
    return "Appliquez la migration supabase/migrations/009_organizations_webhooks.sql sur votre projet.";
  }
  return undefined;
}
