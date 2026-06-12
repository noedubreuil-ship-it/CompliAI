/**
 * Helpers pour vérifier les droits admin.
 * Un utilisateur est admin si :
 *  - son `profiles.role = 'admin'`, OU
 *  - son user_id est dans la liste ADMIN_USER_IDS (env var, séparés par virgule)
 */

import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Retourne l'utilisateur connecté ou null. */
export async function getAuthUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

/** Vérifie si l'utilisateur courant est admin. */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;

  // Vérifie la liste statique en premier (plus rapide)
  const allowedIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedIds.includes(user.id)) return true;

  // Vérifie le rôle en base
  const admin = getAdmin();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === "admin";
}

/** Retourne la liste de tous les utilisateurs avec leur solde de crédits (admin only). */
export async function listUsersWithCredits(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const { page = 1, pageSize = 50, search } = opts;
  const admin = getAdmin();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("user_credits")
    .select(
      `user_id, balance, plan, subscription_status, last_reset_at, created_at,
       profiles!inner(full_name, email_notifications, role)`,
      { count: "exact" }
    )
    .order("balance", { ascending: true })
    .range(from, to);

  // Le search se fait sur le profil, on le fait côté JS pour simplifier
  const { data, count, error } = await query;
  if (error) throw error;

  // Enrichit avec l'email depuis auth.users
  const enriched = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id);
      return {
        userId: row.user_id,
        email: authUser?.user?.email ?? "",
        fullName: (row.profiles as { full_name?: string } | null)?.full_name ?? "",
        balance: row.balance,
        plan: row.plan ?? "free",
        subscriptionStatus: row.subscription_status,
        lastResetAt: row.last_reset_at,
        createdAt: row.created_at,
      };
    })
  );

  const filtered = search
    ? enriched.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.fullName.toLowerCase().includes(search.toLowerCase())
      )
    : enriched;

  return { users: filtered, total: count ?? 0 };
}

/** Ajuste manuellement le solde d'un utilisateur. */
export async function adminAdjustCredits({
  targetUserId,
  adminUserId,
  delta,
  reason,
}: {
  targetUserId: string;
  adminUserId: string;
  delta: number;      // positif = ajout, négatif = retrait
  reason: string;
}) {
  const admin = getAdmin();

  const { data: current } = await admin
    .from("user_credits")
    .select("balance")
    .eq("user_id", targetUserId)
    .single();

  if (!current) throw new Error("Utilisateur sans solde de crédits");

  const newBalance = Math.max(0, current.balance + delta);

  await admin
    .from("user_credits")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId);

  await admin.from("credit_transactions").insert({
    user_id: targetUserId,
    amount: delta,
    type: "adjustment",
    description: reason,
    metadata: { admin_user_id: adminUserId, previous_balance: current.balance },
  });

  return { newBalance, delta };
}
