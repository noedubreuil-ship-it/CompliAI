import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Shield,
  Users,
  FileSearch2,
  TrendingUp,
  BookOpen,
  HelpCircle,
  GraduationCap,
  BookMarked,
  Swords,
  Briefcase,
  Globe2,
  FilePen,
  Gavel,
  ClipboardCheck,
  Scale,
  FileSearch,
  ClipboardList,
  Zap,
  ListChecks,
  LibraryBig,
  FolderSearch,
  Plus,
  Brain,
  CalendarDays,
  Scale as ScaleIcon,
  BarChart3,
  Bell,
  Newspaper,
  Library,
  FolderOpen,
  Building2,
  Share2,
  Layers,
  LayoutDashboard,
  Wrench,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  requiresPro?: boolean;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  /** Sous-titre pour la page catalogue /dashboard/tools */
  catalogSubtitle?: string;
  items: NavItem[];
}

/** Menus déroulants — outils juridiques par section */
export const LEGAL_TOOL_SECTIONS: NavSection[] = [
  {
    id: "conformite",
    label: "Conformité",
    catalogSubtitle: "Documents obligatoires et analyses de conformité AI Act & RGPD",
    items: [
      {
        href: "/dashboard/tools/scanner",
        icon: Globe2,
        label: "Scanner page web",
        description:
          "Indicateurs RGPD / transparence sur HTML statique (bêta) — ne remplace pas un audit RGPD.",
        badge: "Bêta — pas un audit",
      },
      { href: "/dashboard/tools/dpia", icon: FileSearch, label: "DPIA Art. 35", description: "Analyse d'impact RGPD" },
      { href: "/dashboard/tools/ropa", icon: ClipboardList, label: "RoPA Art. 30", description: "Registre des traitements" },
      { href: "/dashboard/tools/classifier", icon: Zap, label: "Classifieur AI Act", description: "Sandbox réglementaire IA" },
      { href: "/dashboard/tools/checklist", icon: ListChecks, label: "Checklist conformité", description: "AI Act, RGPD, NIS2, DORA…" },
      { href: "/dashboard/tools/art11", icon: FileText, label: "Doc. Art. 11", description: "Documentation technique haut risque" },
      { href: "/dashboard/tools/fria", icon: Shield, label: "FRIA Art. 27", description: "Impact droits fondamentaux" },
      { href: "/dashboard/tools/policy", icon: Users, label: "Politique IA employés", description: "Art. 4 littératie IA" },
      { href: "/dashboard/tools/contracts", icon: FileSearch2, label: "Contrats tiers", description: "OpenAI, AWS, Google…" },
      { href: "/dashboard/tools/investor-report", icon: TrendingUp, label: "Rapport investisseurs", description: "Due diligence IA", requiresPro: true, badge: "Pro" },
    ],
  },
  {
    id: "jurisprudence",
    label: "Jurisprudence",
    catalogSubtitle: "Analyse et recherche CJUE, CEDH, DPA et décisions d'autorités",
    items: [
      { href: "/dashboard/tools/jurisprudence", icon: LibraryBig, label: "Analyseur EU", description: "CJUE, CEDH, PDF, ECLI" },
      { href: "/dashboard/tools/recherche-jurisprudentielle", icon: Scale, label: "Recherche IA", description: "CJUE + DPA par thème", requiresPro: true, badge: "Pro" },
      { href: "/dashboard/tools/analyse-decision", icon: Gavel, label: "Décisions autorités", description: "CNIL, DPC, EDPB…", requiresPro: true, badge: "Pro" },
    ],
  },
  {
    id: "formation",
    label: "Formation",
    catalogSubtitle: "Outils pédagogiques pour étudiants et formation continue",
    items: [
      { href: "/dashboard/tools/resume-arret", icon: BookOpen, label: "Résumé d'arrêts", description: "Fiches + commentaires guidés" },
      { href: "/dashboard/tools/quiz", icon: HelpCircle, label: "Quiz interactif", description: "AI Act, RGPD, DSA…" },
      { href: "/dashboard/tools/plan-memoire", icon: GraduationCap, label: "Plan de mémoire", description: "Structure académique" },
      { href: "/dashboard/tools/explication-article", icon: BookMarked, label: "Explication d'articles", description: "3 niveaux pédagogiques" },
      { href: "/dashboard/tools/simulateur", icon: Swords, label: "Cas pratique", description: "Simulation examen / barreau" },
    ],
  },
  {
    id: "cabinet",
    label: "Cabinet Pro",
    catalogSubtitle: "Avocats, juristes, DPO — pratique avancée",
    items: [
      { href: "/dashboard/tools/memoire-conformite", icon: Briefcase, label: "Mémoire conformité", description: "Note structurée cabinet", requiresPro: true, badge: "Pro" },
      { href: "/dashboard/tools/comparateur", icon: Globe2, label: "Comparateur UE-27", description: "Lois nationales + DPA", requiresPro: true, badge: "Pro" },
      { href: "/dashboard/tools/clauses-contrat", icon: FilePen, label: "Clauses contractuelles", description: "DPA, AI Act, PI…", requiresPro: true, badge: "Pro" },
      { href: "/dashboard/tools/audit-qr", icon: ClipboardCheck, label: "Q&R audit ANC", description: "20 questions auditeur", requiresPro: true, badge: "Pro" },
    ],
  },
];

