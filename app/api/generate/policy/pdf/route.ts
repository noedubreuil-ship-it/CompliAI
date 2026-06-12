import { NextRequest, NextResponse } from "next/server";
import { generatePolicyPDF } from "@/lib/pdf/policy";

export async function POST(req: NextRequest) {
  try {
    const { data, companyName } = await req.json();
    if (!data) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    const buffer = await generatePolicyPDF(data, companyName ?? "Entreprise");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="politique-ia-${(companyName ?? "entreprise").replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF Policy]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
