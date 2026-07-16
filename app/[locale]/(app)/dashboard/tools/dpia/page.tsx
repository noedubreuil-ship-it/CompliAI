"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, Loader2, Download, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

const RISK_LABELS: Record<string, string> = {
  low: "Faible", medium: "Modéré", high: "Élevé", critical: "Critique",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  implemented: { label: "Mis en place", color: "text-green-700 bg-green-50" },
  planned: { label: "Planifié", color: "text-amber-700 bg-amber-50" },
  required: { label: "Requis", color: "text-red-700 bg-red-50" },
};

const SECTORS = ["Santé", "Finance / Assurance", "RH / Recrutement", "Éducation", "Commerce / E-commerce",
  "Administration publique", "Transport / Logistique", "Industrie / Manufacture", "Médias / Publicité", "Autre"];

export default function DPIAPage() {
  const locale = useLocale();
  const [form, setForm] = useState({
    treatment_name: "", controller: "", purposes: "", data_types: "",
    data_subjects: "", retention: "", recipients: "", sector: "Santé",
    automated_decisions: false, large_scale: false, sensitive_data: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate/dpia/pdf", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, treatmentName: form.treatment_name }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `dpia-${form.treatment_name.replace(/\s/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    finally { setDownloading(false); }
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/dpia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const canGenerate = form.treatment_name && form.controller && form.purposes && form.data_types && form.data_subjects;

  return (
    <ToolPageShell
      title={result ? (result as { title?: string }).title ?? "DPIA" : "DPIA — Analyse d'Impact sur la Protection des Données"}
      breadcrumb="DPIA"
      icon={FileSearch}
      maxWidth="max-w-4xl"
      description={!result ? "Art. 35 RGPD (UE 2016/679) + Lignes directrices EDPB WP248" : undefined}
      actions={result ? (
        <>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouvelle DPIA</Button>
          <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-blue-600 hover:bg-blue-700">
            {downloading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />PDF…</> : <><Download className="h-4 w-4 mr-1" />PDF</>}
          </Button>
        </>
      ) : undefined}
    >
      {!result && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Quand une DPIA est-elle obligatoire ?</strong> Traitement à grande échelle de données sensibles, 
        décisions automatisées avec effet significatif, surveillance systématique, ou tout traitement 
        susceptible d'engendrer un risque élevé pour les personnes (Art. 35 RGPD + liste CNIL).
      </div>
      )}

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Informations sur le traitement</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "treatment_name", label: "Nom du traitement *", placeholder: "Système de scoring crédit IA" },
                { key: "controller", label: "Responsable de traitement *", placeholder: "MaSociété SA" },
                { key: "data_subjects", label: "Personnes concernées *", placeholder: "Clients particuliers, adultes" },
                { key: "retention", label: "Durée de conservation", placeholder: "5 ans après fin de relation" },
                { key: "recipients", label: "Destinataires / Sous-traitants", placeholder: "AWS (hébergement), Équipe Data" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Secteur *</label>
                <select value={form.sector} onChange={e => set("sector", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Finalités du traitement *</label>
              <textarea value={form.purposes} onChange={e => set("purposes", e.target.value)}
                placeholder="Évaluation du risque de crédit par IA pour l'octroi de prêts personnels..."
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Catégories de données traitées *</label>
              <textarea value={form.data_types} onChange={e => set("data_types", e.target.value)}
                placeholder="Données financières, historique bancaire, revenus, données comportementales..."
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { key: "automated_decisions", label: "Décisions automatisées (Art. 22)", sublabel: "Effet juridique ou significatif" },
                { key: "large_scale", label: "Traitement à grande échelle", sublabel: "Volume important de données/personnes" },
                { key: "sensitive_data", label: "Données sensibles (Art. 9)", sublabel: "Santé, origine, religion, biométrie..." },
              ].map(({ key, label, sublabel }) => (
                <label key={key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="checkbox" checked={(form as any)[key]} onChange={e => set(key, e.target.checked)}
                    className="w-4 h-4 rounded mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-500">{sublabel}</p>
                  </div>
                </label>
              ))}
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button onClick={generate} disabled={loading || !canGenerate} className="w-full bg-blue-600 hover:bg-blue-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyse en cours (30-60s)…</> : "Générer la DPIA"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">{result.executive_summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${RISK_COLORS[result.overall_risk_level] ?? ""}`}>
                      Risque global : {RISK_LABELS[result.overall_risk_level] ?? result.overall_risk_level}
                    </span>
                    {result.consultation_required && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Consultation CNIL requise
                      </span>
                    )}
                    {result.dpia_required && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        DPIA obligatoire
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Assessment */}
          {result.processing_description && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Évaluation du traitement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(result.processing_description).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {key === "purposes_assessment" ? "Finalités" : key === "legal_basis" ? "Base légale" : key === "proportionality" ? "Proportionnalité" : "Nécessité"}
                    </p>
                    <p className="text-sm text-slate-700">{val as string}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risks */}
          {result.risks?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Risques identifiés</h3>
              <div className="space-y-3">
                {result.risks.map((r: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-semibold text-sm">{r.risk}</p>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${RISK_COLORS[r.severity] ?? ""}`}>
                            Sévérité : {RISK_LABELS[r.severity] ?? r.severity}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${RISK_COLORS[r.residual_risk] ?? ""}`}>
                            Résiduel : {RISK_LABELS[r.residual_risk] ?? r.residual_risk}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">Menace : {r.threat}</p>
                      <p className="text-sm text-green-700 bg-green-50 rounded-lg p-2">
                        <strong>Mesures :</strong> {r.measures}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Measures */}
          {result.measures?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mesures de protection</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.measures.map((m: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${STATUS_CONFIG[m.status]?.color ?? ""}`}>
                        {STATUS_CONFIG[m.status]?.label ?? m.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{m.measure}</p>
                        <p className="text-xs text-slate-500">{m.category} — {m.article_ref}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rights */}
          {result.data_subject_rights && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Droits des personnes concernées</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(result.data_subject_rights).map(([right, desc]) => (
                    <div key={right} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-700 capitalize">{right}</p>
                        <p className="text-xs text-slate-500">{desc as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* DPO Opinion & Action Plan */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Avis DPO & Plan d&apos;action</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.dpo_opinion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1"><Info className="h-3 w-3" /> Avis DPO</p>
                  <p className="text-sm text-blue-800">{result.dpo_opinion}</p>
                </div>
              )}
              {result.conclusion && <p className="text-sm text-slate-700">{result.conclusion}</p>}
              {result.action_plan?.length > 0 && (
                <ul className="space-y-1">
                  {result.action_plan.map((a: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              {result.consultation_required && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Les risques résiduels restent élevés. Une consultation préalable de l&apos;autorité de contrôle compétente (CNIL) est obligatoire avant tout déploiement (Art. 36 RGPD).</span>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400 text-center">
            Ce document est généré à titre indicatif. Faites-le valider par votre DPO ou un juriste avant dépôt officiel.
          </p>
        </div>
      )}
    </ToolPageShell>
  );
}
