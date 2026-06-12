import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import {
  isAllowedStripePriceId,
  resolvePlanFromStripePriceId,
} from "@/lib/stripe/plan-mapping";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { priceId, plan: planHint } = await request.json();

  if (!priceId) return NextResponse.json({ error: "Price ID manquant" }, { status: 400 });

  if (!isAllowedStripePriceId(priceId)) {
    return NextResponse.json({ error: "Price ID non reconnu" }, { status: 400 });
  }

  const plan = resolvePlanFromStripePriceId(priceId);
  if (planHint && planHint !== plan) {
    return NextResponse.json({ error: "Plan incompatible avec le Price ID" }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
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

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${plan}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan },
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    metadata: { supabase_user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
