import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKeyUserId } from "@/lib/api/resolve-api-key";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** GET /api/v1/audits — audits récents (clé API). */
export async function GET(request: Request) {
  const userId = await resolveApiKeyUserId(request);
  if (!userId) return NextResponse.json({ error: "Clé API invalide ou expirée" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const projectId = searchParams.get("project_id");

  let query = admin
    .from("audits")
    .select(
      "id, project_id, verdict, compliance_score, ai_act_classification, risk_level, created_at, projects(name)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data: audits, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ audits: audits ?? [], count: audits?.length ?? 0 });
}
