import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ChevronRight, FileSearch, ClipboardList, MessageSquare, AlertTriangle } from "lucide-react";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";

export const metadata: Metadata = {
  title: "RGPD conformité — DPIA, RoPA et outils DPO",
  description:
    "Générez votre DPIA Art. 35, votre RoPA Art. 30 et posez vos questions RGPD à notre consultant IA. Jurisprudence CJUE, décisions CNIL et EDPB indexées. Outil pour DPO.",
  alternates: { canonical: "https://www.compliai.eu/rgpd" },
  openGraph: {
    title: "RGPD conformité — DPIA, RoPA et outils DPO",
    description: "DPIA, RoPA, consultant juridique RGPD. Jurisprudence CJUE et décisions CNIL indexées.",
    url: "https://www.compliai.eu/rgpd",
  },
};

const OUTILS = [
  { icon: FileSearch, title: "DPIA Art. 35", desc: "Analyse d'impact sur la vie privée obligatoire pour les traitements à risque élevé.", href: "/dashboard/tools/dpia", cta: "Générer ma DPIA" },
  { icon: ClipboardList, title: "RoPA Art. 30", desc: "Registre des activités de traitement — obligation pour toutes les entreprises.", href: "/dashboard/tools/ropa", cta: "Créer mon RoPA" },
  { icon: MessageSquare, title: "Consultant RGPD", desc: "Posez vos questions RGPD : réponses sourcées sur jurisprudence CJUE et décisions CNIL.", href: "/dashboard/chat", cta: "Poser une question" },
];

export default function RgpdPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F]">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Shield className="h-5 w-5 text-[#003399]" />
          CompliAI
        </Link>
        <Link href={loginRedirectHref("/dashboard/tools/dpia")}
          className="text-sm font-medium px-4 py-2 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors">
          Essai gratuit
        </Link>
      </nav>

      <section className="bg-[#F5F5F7] py-20 px-6 text-center">
        <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Règlement UE 2016/679</p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1D1D1F] mb-4 max-w-3xl mx-auto">
          RGPD : DPIA, RoPA et conformité pour votre organisation
        </h1>
        <p className="text-lg text-[#6E6E73] max-w-2xl mx-auto mb-8">
          CompliAI génère vos documents RGPD obligatoires et répond à vos questions avec la jurisprudence de la CJUE et les décisions de la CNIL.
        </p>
        <Link href={loginRedirectHref("/dashboard/tools/dpia")}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#003399] text-white font-semibold text-sm hover:bg-[#0044cc] transition-colors">
          Générer ma DPIA gratuitement
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-[#6E6E73] mt-3">Gratuit · Sans carte bancaire</p>
      </section>

      <section className="py-16 px-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-8">Outils RGPD disponibles</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {OUTILS.map((o) => (
            <div key={o.title} className="rounded-2xl border border-black/[0.06] p-6 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#003399]/10 flex items-center justify-center mb-4">
                <o.icon className="h-5 w-5 text-[#003399]" />
              </div>
              <p className="font-semibold text-sm text-[#1D1D1F] mb-2">{o.title}</p>
              <p className="text-xs text-[#6E6E73] leading-relaxed mb-4">{o.desc}</p>
              <Link href={loginRedirectHref(o.href)}
                className="text-xs font-semibold text-[#003399] hover:underline flex items-center gap-1">
                {o.cta} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-[#F5F5F7]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-8">Questions fréquentes RGPD</h2>
          {[
            { q: "Quand une DPIA est-elle obligatoire ?", a: "Lorsque le traitement est susceptible d'engendrer un risque élevé pour les droits des personnes : surveillance à grande échelle, profilage, données sensibles Art. 9, nouvelles technologies, décisions automatisées avec effets significatifs." },
            { q: "Qui doit tenir un RoPA ?", a: "Toutes les organisations de plus de 250 salariés, et celles (quelle que soit leur taille) dont les traitements présentent un risque pour les droits, portent sur des données sensibles ou s'effectuent de manière non occasionnelle." },
            { q: "Quelle est la différence entre DPIA et FRIA (AI Act) ?", a: "La DPIA (RGPD Art. 35) analyse les risques pour la vie privée des personnes concernées. La FRIA (AI Act Art. 27) évalue plus largement l'impact sur les droits fondamentaux. Un système IA peut nécessiter les deux." },
          ].map(({ q, a }) => (
            <div key={q} className="mb-6 border-b border-black/[0.06] pb-6">
              <p className="font-semibold text-[#1D1D1F] mb-2 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                {q}
              </p>
              <p className="text-sm text-[#6E6E73] leading-relaxed pl-6">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#003399] py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Générez vos documents RGPD maintenant</h2>
        <p className="text-white/70 mb-8 max-w-xl mx-auto text-sm">
          DPIA, RoPA, consultant IA — tout en quelques minutes, sourcé sur EUR-Lex et la jurisprudence de la CJUE.
        </p>
        <Link href={loginRedirectHref("/dashboard/tools/dpia")}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-bold text-sm hover:bg-yellow-300 transition-colors">
          Démarrer gratuitement
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      <MarketingSiteFooter />
    </div>
  );
}
