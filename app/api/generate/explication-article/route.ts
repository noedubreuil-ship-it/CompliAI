import { NextResponse } from "next/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildExplicationArticleUserPrompt, extractJson, generateDocument } from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const article = typeof body.article === "string" ? body.article.trim() : "";
  const texte = typeof body.texte === "string" ? body.texte.trim() : "";
  const niveau = typeof body.niveau === "string" ? body.niveau : "Master 1";
  if (!article || !texte) {
    return NextResponse.json({ error: "article et texte requis" }, { status: 400 });
  }

  try {
    const rag = await buildNationalRagContextForTool({
      query: `${texte} ${article}`,
      includeEuCaseLaw: true,
    });
    let prompt = buildExplicationArticleUserPrompt(article, texte, niveau);
    prompt = appendNationalRagToUserPrompt(prompt, rag.context);

    const raw = await generateDocument(prompt, auth.billing("explication-article", "explication-article"));
    return NextResponse.json({ result: extractJson(raw) });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
