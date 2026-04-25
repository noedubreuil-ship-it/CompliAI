import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, Shield, Users, FileSearch2, TrendingUp, ArrowRight, Sparkles,
  BookOpen, HelpCircle, GraduationCap, BookMarked, Swords,
  Briefcase, Globe2, FilePen, Gavel, ClipboardCheck, Scale,
} from "lucide-react";

const COMPLIANCE_TOOLS = [
  {
    href: "/dashboard/tools/art11",
    icon: FileText,
    title: "Documentation Art. 11",
    description: "Documentation technique obligatoire pour systèmes IA à haut risque (Annexe IV). Export PDF.",
    badge: "Obligatoire haut risque",
    badgeColor: "bg-red-50 text-red-700",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/dashboard/tools/fria",
    icon: Shield,
    title: "FRIA Art. 27",
    description: "Évaluation d'Impact sur les Droits Fondamentaux. Obligatoire entités publiques.",
    badge: "Obligatoire entités publiques",
    badgeColor: "bg-orange-50 text-orange-700",
    color: "bg-purple-50 text-purple-600",
  },
  {
    href: "/dashboard/tools/policy",
    icon: Users,
    title: "Politique IA Employés",
    description: "Politique d'usage de l'IA adaptée à votre entreprise. Obligation Art. 4 littératie IA.",
    badge: "Art. 4 AI Act",
    badgeColor: "bg-blue-50 text-blue-700",
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/dashboard/tools/contracts",
    icon: FileSearch2,
    title: "Analyse de contrats tiers",
    description: "Collez votre contrat OpenAI, AWS, Google... Claude analyse la conformité AI Act & RGPD.",
    badge: "Art. 25 RGPD + Art. 28 AI Act",
    badgeColor: "bg-slate-100 text-slate-700",
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/dashboard/tools/investor-report",
    icon: TrendingUp,
    title: "Rapport Investisseurs",
    description: "Due diligence IA en 1 page. Score de conformité, risques, plan d'action.",
    badge: "Feature Pro",
    badgeColor: "bg-blue-50 text-blue-700",
    color: "bg-indigo-50 text-indigo-600",
  },
];

const STUDENT_TOOLS = [
  {
    href: "/dashboard/tools/resume-arret",
    icon: BookOpen,
    title: "Résumé d'arrêts & commentaires guidés",
    description: "Collez un arrêt CJUE, CEDH ou décision DPA → fiche d'arrêt complète + plan de commentaire détaillé.",
    badge: "Nouveau",
    badgeColor: "bg-blue-100 text-blue-700",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/dashboard/tools/quiz",
    icon: HelpCircle,
    title: "Quiz de droit de l'IA interactif",
    description: "QCM générés par Claude sur l'AI Act, RGPD, DSA... Correction immédiate avec citation du texte.",
    badge: "Fort",
    badgeColor: "bg-yellow-100 text-yellow-700",
    color: "bg-yellow-50 text-yellow-600",
  },
  {
    href: "/dashboard/tools/plan-memoire",
    icon: GraduationCap,
    title: "Générateur de plans de mémoires",
    description: "Proposez un sujet → plan en 2 parties / 4 sous-parties, problématique, bibliographie indicative.",
    badge: "Moyen",
    badgeColor: "bg-indigo-100 text-indigo-700",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    href: "/dashboard/tools/explication-article",
    icon: BookMarked,
    title: "Explication d'articles de loi",
    description: "Sélectionnez un article AI Act, RGPD ou DSA → expliqué à 3 niveaux : clair, cas pratique, doctrine.",
    badge: "Fort",
    badgeColor: "bg-green-100 text-green-700",
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/dashboard/tools/simulateur",
    icon: Swords,
    title: "Simulateur de cas pratique",
    description: "Jeu de rôle réglementaire — défendez votre position face au régulateur, DPO ou avocat adverse. Score final.",
    badge: "Très différenciant",
    badgeColor: "bg-red-100 text-red-700",
    color: "bg-red-50 text-red-600",
  },
];

