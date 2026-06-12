import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enrichPromptWithNationalRag } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  buildThirdPartyContractAnalysisUserPrompt,
  extractJson,
  generateThirdPartyContractAnalysis,
  type ContractAnalysisIntake,
} from "@/lib/ai/generators";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await authenticateForGenerate();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const body = await request.json();
  const {
    contract_text,
    provider_name,
    filename,
    service_description,
    contract_type,
    contract_version_or_date,
    role_in_relationship,
    personal_data_context,
    provider_training_use,
    service_criticality,
    sector,
    company_country,
  } = body;

  if (!provider_name) {
    return NextResponse.json({ error: "Nom du fournisseur requis" }, { status: 400 });
  }

  const contractText = typeof contract_text === "string" ? contract_text : "";
  if (!contractText.trim()) {
    return NextResponse.json(
      { error: "Texte du contrat requis (coller le texte ou importer un fichier .txt)" },
      { status: 400 },
    );
  }

  const intake: ContractAnalysisIntake = {
    providerName: provider_name,
    contractText,
    serviceDescription: typeof service_description === "string" ? service_description : undefined,
    contractType: typeof contract_type === "string" ? contract_type : undefined,
    contractVersionOrDate:
      typeof contract_version_or_date === "string" ? contract_version_or_date : undefined,
    roleInRelationship: typeof role_in_relationship === "string" ? role_in_relationship : undefined,
    personalDataContext: typeof personal_data_context === "string" ? personal_data_context : undefined,
    providerTrainingUse: typeof provider_training_use === "string" ? provider_training_use : undefined,
    serviceCriticality: typeof service_criticality === "string" ? service_criticality : undefined,
    sector: typeof sector === "string" ? sector : undefined,
    companyCountry: typeof company_country === "string" ? company_country : undefined,
  };

  try {
    const ragQuery = [
      intake.providerName,
      intake.sector,
      intake.companyCountry,
      intake.contractType,
      intake.personalDataContext,
    ]
      .filter(Boolean)
      .join(" ");
    const prompt = await enrichPromptWithNationalRag(buildThirdPartyContractAnalysisUserPrompt(intake), {
      query: ragQuery,
      includeEuCaseLaw: true,
    });
    const raw = await generateThirdPartyContractAnalysis(prompt, auth.billing("contract", "contract"));
    const analysis = extractJson(raw) as Record<string, unknown> & {
      risk_score?: number | null;
      score_global?: number | null;
    };

    const risk =
      typeof analysis.risk_score === "number" && Number.isFinite(analysis.risk_score) ?
        Math.round(analysis.risk_score)
      : typeof analysis.score_global === "number" && Number.isFinite(analysis.score_global) ?
        Math.round(analysis.score_global)
      : null;
    analysis.risk_score = risk ?? analysis.risk_score;

    const { data: result } = await supabase.from("contract_analyses").insert({
      user_id: auth.userId,
      filename: filename || `${provider_name}_contract.txt`,
      provider_name,
      analysis,
      risk_score: analysis.risk_score ?? null,
    }).select().single();

    return NextResponse.json({ analysis_id: result?.id, analysis });
  } catch (err) {
    console.error("Contract analysis error:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
