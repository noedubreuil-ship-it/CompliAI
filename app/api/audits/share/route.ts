/**
 * POST /api/audits/share — lien lecture seule pour un rapport d'audit
 * Body: { auditId: string, action: "enable" | "disable", expiresInDays?: number }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { auditId, action, expiresInDays = 30 } = await request.json();
  if (!auditId || !action) {
    return NextResponse.json({ error: "auditId et action requis" }, { status: 400 });
  }

  const { data: audit } = await supabase
    .from("audits")
    .select("id, share_token, user_id")
    .eq("id", auditId)
    .eq("user_id", user.id)
    .single();

  if (!audit) return NextResponse.json({ error: "Audit introuvable" }, { status: 404 });

  if (action === "disable") {
    await admin.from("audits").update({ share_enabled: false }).eq("id", auditId);
    return NextResponse.json({ shared: false });
  }

  if (action === "enable") {
    const token = audit.share_token ?? randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    await admin
      .from("audits")
      .update({ share_token: token, share_enabled: true, share_expires_at: expiresAt })
      .eq("id", auditId);

    return NextResponse.json({
      shared: true,
      url: `${baseUrl}/share/audit/${token}`,
      expiresAt,
    });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
