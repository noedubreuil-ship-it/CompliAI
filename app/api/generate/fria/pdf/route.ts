import { NextRequest, NextResponse } from "next/server";
import { generateFRIAPDF } from "@/lib/pdf/fria";

export async function POST(req: NextRequest) {
  try {
    const { data, systemName } = await req.json();
    if (!data) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    const buffer = await generateFRIAPDF(data, systemName ?? "Système IA");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="fria-${(systemName ?? "system").replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF FRIA]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
