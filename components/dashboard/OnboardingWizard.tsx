"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, Building2, Users, ChevronRight, ChevronLeft,
  Cpu, FileText, MessageSquare, Sparkles, CheckCircle2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTORS = [
  { id: "sante", label: "Santé & Médical", emoji: "🏥" },
  { id: "finance", label: "Finance & Banque", emoji: "🏦" },
  { id: "rh", label: "RH & Recrutement", emoji: "👥" },
  { id: "education", label: "Éducation", emoji: "🎓" },
  { id: "retail", label: "Commerce & Retail", emoji: "🛍️" },
  { id: "industrie", label: "Industrie & Manufacturing", emoji: "🏭" },
  { id: "transport", label: "Transport & Logistique", emoji: "🚗" },
  { id: "energie", label: "Énergie & Utilities", emoji: "⚡" },
  { id: "media", label: "Médias & Contenu", emoji: "📱" },
  { id: "juridique", label: "Juridique & Compliance", emoji: "⚖️" },
  { id: "tech", label: "Tech & SaaS", emoji: "💻" },
  { id: "autre", label: "Autre", emoji: "🏢" },
];

const COMPANY_SIZES = [
  { id: "solo", label: "Indépendant / Freelance", desc: "1 personne" },
  { id: "startup", label: "Startup / PME", desc: "2–49 employés" },
  { id: "medium", label: "ETI", desc: "50–249 employés" },
  { id: "large", label: "Grande entreprise", desc: "250+ employés" },
];

const FEATURES = [
  { icon: Shield, label: "Audit AI Act", desc: "Scanner vos projets IA en 5 min" },
  { icon: MessageSquare, label: "Consultant Juridique", desc: "Questions en langage naturel" },
  { icon: FileText, label: "Générateur de docs", desc: "Art. 11, FRIA, Politiques IA" },
  { icon: Cpu, label: "Registre IA", desc: "Inventaire obligatoire AI Act" },
];

interface Props {
  userName: string;
}

export default function OnboardingWizard({ userName }: Props) {
  const [step, setStep] = useState(0);
  const [sector, setSector] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const firstName = userName?.split(" ")[0] || "vous";

  const steps = [
    { id: "welcome", title: "Bienvenue" },
    { id: "org", title: "Votre organisation" },
    { id: "sector", title: "Secteur d'activité" },
    { id: "features", title: "Ce que vous pouvez faire" },
  ];

  async function finish() {
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      const updatePayload: Record<string, unknown> = {
        sector,
        company_size: companySize,
        onboarding_completed: true,
      };
      if (orgName.trim()) updatePayload.full_name = orgName.trim();

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user.id);

      if (error) throw error;

      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Bienvenue sur CompliAI 🎉",
          body: "Commencez par auditer votre premier projet IA ou posez une question au consultant juridique.",
          type: "success",
          link: "/dashboard/projects/new",
        }),
      }).catch(() => {});

      router.refresh();
    } catch (err) {
      setSaveError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Progress */}
        <div className="flex h-1.5 bg-slate-100">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "flex-1 transition-colors duration-500",
                i <= step ? "bg-blue-500" : "bg-slate-100"
              )}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Bonjour, {firstName} 👋
                </h2>
                <p className="text-muted-foreground mt-2">
                  Bienvenue sur <strong>CompliAI</strong> — la plateforme de conformité IA pour le droit européen.
                  Configurons votre espace en 1 minute.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                {FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <f.icon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-slate-900">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Organization */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Votre organisation</h2>
                <p className="text-sm text-muted-foreground mt-1">Ces informations personnalisent votre expérience.</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nom de votre organisation (optionnel)</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Acme Corp, MyStartup…"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Taille de l'organisation</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COMPANY_SIZES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setCompanySize(s.id)}
                        className={cn(
                          "text-left p-3 rounded-xl border-2 transition-colors",
                          companySize === s.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <p className="text-sm font-medium text-slate-900">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Sector */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Secteur d'activité</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Personnalise la veille réglementaire et les alertes.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSector(s.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-colors",
                      sector === s.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    <p className="text-xs font-medium text-slate-900 mt-1 leading-tight">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Ready */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Vous êtes prêt !</h2>
                <p className="text-muted-foreground mt-2">
                  Votre espace CompliAI est configuré. Commencez par auditer votre premier projet IA ou posez une question au consultant juridique.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  La veille réglementaire est personnalisée pour le secteur <strong>{SECTORS.find(s => s.id === sector)?.label ?? "sélectionné"}</strong>
                </div>
                {companySize && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl px-4 py-3">
                    <Users className="h-4 w-4 text-green-500" />
                    Recommandations adaptées aux <strong>{COMPANY_SIZES.find(s => s.id === companySize)?.label ?? "organisations"}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              className={cn(
                "text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1",
                step === 0 && "invisible"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>

            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continuer
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {saveError && (
                  <p className="text-xs text-red-500">{saveError}</p>
                )}
                <Button onClick={finish} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Accéder au tableau de bord
                </Button>
              </div>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full transition-all",
                  i === step ? "w-4 h-1.5 bg-blue-500" : "w-1.5 h-1.5 bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
