"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Download,
  FileJson,
  ExternalLink,
  BookOpen,
  Scale,
  Shield,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const ROPA_STORAGE_KEY = "compliai_ropa_state";

const SECTORS = [
  "Santé",
  "Finance / Assurance",
  "RH / Recrutement",
  "Éducation",
  "Commerce / E-commerce",
  "Administration publique",
  "Tech / SaaS",
  "Conseil / Cabinet",
  "Industrie",
  "Autre",
];
const SIZES = [
  "TPE (< 10 salariés)",
  "PME (10-249 salariés)",
  "ETI (250-4999 salariés)",
  "Grande entreprise (5000+)",
];

const MODE_OPTIONS = [
  {
    id: "register_batch" as const,
    label: "Registre multi-traitements",
    desc: "Idéal pour produire 6 à 10 fiches à partir de la synthèse de vos activités.",
  },
  {
    id: "single_fiche" as const,
    label: "Une fiche Art. 30 détaillée",
    desc: "Un seul traitement : finalités, base légale, données, durées, mesures.",
  },
  { id: "audit" as const, label: "Audit d’une fiche existante", desc: "Collez une fiche ou un extrait pour relever les manques." },
];

const TYPE_TEMPLATES = [
  { value: "", label: "— Modèle type (optionnel) —" },
  { value: "RH-001", label: "RH-001 — Gestion de la paie" },
  { value: "RH-002", label: "RH-002 — Recrutement" },
  { value: "MARKETING-001", label: "MARKETING-001 — Newsletter" },
  { value: "IT-001", label: "IT-001 — Journaux / logs" },
  { value: "IA-001", label: "IA-001 — Scoring / IA" },
  { value: "CLIENT-001", label: "CLIENT-001 — Gestion clients" },
];

