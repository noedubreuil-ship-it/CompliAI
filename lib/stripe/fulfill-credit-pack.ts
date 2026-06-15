import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { sendCreditPackConfirmation } from "@/lib/email";
import { stripe } from "@/lib/stripe/client";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type FulfillCreditPackResult =
  | { status: "fulfilled"; credits: number; newBalance: number }
  | { status: "already_fulfilled"; credits: number; newBalance: number }
  | { status: "not_applicable" }
  | { status: "not_paid" }
  | { status: "forbidden_user" };

async function hasSessionBeenFulfilled(sessionId: string): Promise<boolean> {
  const { data: purchase } = await admin
    .from("credit_pack_purchases")
    .select("status")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (purchase?.status === "completed") return true;

  const { data: tx } = await admin
    .from("credit_transactions")
    .select("id")
    .eq("type", "top_up")
    .contains("metadata", { stripe_session_id: sessionId })
    .limit(1)
    .maybeSingle();

  return Boolean(tx);
}

/**
 * Crédite un pack acheté (idempotent par stripe_session_id).
 * Utilisé par le webhook Stripe et la confirmation immédiate au retour checkout.
 */
export async function fulfillCreditPackFromSession(
  session: Stripe.Checkout.Session,
  expectedUserId?: string
): Promise<FulfillCreditPackResult> {
  if (session.mode !== "payment" || session.metadata?.type !== "credit_pack") {
    return { status: "not_applicable" };
  }

  if (session.payment_status !== "paid") {
    return { status: "not_paid" };
  }

  const userId = session.metadata.supabase_user_id;
  const packId = session.metadata.pack_id;
  const credits = parseInt(session.metadata.credits ?? "0", 10);

  if (!userId || credits <= 0) {
    return { status: "not_applicable" };
  }

  if (expectedUserId && expectedUserId !== userId) {
    return { status: "forbidden_user" };
  }

  const { data: current } = await admin
    .from("user_credits")
    .select("balance, plan")
    .eq("user_id", userId)
    .single();

  if (await hasSessionBeenFulfilled(session.id)) {
    return {
      status: "already_fulfilled",
      credits,
      newBalance: current?.balance ?? credits,
    };
  }

  const newBalance = (current?.balance ?? 0) + credits;
  await admin.from("user_credits").upsert(
    { user_id: userId, balance: newBalance, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  await admin.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type: "top_up",
    description: `Achat pack ${credits.toLocaleString("fr-FR")} crédits`,
    metadata: { stripe_session_id: session.id, pack_id: packId },
  });

  await admin
    .from("credit_pack_purchases")
    .update({
      status: "completed",
      stripe_payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("stripe_session_id", session.id);

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (email) {
    const { data: pack } = packId
      ? await admin
          .from("credit_pack_catalog")
          .select("name, price_cents")
          .eq("id", packId)
          .maybeSingle()
      : { data: null };

    await sendCreditPackConfirmation({
      email,
      packName: pack?.name ?? `Pack ${credits}`,
      credits,
      newBalance,
      amountPaidCents: pack?.price_cents ?? (session.amount_total ?? 0),
    }).catch(() => null);
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "credit_pack_purchased",
      userId,
      credits,
      sessionId: session.id,
    })
  );

  return { status: "fulfilled", credits, newBalance };
}

/** Confirmation immédiate au retour Stripe Checkout (session_id dans l’URL). */
export async function confirmCreditPackBySessionId(
  sessionId: string,
  userId: string
): Promise<FulfillCreditPackResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return fulfillCreditPackFromSession(session, userId);
}
