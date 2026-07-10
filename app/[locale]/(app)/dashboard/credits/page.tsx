"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCreditBalance } from "@/lib/ai-client";
import { Zap, TrendingUp, Package, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Packs statiques (fallback si la table n'est pas encore migrée) ───────────
const STATIC_PACKS: CreditPack[] = [
  { id: "static-1000",  name: "Pack 1 000",   credits: 1000,  price_cents: 1200,  currency: "eur", badge: null },
  { id: "static-5000",  name: "Pack 5 000",   credits: 5000,  price_cents: 4500,  currency: "eur", badge: "Populaire" },
  { id: "static-15000", name: "Pack 15 000",  credits: 15000, price_cents: 11000, currency: "eur", badge: "Meilleure valeur" },
  { id: "static-50000", name: "Pack 50 000",  credits: 50000, price_cents: 32000, currency: "eur", badge: null },
];

/** Estimation affichée : ~N questions consultant (les coûts réels varient selon longueur entrée/sortie). */
const CREDITS_PER_CONSULTANT_QUESTION_HINT = 6;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  badge: string | null;
}

interface CreditInfo {
  balance: number;
  plan: string;
  subscriptionStatus: string | null;
  monthlyCredits: number;
  lowCreditThreshold: number;
  criticalCreditThreshold: number;
  warningLevel: "ok" | "low" | "critical";
  isLow: boolean;
  autoRecharge?: {
    enabled: boolean;
    threshold: number;
    packId: string | null;
  };
}

// ─── Pack Card ─────────────────────────────────────────────────────────────────
function PackCard({
  pack,
  onBuy,
  loading,
}: {
  pack: CreditPack;
  onBuy: (packId: string) => void;
  loading: boolean;
}) {
  const pricePerCredit = (pack.price_cents / pack.credits).toFixed(3);

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow",
        pack.badge === "Meilleure valeur" && "border-blue-500 ring-1 ring-blue-500"
      )}
    >
      {pack.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
          {pack.badge}
        </span>
      )}

      <div>
        <p className="text-sm text-gray-500 font-medium">{pack.name}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">
          {pack.credits.toLocaleString("fr-FR")}
          <span className="text-base font-normal text-gray-500 ml-1">crédits</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{pricePerCredit}€ / crédit</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Zap className="h-3 w-3 text-amber-500" />
        <span>~{Math.floor(pack.credits / CREDITS_PER_CONSULTANT_QUESTION_HINT)} questions au consultant IA</span>
      </div>

      <button
        onClick={() => onBuy(pack.id)}
        disabled={loading}
        className="mt-auto w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm py-2.5 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Acheter —{" "}
            {(pack.price_cents / 100).toLocaleString("fr-FR", {
              style: "currency",
              currency: pack.currency.toUpperCase(),
            })}
          </>
        )}
      </button>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────
