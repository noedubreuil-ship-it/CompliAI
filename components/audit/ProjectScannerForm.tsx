"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, Loader2, Shield } from "lucide-react";
import type { ProjectFormData } from "@/lib/types/audit";

const SECTORS = [
  "Santé & MedTech",
  "Finance & FinTech",
  "RH & Recrutement",
  "Éducation",
  "Transport & Mobilité",
  "Justice & LegalTech",
  "Commerce & E-commerce",
  "Marketing & Publicité",
  "Sécurité & Surveillance",
  "Administration publique",
  "Industrie & IoT",
  "Autre",
];

const DATA_TYPES = [
  "Données d'identité",
  "Données de localisation",
  "Données biométriques",
  "Données de santé",
  "Données financières",
  "Données comportementales",
  "Données d'opinion politique",
  "Données de navigation",
  "Données de communication",
];

const STEPS = [
  { title: "Informations générales", desc: "Nom et description du projet" },
  { title: "Données & IA", desc: "Types de données et modèle" },
  { title: "Usage & Déploiement", desc: "Public cible et périmètre" },
];

const DEFAULT_FORM: ProjectFormData = {
  name: "",
  description: "",
  sector: "",
  business_model: "",
  target_audience: "B2B",
  data_types: [],
  uses_personal_data: false,
  uses_biometric_data: false,
  uses_automated_decisions: false,
  deployment_country: ["EU"],
  ai_model_type: "",
  training_data_source: "",
};

export default function ProjectScannerForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProjectFormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function update(field: keyof ProjectFormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleDataType(type: string) {
    setForm((prev) => ({
      ...prev,
      data_types: prev.data_types.includes(type)
        ? prev.data_types.filter((t) => t !== type)
        : [...prev.data_types, type],
      uses_biometric_data: type === "Données biométriques"
        ? !prev.uses_biometric_data
        : prev.uses_biometric_data,
      uses_personal_data:
        !prev.data_types.includes(type)
          ? true
          : prev.uses_personal_data,
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de l'audit");
      router.push(`/dashboard/projects/${data.project_id}/audit/${data.audit_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setLoading(false);
    }
  }

  const isStepValid = () => {
    if (step === 0) return form.name.length > 2 && form.description.length > 10 && form.sector;
    if (step === 1) return form.ai_model_type.length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 transition-colors ${
              i < step ? "bg-green-500 text-white" :
              i === step ? "bg-slate-900 text-white" :
              "bg-slate-200 text-slate-500"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <div className="hidden sm:block flex-1 min-w-0">
              <p className={`text-xs font-medium ${i === step ? "text-slate-900" : "text-slate-500"}`}>{s.title}</p>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-green-300" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Système de scoring crédit automatisé"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez en détail ce que fait votre système IA, comment il prend des décisions et quel est son impact sur les utilisateurs..."
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sector">Secteur *</Label>
                  <Select
                    id="sector"
                    value={form.sector}
                    onChange={(e) => update("sector", e.target.value)}
                    placeholder="Sélectionnez un secteur"
                  >
                    {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_model">Modèle économique</Label>
                  <Input
                    id="business_model"
                    placeholder="Ex: SaaS B2B, Marketplace, API..."
                    value={form.business_model}
                    onChange={(e) => update("business_model", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ai_model_type">Type de modèle IA *</Label>
                <Input
                  id="ai_model_type"
                  placeholder="Ex: LLM GPT-4, modèle de classification, réseau de neurones convolutif..."
                  value={form.ai_model_type}
                  onChange={(e) => update("ai_model_type", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="training_data">Source des données d&apos;entraînement</Label>
                <Input
                  id="training_data"
                  placeholder="Ex: Dataset propriétaire, données publiques, données tierces..."
                  value={form.training_data_source}
                  onChange={(e) => update("training_data_source", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Types de données traitées</Label>
                <div className="flex flex-wrap gap-2">
                  {DATA_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleDataType(type)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.data_types.includes(type)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "border-slate-300 hover:border-slate-400 text-slate-700"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { key: "uses_automated_decisions" as const, label: "Le système prend des décisions automatisées affectant les personnes" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key] as boolean}
                      onChange={(e) => update(key, e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Public cible</Label>
                <div className="flex flex-wrap gap-2">
                  {["B2B", "B2C", "B2B2C", "Public sector"].map((audience) => (
                    <button
                      key={audience}
                      type="button"
                      onClick={() => update("target_audience", audience)}
                      className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                        form.target_audience === audience
                          ? "bg-slate-900 text-white border-slate-900"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {audience}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Pays de déploiement</Label>
                <div className="flex flex-wrap gap-2">
                  {["EU", "France", "Allemagne", "Espagne", "Italie", "Belgique", "Pays-Bas"].map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => {
                        const current = form.deployment_country;
                        update("deployment_country",
                          current.includes(country)
                            ? current.filter((c) => c !== country)
                            : [...current, country]
                        );
                      }}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                        form.deployment_country.includes(country)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary before submit */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <span>Projet :</span><span className="font-medium text-slate-900">{form.name}</span>
                  <span>Secteur :</span><span className="font-medium text-slate-900">{form.sector}</span>
                  <span>Données perso :</span><span className={`font-medium ${form.uses_personal_data ? "text-orange-600" : "text-green-600"}`}>{form.uses_personal_data ? "Oui" : "Non"}</span>
                  <span>Décisions auto :</span><span className={`font-medium ${form.uses_automated_decisions ? "text-orange-600" : "text-green-600"}`}>{form.uses_automated_decisions ? "Oui" : "Non"}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  L&apos;analyse fournie constitue une <strong>information juridique</strong>, non un conseil juridique. 
                  Validez les résultats avec un avocat spécialisé avant toute décision.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!isStepValid()}>
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Lancer l&apos;audit
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
