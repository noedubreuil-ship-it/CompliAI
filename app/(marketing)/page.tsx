"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { EUFlagSVG } from "@/components/EUFlag";
import { HeroBackground } from "@/components/marketing/HeroBackground";
import { MarketingSiteFooter } from "@/components/marketing/MarketingSiteFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";
import { cn } from "@/lib/utils";
import {
  Shield, CheckCircle2, ArrowRight, FileSearch, MessageSquare,
  Bell, BookOpen, AlertTriangle, Menu, X, Star, Lock, FileText,
  Award, Building2, Gavel, GraduationCap, Search, BarChart3,
  GitCompare, ChevronRight, Zap, Scale,
} from "lucide-react";

/* ─── Apple design tokens ───────────────────────────────────────────────────
   #1D1D1F  — Apple near-black (text)
   #F5F5F7  — Apple off-white (section bg)
   #6E6E73  — Apple mid-grey (secondary text)
   #003399  — EU Blue (brand accent)
   #FFCC00  — EU Gold (CTA accent)
────────────────────────────────────────────────────────────────────────────── */

/* ─── Data ──────────────────────────────────────────────────────────────────── */

const REGULATIONS = [
  { name: "AI Act", ref: "UE 2024/1689", year: "2024" },
  { name: "RGPD", ref: "UE 2016/679", year: "2016" },
  { name: "DSA", ref: "UE 2022/2065", year: "2022" },
  { name: "DMA", ref: "UE 2022/1925", year: "2022" },
  { name: "Data Act", ref: "UE 2023/2854", year: "2023" },
  { name: "DORA", ref: "UE 2022/2554", year: "2022" },
  { name: "NIS2", ref: "UE 2022/2555", year: "2022" },
  { name: "CRA", ref: "UE 2024/2847", year: "2024" },
  { name: "eIDAS 2", ref: "UE 2024/1183", year: "2024" },
  { name: "DGA", ref: "UE 2022/868", year: "2022" },
];

const TOOLS = [
  { icon: FileText, name: "Documentation Art. 11", tag: "Obligatoire", href: "/dashboard/tools/art11" },
  { icon: Search, name: "FRIA Art. 27", tag: "Droits fondamentaux", href: "/dashboard/tools/fria" },
  { icon: Gavel, name: "Clauses contractuelles", tag: "Avocats", href: "/dashboard/tools/clauses-contrat" },
  { icon: GraduationCap, name: "Quiz droit de l'IA", tag: "Étudiants", href: "/dashboard/tools/quiz" },
  { icon: BarChart3, name: "Jurisprudence CJUE", tag: "Recherche", href: "/dashboard/tools/jurisprudence" },
  { icon: GitCompare, name: "Comparateur 27 États", tag: "Légistique", href: "/dashboard/tools/comparateur" },
];

const TESTIMONIALS = [
  {
    quote: "CompliAI nous a permis d'identifier 3 obligations critiques que nous ignorions. Le gain de temps est incroyable.",
    author: "Marie Lefebvre",
    role: "DPO, FinTech startup",
  },
  {
    quote: "En tant qu'avocat spécialisé, j'utilise CompliAI pour mes recherches préliminaires. La précision des citations est impressionnante.",
    author: "Thomas Dubois",
    role: "Avocat en droit numérique",
  },
  {
    quote: "Notre équipe peut maintenant gérer la conformité AI Act sans cabinet externe. ROI immédiat.",
    author: "Sarah Chen",
    role: "CTO, Scale-up B2B",
  },
];

/* ─── Hooks ─────────────────────────────────────────────────────────────────── */

function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return scrolled;
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Nav ───────────────────────────────────────────────────────────────────── */

