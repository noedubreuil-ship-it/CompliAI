"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Shield, AlertCircle, X, Zap } from "lucide-react";

const ENTERPRISE_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? "";

const PLANS = [
  {
    name: "Starter",
    price: "49",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    plan: "starter",
    description: "Pour les startups en phase d'amorçage",
    features: [
      "4 500 crédits IA / mois (Sonnet)",
      "~25 questions consultant + 6 outils / mois",
      "3 audits de conformité par mois",
      "Registre des systèmes IA + export CSV",
      "Scanner, DPIA, checklist, classifier…",
      "Support par email",
    ],
    highlight: false,
  },
  {
    name: "Pro",
    price: "199",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? "",
    plan: "pro",
    description: "Pour les scale-ups et PME tech",
    features: [
      "18 000 crédits IA / mois (Sonnet + Opus premium)",
      "~80 questions + 20 outils + veille",
      "Audits avancés (Opus) + rapport investor-ready",
      "Veille réglementaire automatisée",
      "Tous les outils Pro (comparateur, jurisprudence…)",
      "Support prioritaire",
    ],
    highlight: true,
  },
  ...(ENTERPRISE_PRICE_ID
    ? [
        {
          name: "Enterprise",
          price: "799",
          priceId: ENTERPRISE_PRICE_ID,
          plan: "enterprise",
          description: "Pour cabinets, DPO et équipes multi-projets",
          features: [
            "60 000+ crédits IA / mois",
            "Tous les outils Pro + sièges équipe",
            "Opus sur audits et rapports premium",
            "Support dédié et SLA",
            "Facturation annuelle possible",
            "Onboarding personnalisé",
          ],
          highlight: false,
        },
      ]
    : []),
];

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("subscription_tier").eq("id", user.id).single()
        .then(({ data }) => setCurrentTier(data?.subscription_tier ?? "free"));
    });
  }, []);

  async function handleCheckout(priceId: string, plan: string) {
    setError(null);
    if (!priceId) {
      setError("Configuration Stripe manquante. Contactez le support.");
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan }),
      });
      const { url, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);
      router.push(url);
    } catch (err) {
      setError("Impossible de créer la session de paiement. Réessayez ou contactez le support.");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Choisissez votre plan</h1>
        <p className="text-muted-foreground mt-2">
          Conformité réglementaire AI Act & RGPD pour votre entreprise
        </p>
        {currentTier && (
          <p className="mt-2 text-sm">
            Plan actuel :{" "}
            <span className="font-semibold capitalize text-slate-900">
              {currentTier === "free" ? "Gratuit" : currentTier}
            </span>
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${PLANS.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`${plan.highlight ? "border-2 border-slate-900" : ""} relative`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full font-medium">
                Recommandé
              </div>
            )}
            {currentTier === plan.plan && (
              <div className="absolute -top-3 right-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                Plan actuel
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-1">
                <span className="text-3xl font-bold">{plan.price}€</span>
                <span className="text-muted-foreground text-sm">/mois</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              {currentTier === plan.plan ? (
                <Button className="w-full" variant="outline" disabled>
                  <Shield className="h-4 w-4" />
                  Plan actuel
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  onClick={() => handleCheckout(plan.priceId, plan.plan)}
                  disabled={loading === plan.plan}
                >
                  {loading === plan.plan ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirection…</>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      {currentTier === "free" ? `Passer à ${plan.name}` : `Changer pour ${plan.name}`}
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bundles / packs livrables */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5 text-slate-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900 text-sm">Bundle DPO — Pack conformité (livrables)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Checklist + DPIA + politique IA employés générés et enregistrés dans vos documents, pour démarrer vite sur un projet.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Link href="/dashboard/templates">
                <Button variant="outline" size="sm">
                  Voir le pack (1‑click)
                </Button>
              </Link>
              <Link href="/dashboard/tools/checklist">
                <Button variant="ghost" size="sm">
                  Commencer par la checklist →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Packs de crédits supplémentaires */}
      <div className="rounded-xl border bg-amber-50 border-amber-200 p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-semibold text-gray-900 text-sm">Déjà abonné ? Achetez des crédits supplémentaires</p>
          <p className="text-xs text-gray-500 mt-0.5">Packs à usage unique, ajoutés immédiatement à votre solde.</p>
        </div>
        <Link
          href="/dashboard/credits"
          className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Voir les packs →
        </Link>
      </div>

      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Paiement sécurisé par Stripe · Résiliation à tout moment · Facturation mensuelle</p>
        <p>
          Besoin d&apos;un plan Enterprise sur mesure ?{" "}
          <a href="mailto:enterprise@compliai.eu" className="underline hover:text-foreground">
            Contactez-nous
          </a>
        </p>
      </div>
    </div>
  );
}
