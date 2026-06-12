import { NextResponse } from "next/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildMemoireConformiteUserPrompt, extractJson, generateDocument } from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const situation = typeof body.situation === "string" ? body.situation.trim() : "";
  const contexte = typeof body.contexte === "string" ? body.contexte.trim() : "";
  if (!situation) return NextResponse.json({ error: "situation requise" }, { status: 400 });

  try {
    const query = `${situation}\n${contexte}`;
    const rag = await buildNationalRagContextForTool({ query, includeEuCaseLaw: true });
    let prompt = buildMemoireConformiteUserPrompt(situation, contexte);
    prompt = appendNationalRagToUserPrompt(prompt, rag.context);

    const raw = await generateDocument(prompt, auth.billing("memoire-conformite", "memoire-conformite"));
    const parsed = extractJson(raw);

    return NextResponse.json({
      result: parsed,
      rag: {
        countries: rag.countryCodes,
        statute_hits: rag.statuteHits,
        national_case_law_hits: rag.nationalCaseLawHits,
      },
    });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
