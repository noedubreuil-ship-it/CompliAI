import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUser, RATE_LIMITS } from "@/lib/rate-limit";
import { aiUnauthorized } from "@/lib/ai/http-errors";
import { generateToolExportPdf, type ToolExportSection } from "@/lib/pdf/tool-export";

export const runtime = "nodejs";

function parseSections(raw: unknown): ToolExportSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const heading = typeof o.heading === "string" ? o.heading.trim() : "";
      const body = typeof o.body === "string" ? o.body : "";
      if (!heading || !body.trim()) return null;
      return { heading, body };
    })
    .filter((x): x is ToolExportSection => x !== null);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return aiUnauthorized();

  const limited = await rateLimitUser(user.id, "export-pdf", RATE_LIMITS.pdf);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : undefined;
  const sections = parseSections(body.sections);
  const filenameRaw = typeof body.filename === "string" ? body.filename.trim() : "compliai-export";

  if (!title || sections.length === 0) {
    return NextResponse.json({ error: "title et sections requis" }, { status: 400 });
  }

  const safeName = filenameRaw.replace(/[^\w.-]+/g, "_").slice(0, 80) || "compliai-export";

  try {
    const buffer = await generateToolExportPdf({ title, subtitle, sections });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (e) {
    console.error("[export-pdf]", e);
    return NextResponse.json({ error: "Erreur génération PDF" }, { status: 500 });
  }
}
