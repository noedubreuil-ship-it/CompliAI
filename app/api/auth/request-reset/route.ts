/**
 * POST /api/auth/request-reset
 * Réinitialisation mot de passe avec double rate limiting :
 *  - 3 tentatives / email / 15 minutes
 *  - 5 tentatives / IP / 1 heure
 */

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const LIMITS = {
  email: { max: 3, windowMinutes: 15 },
  ip:    { max: 5, windowMinutes: 60 },
};

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

async function countRecentAttempts(
  identifier: string,
  action: string,
  windowMinutes: number
): Promise<number> {
  const admin = getAdmin();
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const { count } = await admin
    .from("auth_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("created_at", since);
  return count ?? 0;
}

async function recordAttempt(identifier: string, action: string) {
  const admin = getAdmin();
  await admin.from("auth_rate_limits").insert({ identifier, action });
}

export async function POST(request: Request) {
  let email: string;
  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  const ip = getClientIp(request);

  // ── Rate limit par email ─────────────────────────────────────────────────
  const emailCount = await countRecentAttempts(email, "password_reset", LIMITS.email.windowMinutes);
  if (emailCount >= LIMITS.email.max) {
    return NextResponse.json(
      {
        error: `Trop de tentatives pour cet email. Réessayez dans ${LIMITS.email.windowMinutes} minutes.`,
        code: "RATE_LIMITED_EMAIL",
        retryAfterMinutes: LIMITS.email.windowMinutes,
      },
      { status: 429 }
    );
  }

  // ── Rate limit par IP ────────────────────────────────────────────────────
  const ipCount = await countRecentAttempts(`ip:${ip}`, "password_reset", LIMITS.ip.windowMinutes);
  if (ipCount >= LIMITS.ip.max) {
    return NextResponse.json(
      {
        error: `Trop de demandes depuis votre réseau. Réessayez dans ${LIMITS.ip.windowMinutes} minutes.`,
        code: "RATE_LIMITED_IP",
        retryAfterMinutes: LIMITS.ip.windowMinutes,
      },
      { status: 429 }
    );
  }

  // ── Enregistrement de la tentative ───────────────────────────────────────
  await Promise.all([
    recordAttempt(email, "password_reset"),
    recordAttempt(`ip:${ip}`, "password_reset"),
  ]);

  // ── Appel Supabase (via client anonyme pour respecter le flux auth) ──────
  // On utilise le service role pour déclencher l'envoi sans exposer l'anon key
  const admin = getAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.compliai.eu";

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl}/auth/reset-password` },
  });

  if (error) {
    // On retourne toujours succès pour éviter l'énumération d'emails
    console.error("[request-reset] Supabase error:", error.message);
  }

  // Réponse identique qu'il y ait un compte ou non (anti-énumération)
  return NextResponse.json({
    message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
  });
}
