import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await rateLimitUser(user.id, "search", RATE_LIMITS.search);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;

  const [projects, audits, aiSystems, docs] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, description, status")
      .eq("user_id", user.id)
      .or(`name.ilike.${like},description.ilike.${like}`)
      .limit(5),
    supabase
      .from("audits")
      .select("id, project_id, verdict, ai_act_classification, created_at, projects(name)")
      .eq("user_id", user.id)
      .or(`verdict.ilike.${like},ai_act_classification.ilike.${like}`)
      .limit(5),
    supabase
      .from("ai_system_register")
      .select("id, system_name, purpose, risk_level")
      .eq("user_id", user.id)
      .or(`system_name.ilike.${like},purpose.ilike.${like}`)
      .limit(5),
    supabase
      .from("generated_documents")
      .select("id, doc_type, title, created_at")
      .eq("user_id", user.id)
      .ilike("title", like)
      .limit(5),
  ]);

  const results: Array<{
    type: string;
    id: string;
    title: string;
    subtitle?: string;
    href: string;
  }> = [];

  for (const p of projects.data ?? []) {
    results.push({
      type: "project",
      id: p.id,
      title: p.name,
      subtitle: p.description ?? p.status,
      href: `/dashboard/projects/${p.id}`,
    });
  }
  for (const a of audits.data ?? []) {
    results.push({
      type: "audit",
      id: a.id,
      title: `Audit — ${(a as any).projects?.name ?? "Projet"}`,
      subtitle: `${a.verdict} · ${a.ai_act_classification}`,
      href: `/dashboard/projects/${a.project_id}`,
    });
  }
  for (const s of aiSystems.data ?? []) {
    results.push({
      type: "ai_system",
      id: s.id,
      title: s.system_name,
      subtitle: `${s.risk_level} · ${s.purpose}`,
      href: `/dashboard/register`,
    });
  }
  for (const d of docs.data ?? []) {
    results.push({
      type: "document",
      id: d.id,
      title: d.title,
      subtitle: d.doc_type.replace(/_/g, " "),
      href: `/dashboard/tools`,
    });
  }

  return NextResponse.json({ results });
}
