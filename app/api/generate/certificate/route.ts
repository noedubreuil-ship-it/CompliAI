import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { CertificatePDF } from "@/lib/pdf/certificate";

export const runtime = "nodejs";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const url = new URL(request.url);
  const auditId = url.searchParams.get("auditId");
  if (!auditId) return NextResponse.json({ error: "auditId requis" }, { status: 400 });

  const { data: audit } = await admin
    .from("audits")
    .select("id, compliance_score, verdict, ai_act_classification, created_at, projects(name, company)")
    .eq("id", auditId)
    .eq("user_id", user.id)
    .single();

  if (!audit) return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, company")
    .eq("id", user.id)
    .single();

  const project = audit.projects as unknown as { name: string; company?: string } | null;
  const auditDate = new Date(audit.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const validUntil = new Date(Date.now() + 365 * 86400000).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const refCode = `COMPLIAI-${auditId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const data = {
    companyName: profile?.company ?? project?.company ?? "—",
    systemName: project?.name ?? "Système IA",
    auditDate,
    complianceScore: audit.compliance_score ?? 0,
    verdict: audit.verdict ?? "En cours",
    aiActClassification: audit.ai_act_classification ?? "Non classifié",
    auditorRef: refCode,
    validUntil,
  };

  // @ts-expect-error — renderToBuffer types mismatch with @react-pdf/renderer version
  const buffer = await renderToBuffer(createElement(CertificatePDF, { data }));

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation-conformite-${auditId.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
