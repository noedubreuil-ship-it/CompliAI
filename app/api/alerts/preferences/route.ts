import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET — lire les préférences d'alerte de l'utilisateur connecté */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("alert_preferences")
    .select("email, regulations, frequency, last_sent_at")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json(data ?? { email: user.email ?? "", regulations: [], frequency: "weekly" });
}

/** POST — sauvegarder les préférences d'alerte */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { email?: string; regulations?: string[]; frequency?: string };

  const email = typeof body.email === "string" && body.email.trim()
    ? body.email.trim()
    : (user.email ?? "");

  const regulations = Array.isArray(body.regulations)
    ? body.regulations.filter((r): r is string => typeof r === "string")
    : [];

  const frequency = ["daily", "weekly", "never"].includes(body.frequency ?? "")
    ? (body.frequency as "daily" | "weekly" | "never")
    : "weekly";

  const { error } = await supabase
    .from("alert_preferences")
    .upsert({
      user_id: user.id,
      email,
      regulations,
      frequency,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

  if (error) {
    console.error("[alerts/preferences] upsert error:", error.message);
    return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
