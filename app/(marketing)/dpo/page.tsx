import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ChevronRight, CheckCircle2 } from "lucide-react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";

export const metadata: Metadata = {
  title: "Outil DPO — Automatisez votre conformité RGPD & AI Act",
  description:
    "CompliAI est l'outil pensé pour les DPO : DPIA, RoPA, checklist AI Act, jurisprudence CJUE, alertes réglementaires. Réduisez de 80% le temps passé sur la documentation de conformité.",
  alternates: { canonical: "https://www.compliai.eu/dpo" },
  openGraph: {
    title: "Outil DPO — DPIA, RoPA, AI Act automatisés",
    description: "Réduisez de 80% le temps de documentation. DPIA, RoPA, checklist AI Act, jurisprudence CJUE.",
    url: "https://www.compliai.eu/dpo",
  },
};

const FEATURES = [
  "DPIA Art. 35 générée en 5 minutes",
  "RoPA Art. 30 avec export CSV/PDF",
  "Checklist AI Act personnalisée",
  "Jurisprudence CJUE et décisions CNIL indexées",
  "Alertes réglementaires automatiques (EUR-Lex)",
  "Comparateur législatif UE-27",
  "Documentation technique AI Act Art. 11",
  "Consultant juridique IA 24/7",
];

export default function DpoPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
        <Link href={loginRedirectHref("/dashboard")}
          className="text-sm font-medium px-4 py-2 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors">
          Essai gratuit
        </Link>
      </nav>

      <section className="bg-[#000922] py-20 px-6 text-center">
        <p className="text-xs font-semibold text-[#FFCC00] tracking-widest uppercase mb-4">Pour les DPO & équipes conformité</p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4 max-w-3xl mx-auto">
          L&apos;assistant IA qui fait le travail de documentation à votre place
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
          DPIA, RoPA, checklist AI Act, jurisprudence CJUE — CompliAI génère tous vos documents obligatoires en quelques minutes, sourcés sur EUR-Lex et les décisions des DPA européens.
        </p>
        <Link href={loginRedirectHref("/dashboard")}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-bold text-sm hover:bg-yellow-300 transition-colors">
          Démarrer gratuitement
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-white/30 mt-3">Sans carte bancaire · Annulation à tout moment</p>
      </section>

      <section className="py-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">Ce que CompliAI fait pour vous</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3 p-4 rounded-xl bg-[#F5F5F7]">
              <CheckCircle2 className="h-5 w-5 text-[#003399] shrink-0 mt-0.5" />
              <p className="text-sm text-[#1D1D1F]">{f}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-[#F5F5F7]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-3">Combien de temps perdez-vous sur la documentation ?</h2>
          <p className="text-[#6E6E73] mb-10 max-w-xl mx-auto text-sm">
            Une DPIA prend en moyenne 8 à 20h à un DPO. CompliAI la génère en 5 minutes avec les articles applicables, les risques identifiés et les mesures recommandées.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { stat: "5 min", label: "Pour générer une DPIA complète" },
              { stat: "16+", label: "Outils juridiques disponibles" },
              { stat: "33+", label: "Sources officielles indexées (EUR-Lex, CJUE, DPA)" },
            ].map(({ stat, label }) => (
              <div key={label} className="bg-white rounded-2xl p-6 border border-black/[0.06]">
                <p className="text-3xl font-bold text-[#003399] mb-2">{stat}</p>
                <p className="text-sm text-[#6E6E73]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#003399] py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Prêt à gagner du temps sur votre conformité ?</h2>
        <p className="text-white/70 mb-8 max-w-xl mx-auto text-sm">
          Rejoignez les DPO qui utilisent CompliAI pour leur documentation RGPD et AI Act.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={loginRedirectHref("/dashboard")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-bold text-sm hover:bg-yellow-300 transition-colors">
            Démarrer gratuitement
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors">
            Voir les tarifs
          </Link>
        </div>
      </section>

      <MarketingSiteFooter />
    </div>
  );
}
