"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search, RefreshCw, Plus, Minus, Shield, ChevronLeft, ChevronRight,
  TrendingUp, Users, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  userId: string;
  email: string;
  fullName: string;
  balance: number;
  plan: string;
  subscriptionStatus: string | null;
  lastResetAt: string | null;
  createdAt: string;
}

interface Metrics30d {
  periodDays: number;
  byPlan: {
    plan: string;
    userCount: number;
    avgCredits30d: number;
    p95Credits30d: number;
    totalCredits30d: number;
  }[];
  packConversionRate: number;
  payingUsers: number;
  packBuyers30d: number;
  estimatedGrossMarginPct: number;
  estimatedApiCostEur30d: number;
  estimatedSubscriptionRevenueEur30d: number;
}

const PLAN_COLOR: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

// ─── Modale d'ajustement ───────────────────────────────────────────────────────
function AdjustModal({
  user,
  onClose,
  onSave,
}: {
  user: UserRow;
  onClose: () => void;
  onSave: (delta: number, reason: string) => Promise<void>;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseInt(delta);
    if (isNaN(d) || d === 0) { setError("Entrez un montant non nul."); return; }
    if (reason.trim().length < 3) { setError("La raison est trop courte."); return; }
    setSaving(true);
    try {
      await onSave(d, reason.trim());
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Ajuster les crédits</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          Solde actuel : <strong>{user.balance.toLocaleString("fr-FR")} crédits</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Montant (+ pour ajouter, - pour retirer)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDelta((v) => String((parseInt(v) || 0) - 100))}
                className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="ex: 500 ou -200"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setDelta((v) => String((parseInt(v) || 0) + 100))}
                className="px-3 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Raison (visible dans l&apos;historique)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ex: Compensation bug, offre commerciale..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg py-2 text-sm font-semibold flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Confirmer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page admin ────────────────────────────────────────────────────────────────
export default function AdminCreditsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<UserRow | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [metrics, setMetrics] = useState<Metrics30d | null>(null);

  const PAGE_SIZE = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`/api/admin/credits?${params}`);
      if (res.status === 403) { setForbidden(true); return; }
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetch("/api/admin/credits/metrics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMetrics(data))
      .catch(() => null);
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleAdjust = async (delta: number, reason: string) => {
    if (!adjustTarget) return;
    const res = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: adjustTarget.userId, delta, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Erreur");
    }
    await loadUsers();
  };

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Shield className="h-12 w-12" />
        <p className="text-lg font-medium">Accès réservé aux administrateurs</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const lowUsers = users.filter((u) => u.balance <= 200).length;
  const avgBalance = users.length
    ? Math.round(users.reduce((s, u) => s + u.balance, 0) / users.length)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin — Crédits IA</h1>
          <p className="text-sm text-gray-500">{total} utilisateurs</p>
        </div>
      </div>

      {/* Métriques 30 jours */}
      {metrics && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Consommation IA — {metrics.periodDays} derniers jours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">Marge brute estimée</p>
              <p className="text-2xl font-bold text-green-700">{metrics.estimatedGrossMarginPct}%</p>
              <p className="text-xs text-gray-400 mt-1">
                Coût API ~{metrics.estimatedApiCostEur30d.toLocaleString("fr-FR")}€ / MRR ~
                {metrics.estimatedSubscriptionRevenueEur30d.toLocaleString("fr-FR")}€
              </p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-500">Conversion packs</p>
              <p className="text-2xl font-bold">{metrics.packConversionRate}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {metrics.packBuyers30d} achats / {metrics.payingUsers} payants
              </p>
            </div>
            {metrics.byPlan
              .filter((p) => p.plan === "starter" || p.plan === "pro")
              .map((p) => (
                <div key={p.plan} className="bg-white rounded-xl border p-4">
                  <p className="text-xs text-gray-500 capitalize">Plan {p.plan} — moy. / P95</p>
                  <p className="text-2xl font-bold">
                    {p.avgCredits30d.toLocaleString("fr-FR")}
                    <span className="text-base font-normal text-gray-400">
                      {" "}
                      / {p.p95Credits30d.toLocaleString("fr-FR")} cr
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{p.userCount} utilisateurs actifs</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-blue-100 rounded-lg p-2"><Users className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">Total utilisateurs</p><p className="text-2xl font-bold">{total}</p></div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-amber-100 rounded-lg p-2"><Zap className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-xs text-gray-500">Solde moyen</p><p className="text-2xl font-bold">{avgBalance.toLocaleString("fr-FR")}</p></div>
        </div>
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="bg-red-100 rounded-lg p-2"><TrendingUp className="h-5 w-5 text-red-500" /></div>
          <div><p className="text-xs text-gray-500">Solde ≤ 200</p><p className="text-2xl font-bold text-red-600">{lowUsers}</p></div>
        </div>
      </div>

      {/* Barre de recherche + refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par email ou nom..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadUsers}
          className="p-2 border rounded-lg text-gray-500 hover:bg-gray-50"
          title="Rafraîchir"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Utilisateur</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-right px-4 py-3">Solde</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Dernier reset</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && !users.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun résultat</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{u.fullName || "—"}</p>
                    <p className="text-gray-400 text-xs">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", PLAN_COLOR[u.plan] ?? PLAN_COLOR.free)}>
                      {u.plan}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", u.balance <= 200 ? "text-red-600" : u.balance <= 500 ? "text-amber-600" : "text-gray-900")}>
                    {u.balance.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs capitalize">{u.subscriptionStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.lastResetAt
                      ? new Date(u.lastResetAt).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setAdjustTarget(u)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1 transition-colors"
                    >
                      Ajuster
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-500">
            <span>
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} sur {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 border rounded disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale d'ajustement */}
      {adjustTarget && (
        <AdjustModal
          user={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSave={handleAdjust}
        />
      )}
    </div>
  );
}