const PRO_TOOLS = [
  {
    href: "/dashboard/tools/memoire-conformite",
    icon: Briefcase,
    title: "Mémoire de conformité IA",
    description: "Décrivez la situation client → mémoire juridique structuré (qualification, risques, plan d'action). Format cabinet.",
    badge: "Nouveau",
    badgeColor: "bg-slate-100 text-slate-700",
    color: "bg-slate-100 text-slate-700",
  },
  {
    href: "/dashboard/tools/comparateur",
    icon: Globe2,
    title: "Comparateur de législations",
    description: "Comparez la transposition d'une directive (AI Act, RGPD...) entre deux États membres. Tableau côte-à-côte.",
    badge: "Fort",
    badgeColor: "bg-cyan-100 text-cyan-700",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    href: "/dashboard/tools/clauses-contrat",
    icon: FilePen,
    title: "Générateur de clauses contractuelles IA",
    description: "Clauses prêtes à l'emploi : responsabilité IA, DPA Art. 28, transparence algorithmique, portabilité.",
    badge: "Fort",
    badgeColor: "bg-violet-100 text-violet-700",
    color: "bg-violet-50 text-violet-600",
  },
  {
    href: "/dashboard/tools/analyse-decision",
    icon: Gavel,
    title: "Analyse de décisions d'autorités",
    description: "Collez une sanction CNIL, DPC, EDPB → analyse structurée : faits, raisonnement, montant, implications.",
    badge: "Fort",
    badgeColor: "bg-orange-100 text-orange-700",
    color: "bg-orange-50 text-orange-600",
  },
  {
    href: "/dashboard/tools/audit-qr",
    icon: ClipboardCheck,
    title: "Q&R pour audits réglementaires",
    description: "Décrivez votre système IA → 20 questions que poserait un auditeur ANC, avec criticité et préparation.",
    badge: "Moyen",
    badgeColor: "bg-teal-100 text-teal-700",
    color: "bg-teal-50 text-teal-600",
  },
  {
    href: "/dashboard/tools/recherche-jurisprudentielle",
    icon: Scale,
    title: "Recherche jurisprudentielle IA",
    description: "Recherche CJUE + CEDH + DPA par thème ou article. Résumés structurés avec ECLI et implications pratiques.",
    badge: "Moyen",
    badgeColor: "bg-indigo-100 text-indigo-700",
    color: "bg-indigo-50 text-indigo-600",
  },
];

function ToolSection({ title, subtitle, emoji, tools }: { title: string; subtitle: string; emoji: string; tools: typeof COMPLIANCE_TOOLS }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full hover:border-slate-400 transition-all hover:shadow-md cursor-pointer group">
              <CardContent className="pt-5 pb-5 h-full flex flex-col">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${tool.color}`}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm">{tool.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: "Outils juridiques IA — CompliAI" };

export default function ToolsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">Outils juridiques IA</h1>
        <p className="text-muted-foreground mt-1">
          {COMPLIANCE_TOOLS.length + STUDENT_TOOLS.length + PRO_TOOLS.length} outils pour la conformité, la formation et la pratique du droit européen de l&apos;IA.
        </p>
      </div>

      <ToolSection
        emoji="🏢"
        title="Conformité entreprise"
        subtitle="Documents obligatoires et analyses de conformité AI Act & RGPD"
        tools={COMPLIANCE_TOOLS}
      />

      <ToolSection
        emoji="🎓"
        title="Étudiants en droit"
        subtitle="Outils pédagogiques et de formation au droit de l'IA"
        tools={STUDENT_TOOLS}
      />

      <ToolSection
        emoji="⚖️"
        title="Professionnels du droit"
        subtitle="Avocats, juristes, DPO — outils de pratique avancée"
        tools={PRO_TOOLS}
      />

      <div className="bg-slate-50 border rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <strong className="text-slate-900">Tous les outils sont basés sur les textes officiels</strong> —
          {" "}AI Act UE 2024/1689, RGPD UE 2016/679, DSA UE 2022/2065, jurisprudence CJUE/CEDH.
          Ils constituent des informations juridiques générales, non des conseils personnalisés. Faites valider par un avocat.
        </div>
      </div>
    </div>
  );
}
