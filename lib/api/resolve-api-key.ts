import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Résout une clé API Bearer → user_id ou null. */
export async function resolveApiKeyUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const { data: apiKey } = await admin
    .from("api_keys")
    .select("user_id, is_active, expires_at")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .single();

  if (!apiKey) return null;
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return null;

  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash);

  return apiKey.user_id;
}
