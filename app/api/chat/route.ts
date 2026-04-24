import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { searchLegalChunks, buildLegalContext } from "@/lib/ai/rag";
import { LEGAL_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const limited = await rateLimitUser(user.id, "chat", RATE_LIMITS.chat);
  if (limited) return limited;

  const body = await request.json();
  const { question, session_id } = body as { question: string; session_id?: string };

  if (!question?.trim()) {
    return NextResponse.json({ error: "Question vide" }, { status: 400 });
  }

  // Search relevant legal chunks via pgvector
  const chunks = await searchLegalChunks(question, 6, 0.6);
  const legalContext = buildLegalContext(chunks);

  // Build citations for the response metadata
  const citations = chunks.map((c) => ({
    regulation: c.regulation,
    article_number: c.article_number ?? "",
    article_title: c.article_title ?? "",
    excerpt: c.content.slice(0, 300) + (c.content.length > 300 ? "…" : ""),
    eurlex_url: c.eurlex_url ?? `https://eur-lex.europa.eu/search.html?text=${encodeURIComponent(c.regulation)}`,
  }));

  // Prepare user message with legal context
  const userMessage = legalContext
    ? `<legal_context>\n${legalContext}\n</legal_context>\n\nQuestion : ${question}`
    : `Question : ${question}`;

  let stream;
  try {
    stream = await anthropic.messages.stream({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: LEGAL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Claude chat error:", msg);
    return NextResponse.json({ error: `Erreur IA: ${msg}` }, { status: 500 });
  }

  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "citations", citations })}\n\n`));

      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();

      let sessionId = session_id;
      if (!sessionId) {
        const { data: session } = await supabase
          .from("chat_sessions")
          .insert({ user_id: user.id, title: question.slice(0, 60) })
          .select()
          .single();
        sessionId = session?.id;
      }

      if (sessionId && fullResponse) {
        await supabase.from("chat_messages").insert([
          { session_id: sessionId, user_id: user.id, role: "user", content: question },
          { session_id: sessionId, user_id: user.id, role: "assistant", content: fullResponse, citations },
        ]);
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
