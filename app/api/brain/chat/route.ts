import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { streamClaude, buildContextMessage } from "@/lib/ai/client";
import { logAIInteraction } from "@/lib/ai/monitoring";
import { validateUserInput } from "@/lib/ai/guardrails";
import { getCreditBalance, preflightCheck } from "@/lib/credits";
import type { PlanName } from "@/lib/pricing";
import { preflightToResponse } from "@/lib/ai/http-errors";
import { billAiCall } from "@/lib/ai/bill-ai-call";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitUser(user.id, "brain", RATE_LIMITS.chat);
  if (limited) return limited as NextResponse;

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }

  const { message, noteId } = await request.json();
  const inputCheck = validateUserInput(message);
  if (!inputCheck.valid) {
    return NextResponse.json({ error: inputCheck.reason ?? "Message invalide" }, { status: 400 });
  }

  // ── Recherche plein-texte des notes pertinentes ───────────────────────────
  const { data: relevantNotes } = await supabase
    .from("brain_notes")
    .select("id, title, content, path")
    .eq("user_id", user.id)
    .eq("status", "active")
    .or(`title.ilike.%${message.slice(0, 50)}%,content.ilike.%${message.slice(0, 50)}%`)
    .limit(6);

  let currentNote: { id: string; title: string; content: string } | null = null;
  if (noteId) {
    const { data } = await supabase
      .from("brain_notes")
      .select("id, title, content")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .single();
    currentNote = data;
  }

  const noteSources: Array<{ title: string; content: string }> = [];
  if (currentNote) {
    noteSources.push({
      title: `Note actuelle : ${currentNote.title}`,
      content: currentNote.content,
    });
  }
  for (const n of relevantNotes ?? []) {
    if (n.id === noteId) continue;
    noteSources.push({ title: `Note : ${n.title}`, content: n.content });
  }

  const context = noteSources.length > 0
    ? buildContextMessage(noteSources)
    : "=== SOURCE : Cerveau personnel ===\nAucune note pertinente n'a été trouvée pour cette requête.\n=== FIN SOURCE ===";

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      await streamClaude(
        {
          tool: "cerveau",
          userMessage: message,
          context,
          consultantCreditsPlan: plan,
        },
        {
          onText: (text) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          },
          onError: (err) => {
            console.error("[brain] stream error:", err.message);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`));
          },
          onDone: async (meta) => {
            const sources = (relevantNotes ?? []).map((n) => ({
              id: n.id,
              title: n.title,
              path: n.path,
            }));
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, sources })}\n\n`)
            );
            controller.close();

            void billAiCall({
              userId: user.id,
              plan,
              apiModel: meta.model,
              endpoint: "brain-chat",
              inputTokens: meta.inputTokens,
              outputTokens: meta.outputTokens,
              tool: "cerveau",
            }).catch((e) => console.error("[brain] billing error:", e));

            void logAIInteraction(supabase, {
              userId: user.id,
              tool: "cerveau",
              userInput: message,
              outputLength: meta.fullText.length,
              latencyMs: meta.latencyMs,
              temperature: meta.temperature,
              model: meta.model,
              warnings: inputCheck.warnings,
            });
          },
        }
      );
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
