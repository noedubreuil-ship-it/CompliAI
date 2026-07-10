"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileSearch2, Loader2, AlertTriangle, CheckCircle2, Info, XCircle, Download } from "lucide-react";
import Link from "next/link";
import ComplianceScore from "@/components/dashboard/ComplianceScore";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-200 bg-red-50",
  high: "border-orange-200 bg-orange-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-blue-200 bg-blue-50",
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  compliant: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  risk: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  missing: <XCircle className="h-4 w-4 text-red-500" />,
  recommendation: <Info className="h-4 w-4 text-blue-500" />,
};

function clauseStatusLabel(s: string | undefined): string {
  const x = (s || "").toLowerCase();
  if (x === "present") return "Présente";
  if (x === "partial") return "Partielle";
  if (x === "absent") return "Absente";
  if (x === "na" || x === "n/a") return "N/A";
  return s || "—";
}

function clauseStatusClass(s: string | undefined): string {
  const x = (s || "").toLowerCase();
  if (x === "present") return "bg-emerald-100 text-emerald-800";
  if (x === "partial") return "bg-amber-100 text-amber-900";
  if (x === "absent") return "bg-red-100 text-red-800";
  if (x === "na" || x === "n/a") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-700";
}

export default function ContractsPage() {
  const [providerName, setProviderName] = useState("");
  const [contractText, setContractText] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [contractType, setContractType] = useState("");
  const [contractVersionOrDate, setContractVersionOrDate] = useState("");
  const [roleInRelationship, setRoleInRelationship] = useState("");
  const [personalDataContext, setPersonalDataContext] = useState("");
  const [providerTrainingUse, setProviderTrainingUse] = useState("");
  const [serviceCriticality, setServiceCriticality] = useState("");
  const [sector, setSector] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate/contract/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `analyse-contrat-${(result.provider ?? "fournisseur").replace(/\s/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    finally { setDownloading(false); }
  }

  async function analyze() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/contract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_text: contractText,
          provider_name: providerName,
          service_description: serviceDescription || undefined,
          contract_type: contractType || undefined,
          contract_version_or_date: contractVersionOrDate || undefined,
          role_in_relationship: roleInRelationship || undefined,
          personal_data_context: personalDataContext || undefined,
          provider_training_use: providerTrainingUse || undefined,
          service_criticality: serviceCriticality || undefined,
          sector: sector || undefined,
          company_country: companyCountry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.analysis);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setContractText(ev.target?.result as string ?? "");
    reader.readAsText(file);
    if (!providerName) setProviderName(file.name.replace(/\.[^/.]+$/, ""));
  }

  const displayName = result?.contract_analyzed?.provider || result?.provider;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSearch2 className="h-5 w-5 text-amber-600" /> Analyse de contrat tiers
          </h1>
          <p className="text-sm text-muted-foreground">
            Art. 28 RGPD (DPA) · AI Act (déployeur / chaîne, arts 25–30) · DORA / NIS2 selon secteur — sous-traitance IA
          </p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Contrat à analyser</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nom du fournisseur *</label>
              <input value={providerName} onChange={e => setProviderName(e.target.value)}
                placeholder="OpenAI, AWS, Google Cloud, Mistral…"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Importer un fichier texte (.txt)</label>
              <input type="file" accept=".txt,.text" onChange={handleFile}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Collez le texte du contrat (ou extraits pertinents) *
                <span className="text-slate-400 font-normal ml-1">— jusqu&apos;à 16 000 car. analysées (variable serveur)</span>
              </label>
              <textarea value={contractText} onChange={e => setContractText(e.target.value)}
                placeholder="DPA, CGU données, SLA sécurité, sous-traitants, audit, transferts hors UE…"
                rows={10}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">{contractText.length} caractères</p>
            </div>

            <details className="rounded-lg border bg-slate-50/80 px-3 py-2">
              <summary className="text-sm font-medium text-slate-700 cursor-pointer py-1">Configuration analyse (Option B — contexte acheteur / DPO)</summary>
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">Service précisé</label>
                  <input value={serviceDescription} onChange={e => setServiceDescription(e.target.value)}
                    placeholder="Ex : API GPT-4o, Vertex AI, stockage objet…"
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Type de document</label>
                  <input value={contractType} onChange={e => setContractType(e.target.value)}
                    placeholder="CGU, DPA, MSA…"
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Version / date</label>
                  <input value={contractVersionOrDate} onChange={e => setContractVersionOrDate(e.target.value)}
                    placeholder="v3 — 05/2025"
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">Rôle (RT / ST / les deux)</label>
                  <input value={roleInRelationship} onChange={e => setRoleInRelationship(e.target.value)}
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">Données personnelles & sensibilité</label>
                  <textarea value={personalDataContext} onChange={e => setPersonalDataContext(e.target.value)}
                    rows={2}
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Entraînement modèle par fournisseur</label>
                  <input value={providerTrainingUse} onChange={e => setProviderTrainingUse(e.target.value)}
                    placeholder="Oui / opt-out / inconnu…"
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Criticité service</label>
                  <input value={serviceCriticality} onChange={e => setServiceCriticality(e.target.value)}
                    placeholder="critique / important / standard"
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Secteur (DORA, NIS2…)</label>
                  <input value={sector} onChange={e => setSector(e.target.value)}
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600">Pays entreprise cliente</label>
                  <input value={companyCountry} onChange={e => setCompanyCountry(e.target.value)}
                    className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                </div>
              </div>
            </details>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={analyze} disabled={loading || !providerName || !contractText.trim()} className="w-full bg-amber-600 hover:bg-amber-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours (30‑90 s)…</> : "Analyser le contrat"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Analyse — {displayName}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouveau contrat</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-amber-600 hover:bg-amber-700">
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-wrap items-start gap-6">
                <ComplianceScore score={result.risk_score ?? 50} size="lg" />
                <div className="flex-1 space-y-2 min-w-[200px]">
                  <div className="flex flex-wrap gap-2">
                    {(typeof result.score_rgpd_art28 === "number") && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border font-medium">
                        RGPD Art. 28 : <strong>{result.score_rgpd_art28}</strong>/100 {result.score_indicator_rgpd === "green" ? "🟢"
                          : result.score_indicator_rgpd === "yellow" ? "🟡" : result.score_indicator_rgpd === "orange" ? "🟠" : "🔴"}
                      </span>
                    )}
                    {(typeof result.score_ai_act === "number") && (
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border font-medium">
                        AI Act : <strong>{result.score_ai_act}</strong>/100 {result.score_indicator_ai_act === "green" ? "🟢"
                          : result.score_indicator_ai_act === "yellow" ? "🟡" : result.score_indicator_ai_act === "orange" ? "🟠" : "🔴"}
                      </span>
                    )}
                    {result.risk_level_global && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                        Risque global : {result.risk_level_global.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">{result.overall_assessment}</p>
                  <div className="flex gap-3 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${result.gdpr_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      Synthèse RGPD : {result.gdpr_compliant ? "Favorable / à valider juridiquement" : "Écarts matériels probables"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${result.ai_act_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      Synthèse AI Act : {result.ai_act_compliant ? "Favorable / à valider" : "Écarts matériels probables"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {Array.isArray(result.gdpr_art28_clauses) && result.gdpr_art28_clauses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Grille Art. 28 RGPD</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-left bg-slate-50">
                      <th className="py-2 pr-2">Clause</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Localisation</th>
                      <th className="py-2">Évaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.gdpr_art28_clauses.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-2 font-medium">{row.id}. {(row.title || "").slice(0, 120)}</td>
                        <td className="py-2 pr-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${clauseStatusClass(row.status)}`}>
                            {clauseStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-slate-600 max-w-[140px]">{row.location}</td>
                        <td className="py-2 text-slate-700">{row.evaluation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {Array.isArray(result.ai_act_deployer_clauses) && result.ai_act_deployer_clauses.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Grille AI Act (déployeur)</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-left bg-slate-50">
                      <th className="py-2 pr-2">Point</th>
                      <th className="py-2 pr-2">Statut</th>
                      <th className="py-2 pr-2">Localisation</th>
                      <th className="py-2">Évaluation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ai_act_deployer_clauses.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100 align-top">
                        <td className="py-2 pr-2 font-medium">{row.id}. {(row.title || "").slice(0, 120)}</td>
                        <td className="py-2 pr-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${clauseStatusClass(row.status)}`}>
                            {clauseStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-2 text-slate-600 max-w-[140px]">{row.location}</td>
                        <td className="py-2 text-slate-700">{row.evaluation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {result.sector_notes && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sectoriel · DORA / NIS2 / santé…</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-slate-700 whitespace-pre-wrap">{result.sector_notes}</p></CardContent>
            </Card>
          )}

          {result.critical_gaps?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader><CardTitle className="text-sm text-red-800">Lacunes critiques à traiter en priorité</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {result.critical_gaps.map((g: any, i: number) => (
                  <div key={i} className="rounded-lg border border-red-100 bg-red-50/80 p-3 space-y-1">
                    <p className="text-sm font-semibold text-red-900">{i + 1}. {g.title}</p>
                    {g.legal_basis && <p className="text-xs text-red-950/90"><strong>Fondement :</strong> {g.legal_basis}</p>}
                    {g.finding && <p className="text-xs text-slate-800"><strong>Constat :</strong> {g.finding}</p>}
                    {g.risk && <p className="text-xs text-slate-800"><strong>Risque :</strong> {g.risk}</p>}
                    {g.clause_to_negotiate && (
                      <p className="text-xs mt-2 p-2 bg-white rounded border border-red-100">
                        <strong>Clause à exiger / négocier :</strong> {g.clause_to_negotiate}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.moderate_attention_points?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Points d&apos;attention</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.moderate_attention_points.map((p: any, i: number) => (
                  <div key={i} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold">{p.title}</p>
                    {p.legal_basis && <p className="text-xs text-slate-600 mt-1">{p.legal_basis}</p>}
                    <p className="text-xs text-slate-700 mt-1">{p.finding}</p>
                    <p className="text-xs text-amber-800 mt-1"><strong>Recommandation :</strong> {p.recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.sanctions_reference?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sanctions · plafonds théoriques</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="text-muted-foreground mb-2">Référence aux maximums réglementaires — aucun automatismes sur une sanction encourue dans votre dossier.</p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="py-2 pr-2">Cadre</th>
                        <th className="py-2 pr-2">Sanction maximale réglementaire (rappel)</th>
                        <th className="py-2">P. (qualitative rapport)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.sanctions_reference.map((sRow: any, i: number) => (
                        <tr key={i} className="border-b align-top">
                          <td className="py-2 pr-2">{sRow.foundation}</td>
                          <td className="py-2 pr-2">{sRow.max_sanction}</td>
                          <td className="py-2">{sRow.probability_H_M_L}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {result.findings?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Analyse détaillée ({result.findings.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.findings.map((f: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border ${SEVERITY_COLORS[f.severity] ?? ""}`}>
                    <div className="flex items-start gap-2">
                      {TYPE_ICON[f.type] ?? TYPE_ICON.recommendation}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{f.title}</p>
                          <span className="text-xs text-slate-500">{f.category}</span>
                        </div>
                        <p className="text-xs mt-1 opacity-90">{f.description}</p>
                        {f.regulation_ref && (
                          <p className="text-xs mt-1 font-medium opacity-70">{f.regulation_ref}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.missing_clauses?.length > 0 && (
            <Card className="border-red-200">
              <CardHeader><CardTitle className="text-sm text-red-700">Clauses manquantes (synthèse)</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {result.missing_clauses.map((c: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2 items-start text-red-700">
                      <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.action_plan && (result.action_plan.immediate?.length || result.action_plan.short_term_30_90_days?.length || result.action_plan.at_next_renewal?.length) ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Plan d&apos;action recommandé</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                {result.action_plan.immediate?.length ?
                  <>
                    <p className="font-semibold text-red-900">Immédiat</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">{result.action_plan.immediate.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                  </>
                : null}
                {result.action_plan.short_term_30_90_days?.length ?
                  <>
                    <p className="font-semibold">À court terme (30‑90 jours)</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">{result.action_plan.short_term_30_90_days.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                  </>
                : null}
                {result.action_plan.at_next_renewal?.length ?
                  <>
                    <p className="font-semibold text-amber-900">À négocier au prochain renouvellement</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-700">{result.action_plan.at_next_renewal.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                  </>
                : null}
              </CardContent>
            </Card>
          ) : null}

          {result.recommended_amendments?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Amendements recommandés</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {result.recommended_amendments.map((a: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      {a}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.professional_disclaimer && (
            <p className="text-[11px] text-slate-500 leading-relaxed border-t pt-4">{result.professional_disclaimer}</p>
          )}
        </div>
      )}
    </div>
  );
}
