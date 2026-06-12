/**
 * Helpers serveur pour la gestion des crédits.
 * À utiliser uniquement dans les API routes (jamais côté client).
 * Toutes les opérations d'écriture passent par service_role.
 */

import { createClient } from "@supabase/supabase-js";
import type { AIModel, PlanName } from "./pricing";
import { calculateCredits, getPlanConfig } from "./pricing";
import { sendLowCreditsAlert } from "./email";

// Client admin — jamais instancié côté client car il utilise SERVICE_ROLE_KEY
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CreditBalance {
  balance: number;
  plan: PlanName;
  subscriptionStatus: string | null;
  lastResetAt: string | null;
}

export interface ConsumeResult {
  newBalance: number;
  consumed: number;
}

export type ConsumeError =
  | { code: "INSUFFICIENT_CREDITS"; balance: number; required: number }
  | { code: "CREDITS_NOT_FOUND" }
  | { code: "RATE_LIMITED"; retryAfterSeconds: number }
  | { code: "DB_ERROR"; message: string };

// ─── Rate limiting ────────────────────────────────────────────────────────────
const WINDOW_SECONDS = 60;

/**
 * Vérifie et incrémente le compteur de rate limit.
 * Retourne true si la requête est autorisée, false si rate limited.
 */
export async function checkRateLimit(userId: string, rateLimit: number): Promise<boolean> {
  const admin = getAdmin();
  const windowStart = new Date(
    Math.floor(Date.now() / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000
  ).toISOString();

  const { data, error } = await admin
    .from("ai_rate_limits")
    .upsert(
      { user_id: userId, window_start: windowStart, count: 1 },
      { onConflict: "user_id,window_start" }
    )
    .select("count")
    .single();

  if (error) {
    // Si l'upsert échoue (ligne existante), on incrémente manuellement
    const { data: updated } = await admin
      .from("ai_rate_limits")
      .update({ count: admin.rpc("increment_count" as never, {}) })
      .eq("user_id", userId)
      .eq("window_start", windowStart)
      .select("count")
      .single();

    // Fallback : on autorise en cas d'erreur DB pour ne pas bloquer les users
    return true;
  }

  // Si c'est une insertion, count = 1 (autorisé)
  // Si c'est un conflit, on doit lire la vraie valeur
  const { data: current } = await admin
    .from("ai_rate_limits")
    .select("count")
    .eq("user_id", userId)
    .eq("window_start", windowStart)
    .single();

  if (!current) return true;

  if (current.count > 1) {
    // Incrémenter
    await admin
      .from("ai_rate_limits")
      .update({ count: current.count + 1 })
      .eq("user_id", userId)
      .eq("window_start", windowStart);
  }

  return current.count <= rateLimit;
}

// ─── Lecture du solde ─────────────────────────────────────────────────────────
export async function getCreditBalance(userId: string): Promise<CreditBalance | null> {
  const admin = getAdmin();
  const { data } = await admin
    .from("user_credits")
    .select("balance, plan, subscription_status, last_reset_at")
    .eq("user_id", userId)
    .single();

  if (!data) return null;
  return {
    balance: data.balance,
    plan: (data.plan ?? "free") as PlanName,
    subscriptionStatus: data.subscription_status,
    lastResetAt: data.last_reset_at,
  };
}

// ─── Consommation atomique des crédits ────────────────────────────────────────
/**
 * Appelle la RPC Postgres `consume_credits` dans une transaction.
 * Retourne le résultat ou une erreur typée — ne lève jamais d'exception.
 */
export async function consumeCredits(params: {
  userId: string;
  model: AIModel;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  /** Multiplicateur (ex. ×2 pour Opus premium Pro). */
  creditMultiplier?: number;
}): Promise<ConsumeResult | ConsumeError> {
  const admin = getAdmin();
  const base = calculateCredits(params.model, params.inputTokens, params.outputTokens);
  const mult = params.creditMultiplier ?? 1;
  const amount = Math.max(1, Math.ceil(base * mult));

  const { data, error } = await admin.rpc("consume_credits", {
    p_user_id: params.userId,
    p_amount: amount,
    p_model: params.model,
    p_endpoint: params.endpoint,
    p_input_tokens: params.inputTokens,
    p_output_tokens: params.outputTokens,
  });

  if (error) {
    if (error.message?.includes("INSUFFICIENT_CREDITS")) {
      // Extraire le solde actuel depuis le hint Postgres
      const balanceMatch = error.hint?.match(/Balance: (\d+)/);
      return {
        code: "INSUFFICIENT_CREDITS",
        balance: parseInt(balanceMatch?.[1] ?? "0"),
        required: amount,
      };
    }
    if (error.message?.includes("CREDITS_NOT_FOUND")) {
      return { code: "CREDITS_NOT_FOUND" };
    }
    return { code: "DB_ERROR", message: error.message };
  }

  const result = {
    newBalance: (data as { new_balance: number; consumed: number }).new_balance,
    consumed: (data as { new_balance: number; consumed: number }).consumed,
  };

  // Alerte email si le solde passe sous un seuil relatif au plan (fire-and-forget)
  triggerLowCreditsAlertIfNeeded(params.userId, result.newBalance, result.consumed).catch(
    () => null,
  );

  return result;
}

// ─── Alertes email crédits bas ────────────────────────────────────────────────
/** Seuils relatifs à l'allocation mensuelle du plan (20 % et 5 %). */
const LOW_CREDIT_PCT_THRESHOLDS = [0.2, 0.05] as const;

/**
 * Envoie une alerte email si le solde vient de franchir un seuil bas (20 % ou 5 % du quota mensuel).
 * Vérifie un cooldown de 24h pour éviter le spam.
 */
async function triggerLowCreditsAlertIfNeeded(
  userId: string,
  newBalance: number,
  _consumed?: number,
) {
  const admin = getAdmin();
  const { data: credits } = await admin
    .from("user_credits")
    .select("plan")
    .eq("user_id", userId)
    .single();
  const plan = (credits?.plan ?? "free") as PlanName;
  const monthly = getPlanConfig(plan).monthlyCredits;
  const pctThresholds = LOW_CREDIT_PCT_THRESHOLDS.map((p) =>
    Math.max(10, Math.floor(monthly * p)),
  );
  const lowestThreshold = pctThresholds.find((t) => newBalance <= t);
  if (!lowestThreshold) return;

  // Vérifie si une alerte a déjà été envoyée dans les dernières 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("credit_transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "low_credits_alert")
    .gte("created_at", since);

  if ((count ?? 0) > 0) return; // déjà alerté dans les 24h

  // Récupère email + nom depuis auth.users / profiles
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email_notifications")
    .eq("id", userId)
    .single();

  if (profile?.email_notifications === false) return;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return;

  // Envoie l'email
  await sendLowCreditsAlert({
    email,
    userName: profile?.full_name ?? undefined,
    balance: newBalance,
    plan,
    threshold: lowestThreshold,
  });

  // Log pour le cooldown
  await admin.from("credit_transactions").insert({
    user_id: userId,
    amount: 0,
    type: "low_credits_alert",
    description: `Alerte crédits bas — solde ${newBalance}`,
    metadata: { threshold: lowestThreshold },
  });
}

// ─── Attribution de crédits (webhook Stripe) ──────────────────────────────────
export async function grantCredits(params: {
  userId: string;
  amount: number;
  plan: PlanName;
  type: "subscription_grant" | "top_up" | "adjustment" | "refund";
  description: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
}) {
  const admin = getAdmin();

  // RPC atomique : upsert user_credits + log transaction
  const { data, error } = await admin.rpc("grant_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_plan: params.plan,
    p_type: params.type,
    p_description: params.description,
  });

  if (error) throw new Error(`grant_credits RPC failed: ${error.message}`);

  // Met à jour les infos Stripe si fournies
  const updates: Record<string, string> = {};
  if (params.stripeCustomerId) updates.stripe_customer_id = params.stripeCustomerId;
  if (params.stripeSubscriptionId) updates.stripe_subscription_id = params.stripeSubscriptionId;
  if (params.subscriptionStatus) updates.subscription_status = params.subscriptionStatus;

  if (Object.keys(updates).length > 0) {
    await admin.from("user_credits").update(updates).eq("user_id", params.userId);
  }

  return data as { new_balance: number };
}

