import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Liste les membres d'une organisation (nom + rôle) — réservé aux membres de l'org. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Organisation introuvable ou accès refusé" }, { status: 403 });
  }

  const { data: members, error } = await admin
    .from("organization_members")
    .select("user_id, role, joined_at")
    .eq("organization_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } =
    userIds.length > 0 ?
      await admin.from("profiles").select("id, full_name, company").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    members: (members ?? []).map((m) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      full_name: profileMap.get(m.user_id)?.full_name ?? "Utilisateur",
      company: profileMap.get(m.user_id)?.company ?? null,
      is_you: m.user_id === user.id,
    })),
    your_role: membership.role,
  });
}
