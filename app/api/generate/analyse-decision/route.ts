import { runGenerateRoute } from "@/lib/ai/generate-route";
import { buildNationalRagContextForTool } from "@/lib/ai/national-rag-for-tools";
import { createClient } from "@/lib/supabase/server";
import {
  generateAnalyseurDecisionsDocument,
  parseAnalyseurDecisionHeadline,
} from "@/lib/ai/generators";
import type { AnalyseurDecisionProfil } from "@/lib/ai/prompts/analyseur-decisions-autorites";
import { aiBadRequest } from "@/lib/ai/http-errors";

export const runtime = "nodejs";

const PROFILS: AnalyseurDecisionProfil[] = ["professionnel", "etudiant", "rapide"];

function parseProfil(raw: unknown): AnalyseurDecisionProfil {
  return typeof raw === "string" && PROFILS.includes(raw as AnalyseurDecisionProfil) ?
      (raw as AnalyseurDecisionProfil)
    : "professionnel";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const texteDecision =
    typeof body.texte_decision === "string" ? body.texte_decision.trim()
    : typeof body.texteDecision === "string" ? body.texteDecision.trim()
    : "";

  if (texteDecision.length < 80) {
    return aiBadRequest("texte_decision requis (min. 80 caractères — texte ou résumé structuré)");
  }

  const profil = parseProfil(body.profil);
  const reference = typeof body.reference === "string" ? body.reference.trim() : undefined;

  return runGenerateRoute(
    request,
    async (ctx) => {
      const supabase = await createClient();
      const rag = await buildNationalRagContextForTool({
        query: `${texteDecision} ${reference ?? ""}`,
        includeEuCaseLaw: true,
      });
      const markdown = (
        await generateAnalyseurDecisionsDocument({
          billing: ctx.billing("analyse-decision", "analyse-decision"),
          texteDecision,
          profil,
          reference,
          nationalRagContext: rag.context,
        })
      ).trim();

      if (!markdown) {
        throw new Error("Réponse IA vide");
      }

      const projectId = typeof body.project_id === "string" && body.project_id.trim() ? body.project_id.trim() : null;
      await supabase.from("generated_documents").insert({
        user_id: ctx.userId,
        project_id: projectId,
        doc_type: "analyse-decision",
        title: `Décision autorité — ${reference ?? "Analyse"}`,
        content: { profil, headline: parseAnalyseurDecisionHeadline(markdown) },
        raw_text: markdown,
      });

      return {
        markdown,
        profil,
        headline: parseAnalyseurDecisionHeadline(markdown),
        format: "markdown" as const,
        proof: {
          statute_hits: rag.statuteHits,
          national_case_law_hits: rag.nationalCaseLawHits,
          eu_case_law_hits: rag.euCaseLawHits,
          country_codes: rag.countryCodes,
        },
      };
    },
    { body, requirePro: true },
  );
}
