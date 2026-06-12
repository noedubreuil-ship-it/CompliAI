import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { streamClaude } from "@/lib/ai/client";
import { getCreditBalance, preflightCheck } from "@/lib/credits";
import type { PlanName } from "@/lib/pricing";
import { preflightToResponse } from "@/lib/ai/http-errors";
import { billAiCall } from "@/lib/ai/bill-ai-call";
import type { ChatTurn } from "@/lib/ai/history";
import { validateUserInput, validateAIOutput, isOutOfScope, OUT_OF_SCOPE_MESSAGE } from "@/lib/ai/guardrails";
import { logAIInteraction } from "@/lib/ai/monitoring";
import { buildArretsGuideDialoguePrefix } from "@/lib/ai/prompts/arrets-guide";
import type { ResumeArretMode, ResumeArretNiveau } from "@/lib/ai/prompts/arrets-guide";

const MAX_PEDAGOGY_INPUT = 24000;

/**
 * Canal conversationnel — outil « Résumé d'arrêts et commentaires guidés ».
 * Pas de RAG : le prompt système pédagogique est autonome (voir prompts/arrets-guide).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limited = await rateLimitUser(user.id, "arrets-guide", RATE_LIMITS.generate);
  if (limited) return limited;

  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";
  const preflight = await preflightCheck(user.id, plan);
  if (preflight) {
    const blocked = preflightToResponse(preflight);
    if (blocked) return blocked;
  }

  let body: {
    message?: string;
    history?: ChatTurn[];
    caseText?: string;
    mode?: ResumeArretMode;
    niveau?: ResumeArretNiveau;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const prefix = buildArretsGuideDialoguePrefix({
    caseText: typeof body.caseText === "string" ? body.caseText : undefined,
    mode: body.mode,
    niveau: body.niveau,
  });
  const messageRaw = typeof body.message === "string" ? body.message.trim() : "";
  const message = prefix + messageRaw;
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const conversationHistory: ChatTurn[] = rawHistory.filter(
    (t): t is ChatTurn =>
      t &&
      typeof t === "object" &&
      (t.role === "user" || t.role === "assistant") &&
      typeof t.content === "string"
  );

  const inputCheck = validateUserInput(message, { maxLength: MAX_PEDAGOGY_INPUT });
  if (!inputCheck.valid) {
    return NextResponse.json({ error: inputCheck.reason ?? "Entrée invalide" }, { status: 400 });
  }

  const scopeCheck = isOutOfScope(message);
  if (scopeCheck.outOfScope) {
    return NextResponse.json({
      out_of_scope: true,
      topic: scopeCheck.topic,
      message: OUT_OF_SCOPE_MESSAGE,
    });
  }

  const encoder = new TextEncoder();
  let fullResponse = "";
  const inputWarnings = inputCheck.warnings;

  const readable = new ReadableStream({
    async start(controller) {
      await streamClaude(
        {
          tool: "arrets_guide",
          userMessage: message,
          conversationHistory,
          consultantCreditsPlan: plan,
        },
        {
          onText: (text) => {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
          },
          onError: (err) => {
            console.error("[arrets-guide] stream error:", err.message);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`));
          },
          onDone: async (meta) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
            controller.close();

            const outputCheck = validateAIOutput(meta.fullText);
            const warnings = [...inputWarnings, ...outputCheck.warnings];

            void billAiCall({
              userId: user.id,
              plan,
              apiModel: meta.model,
              endpoint: "arrets-guide",
              inputTokens: meta.inputTokens,
              outputTokens: meta.outputTokens,
              tool: "arrets_guide",
            }).catch((e) => console.error("[arrets-guide] billing error:", e));

            void logAIInteraction(supabase, {
              userId: user.id,
              tool: "arrets_guide",
              userInput: message,
              outputLength: meta.fullText.length,
              latencyMs: meta.latencyMs,
              temperature: meta.temperature,
              model: meta.model,
              warnings,
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
