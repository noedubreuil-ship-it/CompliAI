import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Shield, ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { loginRedirectHref } from "@/lib/marketing/site-links";

export default function PricingPage() {
  const t = useTranslations("Pricing");

  const PLANS = [
    { key: "free", price: "0", period: t("free.period"), ctaHref: loginRedirectHref("/dashboard"), highlight: false },
    { key: "starter", price: "49", period: t("perMonth"), ctaHref: loginRedirectHref("/dashboard"), highlight: false },
    { key: "pro", price: "199", period: t("perMonth"), ctaHref: loginRedirectHref("/dashboard"), highlight: true },
    { key: "enterprise", price: null, period: "", ctaHref: "mailto:enterprise@compliai.eu", highlight: false },
  ] as const;

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6" />
            CompliAI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">{t("navLogin")}</Button>
            </Link>
            <Link href="/auth/login">
              <Button size="sm">{t("navStart")} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">{t("title")}</h1>
          <p className="text-slate-600 mt-3 max-w-lg mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const features = t.raw(`${plan.key}.features`) as string[];
            const missing = t.raw(`${plan.key}.missing`) as string[];
            return (
            <Card
              key={plan.key}
              className={`relative flex flex-col ${plan.highlight ? "border-2 border-slate-900 shadow-lg" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap">
                  {t("popular")}
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg">{t(`${plan.key}.name`)}</CardTitle>
                <div>
                  {plan.price === null ? (
                    <p className="text-2xl font-bold">{t("quote")}</p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}€</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t(`${plan.key}.desc`)}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <ul className="space-y-2 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {missing.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="h-4 w-4 flex-shrink-0 mt-0.5 text-center leading-4">—</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.ctaHref}>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {t(`${plan.key}.cta`)}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );})}
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold text-center mb-2">{t("compareTitle")}</h2>
          <p className="text-center text-muted-foreground text-sm mb-8 max-w-xl mx-auto">
            {t("compareSubtitle")}
          </p>
          <div className="overflow-x-auto border rounded-xl shadow-sm">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">{t("colFeature")}</th>
                  <th className="text-left p-4 font-semibold w-[28%]">{t("colStarter")}</th>
                  <th className="text-left p-4 font-semibold w-[28%] border-l-2 border-slate-900">{t("colPro")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(t.raw("compareRows") as string[][]).map(([feat, st, pr]) => (
                  <tr key={String(feat)}>
                    <td className="p-4 text-muted-foreground">{feat}</td>
                    <td className="p-4">{st}</td>
                    <td className="p-4 border-l bg-slate-50/50">{pr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("taxLine")}
          </p>
          <p className="text-xs text-muted-foreground border rounded-lg px-4 py-3 bg-slate-50 max-w-2xl mx-auto">
            <strong>{t("disclaimerLabel")}</strong> {t("disclaimer")}
          </p>
        </div>
      </div>
      <MarketingFooter />
    </div>
  );
}
