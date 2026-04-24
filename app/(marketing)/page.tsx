import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle2,
  ArrowRight,
  FileSearch,
  MessageSquare,
  Bell,
  BookOpen,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Audit de conformité en 5 minutes",
    description:
      "Décrivez votre projet IA et obtenez un verdict immédiat (AI Act, RGPD, DSA) avec une roadmap d'actions priorisées et une estimation des coûts.",
    badge: "Mode 1",
  },
  {
    icon: MessageSquare,
    title: "Consultant juridique IA 24/7",
    description:
      "Posez n'importe quelle question sur le droit européen du numérique. Chaque réponse cite les articles exacts et lie vers EUR-Lex.",
    badge: "Mode 2",
  },
  {
    icon: BookOpen,
    title: "Registre IA réglementaire",
    description:
      "L'AI Act impose un registre des systèmes à haut risque. CompliAI le génère et le maintient automatiquement pour vous.",
    badge: "Mode 3",
  },
  {
    icon: Bell,
    title: "Veille réglementaire automatisée",
    description:
      "Scan quotidien d'EUR-Lex. Dès qu'une mise à jour impacte vos projets, vous recevez une alerte email avec analyse d'impact.",
    badge: "Mode 4",
  },
];

const REGULATIONS = [
  { name: "AI Act", year: "2024", desc: "UE 2024/1689" },
  { name: "RGPD", year: "2016", desc: "UE 2016/679" },
  { name: "DSA", year: "2022", desc: "UE 2022/2065" },
  { name: "DMA", year: "2022", desc: "UE 2022/1925" },
  { name: "Data Act", year: "2023", desc: "UE 2023/2854" },
];

const RISK_LEVELS = [
  { label: "Inacceptable", color: "bg-red-500", desc: "Pratiques interdites (surveillance biométrique de masse, etc.)" },
  { label: "Haut risque", color: "bg-orange-500", desc: "Obligations strictes (biométrie, RH, crédit, santé…)" },
  { label: "Risque limité", color: "bg-amber-400", desc: "Obligations de transparence" },
  { label: "Risque minimal", color: "bg-green-500", desc: "Pas d'obligation spécifique" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-slate-900" />
            CompliAI
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <Link href="#features" className="hover:text-slate-900">Fonctionnalités</Link>
            <Link href="#regulations" className="hover:text-slate-900">Réglementations</Link>
            <Link href="/pricing" className="hover:text-slate-900">Tarifs</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/auth/login?mode=signup">
              <Button size="sm">
                Essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 text-sm px-4 py-1.5 rounded-full mb-6 font-medium">
          <Shield className="h-4 w-4" />
          AI Act en vigueur · RGPD · DSA · DMA
        </div>
        <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6 max-w-3xl mx-auto">
          La conformité IA européenne,{" "}
          <span className="text-blue-600">sans cabinet d&apos;avocats</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          CompliAI analyse votre projet IA, identifie vos obligations réglementaires et génère 
          une roadmap de conformité actionnable — en 5 minutes, pour une fraction du coût d&apos;un audit juridique.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/auth/login">
            <Button size="lg" className="h-12 px-8">
              <Shield className="h-5 w-5" />
              Auditer mon projet gratuitement
            </Button>
          </Link>
          <Link href="#features">
            <Button variant="outline" size="lg" className="h-12 px-8">
              Voir la démo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-12 flex items-center justify-center gap-8 flex-wrap text-sm text-slate-500">
          {["Sans carte bancaire", "Rapport en 5 min", "Basé sur les textes officiels EUR-Lex"].map((item) => (
            <div key={item} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Risk level visual */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-slate-400 text-sm text-center mb-6 uppercase tracking-wide font-medium">
            Classification AI Act — Pyramide des risques
          </p>
          <div className="space-y-2">
            {RISK_LEVELS.map((level) => (
              <div key={level.label} className="flex items-center gap-4">
                <div className={`h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${level.color}`}
                  style={{ width: level.label === "Inacceptable" ? "25%" : level.label === "Haut risque" ? "45%" : level.label === "Risque limité" ? "70%" : "100%" }}>
                  <span className="text-white text-xs font-bold px-3">{level.label}</span>
                </div>
                <p className="text-slate-400 text-sm hidden md:block">{level.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">4 modes, une seule plateforme</h2>
          <p className="text-slate-600 mt-3 max-w-xl mx-auto">
            De l&apos;audit initial à la veille permanente, CompliAI couvre tout le cycle de vie de votre conformité réglementaire.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="p-6 border rounded-2xl hover:border-slate-400 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 rounded-xl flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg leading-snug">{feature.title}</h3>
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Regulations covered */}
      <section id="regulations" className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Base juridique couverte</h2>
          <p className="text-slate-600 text-sm mb-8">
            Tous les textes sont indexés depuis EUR-Lex et vectorisés pour une recherche sémantique précise.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {REGULATIONS.map((reg) => (
              <div key={reg.name} className="bg-white border rounded-xl px-5 py-4 text-center min-w-[120px]">
                <p className="font-bold text-lg">{reg.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{reg.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
            <ExternalLink className="h-4 w-4" />
            <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener" className="hover:underline">
              Source officielle : EUR-Lex (eur-lex.europa.eu)
            </a>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-1.5 rounded-full mb-4">
              <AlertTriangle className="h-4 w-4" />
              Le problème
            </div>
            <h2 className="text-2xl font-bold mb-4">Un audit juridique coûte entre 15 000€ et 50 000€</h2>
            <p className="text-slate-600 leading-relaxed">
              Les cabinets d&apos;avocats spécialisés en droit de l&apos;IA facturent plusieurs dizaines de milliers d&apos;euros 
              pour analyser un produit. Impossible à budgéter pour une startup, et trop lent pour chaque itération produit.
            </p>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm px-3 py-1.5 rounded-full mb-4">
              <CheckCircle2 className="h-4 w-4" />
              La solution CompliAI
            </div>
            <h2 className="text-2xl font-bold mb-4">Audit complet en 5 minutes pour 49€/mois</h2>
            <p className="text-slate-600 leading-relaxed">
              Notre RAG IA indexe les textes de loi officiels et génère des analyses précises, citant chaque article applicable. 
              Pas d&apos;hallucination : si la réponse n&apos;est pas dans les textes, CompliAI vous le dit.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à sécuriser votre conformité IA ?
          </h2>
          <p className="text-slate-400 mb-8">
            Rejoignez des centaines de startups qui utilisent CompliAI pour naviguer le droit européen.
          </p>
          <Link href="/auth/login">
            <Button size="lg" variant="secondary" className="h-12 px-8">
              Démarrer gratuitement
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>CompliAI — © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/legal/cgu" className="hover:text-slate-900">CGU</Link>
            <Link href="/legal/privacy" className="hover:text-slate-900">Confidentialité</Link>
            <Link href="/legal/disclaimer" className="hover:text-slate-900">Avertissement légal</Link>
            <Link href="/pricing" className="hover:text-slate-900">Tarifs</Link>
          </div>
          <p className="text-xs text-center">
            Les analyses CompliAI sont des informations juridiques, non des conseils juridiques.
          </p>
        </div>
      </footer>
    </div>
  );
}
