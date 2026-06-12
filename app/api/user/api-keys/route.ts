/**
 * CRUD clés API utilisateur
 * GET    — liste les clés (sans hash)
 * POST   — crée une nouvelle clé (retourne la clé en clair UNE SEULE FOIS)
 * DELETE — révoque une clé (body: { keyId })
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { data } = await admin
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, expires_at, is_active, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { name, scopes = ["read"], expiresInDays } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  // Vérifie le nombre de clés actives (max 10)
  const { count } = await admin.from("api_keys").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("is_active", true);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: "Maximum 10 clés actives" }, { status: 429 });
  }

  const rawKey = `cai_${randomBytes(32).toString("base64url")}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null;

  await admin.from("api_keys").insert({
    user_id: user.id,
    name: name.trim(),
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
    expires_at: expiresAt,
  });

  // La clé brute n'est retournée qu'une seule fois
  return NextResponse.json({ key: rawKey, prefix: keyPrefix, name, scopes, expiresAt });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { keyId } = await request.json();
  if (!keyId) return NextResponse.json({ error: "keyId requis" }, { status: 400 });

  await admin.from("api_keys").update({ is_active: false }).eq("id", keyId).eq("user_id", user.id);
  return NextResponse.json({ revoked: true });
}
