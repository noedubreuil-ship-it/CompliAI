import { NextResponse } from "next/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";
import {
  buildSimulateurEvaluateUserPrompt,
  buildSimulateurFollowUpUserPrompt,
  buildSimulateurStartUserPrompt,
  generateSimulateurCasPratiqueDocument,
  parseSimulateurScenarioId,
  parseSimulateurScore,
} from "@/lib/ai/generators";
import type {
  SimulateurFormat,
  SimulateurNiveau,
  SimulateurTheme,
} from "@/lib/ai/prompts/simulateur-cas-pratique";

export const runtime = "nodejs";

const NIVEAUX: SimulateurNiveau[] = ["L2_L3", "M1", "M2_Bar"];
const THEMES: SimulateurTheme[] = [
  "rgpd",
  "ai_act",
  "dsa_dma",
  "droits_fondamentaux",
  "transferts",
  "biometrie",
  "random",
];
const FORMATS: SimulateurFormat[] = ["court", "standard", "intensif"];

function parseNiveau(raw: unknown): SimulateurNiveau {
  return typeof raw === "string" && NIVEAUX.includes(raw as SimulateurNiveau) ?
      (raw as SimulateurNiveau)
    : "L2_L3";
}

function parseTheme(raw: unknown): SimulateurTheme {
  return typeof raw === "string" && THEMES.includes(raw as SimulateurTheme) ?
      (raw as SimulateurTheme)
    : "random";
}

function parseFormat(raw: unknown): SimulateurFormat {
  return typeof raw === "string" && FORMATS.includes(raw as SimulateurFormat) ?
      (raw as SimulateurFormat)
    : "standard";
}

function parsePlayedIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.length > 0);
}

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const limited = await rateLimitUser(auth.userId, "legal-tools", RATE_LIMITS.generate);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "start";
  const niveau = parseNiveau(body.niveau);
  const theme = parseTheme(body.theme);
  const format = parseFormat(body.format);
  const playedScenarioIds = parsePlayedIds(body.played_scenario_ids);

  try {
    let userPrompt: string;

    if (action === "start") {
      userPrompt = buildSimulateurStartUserPrompt({ niveau, theme, format, playedScenarioIds });
    } else if (action === "evaluate") {
      const enonce = typeof body.enonce === "string" ? body.enonce.trim() : "";
      const studentAnswer = typeof body.student_answer === "string" ? body.student_answer.trim() : "";
      if (enonce.length < 80) {
        return NextResponse.json({ error: "enonce requis (contexte du cas)" }, { status: 400 });
      }
      if (studentAnswer.length < 40) {
        return NextResponse.json({ error: "student_answer requis (min. 40 caractères)" }, { status: 400 });
      }
      userPrompt = buildSimulateurEvaluateUserPrompt({
        niveau,
        theme,
        format,
        scenarioId: typeof body.scenario_id === "string" ? body.scenario_id : undefined,
        enonce,
        studentAnswer,
      });
    } else if (action === "nouveau_cas" || action === "plus_difficile") {
      const command = action === "plus_difficile" ? "plus_difficile" : "nouveau_cas";
      let adjNiveau = niveau;
      let adjFormat = format;
      if (command === "plus_difficile") {
        if (niveau === "L2_L3") adjNiveau = "M1";
        else if (niveau === "M1") adjNiveau = "M2_Bar";
        if (format === "court") adjFormat = "standard";
        else if (format === "standard") adjFormat = "intensif";
      }
      userPrompt = buildSimulateurFollowUpUserPrompt({
        niveau: adjNiveau,
        theme,
        format: adjFormat,
        command,
        playedScenarioIds,
      });
    } else {
      return NextResponse.json({ error: `action inconnue: ${action}` }, { status: 400 });
    }

    const ragQuery = `${theme} ${niveau} ${action === "evaluate" ? body.enonce : ""}`;
    const rag = await buildNationalRagContextForTool({ query: ragQuery, includeEuCaseLaw: true });
    const enrichedPrompt = appendNationalRagToUserPrompt(userPrompt, rag.context);
    const markdown = (await generateSimulateurCasPratiqueDocument(enrichedPrompt, auth.billing("simulateur", "simulateur"))).trim();
    if (!markdown) {
      return NextResponse.json({ error: "Réponse IA vide" }, { status: 500 });
    }

    const scenarioId =
      action === "start" || action === "nouveau_cas" || action === "plus_difficile" ?
        parseSimulateurScenarioId(markdown)
      : typeof body.scenario_id === "string" ? body.scenario_id
      : null;

    const score = action === "evaluate" ? parseSimulateurScore(markdown) : null;

    return NextResponse.json({
      result: {
        markdown,
        action,
        scenario_id: scenarioId,
        score,
        niveau,
        theme,
        format,
      },
    });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
