import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: systems } = await supabase
    .from("ai_system_register")
    .select("id, system_name, version, description, purpose, risk_category, ai_act_classification, provider_name")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return NextResponse.json({ systems: systems ?? [] });
}
