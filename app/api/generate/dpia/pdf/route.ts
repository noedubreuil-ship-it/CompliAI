import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDPIAPDF } from "@/lib/pdf/dpia";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });

  const { data: doc } = await supabase
    .from("generated_documents")
    .select("content, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  try {
    const treatmentName = doc.content?.treatment_info?.name ?? doc.title ?? "Traitement";
    const buffer = await generateDPIAPDF(doc.content, treatmentName);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dpia-${treatmentName.replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF DPIA]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { data, treatmentName } = await req.json();
    if (!data) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    const buffer = await generateDPIAPDF(data, treatmentName ?? "Traitement");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dpia-${(treatmentName ?? "traitement").replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF DPIA]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