export default function CreditsPage() {
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<
    { id: string; amount: number; type: string; description: string; created_at: string }[]
  >([]);
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState(false);
  const [autoRechargePackId, setAutoRechargePackId] = useState<string | null>(null);
  const [savingAuto, setSavingAuto] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const [packsRes, balanceRes] = await Promise.all([
      supabase
        .from("credit_pack_catalog")
        .select("id, name, credits, price_cents, currency, badge")
        .eq("is_active", true)
        .order("sort_order"),
      getCreditBalance(),
    ]);

    // Si la table n'existe pas encore (migration non appliquée) ou est vide,
    // on utilise les packs statiques
    if (packsRes.data && packsRes.data.length > 0) {
      setPacks(packsRes.data);
    } else {
      setPacks(STATIC_PACKS);
    }
    if (balanceRes) {
      setCreditInfo(balanceRes);
      setAutoRechargeEnabled(balanceRes.autoRecharge?.enabled ?? false);
      setAutoRechargePackId(balanceRes.autoRecharge?.packId ?? null);
    }

    // Historique des 10 dernières transactions
    const { data: txs } = await supabase
      .from("credit_transactions")
      .select("id, amount, type, description, created_at")
      .neq("type", "low_credits_alert")
      .order("created_at", { ascending: false })
      .limit(10);
    if (txs) setTransactions(txs);
  }, [supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const packName = params.get("pack") ?? "pack";

    async function handleReturn() {
      if (params.get("success") !== "1") {
        await loadData();
        return;
      }

      if (sessionId) {
        try {
          const res = await fetch("/api/stripe/confirm-credit-pack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json();
          if (res.ok && data.newBalance != null) {
            setSuccessMsg(
              `Paiement confirmé ! +${Number(data.credits).toLocaleString("fr-FR")} crédits — nouveau solde : ${Number(data.newBalance).toLocaleString("fr-FR")}.`
            );
          } else {
            setSuccessMsg(
              `Paiement reçu. Si le solde ne se met pas à jour, rafraîchissez la page dans quelques secondes.`
            );
          }
        } catch {
          setSuccessMsg(`Paiement reçu. Actualisation du solde en cours…`);
        }
      } else {
        setSuccessMsg(`Paiement confirmé ! Votre ${packName} sera crédité sous peu.`);
      }

      window.history.replaceState({}, "", "/dashboard/credits");
      await loadData();
      setTimeout(() => setSuccessMsg(null), 10000);
    }

    void handleReturn();
  }, [loadData]);

  const saveAutoRecharge = async (enabled: boolean, packId: string | null) => {
    setSavingAuto(true);
    try {
      const res = await fetch("/api/ai/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoRechargeEnabled: enabled,
          autoRechargeThreshold: 500,
          autoRechargePackId: packId,
        }),
      });
      if (!res.ok) throw new Error("Échec sauvegarde");
      setAutoRechargeEnabled(enabled);
      setAutoRechargePackId(packId);
    } catch {
      alert("Impossible d'enregistrer la recharge auto.");
    } finally {
      setSavingAuto(false);
    }
  };

  const handleBuy = async (packId: string) => {
    setLoadingPackId(packId);
    try {
      // Pour les packs statiques (migration non encore appliquée),
      // on passe les infos complètes du pack directement
      const pack = packs.find((p) => p.id === packId);
      const isStatic = packId.startsWith("static-");

      const res = await fetch("/api/stripe/checkout-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isStatic && pack
            ? { inlinepack: { credits: pack.credits, price_cents: pack.price_cents, name: pack.name, currency: pack.currency } }
            : { packId }
        ),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Erreur lors du checkout");
    } catch {
      alert("Erreur réseau, veuillez réessayer.");
    } finally {
      setLoadingPackId(null);
    }
  };

  const txTypeLabel: Record<string, string> = {
    subscription_grant: "Renouvellement",
    usage: "Consommation IA",
    top_up: "Achat pack",
    adjustment: "Ajustement admin",
    refund: "Remboursement",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-4 text-green-800 text-sm">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Solde actuel */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Crédits IA</h1>
        <p className="text-sm text-gray-500 mb-6">Gérez votre solde et achetez des packs supplémentaires.</p>

        <div className="rounded-xl bg-gradient-to-br from-blue-900 to-blue-700 text-white p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm opacity-75 mb-1">Solde actuel</p>
            <p className="text-4xl font-bold">
              {creditInfo ? creditInfo.balance.toLocaleString("fr-FR") : "—"}
              <span className="text-xl font-normal opacity-75 ml-2">crédits</span>
            </p>
            <p className="text-sm opacity-75 mt-1 capitalize">
              Plan {creditInfo?.plan ?? "—"}
              {creditInfo?.subscriptionStatus && ` · ${creditInfo.subscriptionStatus}`}
            </p>
          </div>

          {creditInfo?.warningLevel === "critical" && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-300/40 rounded-lg px-4 py-3 text-red-100 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Solde critique (≤ 5 % du quota) — achetez un pack pour continuer
            </div>
          )}
          {creditInfo?.warningLevel === "low" && (
            <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-300/30 rounded-lg px-4 py-3 text-amber-100 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Solde bas (≤ 20 % du quota mensuel)
            </div>
          )}

          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 opacity-50" />
          </div>
        </div>
      </section>

      {/* Recharge automatique */}
      <section className="rounded-xl border bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Recharge automatique</h2>
        <p className="text-sm text-gray-500">
          Si votre solde passe sous 500 crédits, nous vous proposerons d&apos;acheter le pack sélectionné en un clic (paiement Stripe).
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRechargeEnabled}
            disabled={savingAuto}
            onChange={(e) => {
              const pack =
                autoRechargePackId ??
                packs.find((p) => p.credits === 5000)?.id ??
                packs[0]?.id ??
                null;
              void saveAutoRecharge(e.target.checked, pack);
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Activer la recharge auto (pack 5 000 cr @ 45€)</span>
        </label>
        {autoRechargeEnabled && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Recharge auto activée — vous recevrez une alerte email si le solde descend sous le seuil.
          </p>
        )}
      </section>

      {/* Packs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Packs de crédits</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Achat unique, crédits ajoutés immédiatement. Ne remplace pas votre quota mensuel — s&apos;ajoute à votre solde.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
          {packs.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              onBuy={handleBuy}
              loading={loadingPackId === pack.id}
            />
          ))}
        </div>
      </section>

      {/* Historique */}
      {transactions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Historique récent</h2>
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Description</th>
                  <th className="text-right px-4 py-3">Crédits</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <span className="text-xs bg-gray-100 rounded px-2 py-0.5 mr-2">
                        {txTypeLabel[tx.type] ?? tx.type}
                      </span>
                      {tx.description}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-semibold tabular-nums",
                        tx.amount > 0 ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {tx.amount > 0 ? "+" : ""}
                      {tx.amount.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
