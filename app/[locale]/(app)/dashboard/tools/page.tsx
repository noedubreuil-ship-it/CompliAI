import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { LEGAL_TOOL_SECTIONS, type NavItem } from "@/lib/navigation/app-nav";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

const ICON_COLORS = [
  "bg-cyan-50 text-cyan-700",
  "bg-blue-50 text-blue-600",
  "bg-indigo-50 text-indigo-600",
  "bg-violet-50 text-violet-600",
  "bg-amber-50 text-amber-600",
  "bg-teal-50 text-teal-600",
  "bg-emerald-50 text-emerald-600",
  "bg-orange-50 text-orange-600",
  "bg-slate-100 text-slate-700",
];

const BADGE_STYLES: Record<string, string> = {
  Pro: "bg-slate-100 text-slate-700",
  "Bêta — pas un audit": "bg-cyan-50 text-cyan-800",
  Bêta: "bg-cyan-50 text-cyan-800",
};

function badgeClass(badge?: string) {
  if (!badge) return "bg-slate-100 text-slate-600";
  return BADGE_STYLES[badge] ?? "bg-blue-50 text-blue-700";
}

function ToolCard({ tool, isPro, colorClass }: { tool: NavItem; isPro: boolean; colorClass: string }) {
  const locked = tool.requiresPro && !isPro;
  const href = locked ? "/dashboard/upgrade" : tool.href;

  return (
    <Link href={href}>
      <Card
        className={`h-full transition-all cursor-pointer group ${locked ? "opacity-70 hover:opacity-90" : "hover:border-neutral-300 hover:shadow-md"}`}
      >
        <CardContent className="pt-5 pb-5 h-full flex flex-col">
          <div className="flex items-start gap-4 flex-1">
            <div
              className={`p-2.5 rounded-xl flex-shrink-0 ${locked ? "bg-neutral-100 text-neutral-400" : colorClass}`}
            >
              {locked ? <Lock className="h-5 w-5" /> : <tool.icon className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className={`font-semibold text-sm ${locked ? "text-neutral-400" : "text-neutral-900"}`}>
                  {tool.label}
                </h3>
                {locked ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    Pro requis
                  </span>
                ) : tool.badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass(tool.badge)}`}>
                    {tool.badge}
                  </span>
                ) : null}
              </div>
              <p className={`text-xs leading-relaxed ${locked ? "text-neutral-400" : "text-muted-foreground"}`}>
                {tool.description}
              </p>
            </div>
            <ArrowRight
              className={`h-4 w-4 flex-shrink-0 mt-1 transition-opacity ${locked ? "text-amber-500 opacity-60 group-hover:opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export const metadata = { title: "Outils juridiques IA — CompliAI" };

export default async function ToolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user!.id)
    .single();
  const isPro = profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise";

  const toolCount = LEGAL_TOOL_SECTIONS.reduce((n, s) => n + s.items.length, 0);

  return (
    <ToolPageShell
      title="Outils juridiques IA"
      breadcrumb="Catalogue"
      maxWidth="max-w-5xl"
      description={`${toolCount} outils pour la conformité, la jurisprudence, la formation et la pratique du droit européen de l'IA.`}
    >
      <div className="space-y-10">
        {LEGAL_TOOL_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{section.label}</h2>
              {section.catalogSubtitle && (
                <p className="text-sm text-muted-foreground">{section.catalogSubtitle}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {section.items.map((tool, i) => (
                <ToolCard key={tool.href} tool={tool} isPro={isPro} colorClass={ICON_COLORS[i % ICON_COLORS.length]} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="text-sm text-neutral-600">
            <strong className="text-neutral-900">Textes officiels indexés</strong> — AI Act, RGPD, DSA, jurisprudence
            CJUE/CEDH. Information juridique générale, non un conseil personnalisé.
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
