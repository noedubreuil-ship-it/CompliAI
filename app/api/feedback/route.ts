/**
 * POST /api/feedback — Signaler une réponse IA incorrecte ou insuffisante (H15 audit v2).
 *
 * La table `ai_interaction_logs` possède déjà les colonnes `feedback` et `feedback_note`
 * (migration 010). Ce endpoint met à jour la ligne correspondant à l'interaction signalée.
 *
 * Aucune donnée sensible n'est stockée ici : seulement l'ID de l'interaction, le type
 * de feedback (positive | negative) et une note libre optionnelle.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { interaction_id?: string; feedback?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { interaction_id, feedback, note } = body;

  if (!interaction_id || typeof interaction_id !== "string") {
    return NextResponse.json({ error: "interaction_id requis" }, { status: 400 });
  }

  const feedbackValue = feedback === "positive" ? "positive" : "negative";
  const feedbackNote = typeof note === "string" ? note.slice(0, 1000) : null;

  const { error } = await supabase
    .from("ai_interaction_logs")
    .update({
      feedback: feedbackValue,
      feedback_note: feedbackNote,
    })
    .eq("id", interaction_id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[feedback] update error:", error.message);
    return NextResponse.json({ error: "Impossible de sauvegarder le feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
