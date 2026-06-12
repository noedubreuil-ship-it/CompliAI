import { NextResponse } from "next/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildPlanMemoireUserPrompt, extractJson, generateDocument } from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sujet = typeof body.sujet === "string" ? body.sujet.trim() : "";
  const niveau = typeof body.niveau === "string" ? body.niveau : "Master 2";
  if (!sujet) return NextResponse.json({ error: "sujet requis" }, { status: 400 });

  try {
    const rag = await buildNationalRagContextForTool({ query: sujet, includeEuCaseLaw: true });
    let prompt = buildPlanMemoireUserPrompt(sujet, niveau);
    prompt = appendNationalRagToUserPrompt(prompt, rag.context);

    const raw = await generateDocument(prompt, auth.billing("plan-memoire", "plan-memoire"));
    return NextResponse.json({ result: extractJson(raw) });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
