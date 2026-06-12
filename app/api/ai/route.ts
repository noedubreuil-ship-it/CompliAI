/**
 * POST /api/ai
 * Endpoint IA unifié avec gestion des crédits.
 * La clé Anthropic n'est jamais exposée au client.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance, consumeCredits, preflightCheck } from "@/lib/credits";
import { MODEL_CONFIG, type AIModel, type PlanName } from "@/lib/pricing";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Validation manuelle (sans Zod pour éviter une dépendance) ───────────────
const VALID_MODELS: AIModel[] = ["haiku", "sonnet", "opus"];
const MAX_TOKENS_CEILING = 8192;

interface RequestBody {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  model?: AIModel;
  system?: string;
  max_tokens?: number;
  stream?: boolean;
  endpoint?: string; // label pour les logs (ex: "chat", "audit", "dpia")
}

function validateBody(body: unknown): { data: RequestBody } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Body invalide" };
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { error: "messages est requis et ne peut pas être vide" };
  }

  for (const msg of b.messages) {
    if (!msg || typeof msg !== "object") return { error: "Message invalide" };
    const m = msg as Record<string, unknown>;
    if (m.role !== "user" && m.role !== "assistant") return { error: "role doit être 'user' ou 'assistant'" };
    if (typeof m.content !== "string") return { error: "content doit être une chaîne" };
  }

  const model = (b.model as AIModel | undefined) ?? "haiku";
  if (!VALID_MODELS.includes(model)) {
    return { error: `model doit être parmi : ${VALID_MODELS.join(", ")}` };
  }

  const maxTokens = (b.max_tokens as number | undefined) ?? 1024;
  if (typeof maxTokens !== "number" || maxTokens < 1 || maxTokens > MAX_TOKENS_CEILING) {
    return { error: `max_tokens doit être entre 1 et ${MAX_TOKENS_CEILING}` };
  }

  return {
    data: {
      messages: b.messages as RequestBody["messages"],
      model,
      system: typeof b.system === "string" ? b.system : undefined,
      max_tokens: maxTokens,
      stream: b.stream === true,
      endpoint: typeof b.endpoint === "string" ? b.endpoint : "api/ai",
    },
  };
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // ── Validation body ───────────────────────────────────────────────────────
  let parsedBody: Record<string, unknown>;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const validation = validateBody(parsedBody);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { messages, model, system, max_tokens, stream, endpoint } = validation.data;
  const modelConfig = MODEL_CONFIG[model!];

  // ── Lecture du plan & preflight (rate limit + solde min) ──────────────────
  const credits = await getCreditBalance(user.id);
  const plan: PlanName = credits?.plan ?? "free";

  const preflightError = await preflightCheck(user.id, plan);
  if (preflightError) {
    if (preflightError.code === "RATE_LIMITED") {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans une minute.", code: "RATE_LIMITED" },
        {
          status: 429,
          headers: { "Retry-After": String(preflightError.retryAfterSeconds) },
        }
      );
    }
    if (preflightError.code === "INSUFFICIENT_CREDITS" || preflightError.code === "CREDITS_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "Crédits insuffisants. Rechargez votre abonnement.",
          code: "INSUFFICIENT_CREDITS",
          balance: "balance" in preflightError ? preflightError.balance : 0,
        },
        { status: 402 }
      );
    }
  }

  // ── Appel Anthropic ───────────────────────────────────────────────────────
  let inputTokens = 0;
  let outputTokens = 0;
  let responseContent = "";

  // Mode streaming (SSE)
  if (stream) {
    const encoder = new TextEncoder();
    let streamInputTokens = 0;
    let streamOutputTokens = 0;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = anthropic.messages.stream({
            model: modelConfig.apiId,
            max_tokens: max_tokens!,
            system: system ?? undefined,
            messages,
          });

          for await (const chunk of anthropicStream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              const text = chunk.delta.text;
              responseContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
            if (chunk.type === "message_delta" && chunk.usage) {
              streamOutputTokens = chunk.usage.output_tokens;
            }
            if (chunk.type === "message_start" && chunk.message.usage) {
              streamInputTokens = chunk.message.usage.input_tokens;
            }
          }

          // Déduire les crédits après réception complète
          const result = await consumeCredits({
            userId: user.id,
            model: model!,
            endpoint: endpoint!,
            inputTokens: streamInputTokens,
            outputTokens: streamOutputTokens,
          });

          const newBalance = "newBalance" in result ? result.newBalance : (credits?.balance ?? 0);
          const consumed = "consumed" in result ? result.consumed : 0;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                usage: {
                  input_tokens: streamInputTokens,
                  output_tokens: streamOutputTokens,
                  credits_consumed: consumed,
                },
                remaining_credits: newBalance,
              })}\n\n`
            )
          );
        } catch (err) {
          console.error(JSON.stringify({ level: "error", event: "anthropic_stream_error", err: String(err) }));
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`)
          );
        } finally {
          controller.close();
        }
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

  // Mode non-streaming (réponse complète)
  try {
    const response = await anthropic.messages.create({
      model: modelConfig.apiId,
      max_tokens: max_tokens!,
      system: system ?? undefined,
      messages,
    });

    inputTokens = response.usage.input_tokens;
    outputTokens = response.usage.output_tokens;
    responseContent = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err: unknown) {
    console.error(JSON.stringify({ level: "error", event: "anthropic_error", userId: user.id, err: String(err) }));
    // Ne pas débiter l'utilisateur en cas d'erreur Anthropic
    return NextResponse.json(
      { error: "Le service IA est temporairement indisponible. Réessayez." },
      { status: 500 }
    );
  }

  // ── Déduction des crédits (après succès Anthropic) ────────────────────────
  const consumeResult = await consumeCredits({
    userId: user.id,
    model: model!,
    endpoint: endpoint!,
    inputTokens,
    outputTokens,
  });

  if ("code" in consumeResult) {
    // Erreur de déduction post-appel — on log mais on retourne quand même la réponse
    // (l'utilisateur a déjà reçu la réponse IA, on ne peut pas la retirer)
    console.error(JSON.stringify({
      level: "error",
      event: "post_consume_failed",
      userId: user.id,
      code: consumeResult.code,
    }));
  }

  const newBalance = "newBalance" in consumeResult ? consumeResult.newBalance : (credits?.balance ?? 0);
  const consumed = "consumed" in consumeResult ? consumeResult.consumed : 0;

  return NextResponse.json({
    message: responseContent,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      credits_consumed: consumed,
    },
    remaining_credits: newBalance,
  });
}
