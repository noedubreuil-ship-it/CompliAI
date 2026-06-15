import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { createClient as createAdmin } from "@supabase/supabase-js";
import {
  getCreditPackDefinition,
  stripePriceIdForPackCredits,
} from "@/lib/stripe/credit-pack-config";

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();

  // ── Résolution du pack ────────────────────────────────────────────────────
  let pack: { id: string | null; name: string; credits: number; price_cents: number; currency: string; stripe_price_id?: string | null };

  if (body.inlinepack) {
    // Pack statique (migration non encore appliquée) : les infos viennent du client
    const ip = body.inlinepack as { credits: number; price_cents: number; name: string; currency: string };
    if (!ip.credits || !ip.price_cents) {
      return NextResponse.json({ error: "Pack invalide" }, { status: 400 });
    }
    const def = getCreditPackDefinition(ip.credits);
    pack = {
      id: null,
      name: def?.name ?? ip.name,
      credits: ip.credits,
      price_cents: def?.priceCents ?? ip.price_cents,
      currency: ip.currency ?? "eur",
      stripe_price_id: stripePriceIdForPackCredits(ip.credits),
    };
  } else if (body.packId) {
    // Pack en base
    const { data: dbPack } = await admin
      .from("credit_pack_catalog")
      .select("id, name, credits, price_cents, currency, stripe_price_id")
      .eq("id", body.packId)
      .eq("is_active", true)
      .single();
    if (!dbPack) return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
    pack = {
      ...dbPack,
      stripe_price_id:
        dbPack.stripe_price_id ?? stripePriceIdForPackCredits(dbPack.credits) ?? null,
    };
  } else {
    return NextResponse.json({ error: "packId ou inlinepack requis" }, { status: 400 });
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

  // Mode 1 : Stripe Price ID existant → utilise price directement
  // Mode 2 : pas de price ID → crée dynamiquement le line_items
  const lineItems = pack.stripe_price_id
    ? [{ price: pack.stripe_price_id, quantity: 1 }]
    : [
        {
          price_data: {
            currency: pack.currency,
            unit_amount: pack.price_cents,
            product_data: {
              name: `CompliAI — ${pack.name}`,
              description: `${pack.credits.toLocaleString("fr-FR")} crédits IA`,
              metadata: { pack_id: pack.id, credits: String(pack.credits) },
            },
          },
          quantity: 1,
        },
      ];

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits?success=1&session_id={CHECKOUT_SESSION_ID}&pack=${encodeURIComponent(pack.name)}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits`,
    metadata: {
      supabase_user_id: user.id,
      pack_id: pack.id,
      credits: String(pack.credits),
      type: "credit_pack",
    },
    invoice_creation: { enabled: true },
  });

  // Pré-enregistre l'achat en "pending" (seulement si table existe et pack a un id)
  if (pack.id) {
    const { error: insertErr } = await admin.from("credit_pack_purchases").insert({
      user_id: user.id,
      pack_id: pack.id,
      credits_granted: pack.credits,
      amount_paid_cents: pack.price_cents,
      currency: pack.currency,
      stripe_session_id: session.id,
    });
    if (insertErr && process.env.NODE_ENV === "development") {
      console.warn("[checkout-credits] credit_pack_purchases:", insertErr.message);
    }
  }

  return NextResponse.json({ url: session.url });
}
