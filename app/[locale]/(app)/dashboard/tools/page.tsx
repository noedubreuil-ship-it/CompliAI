import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { LEGAL_TOOL_SECTIONS, type NavItem } from "@/lib/navigation/app-nav";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

/** Slug de traduction dérivé du href (ex: /dashboard/tools/dpia → tools_dpia). */
function navSlug(href: string): string {
  return href.replace(/^\/dashboard\/?/, "").replace(/\//g, "_") || "root";
}

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

function ToolCard({ tool, isPro, colorClass, label, desc, proRequiredLabel }: { tool: NavItem; isPro: boolean; colorClass: string; label: string; desc: string; proRequiredLabel: string }) {
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
                  {label}
                </h3>
                {locked ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-800 border border-amber-200">
                    {proRequiredLabel}
                  </span>
                ) : tool.badge ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass(tool.badge)}`}>
                    {tool.badge}
                  </span>
                ) : null}
              </div>
              <p className={`text-xs leading-relaxed ${locked ? "text-neutral-400" : "text-muted-foreground"}`}>
                {desc}
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

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tools" });
  return { title: t("metaTitle") };
}

export default async function ToolsPage() {
  const t = await getTranslations("Tools");
  const ts = await getTranslations("Dashboard.appNav");
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
      title={t("title")}
      breadcrumb={t("breadcrumb")}
      maxWidth="max-w-5xl"
      description={t("description", { count: toolCount })}
    >
      <div className="space-y-10">
        {LEGAL_TOOL_SECTIONS.map((section) => (
          <div key={section.id} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">{ts(`sec_${section.id}`)}</h2>
              {section.catalogSubtitle && (
                <p className="text-sm text-muted-foreground">{ts(`catalog_${section.id}`)}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {section.items.map((tool, i) => (
                <ToolCard
                  key={tool.href}
                  tool={tool}
                  isPro={isPro}
                  colorClass={ICON_COLORS[i % ICON_COLORS.length]}
                  label={ts(`${navSlug(tool.href)}.l`)}
                  desc={ts(`${navSlug(tool.href)}.d`)}
                  proRequiredLabel={t("proRequired")}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
          <div className="text-sm text-neutral-600">
            <strong className="text-neutral-900">{t("footerBold")}</strong> {t("footerText")}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
