import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Shield, ArrowRight } from "lucide-react";

const PLANS = [
  {
    name: "Gratuit",
    price: "0",
    period: "pour toujours",
    description: "Découvrez CompliAI sans engagement",
    cta: "Commencer gratuitement",
    ctaHref: "/auth/login",
    highlight: false,
    features: [
      "1 audit par mois",
      "Chat juridique (10 questions/jour)",
      "Verdict de conformité",
      "Roadmap basique",
      "Disclaimer & recommandations",
    ],
    missing: ["Rapport PDF", "Registre IA", "Veille réglementaire", "Suivi des issues"],
  },
  {
    name: "Starter",
    price: "49",
    period: "/mois",
    description: "Pour les startups en phase de croissance",
    cta: "Choisir Starter",
    ctaHref: "/auth/login",
    highlight: false,
    features: [
      "3 audits par mois",
      "Chat juridique illimité",
      "Roadmap détaillée",
      "Estimation des coûts de conformité",
      "Registre des systèmes IA",
      "Suivi des issues bloquantes (Kanban)",
      "Export CSV du registre",
      "Support par email",
    ],
    missing: ["Rapport PDF investor-ready", "Veille réglementaire automatisée"],
  },
  {
    name: "Pro",
    price: "199",
    period: "/mois",
    description: "Pour les scale-ups et équipes Legal/Compliance",
    cta: "Choisir Pro",
    ctaHref: "/auth/login",
    highlight: true,
    features: [
      "Audits illimités",
      "Rapport PDF investor-ready",
      "Veille réglementaire quotidienne (EUR-Lex)",
      "Alertes email d'impact réglementaire",
      "Registre IA complet (CSV + PDF)",
      "Projets illimités",
      "API d'intégration (roadmap)",
      "Support prioritaire",
    ],
    missing: [],
  },
  {
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    description: "Pour les grands groupes et cabinets conseil",
    cta: "Nous contacter",
    ctaHref: "mailto:enterprise@compliai.eu",
    highlight: false,
    features: [
      "Tout le plan Pro",
      "Déploiement cloud privé",
      "SSO & gestion des accès",
      "Intégration API custom",
      "SLA garanti",
      "Accompagnement onboarding",
      "Nombre d'utilisateurs illimité",
    ],
    missing: [],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6" />
            CompliAI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm">Démarrer <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">Tarifs transparents</h1>
          <p className="text-slate-600 mt-3 max-w-lg mx-auto">
            Commencez gratuitement, évoluez selon vos besoins de conformité.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col ${plan.highlight ? "border-2 border-slate-900 shadow-lg" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  Le plus populaire
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div>
                  {plan.price === "Sur devis" ? (
                    <p className="text-2xl font-bold">Sur devis</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}€</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="h-4 w-4 flex-shrink-0 mt-0.5 text-center leading-4">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.ctaHref}>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Tous les plans incluent la TVA. Facturation mensuelle. Résiliation à tout moment.
          </p>
          <p className="text-xs text-muted-foreground border rounded-lg px-4 py-3 bg-slate-50 max-w-2xl mx-auto">
            <strong>Avertissement :</strong> Les analyses CompliAI constituent des <em>informations juridiques générales</em> basées 
            sur les textes de loi européens en vigueur, et non des conseils juridiques personnalisés. 
            Consultez un avocat qualifié pour toute décision engageant la responsabilité de votre entreprise.
          </p>
        </div>
      </div>
    </div>
  );
}
