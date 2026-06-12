import { NextResponse } from "next/server";
import { buildNationalRagContextForTool } from "@/lib/ai/national-rag-for-tools";
import { authenticateForGenerate } from "@/lib/ai/generate-route";
import {
  extractJson,
  generateClausesIaDocument,
  normalizeClausesIaForClient,
} from "@/lib/ai/generators";
import { catchGenerateRouteError } from "@/lib/ai/http-errors";
import type { ClausesIaNiveau, ClausesIaType } from "@/lib/ai/prompts/generateur-clauses-ia";

export const runtime = "nodejs";

const CLAUSE_TYPES: ClausesIaType[] = [
  "responsabilite_ia",
  "transparence_algo",
  "dpa_rgpd",
  "conformite_ai_act",
  "audit",
  "propriete_intellectuelle",
  "portabilite",
  "package_complet",
];

const NIVEAUX: ClausesIaNiveau[] = ["essentielle", "standard", "renforcee"];

function parseClauseType(raw: unknown): ClausesIaType {
  return typeof raw === "string" && CLAUSE_TYPES.includes(raw as ClausesIaType) ?
      (raw as ClausesIaType)
    : "responsabilite_ia";
}

function parseNiveau(raw: unknown): ClausesIaNiveau {
  return typeof raw === "string" && NIVEAUX.includes(raw as ClausesIaNiveau) ?
      (raw as ClausesIaNiveau)
    : "standard";
}

function optStr(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export async function POST(request: Request) {
  const auth = await authenticateForGenerate({ requirePro: true });
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const intake = {
    clauseType: parseClauseType(body.clause_type ?? body.typeClause),
    niveau: parseNiveau(body.niveau),
    partieA: optStr(body.partie_a ?? body.partieA),
    roleA: optStr(body.role_a ?? body.roleA),
    partieB: optStr(body.partie_b ?? body.partieB),
    roleB: optStr(body.role_b ?? body.roleB),
    contractType: optStr(body.contract_type),
    domain: optStr(body.domain),
    personalData: optStr(body.personal_data),
    aiClassification: optStr(body.ai_classification),
    applicableLaw: optStr(body.applicable_law),
    language: optStr(body.language),
    contextExtra: optStr(body.contexte ?? body.context_extra),
  };

  try {
    const ragQuery = [
      intake.domain,
      intake.contractType,
      intake.applicableLaw,
      intake.personalData,
      intake.contextExtra,
      intake.clauseType,
    ]
      .filter(Boolean)
      .join(" ");
    const rag = await buildNationalRagContextForTool({ query: ragQuery, includeEuCaseLaw: false });
    const raw = await generateClausesIaDocument(intake, rag.context, auth.billing("clauses-contrat", "clauses-ia"));
    const parsed = extractJson(raw) as Record<string, unknown>;
    const result = normalizeClausesIaForClient(parsed);
    return NextResponse.json({ result });
  } catch (err) {
    return catchGenerateRouteError(err);
  }
}
