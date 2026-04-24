import { NextRequest, NextResponse } from "next/server";
import { generateContractPDF } from "@/lib/pdf/contract";

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json();
    if (!data) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    const buffer = await generateContractPDF(data);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analyse-contrat-${(data.provider ?? "fournisseur").replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF Contract]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
