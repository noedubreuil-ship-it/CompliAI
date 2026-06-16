import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";
import {
  buildResumeArretGenerationPrompt,
  extractJson,
  generateResumeArretDocument,
  normalizeResumeArretForClient,
} from "@/lib/ai/generators";
import type { ResumeArretMode, ResumeArretNiveau } from "@/lib/ai/prompts/arrets-guide";

export const runtime = "nodejs";

const MODES_JSON: ResumeArretMode[] = ["F", "C", "FC"];
const MODES_PROSE: ResumeArretMode[] = ["E", "M", "T"];
const ALL_MODES: ResumeArretMode[] = [...MODES_JSON, ...MODES_PROSE];

function parseMode(raw: unknown): ResumeArretMode {
  const m = typeof raw === "string" ? raw.toUpperCase() : "FC";
  return ALL_MODES.includes(m as ResumeArretMode) ? (m as ResumeArretMode) : "FC";
}

function parseNiveau(raw: unknown): ResumeArretNiveau | undefined {
  const allowed = ["L1", "L2", "L3", "M1", "M2", "Doctorat", "Professionnel", "auto"] as const;
  if (typeof raw !== "string") return undefined;
  return allowed.includes(raw as (typeof allowed)[number]) ? (raw as ResumeArretNiveau) : undefined;
}

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const limited = await rateLimitUser(auth.userId, "arrets-guide", RATE_LIMITS.generate);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 50) {
    return NextResponse.json({ error: "text requis (min. 50 caractères)" }, { status: 400 });
  }

  const mode = parseMode(body.mode);
  const niveau = parseNiveau(body.niveau);
  const reference = typeof body.reference === "string" ? body.reference.trim() : undefined;

  try {
    const basePrompt = buildResumeArretGenerationPrompt({ text, mode, niveau, reference });
    const prompt = await enrichPromptWithNationalRag(basePrompt, {
      query: `${reference ?? ""} ${text.slice(0, 2000)}`,
      includeEuCaseLaw: true,
    });
    const prose = MODES_PROSE.includes(mode);
    const raw = await generateResumeArretDocument(prompt, prose, auth.billing("resume-arret", "arrets_guide"));

    if (prose) {
      const result = {
        mode,
        niveau: niveau ?? "auto",
        markdown: raw.trim(),
        format: "markdown" as const,
      };
      return NextResponse.json({ result });
    }

    const parsed = extractJson(raw) as Record<string, unknown>;
    const result = normalizeResumeArretForClient(parsed);

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      doc_type: "resume-arret",
      title: `Fiche arrêt — ${String((result.fiche as Record<string, unknown>)?.reference ?? text.slice(0, 60))}`,
      content: result,
      raw_text: raw,
    });

    return NextResponse.json({ result, format: "json" as const });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
