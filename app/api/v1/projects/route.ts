import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveApiKeyUserId } from "@/lib/api/resolve-api-key";

export const runtime = "nodejs";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** GET /api/v1/projects — liste des projets de l'utilisateur (clé API). */
export async function GET(request: Request) {
  const userId = await resolveApiKeyUserId(request);
  if (!userId) return NextResponse.json({ error: "Clé API invalide ou expirée" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const { data: projects, error } = await admin
    .from("projects")
    .select("id, name, sector, status, organization_id, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: projects ?? [], count: projects?.length ?? 0 });
}
