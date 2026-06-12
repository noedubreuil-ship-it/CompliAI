import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marque le parcours produit C1 comme terminé (masquage définitif côté serveur). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ product_funnel_completed_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("[product-funnel]", error.message);
    return NextResponse.json({ error: "Mise à jour impossible" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
