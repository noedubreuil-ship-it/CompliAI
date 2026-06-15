"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, AlertTriangle } from "lucide-react";
import { getCreditBalance, type CreditInfo } from "@/lib/ai-client";
import { cn } from "@/lib/utils";

function balancePct(credits: CreditInfo): number {
  const max = credits.monthlyCredits || 1;
  return Math.max(2, Math.min(100, (credits.balance / max) * 100));
}

export function CreditBadge({ className }: { className?: string }) {
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const refresh = () => getCreditBalance().then(setCredits);
    refresh().finally(() => setLoading(false));

    window.addEventListener("compliai:credits-updated", refresh);
    const interval = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("compliai:credits-updated", refresh);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div
        className={cn("flex items-center gap-1 px-2 py-1 rounded-full animate-pulse bg-gray-100", className)}
      >
        <div className="w-12 h-3 rounded bg-gray-200" />
      </div>
    );
  }

  if (!credits) return null;

  const critical = credits.warningLevel === "critical";
  const low = credits.warningLevel === "low";

  return (
    <Link
      href="/dashboard/credits"
      title={
        critical
          ? "Crédits critiques — achetez un pack"
          : low
            ? "Crédits bas (≤ 20 % du quota)"
            : "Gérer mes crédits IA"
      }
    >
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all hover:opacity-80",
          critical
            ? "border-red-300 bg-red-50 text-red-700"
            : low
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-gray-200 bg-white text-gray-700",
          className,
        )}
      >
        {critical || low ? (
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
        ) : (
          <Zap className="h-3 w-3 flex-shrink-0 text-amber-500" />
        )}
        <span>{credits.balance.toLocaleString("fr-FR")}</span>
        <span className="opacity-60">cr.</span>
      </div>
    </Link>
  );
}

/** Version compacte pour mobile / sidebar */
export function CreditBadgeCompact() {
  const [credits, setCredits] = useState<CreditInfo | null>(null);

  useEffect(() => {
    const refresh = () => getCreditBalance().then(setCredits);
    refresh();
    window.addEventListener("compliai:credits-updated", refresh);
    const interval = setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener("compliai:credits-updated", refresh);
      clearInterval(interval);
    };
  }, []);

  if (!credits) return null;

  const critical = credits.warningLevel === "critical";
  const low = credits.warningLevel === "low";
  const pct = balancePct(credits);

  return (
    <Link href="/dashboard/credits" className="block">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-lg text-xs border",
          critical
            ? "bg-red-50 border-red-200"
            : low
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200",
        )}
      >
        <div className="flex items-center gap-1.5">
          <Zap
            className={cn(
              "h-3.5 w-3.5",
              critical ? "text-red-600" : low ? "text-amber-600" : "text-gray-500",
            )}
          />
          <span className="text-gray-700 font-medium">Crédits IA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                critical ? "bg-red-500" : low ? "bg-amber-500" : "bg-blue-500",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span
            className={cn(
              "font-semibold tabular-nums",
              critical ? "text-red-700" : low ? "text-amber-700" : "text-gray-900",
            )}
          >
            {credits.balance.toLocaleString("fr-FR")}
          </span>
        </div>
      </div>
    </Link>
  );
}
