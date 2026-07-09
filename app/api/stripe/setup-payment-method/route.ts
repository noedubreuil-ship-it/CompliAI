/**
 * POST /api/stripe/setup-payment-method
 *
 * Crée un Stripe SetupIntent pour enregistrer une méthode de paiement
 * en vue de l'auto-recharge de crédits (H17b).
 *
 * Nécessite un consentement RGPD explicite (art. 6.1.a + art. 6.1.b RGPD),
 * conforme à PSD2 pour les paiements récurrents initiés par le commerçant.
 *
 * Flow :
 *   1. POST /api/stripe/setup-payment-method → { clientSecret, customerId }
 *   2. Frontend utilise stripe.js confirmCardSetup(clientSecret)
 *   3. Stripe appelle webhook setup_intent.succeeded → on enregistre le payment_method_id
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { createClient as createAdmin } from "@supabase/supabase-js";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json() as {
    consent: boolean; // consentement explicite utilisateur
    threshold: number;
    pack_credits: number;
  };

  if (!body.consent) {
    return NextResponse.json(
      { error: "Le consentement explicite est requis pour enregistrer une méthode de paiement." },
      { status: 400 }
    );
  }

  // Récupère / crée le customer Stripe
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    await admin.from("user_credits").upsert(
      { user_id: user.id, stripe_customer_id: customerId },
      { onConflict: "user_id" }
    );
  }

  // Crée une Stripe Checkout session en mode setup (pas de paiement immédiat)
  // L'utilisateur saisit sa carte sur la page Stripe hébergée (le plus sécurisé — PCI DSS)
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "setup",
    payment_method_types: ["card"],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?auto_recharge_setup=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits`,
    metadata: {
      supabase_user_id: user.id,
      purpose: "auto_recharge",
      threshold: String(body.threshold ?? 500),
      pack_credits: String(body.pack_credits ?? 5000),
    },
  });

  // Enregistre les préférences d'auto-recharge (en attente de confirmation du SetupIntent)
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
  await admin.from("profiles").update({
    auto_recharge_enabled: false, // activé seulement après checkout.session.completed (setup)
    auto_recharge_threshold: body.threshold ?? 500,
    auto_recharge_pack_credits: body.pack_credits ?? 5000,
  }).eq("id", user.id);

  await admin.from("user_credits").upsert({
    user_id: user.id,
    auto_recharge_consent_at: new Date().toISOString(),
    auto_recharge_consent_ip: ip,
  }, { onConflict: "user_id" });

  return NextResponse.json({ url: session.url });
}

/**
 * DELETE /api/stripe/setup-payment-method — désactive l'auto-recharge
 */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  await admin.from("profiles").update({
    auto_recharge_enabled: false,
    auto_recharge_threshold: 500,
    auto_recharge_pack_credits: null,
  }).eq("id", user.id);

  await admin.from("user_credits").update({
    stripe_payment_method_id: null,
    auto_recharge_consent_at: null,
    auto_recharge_consent_ip: null,
  }).eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
