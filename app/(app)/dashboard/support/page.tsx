"use client";

import { useState } from "react";
import { Mail, MessageSquare, BookOpen, ExternalLink, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    q: "Comment fonctionne le système de crédits IA ?",
    a: "Chaque appel au consultant IA ou à un outil de génération consomme des crédits proportionnellement aux tokens utilisés. Votre abonnement inclut un quota mensuel remis à zéro chaque mois. Vous pouvez acheter des packs supplémentaires à tout moment sur la page Crédits.",
  },
  {
    q: "Puis-je partager mes documents générés (DPIA, RoPA) avec mon équipe ?",
    a: "Oui — depuis la page Mes Documents, chaque rapport dispose d'un bouton \"Partager\" qui génère un lien de consultation en lecture seule, valable 30 jours.",
  },
  {
    q: "Les réponses du consultant IA constituent-elles un conseil juridique ?",
    a: "Non. CompliAI fournit une information juridique fondée sur les textes officiels (AI Act, RGPD, DSA, etc.) mais ne remplace pas un avocat. Chaque réponse contient un avertissement à cet effet.",
  },
  {
    q: "Comment mettre à jour ma carte bancaire ou annuler mon abonnement ?",
    a: "Rendez-vous dans Paramètres → Abonnement, ou contactez-nous directement à billing@compliai.eu. L'annulation prend effet à la fin de la période en cours.",
  },
  {
    q: "Mes données sont-elles hébergées en Europe ?",
    a: "Oui. Toutes les données sont stockées chez Supabase (région eu-central-1, Francfort) et ne sortent jamais de l'UE. Les appels à l'API Anthropic (Claude) ne transmettent pas de données personnelles identifiantes.",
  },
  {
    q: "Quelle est la différence entre la bibliothèque juridique et le consultant ?",
    a: "La bibliothèque (textes UE, JP, lois nationales indexées) est alimentée en arrière-plan par des jobs techniques, des ingests et des crons — pas à chaque message. Le consultant interroge ce corpus via RAG pour répondre. En production nous recommandons de désactiver l’ingestion « au fil du chat » (variables d’environnement documentées dans .env.example) et de s’appuyer sur les crons et scripts de backfill pour une couverture stable.",
  },
  {
    q: "L'ingestion RAG couvre-t-elle tous les textes de loi ?",
    a: "La bibliothèque couvre en priorité le droit de l’Union (AI Act, RGPD, DSA, DMA, NIS2, etc.), la jurisprudence indexée et le droit national lorsque les sources sont présentes dans le registre UE-27 et ingérées. Elle n’est pas une garantie d’exhaustivité automatique pour les 27 ordres juridiques : en cas de doute ou pour un litige, confrontez toujours le texte authentique (EUR-Lex, journal officiel national) ou un juriste.",
  },
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSending(true);
    // Simule l'envoi (à connecter à Resend / Crisp en prod)
    await new Promise((r) => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support & Aide</h1>
        <p className="text-sm text-gray-500 mt-1">
          Une question ? Un problème ? Nous répondons généralement en moins de 4h en jours ouvrés.
        </p>
      </div>

      {/* Canaux de contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="mailto:support@compliai.eu"
          className="flex flex-col gap-2 rounded-xl border bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Mail className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">Email</p>
          <p className="text-xs text-gray-500">support@compliai.eu</p>
          <span className="text-xs text-blue-600 font-medium group-hover:underline mt-auto">
            Écrire un email →
          </span>
        </a>

        <a
          href="mailto:billing@compliai.eu"
          className="flex flex-col gap-2 rounded-xl border bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <MessageSquare className="h-4.5 w-4.5 text-amber-600" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">Facturation</p>
          <p className="text-xs text-gray-500">billing@compliai.eu</p>
          <span className="text-xs text-amber-600 font-medium group-hover:underline mt-auto">
            Question de facturation →
          </span>
        </a>

        <Link
          href="/dashboard/chat"
          className="flex flex-col gap-2 rounded-xl border bg-white p-5 hover:shadow-md transition-shadow group"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <BookOpen className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <p className="font-semibold text-gray-900 text-sm">Consultant IA</p>
          <p className="text-xs text-gray-500">Questions juridiques</p>
          <span className="text-xs text-purple-600 font-medium group-hover:underline mt-auto">
            Ouvrir le chat →
          </span>
        </Link>
      </div>

      {/* Documentation rapide */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ressources utiles</h2>
        <div className="divide-y rounded-xl border bg-white overflow-hidden">
          {[
            { label: "Guide de démarrage rapide", href: "#", desc: "Créer votre premier audit en 5 minutes" },
            { label: "Comprendre l'AI Act", href: "/dashboard/sources", desc: "Texte complet + résumé des obligations" },
            { label: "Acheter des crédits supplémentaires", href: "/dashboard/credits", desc: "Packs de 1 000 à 50 000 crédits" },
            { label: "Gérer mon abonnement", href: "/dashboard/settings", desc: "Plan, facturation, résiliation" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Questions fréquentes</h2>
        <div className="divide-y rounded-xl border bg-white overflow-hidden">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800 pr-4">{faq.q}</span>
                <ChevronRight
                  className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Formulaire de contact */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Nous contacter</h2>
        <p className="text-sm text-gray-500 mb-4">Vous ne trouvez pas votre réponse ? Envoyez-nous un message.</p>

        {sent ? (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 p-5 text-green-800">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Message envoyé !</p>
              <p className="text-xs mt-0.5">Nous vous répondrons à votre adresse email dans les 4 heures ouvrées.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sujet</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="ex: Problème de crédits, Question sur l'AI Act..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Décrivez votre problème ou question en détail..."
                rows={5}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Envoi en cours…</>
              ) : (
                <>
                  <Mail className="h-4 w-4" /> Envoyer le message
                </>
              )}
            </button>
          </form>
        )}
      </section>

      <p className="text-xs text-center text-gray-400">
        CompliAI · support@compliai.eu · Réponse sous 4h en jours ouvrés
      </p>
    </div>
  );
}
