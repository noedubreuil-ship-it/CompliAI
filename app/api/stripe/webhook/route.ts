import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";
import { mapPriceIdToTier } from "@/lib/stripe/limits";
import { resolvePlanFromStripePriceId } from "@/lib/stripe/plan-mapping";
import { getPlanConfig } from "@/lib/pricing";
import { grantCredits, initUserCredits } from "@/lib/credits";
import { sendCreditPackConfirmation } from "@/lib/email";
import type Stripe from "stripe";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "webhook_signature_failed", err }));
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency : table dédiée (plus fiable que stripe_event_id dans subscriptions) ──
  const { data: alreadyProcessed } = await admin
    .from("processed_stripe_events")
    .select("event_id")
    .eq("event_id", event.id)
    .single();

  if (alreadyProcessed) {
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Marque l'événement comme traité AVANT de le traiter (pour éviter les doubles traitements)
  await admin.from("processed_stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  try {
    switch (event.type) {
      // ── Achat de pack de crédits (one-time) ─────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "payment" && session.metadata?.type === "credit_pack") {
          const userId = session.metadata.supabase_user_id;
          const packId = session.metadata.pack_id;
          const credits = parseInt(session.metadata.credits ?? "0");

          if (userId && credits > 0) {
            // Incrémente le solde sans écraser le plan existant
            const { data: current } = await admin
              .from("user_credits")
              .select("balance, plan")
              .eq("user_id", userId)
              .single();

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

            // Met à jour le statut d'achat
            await admin.from("credit_pack_purchases")
              .update({ status: "completed", stripe_payment_intent: session.payment_intent as string })
              .eq("stripe_session_id", session.id);

            // Email de confirmation
            const { data: authUser } = await admin.auth.admin.getUserById(userId);
            const email = authUser?.user?.email;
            if (email) {
              const { data: credits_row } = await admin
                .from("user_credits")
                .select("balance")
                .eq("user_id", userId)
                .single();
              const { data: pack } = await admin
                .from("credit_pack_catalog")
                .select("name, price_cents")
                .eq("id", packId)
                .single();

              await sendCreditPackConfirmation({
                email,
                packName: pack?.name ?? `Pack ${credits}`,
                credits,
                newBalance: credits_row?.balance ?? credits,
                amountPaidCents: pack?.price_cents ?? (session.amount_total ?? 0),
              }).catch(() => null);
            }

            console.log(JSON.stringify({ level: "info", event: "credit_pack_purchased", userId, credits, sessionId: session.id }));
          }
          break;
        }

        // ── Nouveau checkout souscrit ─────────────────────────────────────────
        if (session.mode !== "subscription") break;

        const userId = session.metadata?.supabase_user_id;
        if (!userId) {
          console.error(JSON.stringify({ level: "error", event: "missing_user_id", sessionId: session.id }));
          break;
        }

        const subscriptionId = session.subscription as string;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = resolvePlanFromStripePriceId(priceId);
        if (plan === "free") {
          console.error(JSON.stringify({
            level: "error",
            event: "unknown_price_id",
            priceId,
            sessionId: session.id,
          }));
          break;
        }

        const tier = mapPriceIdToTier(priceId);
        await upsertSubscription(userId, sub, priceId, tier, event.id);

        // Crédits d'activation (la 1ʳᵉ facture est traitée ici, pas dans invoice.paid)
        const grant = await initUserCredits(userId, plan, {
          stripeCustomerId: String(sub.customer),
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          description: `Abonnement ${plan} — activation`,
        });

        console.log(JSON.stringify({
          level: "info",
          event: "checkout_completed",
          userId,
          plan,
          credits: getPlanConfig(plan).monthlyCredits,
          newBalance: grant?.new_balance,
        }));
        break;
      }

      // ── Facture payée = renouvellement mensuel → reset des crédits ──────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        // 1ʳᵉ facture : crédits déjà accordés dans checkout.session.completed
        if (invoice.billing_reason === "subscription_create") break;

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = resolvePlanFromStripePriceId(priceId);
        if (plan === "free") break;

        const { monthlyCredits } = getPlanConfig(plan);

        await grantCredits({
          userId,
          amount: monthlyCredits,
          plan,
          type: "subscription_grant",
          description: `Renouvellement ${plan} — ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
          stripeCustomerId: invoice.customer as string,
          stripeSubscriptionId: invoice.subscription as string,
          subscriptionStatus: "active",
        });

        console.log(JSON.stringify({
          level: "info",
          event: "credits_granted",
          userId,
          plan,
          credits: monthlyCredits,
          invoiceId: invoice.id,
        }));
        break;
      }

      // ── Changement de plan ──────────────────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = resolvePlanFromStripePriceId(priceId);
        const tier = mapPriceIdToTier(priceId);
        await upsertSubscription(userId, sub, priceId, tier, event.id);

        const prev = event.data.previous_attributes as Partial<Stripe.Subscription> | undefined;
        const priceChanged = Boolean(prev?.items);

        if (plan !== "free" && sub.status === "active" && priceChanged) {
          const { monthlyCredits } = getPlanConfig(plan);
          await grantCredits({
            userId,
            amount: monthlyCredits,
            plan,
            type: "subscription_grant",
            description: `Changement de plan → ${plan}`,
            stripeCustomerId: String(sub.customer),
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
          });
        } else {
          await admin.from("user_credits")
            .update({
              plan: plan === "free" ? "free" : plan,
              subscription_status: sub.status,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        console.log(JSON.stringify({ level: "info", event: "subscription_updated", userId, plan, status: sub.status }));
        break;
      }

      // ── Résiliation ────────────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await admin.from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString(), stripe_event_id: event.id })
          .eq("stripe_subscription_id", sub.id);

        await admin.from("profiles")
          .update({ subscription_tier: "free" })
          .eq("id", userId);

        // Remet le plan sur free dans user_credits (sans retirer les crédits restants)
        await admin.from("user_credits")
          .update({ plan: "free", subscription_status: "canceled", updated_at: new Date().toISOString() })
          .eq("user_id", userId);

        console.log(JSON.stringify({ level: "info", event: "subscription_canceled", userId }));
        break;
      }

      // ── Paiement échoué ────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await admin.from("subscriptions")
            .update({ status: "past_due", updated_at: new Date().toISOString(), stripe_event_id: event.id })
            .eq("stripe_subscription_id", invoice.subscription as string);

          // Signaler en user_credits mais ne pas retirer de crédits
          await admin.from("user_credits")
            .update({ subscription_status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "webhook_processing_error", eventType: event.type, err: String(err) }));
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  userId: string,
  sub: Stripe.Subscription,
  priceId: string,
  tier: string,
  eventId: string
) {
  const subData = {
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    status: sub.status,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    stripe_event_id: eventId,
    updated_at: new Date().toISOString(),
  };

  await admin.from("subscriptions").upsert(subData, { onConflict: "stripe_subscription_id" });
  await admin.from("profiles").update({ subscription_tier: tier }).eq("id", userId);
}