function loadPersisted():
  | { result: Record<string, unknown>; form: Record<string, unknown> }
  | null {
  try {
    const raw = localStorage.getItem(ROPA_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { result: Record<string, unknown>; form: Record<string, unknown> };
  } catch {
    return null;
  }
}

export default function RoPAPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template_id")?.trim() || undefined;

  const [mode, setMode] = useState<"register_batch" | "single_fiche" | "audit">("register_batch");
  const [form, setForm] = useState({
    company_name: "",
    sector: "Tech / SaaS",
    company_size: "PME (10-249 salariés)",
    activities: "",
    dpo_name: "",
    dpo_email: "",
    treatment_name: "",
    role: "",
    intake_extended: "",
    existing_record: "",
    template_hint: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [expandedTreatment, setExpandedTreatment] = useState<string | null>(null);

  useEffect(() => {
    const p = loadPersisted();
    if (p?.result) {
      setResult(p.result);
      if (p.form && typeof p.form === "object") {
        const { mode: savedMode, ...rest } = p.form as Record<string, unknown>;
        setForm(f => ({ ...f, ...rest }));
        if (savedMode === "single_fiche" || savedMode === "audit" || savedMode === "register_batch") {
          setMode(savedMode);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!result) return;
    try {
      localStorage.setItem(ROPA_STORAGE_KEY, JSON.stringify({ result, form: { ...form, mode } }));
    } catch {/* ignore */}
  }, [result, form, mode]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const canGenerate =
    mode === "audit" ? form.existing_record.trim().length >= 20
    : mode === "single_fiche" ?
      Boolean(form.company_name && form.treatment_name && (form.intake_extended.trim() || form.activities.trim()))
    : Boolean(form.company_name && form.activities);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate/ropa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          mode,
          company_name: form.company_name,
          sector: form.sector,
          company_size: form.company_size,
          activities: form.activities,
          dpo_name: form.dpo_name,
          dpo_email: form.dpo_email,
          treatment_name: form.treatment_name,
          role: form.role,
          intake_extended: form.intake_extended,
          existing_record: form.existing_record,
          template_hint: form.template_hint || undefined,
          template_id: templateId,
        }),
      });
      const data = (await res.json()) as { error?: string; content?: Record<string, unknown> };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setResult(data.content ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  async function downloadPdf() {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch("/api/generate/ropa/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, companyName: form.company_name }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ropa-${form.company_name.replace(/\s/g, "_") || "registre"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloadingPdf(false);
    }
  }

  function downloadCsv() {
    if (!result?.treatments || !Array.isArray(result.treatments)) return;
    const treatments = result.treatments as Record<string, unknown>[];
    const headers = ["ID", "Nom", "Finalité", "Base légale", "Données", "Personnes", "Conservation", "DPIA", "Sensibles", "Hors UE"];
    const rows = treatments.map(t => [
      String(t.id ?? ""),
      String(t.name ?? ""),
      String(t.purpose ?? ""),
      String(t.legal_basis ?? ""),
      Array.isArray(t.categories) ? (t.categories as string[]).join(" | ") : "",
      String(t.data_subjects ?? ""),
      String(t.retention ?? ""),
      t.dpia_required ? "Oui" : "Non",
      t.sensitive_data ? "Oui" : "Non",
      t.transfers_outside_eu ? "Oui" : "Non",
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ropa-${(form.company_name || "export").replace(/\s/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ropa-${(form.company_name || "export").replace(/\s/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = result?.summary as Record<string, unknown> | undefined;
  const watchlist =
    result?.dashboard && typeof result.dashboard === "object" ?
      (result.dashboard as { watchlist?: unknown[] }).watchlist
    : undefined;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" /> RoPA — Registre des activités de traitement
          </h1>
          <p className="text-sm text-muted-foreground">Art. 30 RGPD (UE 2016/679) — Responsable & sous-traitant</p>
        </div>
      </div>

      <Card className="border-teal-100 bg-teal-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-teal-900 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Qui doit tenir un RoPA ?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-teal-950 space-y-2">
          <p>
            <strong>Obligation légale</strong> : organisation de <strong>250 salariés ou plus</strong> (Art. 30(5) RGPD).
          </p>
          <p>
            <strong>Souvent obligatoire en dessous de 250</strong> si traitements non occasionnels à risque, données sensibles
            (Art. 9), données pénales (Art. 10), etc.
          </p>
          <p>
            <strong>Deux formats</strong> : <strong>responsable de traitement</strong> (Art. 30(1) — 7 blocs) ·{" "}
            <strong>sous-traitant</strong> (Art. 30(2) — 4 blocs).
          </p>
          <p className="text-xs text-teal-800">Sans RoPA à jour, la démonstration de conformité vis-à-vis de la CNIL (ou autre DPA) est très difficile.</p>
        </CardContent>
      </Card>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mode de génération</CardTitle>
            <p className="text-sm text-muted-foreground">Choisissez la mission de conformité puis complétez le formulaire.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {MODE_OPTIONS.map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    mode === opt.id ? "border-teal-500 bg-teal-50/50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="ropa-mode"
                    checked={mode === opt.id}
                    onChange={() => setMode(opt.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-slate-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nom de l&apos;organisation *</label>
                <input
                  value={form.company_name}
                  onChange={e => set("company_name", e.target.value)}
                  placeholder="MaSociété SAS"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Secteur</label>
                <select
                  value={form.sector}
                  onChange={e => set("sector", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {SECTORS.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Taille</label>
                <select
                  value={form.company_size}
                  onChange={e => set("company_size", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {SIZES.map(s => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">DPO — nom</label>
                <input
                  value={form.dpo_name}
                  onChange={e => set("dpo_name", e.target.value)}
                  placeholder="Facultatif pour l’IA"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1">DPO — email</label>
                <input
                  value={form.dpo_email}
                  onChange={e => set("dpo_email", e.target.value)}
                  placeholder="dpo@entreprise.fr"
                  type="email"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {mode === "register_batch" && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">
                  Synthèse des activités & familles de traitements *
                </label>
                <textarea
                  value={form.activities}
                  onChange={e => set("activities", e.target.value)}
                  placeholder="Ex. : CRM clients B2B, facturation, paie, recrutement, analytics produit, emailing marketing, support client…"
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            )}

            {mode === "single_fiche" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Nom du traitement *</label>
                    <input
                      value={form.treatment_name}
                      onChange={e => set("treatment_name", e.target.value)}
                      placeholder="Ex. Gestion de la paie"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-1">Votre rôle</label>
                    <input
                      value={form.role}
                      onChange={e => set("role", e.target.value)}
                      placeholder="Responsable / Sous-traitant / Co-responsable"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Modèle type</label>
                  <select
                    value={form.template_hint}
                    onChange={e => set("template_hint", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {TYPE_TEMPLATES.map(t => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">
                    Questionnaire (finalités, base légale Art. 6, données, personnes, durées, destinataires, transferts, mesures…) *
                  </label>
                  <textarea
                    value={form.intake_extended}
                    onChange={e => set("intake_extended", e.target.value)}
                    rows={8}
                    placeholder="Copiez ou rédigez les réponses par section. Les zones vides seront marquées [À COMPLÉTER] par l’IA."
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>
              </>
            )}

            {mode === "audit" && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Fiche ou extrait de registre à auditer *</label>
                <textarea
                  value={form.existing_record}
                  onChange={e => set("existing_record", e.target.value)}
                  rows={10}
                  placeholder="Collez le texte de votre fiche RoPA, d’un tableau Excel exporté, ou d’un extrait PDF…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button onClick={generate} disabled={loading || !canGenerate} className="w-full bg-teal-600 hover:bg-teal-700">
              {loading ?
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Génération RoPA…
                </>
              : "Générer"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{String(result.title ?? "RoPA")}</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setExpandedTreatment(null);
                }}
              >
                Nouveau registre
              </Button>
              <Button variant="outline" size="sm" onClick={exportJson}>
                <FileJson className="h-4 w-4 mr-1" /> JSON
              </Button>
              <Button variant="outline" size="sm" onClick={downloadCsv} className="bg-white">
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloadingPdf} className="bg-teal-600 hover:bg-teal-700">
                {downloadingPdf ?
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                : <Download className="h-4 w-4 mr-1" />}
                PDF
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/tools/dpia">
                <Scale className="h-3.5 w-3.5 mr-1" /> AIPD / DPIA
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/tools/contracts">
                <Search className="h-3.5 w-3.5 mr-1" /> Analyse contrat (DPA)
              </Link>
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard/tools/classifier">
                <Shield className="h-3.5 w-3.5 mr-1" /> Classifieur AI Act
              </Link>
            </Button>
          </div>

          {typeof result.mode_applied === "string" && (
            <p className="text-xs text-slate-500">
              Mode : <strong>{result.mode_applied}</strong>
            </p>
          )}

          {summary && typeof summary === "object" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Traitements", value: summary.total_treatments, color: "text-teal-600" },
                { label: "Données sensibles", value: summary.treatments_with_sensitive_data, color: "text-red-600" },
                { label: "DPIA / AIPD", value: summary.treatments_requiring_dpia, color: "text-amber-600" },
                { label: "Transferts hors UE", value: summary.treatments_with_eu_transfers, color: "text-blue-600" },
                ...(typeof summary.treatments_with_ai === "number" ?
                  [{ label: "Lien IA", value: summary.treatments_with_ai, color: "text-violet-600" }]
                : []),
              ].map(s => (
                <div key={s.label} className="bg-white border rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{String(s.value ?? 0)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {Array.isArray(watchlist) && watchlist.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm text-amber-900">Points de vigilance</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-amber-950 space-y-1">
                  {watchlist.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                      {String(w)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.audit_report != null && typeof result.audit_report === "object" ?
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Rapport d&apos;audit Art. 30</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 space-y-3">
                <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(result.audit_report, null, 2)}
                </pre>
              </CardContent>
            </Card>
          : null}

          <div className="space-y-3">
            {(result.treatments as Record<string, unknown>[] | undefined)?.map(t => {
              const id = String(t.id ?? "");
              return (
                <Card key={id}>
                  <CardContent className="pt-4 pb-4">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedTreatment(expandedTreatment === id ? null : id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{id}</span>
                          <p className="text-sm font-semibold">{String(t.name ?? "")}</p>
                          {typeof t.status === "string" && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{t.status}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {t.sensitive_data ?
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Art. 9</span>
                          : null}
                          {t.dpia_required ?
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> DPIA
                            </span>
                          : null}
                          {t.transfers_outside_eu ?
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Hors UE</span>
                          : null}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 text-left line-clamp-2">{String(t.purpose ?? "")}</p>
                    </button>

                    {expandedTreatment === id && (
                      <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Base légale</p>
                          <p>{String(t.legal_basis ?? "")}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Conservation</p>
                          <p>{String(t.retention ?? "")}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Données</p>
                          <p>{Array.isArray(t.categories) ? (t.categories as string[]).join(", ") : ""}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Personnes</p>
                          <p>{String(t.data_subjects ?? "")}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Destinataires</p>
                          <p>{Array.isArray(t.recipients) ? (t.recipients as string[]).join(", ") : ""}</p>
                        </div>
                        {t.tool_links_hint != null && typeof t.tool_links_hint === "object" ?
                          <div className="sm:col-span-2 flex flex-wrap gap-2">
                            {Object.entries(t.tool_links_hint as Record<string, string>).map(([k, href]) => (
                              <Link key={k} href={href.startsWith("/") ? href : `/${href}`}>
                                <Button variant="outline" size="sm" className="h-7 text-xs">
                                  {k} <ExternalLink className="h-3 w-3 ml-0.5 opacity-70" />
                                </Button>
                              </Link>
                            ))}
                          </div>
                        : null}
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Mesures (extrait)</p>
                          <ul className="space-y-0.5">
                            {Array.isArray(t.security_measures) ?
                              (t.security_measures as unknown[]).map((m, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-xs">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  {String(m)}
                                </li>
                              ))
                            : null}
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {result.notes != null && String(result.notes).length > 0 ?
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">{String(result.notes)}</p>
          : null}

          {result.professional_disclaimer != null && String(result.professional_disclaimer).length > 0 ?
            <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3">
              {String(result.professional_disclaimer)}
            </p>
          : null}

          <p className="text-xs text-slate-400 text-center">
            Document indicatif — validez avec votre DPO. Tenir le registre accessible pour l&apos;autorité de contrôle (Art. 30 §4).
          </p>
        </div>
      )}
    </div>
  );
}
