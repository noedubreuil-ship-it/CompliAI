"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Shield } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "49",
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? "",
    plan: "starter",
    description: "Pour les startups en phase d'amorçage",
    features: [
      "3 audits de conformité par mois",
      "Chat RAG illimité",
      "Registre des systèmes IA",
      "Suivi des issues bloquantes",
      "Export CSV du registre",
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
      "Audits illimités",
      "Rapport PDF investor-ready",
      "Veille réglementaire automatisée",
      "Alertes email en temps réel",
      "Export du registre IA (CSV + PDF)",
      "Support prioritaire",
    ],
    highlight: true,
  },
];

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleCheckout(priceId: string, plan: string) {
    if (!priceId) {
      alert("Configuration Stripe manquante. Définissez les variables NEXT_PUBLIC_STRIPE_*_PRICE_ID.");
      return;
    }

    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, plan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      router.push(url);
    } catch (err) {
      alert("Erreur lors de la création de la session de paiement");
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlight ? "border-2 border-slate-900 relative" : ""}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full font-medium">
                Recommandé
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
              <Button
                className="w-full"
                variant={plan.highlight ? "default" : "outline"}
                onClick={() => handleCheckout(plan.priceId, plan.plan)}
                disabled={loading !== null}
              >
                {loading === plan.plan ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Redirection…</>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Choisir {plan.name}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
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