// ─── Initialisation utilisateur (inscription free ou premier abonnement) ───────
export async function initUserCredits(
  userId: string,
  plan: PlanName,
  opts?: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: string;
    description?: string;
  },
) {
  const { monthlyCredits } = getPlanConfig(plan);
  return grantCredits({
    userId,
    amount: monthlyCredits,
    plan,
    type: "subscription_grant",
    description: opts?.description ?? `Activation plan ${plan}`,
    stripeCustomerId: opts?.stripeCustomerId,
    stripeSubscriptionId: opts?.stripeSubscriptionId,
    subscriptionStatus: opts?.subscriptionStatus ?? (plan === "free" ? "inactive" : "active"),
  });
}

/** Crée la ligne `user_credits` si absente (comptes existants avant migration). */
export async function ensureUserCredits(
  userId: string,
  plan: PlanName = "free",
): Promise<CreditBalance> {
  const existing = await getCreditBalance(userId);
  if (existing) return existing;

  await initUserCredits(userId, plan, {
    description: plan === "free" ? "Crédits gratuits initiaux" : `Activation plan ${plan}`,
    subscriptionStatus: plan === "free" ? "inactive" : "active",
  });

  const created = await getCreditBalance(userId);
  if (!created) {
    throw new Error("CREDITS_INIT_FAILED");
  }
  return created;
}

// ─── Vérification préalable avant appel IA ────────────────────────────────────
/**
 * Vérifie solde + rate limit avant de passer un appel Claude.
 * Retourne null si OK, ou une ConsumeError si bloqué.
 */
export async function preflightCheck(
  userId: string,
  plan: PlanName
): Promise<ConsumeError | null> {
  const cfg = getPlanConfig(plan);

  // Rate limit
  const allowed = await checkRateLimit(userId, cfg.rateLimit);
  if (!allowed) {
    return { code: "RATE_LIMITED", retryAfterSeconds: WINDOW_SECONDS };
  }

  // Solde minimum — initialise les crédits free si la ligne n'existe pas encore
  let credits = await getCreditBalance(userId);
  if (!credits) {
    try {
      credits = await ensureUserCredits(userId, plan);
    } catch {
      return { code: "CREDITS_NOT_FOUND" };
    }
  }
  if (credits.balance < cfg.minBalanceToCall) {
    return {
      code: "INSUFFICIENT_CREDITS",
      balance: credits.balance,
      required: cfg.minBalanceToCall,
    };
  }

  return null;
}
