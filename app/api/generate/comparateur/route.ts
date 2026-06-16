import { NextResponse } from "next/server";
import { EU27 } from "@/lib/data/eu27-registry";
import { createClient } from "@/lib/supabase/server";
import {
  appendNationalRagToUserPrompt,
  buildNationalRagContextForTool,
  getEu27CountryCodesForToolRag,
} from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildComparateurCompareUserPrompt,
  buildComparateurPanoramaUserPrompt,
  extractJson,
  generateComparateurLegislationsDocument,
  normalizeComparateurForClient,
} from "@/lib/ai/generators";
import type { ComparateurFocus } from "@/lib/ai/prompts/comparateur-legislations";
import { catchGenerateRouteError, aiUnavailable } from "@/lib/ai/http-errors";
import { ComparateurClientSchema } from "@/lib/ai/schemas/comparateur";

export const runtime = "nodejs";

const FOCUSES: ComparateurFocus[] = ["rgpd", "ai_act", "nis2", "transversal"];

function parseFocus(raw: unknown): ComparateurFocus {
  return typeof raw === "string" && FOCUSES.includes(raw as ComparateurFocus) ?
      (raw as ComparateurFocus)
    : "transversal";
}

function parseCountryCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return EU27[code] ? code : null;
}

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = body.mode === "panorama" ? "panorama" : "bilateral";
  const focus = parseFocus(body.focus);
  const aspect = typeof body.aspect === "string" ? body.aspect.trim() : undefined;
  const projectId = typeof body.project_id === "string" && body.project_id.trim() ? body.project_id.trim() : null;

  try {
    let userPrompt: string;
    let ragCountryCodes: string[] = [];

    if (mode === "panorama") {
      userPrompt = buildComparateurPanoramaUserPrompt({ focus, aspect });
      ragCountryCodes = getEu27CountryCodesForToolRag();
    } else {
      const code1 = parseCountryCode(body.country1 ?? body.pays1);
      const code2 = parseCountryCode(body.country2 ?? body.pays2);
      if (!code1 || !code2) {
        return NextResponse.json(
          { error: "country1 et country2 requis (codes ISO2 UE-27, ex. FR, DE)" },
          { status: 400 },
        );
      }
      if (code1 === code2) {
        return NextResponse.json({ error: "Sélectionnez deux pays différents" }, { status: 400 });
      }
      ragCountryCodes = [code1, code2];
      userPrompt = buildComparateurCompareUserPrompt({
        countryCodes: [code1, code2],
        focus,
        aspect,
      });
    }

    const ragQuery = [aspect, focus, mode, ...ragCountryCodes.map((c) => EU27[c]?.name_fr ?? c)].join(
      " "
    );
    const rag = await buildNationalRagContextForTool({
      query: ragQuery,
      countryCodes: ragCountryCodes,
      includeEuCaseLaw: focus === "rgpd" || focus === "transversal",
    });
    userPrompt = appendNationalRagToUserPrompt(userPrompt, rag.context);

    const raw = await generateComparateurLegislationsDocument(userPrompt, auth.billing("comparateur", "comparateur"));
    const parsed = extractJson(raw) as Record<string, unknown>;
    const result = normalizeComparateurForClient(parsed);
    const validated = ComparateurClientSchema.safeParse(result);
    if (!validated.success) {
      console.error("[comparateur] invalid JSON shape:", validated.error.flatten());
      return aiUnavailable("Sortie IA invalide (comparateur). Réessayez.");
    }

    await supabase.from("generated_documents").insert({
      user_id: auth.userId,
      project_id: projectId,
      doc_type: "comparateur",
      title:
        mode === "panorama" ?
          `Comparateur UE-27 — ${focus}`
        : `Comparateur — ${ragCountryCodes.join(" vs ")} (${focus})`,
      content: validated.data,
      raw_text: raw,
    });

    return NextResponse.json({
      result: validated.data,
      rag: {
        countries: rag.countryCodes,
        statute_hits: rag.statuteHits,
      },
      proof: {
        country_codes: rag.countryCodes,
        statute_hits: rag.statuteHits,
        national_case_law_hits: rag.nationalCaseLawHits,
        eu_case_law_hits: rag.euCaseLawHits,
      },
    });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
