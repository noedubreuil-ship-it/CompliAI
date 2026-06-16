import type { Metadata } from "next";
import Link from "next/link";
import { Shield, CheckCircle2, ChevronRight, FileText, Zap, ListChecks, AlertTriangle } from "lucide-react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";

export const metadata: Metadata = {
  title: "AI Act conformité — Guide complet et outils pour entreprises",
  description:
    "Tout ce que vous devez savoir sur l'AI Act (UE 2024/1689) : obligations, délais, classification des systèmes IA, documentation Art. 11 et FRIA Art. 27. Outils de conformité pour DPO et juristes.",
  alternates: { canonical: "https://www.compliai.eu/ai-act" },
  openGraph: {
    title: "AI Act conformité — Guide complet",
    description: "Obligations, délais, classification des risques. Préparez votre conformité AI Act avec les bons outils.",
    url: "https://www.compliai.eu/ai-act",
  },
};

const DEADLINES = [
  { date: "2 fév. 2025", label: "Pratiques interdites (Art. 5)", status: "passé", color: "text-red-600" },
  { date: "2 août 2025", label: "GPAI / modèles fondation (Art. 51-56)", status: "passé", color: "text-red-600" },
  { date: "2 août 2026", label: "Systèmes haut risque (Annexe III)", status: "urgent", color: "text-amber-600" },
  { date: "2 août 2027", label: "Systèmes haut risque (Annexe I)", status: "à venir", color: "text-blue-600" },
];

const OBLIGATIONS = [
  { icon: FileText, title: "Documentation technique (Art. 11)", desc: "Fiche technique obligatoire pour tout système à haut risque.", tool: "/dashboard/tools/art11", cta: "Générer Doc. Art. 11" },
  { icon: Shield, title: "FRIA Art. 27", desc: "Évaluation d'impact sur les droits fondamentaux pour les déployeurs publics.", tool: "/dashboard/tools/fria", cta: "Générer FRIA" },
  { icon: Zap, title: "Classification AI Act", desc: "Déterminer si votre système est haut risque, GPAI ou à risque minimal.", tool: "/dashboard/tools/classifier", cta: "Classifier mon IA" },
  { icon: ListChecks, title: "Checklist conformité", desc: "Roadmap personnalisée AI Act + RGPD selon votre profil.", tool: "/dashboard/tools/checklist", cta: "Générer la checklist" },
];

export default function AiActPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
        <Link href={loginRedirectHref("/dashboard/tools/checklist")}
          className="text-sm font-medium px-4 py-2 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors">
          Essai gratuit
        </Link>
      </nav>

      {/* Hero */}
      <section className="bg-[#F5F5F7] py-20 px-6 text-center">
        <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Règlement UE 2024/1689</p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-4 max-w-3xl mx-auto">
          AI Act : tout ce que vous devez faire et quand le faire
        </h1>
        <p className="text-lg text-[#6E6E73] max-w-2xl mx-auto mb-8">
          Le règlement européen sur l'intelligence artificielle impose des obligations selon le niveau de risque de votre système IA. Voici les deadlines, les obligations et les outils pour y répondre.
        </p>
        <Link href={loginRedirectHref("/dashboard/tools/checklist")}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#003399] text-white font-semibold text-sm hover:bg-[#0044cc] transition-colors">
          Générer ma checklist AI Act
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-[#6E6E73] mt-3">Gratuit · Sans carte bancaire</p>
      </section>

      {/* Deadlines */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Calendrier d&apos;application</h2>
        <p className="text-[#6E6E73] mb-8">L'AI Act s'applique progressivement depuis février 2025.</p>
        <div className="space-y-4">
          {DEADLINES.map((d) => (
            <div key={d.date} className="flex items-center gap-4 p-4 rounded-2xl border border-black/[0.06] bg-white">
              <div className="w-32 shrink-0">
                <p className={`text-sm font-bold ${d.color}`}>{d.date}</p>
                <p className="text-xs text-[#6E6E73] capitalize">{d.status}</p>
              </div>
              <p className="text-sm text-[#1D1D1F]">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Obligations + outils */}
      <section className="py-16 px-6 bg-[#F5F5F7]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Obligations principales et outils associés</h2>
          <p className="text-[#6E6E73] mb-8">CompliAI génère chaque document obligatoire en quelques minutes.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {OBLIGATIONS.map((o) => (
              <div key={o.title} className="bg-white rounded-2xl p-6 border border-black/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#003399]/10 flex items-center justify-center">
                    <o.icon className="h-5 w-5 text-[#003399]" />
                  </div>
                  <p className="font-semibold text-sm text-[#1D1D1F]">{o.title}</p>
                </div>
                <p className="text-xs text-[#6E6E73] mb-4 leading-relaxed">{o.desc}</p>
                <Link href={loginRedirectHref(o.tool)}
                  className="text-xs font-semibold text-[#003399] hover:underline flex items-center gap-1">
                  {o.cta} <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ rapide */}
      <section className="py-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-[#1D1D1F] mb-8">Questions fréquentes</h2>
        {[
          { q: "Mon entreprise est-elle concernée par l'AI Act ?", a: "Si vous développez ou utilisez des systèmes IA mis sur le marché de l'UE ou utilisés dans l'UE, oui. Le règlement s'applique aux fournisseurs (qui développent) et aux déployeurs (qui utilisent des IA tierces)." },
          { q: "Qu'est-ce qu'un système IA à haut risque ?", a: "Un système listé à l'Annexe III (recrutement, crédit, biométrie, justice, éducation, sécurité critique…) ou intégrant un composant de sécurité d'un produit couvert par l'Annexe I (dispositifs médicaux, véhicules, etc.)." },
          { q: "Quelle est la différence entre fournisseur et déployeur ?", a: "Le fournisseur développe et met sur le marché le système IA. Le déployeur l'utilise dans un contexte professionnel. Les obligations diffèrent selon ce rôle — notamment sur la documentation technique et l'évaluation de conformité." },
          { q: "Quelles sont les amendes prévues ?", a: "Jusqu'à 35M€ ou 7% du CA mondial pour les pratiques interdites. 15M€ ou 3% pour les autres manquements. 7,5M€ ou 1,5% pour les informations incorrectes fournies à l'autorité." },
        ].map(({ q, a }) => (
          <div key={q} className="mb-6 border-b border-black/[0.06] pb-6">
            <p className="font-semibold text-[#1D1D1F] mb-2 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              {q}
            </p>
            <p className="text-sm text-[#6E6E73] leading-relaxed pl-6">{a}</p>
          </div>
        ))}
      </section>

      {/* CTA final */}
      <section className="bg-[#003399] py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Prêt à démarrer votre conformité AI Act ?</h2>
        <p className="text-white/70 mb-8 max-w-xl mx-auto text-sm">
          CompliAI génère votre checklist personnalisée, votre documentation technique et votre FRIA en quelques minutes.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={loginRedirectHref("/dashboard/tools/checklist")}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-bold text-sm hover:bg-yellow-300 transition-colors">
            Générer ma checklist gratuitement
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
