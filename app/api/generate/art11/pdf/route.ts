import { NextRequest, NextResponse } from "next/server";
import { generateArt11PDF } from "@/lib/pdf/art11";

export async function POST(req: NextRequest) {
  try {
    const { data, systemName } = await req.json();
    if (!data) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

    const buffer = await generateArt11PDF(data, systemName ?? "Système IA");

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="doc-art11-${(systemName ?? "system").replace(/\s/g, "_")}.pdf"`,
      },
    });
  } catch (e: any) {
    console.error("[PDF Art11]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
