import { NextResponse } from "next/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { buildAuditQrUserPrompt, extractJson, generateDocument } from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const systemDescription =
    typeof body.systemDescription === "string" ? body.systemDescription.trim() : "";
  const secteur = typeof body.secteur === "string" ? body.secteur.trim() : "";
  if (!systemDescription) {
    return NextResponse.json({ error: "systemDescription requis" }, { status: 400 });
  }

  try {
    const rag = await buildNationalRagContextForTool({
      query: `${systemDescription} ${secteur}`,
      includeEuCaseLaw: false,
    });
    let prompt = buildAuditQrUserPrompt(systemDescription, secteur);
    prompt = appendNationalRagToUserPrompt(prompt, rag.context);

    const raw = await generateDocument(prompt, auth.billing("audit", "audit"));
    const parsed = extractJson(raw);

    return NextResponse.json({ result: parsed });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
