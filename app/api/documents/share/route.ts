/**
 * POST /api/documents/share — génère ou révoque un lien de partage pour un document
 * Body: { docId: string, action: "enable" | "disable", expiresInDays?: number }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { docId, action, expiresInDays = 30 } = await request.json();
  if (!docId || !action) return NextResponse.json({ error: "docId et action requis" }, { status: 400 });

  // Vérifie que le document appartient à l'utilisateur
  const { data: doc } = await admin
    .from("generated_documents")
    .select("id, doc_type, share_token")
    .eq("id", docId)
    .eq("user_id", user.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  if (action === "disable") {
    await admin
      .from("generated_documents")
      .update({ share_enabled: false })
      .eq("id", docId);
    return NextResponse.json({ shared: false });
  }

  if (action === "enable") {
    const token = doc.share_token ?? randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + expiresInDays * 86400000).toISOString();

    await admin
      .from("generated_documents")
      .update({ share_token: token, share_enabled: true, share_expires_at: expiresAt })
      .eq("id", docId);

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;
    return NextResponse.json({ shared: true, url: shareUrl, expiresAt });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
