/**
 * POST /api/stripe/auto-recharge
 *
 * Déclenche une recharge de crédits via la méthode de paiement sauvegardée.
 * Utilisé soit :
 *   1. Automatiquement par un cron (vérification des soldes bas).
 *   2. Manuellement par l'utilisateur via le bouton "Recharger maintenant".
 *
 * Crée un Stripe PaymentIntent off-session (MIT — paiement initié marchand),
 * conforme PSD2/SCA avec l'exemption "recurring MIT" (EBA Guidelines on SCA).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { getCreditPackDefinition, stripePriceIdForPackCredits } from "@/lib/stripe/credit-pack-config";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Vérifie que l'auto-recharge est configurée
  const { data: profile } = await admin
    .from("profiles")
    .select("auto_recharge_enabled, auto_recharge_threshold, auto_recharge_pack_credits, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.auto_recharge_enabled) {
    return NextResponse.json({ error: "Auto-recharge non activée." }, { status: 400 });
  }

  const { data: credits } = await admin
    .from("user_credits")
    .select("balance, stripe_payment_method_id")
    .eq("user_id", user.id)
    .single();

  if (!credits?.stripe_payment_method_id) {
    return NextResponse.json({ error: "Aucune méthode de paiement enregistrée." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { manual?: boolean };
  const isManual = body.manual === true;

  // Vérification du seuil (sauf si déclenchement manuel)
  if (!isManual && (credits.balance ?? 0) > (profile.auto_recharge_threshold ?? 500)) {
    return NextResponse.json({ skipped: true, reason: "Solde suffisant" });
  }

  const packCredits = profile.auto_recharge_pack_credits ?? 5000;
  const packDef = getCreditPackDefinition(packCredits);

  if (!packDef) {
    return NextResponse.json({ error: `Pack ${packCredits} crédits introuvable.` }, { status: 400 });
  }

  // Crée le PaymentIntent off-session
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: packDef.priceCents,
      currency: "eur",
      customer: profile.stripe_customer_id!,
      payment_method: credits.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      description: `CompliAI — Auto-recharge ${packDef.name} (${packCredits} crédits)`,
      metadata: {
        supabase_user_id: user.id,
        credits: String(packCredits),
        type: "auto_recharge",
        triggered_by: isManual ? "manual" : "threshold",
      },
      receipt_email: user.email ?? undefined,
    });
  } catch (err: unknown) {
    const stripeError = err as { code?: string; message?: string };
    // SCA requise — renvoie le clientSecret pour que l'utilisateur confirme
    if (stripeError.code === "authentication_required") {
      return NextResponse.json({
        requires_action: true,
        payment_intent_client_secret: (err as { payment_intent?: { client_secret?: string } }).payment_intent?.client_secret,
        error: "Authentification 3DS requise. Veuillez confirmer le paiement.",
      }, { status: 402 });
    }
    return NextResponse.json({ error: stripeError.message ?? "Erreur Stripe" }, { status: 500 });
  }

  if (paymentIntent.status === "succeeded") {
    // Crédite immédiatement (additionne au solde existant)
    const { data: currentCredits } = await admin
      .from("user_credits")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const newBalance = (currentCredits?.balance ?? 0) + packCredits;
    await admin.from("user_credits").upsert(
      { user_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    await admin.from("credit_transactions").insert({
      user_id: user.id,
      amount: packCredits,
      type: "top_up",
      description: `Auto-recharge ${packDef.name} (${packCredits} crédits)`,
      metadata: { stripe_payment_intent_id: paymentIntent.id, source: "auto_recharge" },
    });

    return NextResponse.json({
      success: true,
      credits_added: packCredits,
      new_balance: newBalance,
      amount_charged_cents: packDef.priceCents,
      payment_intent_id: paymentIntent.id,
    });
  }

  return NextResponse.json({
    success: false,
    status: paymentIntent.status,
    payment_intent_id: paymentIntent.id,
  });
}
