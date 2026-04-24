import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTierLimits } from "@/lib/stripe/limits";
import { generateAuditPDF } from "@/lib/pdf/generate";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ auditId: string }> }
) {
  const { auditId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Check tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, company")
    .eq("id", user.id)
    .single();

  const tier = (profile?.subscription_tier ?? "free") as Parameters<typeof getTierLimits>[0];
  const limits = getTierLimits(tier);

  if (!limits.pdf_export) {
    return NextResponse.json(
      { error: "La génération de PDF est disponible avec le plan Pro. Passez à Pro pour accéder à cette fonctionnalité." },
      { status: 403 }
    );
  }

  // Fetch audit + project
  const { data: audit } = await supabase
    .from("audits")
    .select("*, projects(name, sector, target_audience)")
    .eq("id", auditId)
    .eq("user_id", user.id)
    .single();

  if (!audit) {
    return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateAuditPDF({
      audit: {
        ...audit,
        roadmap: audit.roadmap ?? [],
        cost_estimate: audit.cost_estimate ?? { initial: "—", recurring_annual: "—", details: "" },
      },
      project: {
        name: (audit.projects as { name: string; sector: string; target_audience: string })?.name ?? "—",
        sector: (audit.projects as { name: string; sector: string; target_audience: string })?.sector ?? "—",
        target_audience: (audit.projects as { name: string; sector: string; target_audience: string })?.target_audience ?? "—",
      },
      companyName: profile?.company ?? undefined,
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compliai-rapport-${auditId.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Erreur lors de la génération du PDF" }, { status: 500 });
  }
}
