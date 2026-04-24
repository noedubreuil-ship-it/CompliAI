import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Shield,
  Users,
  FileSearch2,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/tools/art11",
    icon: FileText,
    title: "Documentation Art. 11",
    description: "Génère la documentation technique obligatoire pour vos systèmes IA à haut risque (Annexe IV AI Act). Export PDF + Word.",
    badge: "Obligatoire haut risque",
    badgeColor: "bg-red-50 text-red-700",
    color: "bg-blue-50 text-blue-600",
  },
  {
    href: "/dashboard/tools/fria",
    icon: Shield,
    title: "FRIA Art. 27",
    description: "Évaluation d'Impact sur les Droits Fondamentaux. Obligatoire pour les entités publiques, fortement recommandée pour tous.",
    badge: "Obligatoire entités publiques",
    badgeColor: "bg-orange-50 text-orange-700",
    color: "bg-purple-50 text-purple-600",
  },
  {
    href: "/dashboard/tools/policy",
    icon: Users,
    title: "Politique IA Employés",
    description: "Génère automatiquement une politique d'usage de l'IA adaptée à votre entreprise. PDF signable. Obligation Art. 4 littératie IA.",
    badge: "Art. 4 AI Act",
    badgeColor: "bg-blue-50 text-blue-700",
    color: "bg-green-50 text-green-600",
  },
  {
    href: "/dashboard/tools/contracts",
    icon: FileSearch2,
    title: "Analyse de contrats tiers",
    description: "Collez votre contrat OpenAI, AWS, Google, etc. Claude analyse si les clauses respectent l'AI Act et le RGPD.",
    badge: "Art. 25 RGPD + Art. 28 AI Act",
    badgeColor: "bg-slate-100 text-slate-700",
    color: "bg-amber-50 text-amber-600",
  },
  {
    href: "/dashboard/tools/investor-report",
    icon: TrendingUp,
    title: "Rapport Investisseurs",
    description: "Due diligence IA en 1 page. Score de conformité, risques, plan d'action. Les VCs et PE le demandent systématiquement.",
    badge: "Feature Pro",
    badgeColor: "bg-blue-50 text-blue-700",
    color: "bg-indigo-50 text-indigo-600",
  },
];

export const metadata = { title: "Outils juridiques IA — CompliAI" };

export default function ToolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Outils juridiques IA</h1>
        <p className="text-muted-foreground mt-1">
          Générez tous vos documents obligatoires en quelques minutes grâce à l&apos;IA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full hover:border-slate-400 transition-colors cursor-pointer group">
              <CardContent className="pt-5 pb-5 h-full flex flex-col">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${tool.color}`}>
                    <tool.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{tool.title}</h3>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tool.badgeColor}`}>
                      {tool.badge}
                    </span>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{tool.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="bg-slate-50 border rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <strong className="text-slate-900">Tous les documents sont basés sur les textes officiels</strong> —
          {" "}AI Act UE 2024/1689, RGPD UE 2016/679, DSA UE 2022/2065. Ils constituent des informations juridiques générales,
          non des conseils juridiques. Faites valider par un avocat avant signature.
        </div>
      </div>
    </div>
  );
}
