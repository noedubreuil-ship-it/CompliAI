"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { X, Zap, Shield, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditsUpsellModalProps {
  open: boolean;
  balance: number;
  onClose: () => void;
}

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "29€",
    period: "/mois",
    credits: "5 000 crédits",
    features: ["Tous les outils IA", "DPIA, RoPA, Checklist", "Jurisprudence CJUE"],
    href: "/dashboard/upgrade?plan=starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "79€",
    period: "/mois",
    credits: "20 000 crédits",
    features: ["Tout Starter", "Modèle Claude Opus", "Projets illimités", "Support prioritaire"],
    href: "/dashboard/upgrade?plan=pro",
    highlight: true,
  },
];

const CREDIT_PACKS = [
  { name: "Pack 2 000", credits: 2000, price: "9€", href: "/dashboard/credits?pack=2000" },
  { name: "Pack 5 000", credits: 5000, price: "19€", href: "/dashboard/credits?pack=5000" },
];

export function CreditsUpsellModal({ open, balance, onClose }: CreditsUpsellModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#003399] to-[#0055CC] px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-[#FFCC00]" />
            </div>
            <div>
              <p className="font-bold text-base">Crédits insuffisants</p>
              <p className="text-white/70 text-xs">Solde actuel : {balance.toLocaleString("fr-FR")} crédits</p>
            </div>
          </div>
          <p className="text-white/80 text-sm mt-3 leading-relaxed">
            Rechargez votre compte pour continuer à utiliser le consultant IA et tous les outils de conformité.
          </p>
        </div>

        <div className="p-6">
          {/* Plans */}
          <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">Abonnements mensuels</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {PLANS.map((plan) => (
              <Link
                key={plan.id}
                href={plan.href}
                onClick={onClose}
                className={cn(
                  "flex flex-col p-4 rounded-xl border-2 transition-all hover:shadow-md",
                  plan.highlight
                    ? "border-[#003399] bg-[#003399]/5"
                    : "border-black/[0.08] hover:border-[#003399]/30"
                )}
              >
                {plan.highlight && (
                  <span className="text-[10px] font-bold text-[#003399] uppercase tracking-wide mb-1.5">
                    Recommandé
                  </span>
                )}
                <p className="font-bold text-[#1D1D1F] text-sm">{plan.name}</p>
                <p className="text-xs text-[#6E6E73] mb-2">{plan.credits}</p>
                <p className="font-bold text-[#1D1D1F] text-lg leading-none mb-3">
                  {plan.price}
                  <span className="text-xs font-normal text-[#6E6E73]">{plan.period}</span>
                </p>
                <div className="space-y-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-[#003399] shrink-0" />
                      <span className="text-[11px] text-[#444]">{f}</span>
                    </div>
                  ))}
                </div>
                <div className={cn(
                  "mt-3 py-1.5 rounded-lg text-center text-xs font-semibold transition-colors",
                  plan.highlight
                    ? "bg-[#003399] text-white"
                    : "bg-[#F5F5F7] text-[#1D1D1F]"
                )}>
                  Choisir {plan.name} <ChevronRight className="inline h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>

          {/* Packs crédits */}
          <p className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wide mb-3">Packs crédits (sans abonnement)</p>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {CREDIT_PACKS.map((pack) => (
              <Link
                key={pack.name}
                href={pack.href}
                onClick={onClose}
                className="flex items-center justify-between p-3 rounded-xl border border-black/[0.06] hover:border-[#003399]/30 hover:bg-[#F5F5F7] transition-all"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1D1D1F]">{pack.credits.toLocaleString("fr-FR")} cr.</p>
                  <p className="text-xs text-[#6E6E73]">paiement unique</p>
                </div>
                <p className="text-sm font-bold text-[#003399]">{pack.price}</p>
              </Link>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-[11px] text-[#6E6E73]">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>Paiement sécurisé · Annulation à tout moment · RGPD compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
