import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { buildNationalRagContextForTool } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  extractJson,
  generateQuizEtudiantsDocument,
  normalizeQuizEtudiantsForClient,
} from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";
import type { QuizEtudiantExamMode } from "@/lib/ai/prompts/quiz-eu-etudiants";

export const runtime = "nodejs";

const EXAM_MODES: QuizEtudiantExamMode[] = [
  "apprentissage",
  "rapide",
  "examen_blanc",
  "revision",
  "methodologie",
];

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const limited = await rateLimitUser(auth.userId, "legal-tools", RATE_LIMITS.generate);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return NextResponse.json({ error: "topic requis" }, { status: 400 });
  const projectId = typeof body.project_id === "string" && body.project_id.trim() ? body.project_id.trim() : null;

  const niveau = typeof body.niveau === "string" ? body.niveau : "L3";
  const countRaw = typeof body.count === "number" ? body.count : Number(body.count ?? 5);
  const count = Number.isFinite(countRaw) ? Math.min(20, Math.max(3, Math.floor(countRaw))) : 5;
  const examModeRaw = typeof body.exam_mode === "string" ? body.exam_mode : "apprentissage";
  const examMode = EXAM_MODES.includes(examModeRaw as QuizEtudiantExamMode) ?
    (examModeRaw as QuizEtudiantExamMode)
  : "apprentissage";

  try {
    const rag = await buildNationalRagContextForTool({ query: topic, includeEuCaseLaw: true });
    const raw = await generateQuizEtudiantsDocument({
      topic,
      niveau,
      count,
      examMode,
      nationalRagContext: rag.context,
      billing: auth.billing("quiz", "quiz"),
    });
    const parsed = extractJson(raw) as Record<string, unknown>;
    const result = normalizeQuizEtudiantsForClient(parsed);

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: projectId,
      doc_type: "quiz",
      title: `Quiz — ${topic.slice(0, 80)}`,
      content: result,
      raw_text: raw,
    });

    return NextResponse.json({ result });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