function Nav() {
  const scrolled = useScrolled(40);
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Navigation principale"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[rgba(255,255,255,0.85)] backdrop-blur-2xl border-b border-black/[0.08]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[980px] mx-auto px-5 h-[52px] flex items-center justify-between gap-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 cursor-pointer group">
          <div className="w-7 h-7 rounded-lg bg-[#003399] flex items-center justify-center shadow-sm">
            <Shield className="h-[15px] w-[15px] text-white" />
          </div>
          <span className="text-sm font-semibold text-[#1D1D1F] tracking-tight">
            Compli<span className="text-[#003399]">AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {[
            ["Fonctionnalités", "#fonctionnalités"],
            ["Outils", "#outils"],
            ["Réglementations", "#réglementations"],
            ["Tarifs", "/pricing"],
          ].map(([label, href]) => (
            <a key={label} href={href}
              className="text-xs font-medium text-[#1D1D1F]/75 hover:text-[#1D1D1F] transition-colors cursor-pointer whitespace-nowrap">
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login">
            <span className="text-xs font-medium text-[#003399] hover:underline cursor-pointer">
              Connexion
            </span>
          </Link>
          <Link href="/auth/login">
            <span className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#003399] text-white hover:bg-[#0044cc] transition-colors cursor-pointer">
              Essai gratuit
            </span>
          </Link>
        </div>

        {/* Mobile burger */}
        <button onClick={() => setOpen(!open)} aria-label="Menu"
          className="md:hidden p-1.5 text-[#1D1D1F] cursor-pointer">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-2xl border-t border-black/[0.06] px-5 py-4 space-y-1">
          {[
            ["Fonctionnalités", "#fonctionnalités"],
            ["Outils", "#outils"],
            ["Réglementations", "#réglementations"],
            ["Tarifs", "/pricing"],
          ].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="block py-3 text-sm text-[#1D1D1F]/80 border-b border-black/[0.04] cursor-pointer">
              {label}
            </a>
          ))}
          <div className="flex gap-3 pt-3">
            <Link href="/auth/login" className="flex-1">
              <button className="w-full py-2.5 rounded-full border border-[#003399] text-[#003399] text-sm font-medium cursor-pointer">
                Connexion
              </button>
            </Link>
            <Link href="/auth/login" className="flex-1">
              <button className="w-full py-2.5 rounded-full bg-[#003399] text-white text-sm font-medium cursor-pointer">
                Essai gratuit
              </button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Aperçu produit ────────────────────────────────────────────────────────
   Affiche public/product-preview.png si présent, sinon un mock du consultant.
   Pour remplacer : déposer une capture d'écran de l'app dans public/product-preview.png
   (idéalement le consultant juridique avec une réponse sourcée), ou une vidéo plus tard.
────────────────────────────────────────────────────────────────────────────── */

function ProductPreview() {
  // Le mock s'affiche par défaut ; si public/product-preview.png existe et se
  // charge, on bascule sur la vraie capture. Robuste sans dépendre de onError.
  const [imgOk, setImgOk] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => { if (probe.naturalWidth > 0) setImgOk(true); };
    probe.src = "/product-preview.png";
  }, []);

  return (
    <div className="rounded-3xl border border-black/[0.08] bg-[#F5F5F7] shadow-[0_20px_80px_rgba(0,0,0,0.12)] overflow-hidden">
      {/* Barre fenêtre */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-black/[0.06] bg-white/60">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 text-[11px] text-[#6E6E73] font-medium">app.compliai.eu · Consultant juridique</span>
      </div>

      {imgOk ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/product-preview.png"
          alt="Aperçu du consultant juridique CompliAI : question posée et réponse sourcée"
          className="block w-full h-auto"
          onError={() => setImgOk(false)}
        />
      ) : (
        <div className="p-6 md:p-8 space-y-4 bg-white">
          {/* Question utilisateur */}
          <div className="flex justify-end">
            <div className="max-w-[80%] bg-[#003399] text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 leading-relaxed">
              Mon chatbot doit-il informer l&apos;utilisateur qu&apos;il parle à une IA ?
            </div>
          </div>
          {/* Réponse assistant */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#003399] flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="bg-[#F5F5F7] rounded-2xl rounded-tl-md px-4 py-3 text-sm text-[#1D1D1F] leading-relaxed">
                Oui. L&apos;<strong>article 50 §1 de l&apos;AI Act</strong> impose une obligation de transparence :
                les systèmes d&apos;IA destinés à interagir avec des personnes physiques doivent les informer
                qu&apos;elles communiquent avec une IA, sauf si cela est manifeste au vu du contexte.
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { t: "AI Act · Art. 50 §1", c: "bg-indigo-100 text-indigo-800" },
                  { t: "AI Act · considérant 132", c: "bg-indigo-100 text-indigo-800" },
                  { t: "EUR-Lex", c: "bg-blue-100 text-blue-800" },
                ].map((s) => (
                  <span key={s.t} className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded", s.c)}>
                    <BookOpen className="h-3 w-3" /> {s.t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden text-[#1D1D1F]">
      <Nav />

      {/* ══════════════════════════════════════════════════════════════════════
          HERO — Image + dégradés EU
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center bg-[#000922] overflow-hidden">

        <HeroBackground />

        <div className="relative z-20 max-w-[980px] mx-auto px-5 pt-32 pb-24 text-center">

          {/* Eyebrow chip */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/8 text-white/60 text-xs mb-8 backdrop-blur-sm">
            <EUFlagSVG width={16} height={11} />
            AI Act · RGPD · DSA · DMA · Data Act
          </div>

          {/* Headline */}
          <h1
            className="text-white font-bold leading-[1.02] tracking-[-0.04em] mb-6"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
          >
            La conformité IA européenne.<br />
            <span style={{
              background: "linear-gradient(90deg, #FFCC00 0%, #FFE566 40%, #FFCC00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              En 5 minutes.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-white/50 font-normal leading-relaxed mx-auto mb-10"
            style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)", maxWidth: "600px" }}>
            Auditez votre projet IA, identifiez vos obligations réglementaires
            et générez votre roadmap de conformité — sans cabinet d'avocats.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
            <Link href="/auth/login">
              <button className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-semibold text-sm hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 cursor-pointer">
                Démarrer gratuitement
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="flex items-center gap-1.5 text-sm text-[#003399] font-medium cursor-pointer hover:underline underline-offset-2">
                Voir les tarifs <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>

          <p className="text-white/20 text-xs mt-7">Sans carte bancaire · Annulation à tout moment</p>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-20 z-20">
          <div className="w-[1px] h-10 bg-white/60" style={{ animation: "fade-up 2s ease-in-out infinite" }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STATS BAR — blanc Apple
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white border-b border-black/[0.06]">
        <div className="max-w-[980px] mx-auto px-5 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { val: "43", sub: "Règlements & textes EU" },
              { val: "14 276", sub: "Extraits officiels indexés" },
              { val: "Quotidienne", sub: "Mise à jour automatique" },
              { val: "16", sub: "Outils juridiques IA" },
            ].map(({ val, sub }) => (
              <div key={sub}>
                <p className="font-bold tracking-[-0.03em] text-[#1D1D1F] mb-1"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
                  {val}
                </p>
                <p className="text-xs text-[#6E6E73] leading-snug">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          APERÇU PRODUIT — capture d'écran (remplaçable par vidéo)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white pt-20 pb-8">
        <div className="max-w-[980px] mx-auto px-5 text-center">
          <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Aperçu produit</p>
          <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F] mb-3"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
            Le consultant juridique, en action.
          </h2>
          <p className="text-[#6E6E73] text-sm max-w-[520px] mx-auto mb-10">
            Posez votre question en langage naturel. CompliAI répond avec les articles, considérants
            et décisions exacts — chaque source est citée et vérifiable.
          </p>
        </div>
        <div className="max-w-[900px] mx-auto px-5">
          <ProductPreview />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          MÉTHODOLOGIE / CRÉDIBILITÉ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 border-b border-black/[0.06]">
        <div className="max-w-[980px] mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Zap,
                title: "Mise à jour quotidienne",
                desc: "Le corpus est actualisé automatiquement chaque jour depuis les sources officielles. Votre conformité reste à jour sans effort.",
              },
              {
                icon: BookOpen,
                title: "Sources officielles citées",
                desc: "Chaque réponse renvoie aux textes exacts : EUR-Lex, CJUE, EDPB et autorités nationales. Rien n'est inventé, tout est vérifiable.",
              },
              {
                icon: Scale,
                title: "43 règlements, 14 276 extraits",
                desc: "AI Act, RGPD, DSA, DMA, DORA, NIS2, Data Act, jurisprudence CJUE, lignes directrices EDPB — un corpus juridique structuré et vectorisé.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#F5F5F7] rounded-3xl p-7">
                <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center mb-5 shadow-sm">
                  <Icon className="h-5 w-5 text-[#003399]" />
                </div>
                <h3 className="font-semibold text-[#1D1D1F] mb-2 tracking-[-0.02em]" style={{ fontSize: "1.05rem" }}>
                  {title}
                </h3>
                <p className="text-[#6E6E73] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADLINE SECTION — "Conçu pour votre métier"
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F5F5F7] py-24">
        <div className="max-w-[980px] mx-auto px-5 text-center">
          <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Pour tous les acteurs</p>
          <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F] leading-tight mb-5"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
            Conçu pour votre métier.
          </h2>
          <p className="text-[#6E6E73] max-w-[580px] mx-auto leading-relaxed"
            style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)" }}>
            Que vous soyez fondateur, juriste ou chercheur, CompliAI s'adapte à vos besoins spécifiques.
          </p>
        </div>

        {/* 3-col cards */}
        <div className="max-w-[980px] mx-auto px-5 mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Building2,
              title: "Startups & Entreprises",
              desc: "Auditez vos produits IA, générez votre registre réglementaire et suivez vos obligations en temps réel.",
              cta: "Auditer mon projet",
            },
            {
              icon: Gavel,
              title: "Juristes & Avocats",
              desc: "Recherche sémantique dans les textes officiels, génération de clauses contractuelles, suivi EUR-Lex.",
              cta: "Outils pour avocats",
            },
            {
              icon: GraduationCap,
              title: "Étudiants & Chercheurs",
              desc: "Textes de loi annotés, quiz interactifs, comparateurs de législations entre les 27 États membres.",
              cta: "Accès académique",
            },
          ].map(({ icon: Icon, title, desc, cta }) => (
            <Link href="/auth/login" key={title}>
              <div className="bg-white rounded-3xl p-8 h-full flex flex-col cursor-pointer group transition-all hover:shadow-[0_8px_40px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
                <div className="w-11 h-11 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mb-5 group-hover:bg-[#003399]/8 transition-colors">
                  <Icon className="h-5 w-5 text-[#1D1D1F]" />
                </div>
                <h3 className="font-semibold text-[#1D1D1F] mb-3 tracking-[-0.02em]" style={{ fontSize: "1.1rem" }}>
                  {title}
                </h3>
                <p className="text-[#6E6E73] text-sm leading-relaxed flex-1">{desc}</p>
                <div className="mt-5 flex items-center gap-1 text-sm font-medium text-[#003399] group-hover:gap-2 transition-all">
                  {cta} <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BENTO GRID — 4 features, Apple-style
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="fonctionnalités" className="bg-[#F5F5F7] pb-24">
        <div className="max-w-[980px] mx-auto px-5">

          <div className="text-center mb-12">
            <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Plateforme complète</p>
            <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              4 modes. Une seule plateforme.
            </h2>
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card 1 — large, dark */}
            <div className="bg-[#1D1D1F] rounded-3xl p-8 md:col-span-2 flex flex-col md:flex-row gap-8 items-start group cursor-default">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/50 text-[11px] font-medium mb-5">
                  Mode 1
                </div>
                <h3 className="font-bold text-white tracking-[-0.03em] leading-tight mb-3"
                  style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}>
                  Audit de conformité<br />en 5 minutes
                </h3>
                <p className="text-white/50 text-sm leading-relaxed max-w-[380px]">
                  Décrivez votre projet IA et obtenez un verdict immédiat — AI Act, RGPD, DSA — avec une roadmap d'actions priorisées.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-[240px] h-[160px] rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <FileSearch className="h-12 w-12 text-white/20" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-3xl p-8 cursor-default group">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73] text-[11px] font-medium mb-5">
                Mode 2
              </div>
              <h3 className="font-bold text-[#1D1D1F] tracking-[-0.02em] leading-tight mb-3 text-xl">
                Consultant juridique IA 24/7
              </h3>
              <p className="text-[#6E6E73] text-sm leading-relaxed">
                Analyse depuis la bibliothèque juridique indexée (droits européens, jurisprudence, États membres).
                Synthèse ou note développée au choix. Information juridique générale — pas un dossier défendu par un
                avocat.
              </p>
              <div className="mt-6 h-px bg-[#F5F5F7]" />
              <Link
                href={loginRedirectHref("/dashboard/chat")}
                className="mt-4 flex items-center gap-2 text-[#003399] text-sm font-medium cursor-pointer hover:gap-3 transition-all"
              >
                <MessageSquare className="h-4 w-4" />
                Accéder au consultant
              </Link>
            </div>

            {/* Card 3 */}
            <div className="bg-[#003399] rounded-3xl p-8 cursor-default">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/50 text-[11px] font-medium mb-5">
                Mode 3
              </div>
              <h3 className="font-bold text-white tracking-[-0.02em] leading-tight mb-3 text-xl">
                Registre IA réglementaire
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                L'AI Act impose un registre des systèmes à haut risque. CompliAI le génère et le maintient automatiquement.
              </p>
              <div className="mt-6 h-px bg-white/10" />
              <Link
                href={loginRedirectHref("/dashboard/register")}
                className="mt-4 flex items-center gap-2 text-[#FFCC00] text-sm font-medium cursor-pointer hover:gap-3 transition-all"
              >
                <BookOpen className="h-4 w-4" />
                Voir le registre
              </Link>
            </div>

            {/* Card 4 — large */}
            <div className="bg-[#F5F5F7] rounded-3xl p-8 md:col-span-2 flex flex-col md:flex-row gap-8 items-center cursor-default">
              <div className="flex-shrink-0 w-full md:w-[240px] h-[140px] rounded-2xl bg-white border border-black/[0.06] flex items-center justify-center shadow-sm">
                <Bell className="h-10 w-10 text-[#003399]/30" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white text-[#6E6E73] text-[11px] font-medium mb-5 border border-black/[0.06]">
                  Mode 4
                </div>
                <h3 className="font-bold text-[#1D1D1F] tracking-[-0.02em] leading-tight mb-3"
                  style={{ fontSize: "clamp(1.3rem, 3vw, 1.8rem)" }}>
                  Veille réglementaire automatisée
                </h3>
                <p className="text-[#6E6E73] text-sm leading-relaxed max-w-[420px]">
                  Scan quotidien d'EUR-Lex. Dès qu'une mise à jour impacte vos projets, vous recevez une alerte avec analyse d'impact.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PROBLEM / SOLUTION — Split Apple-style
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="max-w-[980px] mx-auto px-5">

          <div className="text-center mb-16">
            <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              Pourquoi CompliAI ?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Problem */}
            <div className="bg-[#F5F5F7] rounded-3xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-semibold text-red-500 uppercase tracking-widest">Sans CompliAI</span>
              </div>
              <p className="font-bold text-[#1D1D1F] tracking-[-0.02em] leading-snug mb-6"
                style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)" }}>
                Un audit juridique coûte entre 15 000€ et 50 000€
              </p>
              <div className="space-y-3">
                {[
                  "Délais de 2 à 6 semaines",
                  "350€–600€/heure de conseil",
                  "Zéro mise à jour automatique",
                  "Incompréhensible pour les non-juristes",
                ].map(p => (
                  <div key={p} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <X className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="text-sm text-[#6E6E73]">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Solution */}
            <div className="bg-[#1D1D1F] rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 opacity-5">
                <EUFlagSVG width={200} height={133} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <CheckCircle2 className="h-4 w-4 text-[#FFCC00]" />
                  <span className="text-xs font-semibold text-[#FFCC00] uppercase tracking-widest">Avec CompliAI</span>
                </div>
                <p className="font-bold text-white tracking-[-0.02em] leading-snug mb-6"
                  style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)" }}>
                  Audit complet en 5 minutes pour 49€/mois
                </p>
                <div className="space-y-3">
                  {[
                    "Résultats immédiats, 24h/24",
                    "Abonnement fixe, sans surprise",
                    "Mises à jour EUR-Lex automatiques",
                    "Explications simples avec citations",
                  ].map(p => (
                    <div key={p} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#FFCC00]/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3 w-3 text-[#FFCC00]" />
                      </div>
                      <span className="text-sm text-white/70">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          AI ACT PYRAMID — sombre Apple
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#1D1D1F] py-24">
        <div className="max-w-[680px] mx-auto px-5 text-center">
          <p className="text-xs font-semibold text-white/30 tracking-widest uppercase mb-4">
            Classification AI Act
          </p>
          <h2 className="font-bold text-white tracking-[-0.03em] mb-12"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
            Pyramide des risques
          </h2>

          <div className="space-y-3">
            {[
              { label: "Inacceptable", from: "#EF4444", to: "#DC2626", w: "32%", ref: "Art. 5" },
              { label: "Haut risque", from: "#F97316", to: "#EA580C", w: "52%", ref: "Annexe III" },
              { label: "Risque limité", from: "#EAB308", to: "#CA8A04", w: "74%", ref: "Art. 50" },
              { label: "Risque minimal", from: "#22C55E", to: "#16A34A", w: "100%", ref: "Code volontaire" },
            ].map(level => (
              <div key={level.label} className="flex items-center gap-5 justify-center">
                <div
                  className="h-11 rounded-xl flex items-center justify-center transition-all hover:brightness-110 cursor-default"
                  style={{
                    width: level.w,
                    background: `linear-gradient(90deg, ${level.from}, ${level.to})`,
                  }}
                >
                  <span className="text-white text-xs font-semibold px-4 whitespace-nowrap">{level.label}</span>
                </div>
                <span className="text-white/20 text-xs w-20 text-left hidden md:block">{level.ref}</span>
              </div>
            ))}
          </div>
          <p className="text-white/20 text-xs mt-10">
            CompliAI détermine automatiquement votre niveau de risque
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TOOLS — grille Apple
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="outils" className="bg-white py-24">
        <div className="max-w-[980px] mx-auto px-5">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Aperçu produit</p>
            <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F] text-2xl md:text-3xl mb-3">
              Voyez ce que vous obtenez après inscription
            </h2>
            <p className="text-sm text-[#6E6E73] max-w-xl mx-auto">
              Consultant sourcé, checklist DPO et audit express — trois parcours utilisés chaque jour par les équipes
              conformité.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-16">
            {[
              {
                title: "Consultant juridique",
                desc: "Chat avec citations EUR-Lex / CJUE, note développée ou synthèse.",
                href: "/dashboard/chat",
              },
              {
                title: "Checklist conformité",
                desc: "Roadmap AI Act + RGPD priorisée, export CSV/PDF, suivi des statuts.",
                href: "/dashboard/tools/checklist",
              },
              {
                title: "Audit express",
                desc: "Verdict AI Act en quelques minutes, score et actions bloquantes.",
                href: "/dashboard/projects/new",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={loginRedirectHref(card.href)}
                className="rounded-2xl border border-black/[0.06] bg-[#F5F5F7] p-5 hover:bg-white hover:shadow-md transition-all"
              >
                <p className="font-semibold text-[#1D1D1F] text-sm">{card.title}</p>
                <p className="text-xs text-[#6E6E73] mt-2 leading-relaxed">{card.desc}</p>
                <p className="text-xs text-[#003399] font-medium mt-4">Essayer →</p>
              </Link>
            ))}
          </div>

          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">16 outils spécialisés</p>
            <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F]"
              style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              Pour les entreprises,<br />les avocats et les étudiants.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
            {TOOLS.map(tool => (
              <Link key={tool.name} href={loginRedirectHref(tool.href)}>
                <div className="flex items-center gap-3 p-4 bg-[#F5F5F7] hover:bg-white border border-transparent hover:border-black/[0.08] rounded-2xl transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#003399]/5 transition-colors">
                    <tool.icon className="h-4 w-4 text-[#1D1D1F]" style={{ width: "16px", height: "16px" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1D1D1F] leading-tight truncate">{tool.name}</p>
                    <p className="text-xs text-[#6E6E73] mt-0.5">{tool.tag}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[#6E6E73] ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href={loginRedirectHref("/dashboard/tools")}>
              <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#003399] text-white text-sm font-medium hover:bg-[#0044cc] transition-colors cursor-pointer">
                Voir tous les outils
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          REGULATIONS — fond Apple sombre
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="réglementations" className="bg-[#F5F5F7] py-24">
        <div className="max-w-[980px] mx-auto px-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <EUFlagSVG width={28} height={19} />
            <p className="text-xs font-semibold text-[#6E6E73] tracking-widest uppercase">Base juridique officielle</p>
          </div>
          <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F] mb-3"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
            43 règlements européens.<br />1 seule plateforme.
          </h2>
          <p className="text-[#6E6E73] text-sm mb-12 max-w-[560px] mx-auto">
            14 276 extraits officiels indexés depuis EUR-Lex, CJUE et les autorités de protection des données,
            vectorisés pour une recherche sémantique précise.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {REGULATIONS.map(reg => (
              <div
                key={reg.name}
                className="bg-white rounded-2xl px-6 py-4 text-center min-w-[120px] border border-black/[0.06] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-default"
              >
                <p className="font-bold text-[#1D1D1F] tracking-[-0.02em] text-lg">{reg.name}</p>
                <p className="text-[10px] text-[#6E6E73] mt-1">{reg.ref}</p>
                <p className="text-[10px] text-[#003399] font-semibold mt-1">{reg.year}</p>
              </div>
            ))}
            <div className="bg-[#003399] rounded-2xl px-6 py-4 text-center min-w-[120px] flex flex-col items-center justify-center cursor-default">
              <p className="font-bold text-white tracking-[-0.02em] text-lg">+33</p>
              <p className="text-[10px] text-white/70 mt-1 leading-snug">autres textes,<br />directives & JP</p>
            </div>
          </div>

          <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#6E6E73] hover:text-[#1D1D1F] mt-10 transition-colors cursor-pointer">
            <ArrowRight className="h-3 w-3" />
            Source officielle · eur-lex.europa.eu
          </a>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="max-w-[980px] mx-auto px-5">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#003399] tracking-widest uppercase mb-4">Ils nous font confiance</p>
            <h2 className="font-bold tracking-[-0.03em] text-[#1D1D1F]"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              Ce que disent nos utilisateurs.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map(t => (
              <div key={t.author}
                className="bg-[#F5F5F7] rounded-3xl p-7 cursor-default hover:shadow-[0_8px_40px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all">
                <div className="flex gap-0.5 mb-5">
                  {[0,1,2,3,4].map(i => (
                    <Star key={i} className="h-3.5 w-3.5 fill-[#FFCC00] text-[#FFCC00]" />
                  ))}
                </div>
                <p className="text-[#1D1D1F] text-sm leading-relaxed mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#003399] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {t.author.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#1D1D1F]">{t.author}</p>
                    <p className="text-[11px] text-[#6E6E73]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FINAL CTA — plein écran Apple
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#000] py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,51,153,0.30) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-[680px] mx-auto px-5 text-center">
          <EUFlagSVG width={40} height={27} className="mx-auto mb-8 opacity-80" />

          <h2 className="font-bold text-white tracking-[-0.04em] leading-tight mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}>
            Prêt à sécuriser<br />votre conformité IA ?
          </h2>
          <p className="text-white/45 mb-10 leading-relaxed" style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)" }}>
            Rejoignez des centaines de startups, avocats et juristes qui utilisent CompliAI pour naviguer le droit européen.
          </p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex -space-x-2">
              {["ML","TD","SC","AB","FP"].map(i => (
                <div key={i} className="w-7 h-7 rounded-full bg-[#003399] border-2 border-[#000] flex items-center justify-center text-white text-[9px] font-bold">
                  {i}
                </div>
              ))}
            </div>
            <p className="text-white/35 text-xs">
              <span className="text-white/70 font-semibold">500+</span> utilisateurs actifs
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <button className="group flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#FFCC00] text-[#003399] font-semibold text-sm hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-500/20 cursor-pointer">
                <Shield className="h-4 w-4" />
                Démarrer gratuitement
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="flex items-center gap-1.5 text-sm text-white/50 font-medium cursor-pointer hover:text-white/80 transition-colors px-4">
                Voir les tarifs <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </Link>
          </div>
          <p className="text-white/45 text-xs mt-6">Sans carte bancaire · Annulation à tout moment</p>
        </div>
      </section>

      <MarketingSiteFooter />

    </div>
  );
}