export const WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard/overview", icon: LayoutDashboard, label: "Vue d'ensemble", description: "Score, audits, KPIs" },
  { href: "/dashboard/projects", icon: FolderSearch, label: "Projets", description: "Audits et conformité par projet" },
  { href: "/dashboard/projects/new", icon: Plus, label: "Nouvel audit", description: "Lancer un audit AI Act / RGPD" },
  { href: "/dashboard/brain", icon: Brain, label: "Cerveau", description: "Mémoire long terme de l'organisation" },
  { href: "/dashboard/benchmark", icon: BarChart3, label: "Benchmark sectoriel", description: "Comparaison pairs", requiresPro: true },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics DPO", description: "Rapport COMEX" },
  { href: "/dashboard/tools", icon: Wrench, label: "Tous les outils", description: "Catalogue complet" },
  { href: "/dashboard/lawyers", icon: ScaleIcon, label: "Annuaire avocats", description: "Profils et mise en relation" },
];

export const VEILLE_NAV: NavItem[] = [
  { href: "/dashboard/register", icon: BookOpen, label: "Registre IA", description: "Registre AI Act auto", requiresPro: true },
  { href: "/dashboard/alerts", icon: Bell, label: "Veille réglementaire", description: "Alertes EUR-Lex", requiresPro: true },
  { href: "/dashboard/journal", icon: Newspaper, label: "Journal UE", description: "Actualité droit numérique" },
  { href: "/dashboard/sources", icon: Library, label: "Sources juridiques", description: "33+ sources officielles" },
  { href: "/dashboard/documents", icon: FolderOpen, label: "Mes documents", description: "DPIA, RoPA, analyses" },
  { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendrier", description: "Deadlines AI Act & RGPD" },
  { href: "/dashboard/templates", icon: Layers, label: "Modèles", description: "Gabarits DPIA / RoPA" },
  { href: "/dashboard/team", icon: Building2, label: "Équipe", description: "Organisation & rôles" },
  { href: "/dashboard/integrations", icon: Share2, label: "Intégrations", description: "Webhooks, Slack, n8n" },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/overview") return pathname === "/dashboard/overview";
  if (href === "/dashboard/projects") {
    return pathname === "/dashboard/projects" || (pathname.startsWith("/dashboard/projects/") && !pathname.startsWith("/dashboard/projects/new"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionHasActiveItem(pathname: string, section: NavSection): boolean {
  return section.items.some((item) => isNavItemActive(pathname, item.href));
}
