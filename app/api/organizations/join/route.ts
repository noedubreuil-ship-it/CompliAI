import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Rejoindre une équipe à partir du code d'invitation (RPC join_organization) */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { invite_code } = await request.json();
  if (!invite_code || typeof invite_code !== "string") {
    return NextResponse.json({ error: "invite_code requis" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("join_organization", {
    invite: invite_code.trim(),
  });

  if (error) {
    const msg = error.message ?? String(error);
    if (msg.includes("INVALID_INVITE")) {
      return NextResponse.json({ error: "Code d'invitation invalide ou expiré" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ result: data });
}
