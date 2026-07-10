"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Zap, Loader2, AlertTriangle, CheckCircle, Shield, XCircle, Info } from "lucide-react";
import Link from "next/link";

const SECTORS = ["Santé", "Finance / Crédit", "RH / Recrutement", "Éducation", "Justice / Police",
  "Infrastructure critique", "Transport autonome", "Biométrie / Surveillance", "Commerce / Marketing", "Autre"];

const CLASSIFICATION_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof Shield; label: string }> = {
  "Inacceptable": { color: "text-red-700", bg: "bg-red-50", border: "border-red-300", icon: XCircle, label: "Pratique interdite" },
  "Haut risque": { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300", icon: AlertTriangle, label: "Haut risque" },
  "Risque limité": { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300", icon: Info, label: "Risque limité" },
  "Risque minimal": { color: "text-green-700", bg: "bg-green-50", border: "border-green-300", icon: CheckCircle, label: "Risque minimal" },
};

const EFFORT_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700",
};

export default function ClassifierPage() {
  const [form, setForm] = useState({
    system_name: "", description: "", use_case: "", sector: "Finance / Crédit",
    decision_impact: "", data_types: "", deployment: "", is_public: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function classify() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/classifier", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const canClassify = form.system_name && form.description && form.use_case;
  const cfg = result ? (CLASSIFICATION_CONFIG[result.classification] ?? CLASSIFICATION_CONFIG["Risque minimal"]) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-600" /> Classifieur AI Act — Sandbox réglementaire
          </h1>
          <p className="text-sm text-muted-foreground">Classification selon l&apos;AI Act (UE 2024/1689) — Annexes I, III, Art. 5 & 50</p>
        </div>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800">
        <strong>Comment ça marche ?</strong> Décrivez votre système IA et obtenez sa classification précise selon l&apos;AI Act : 
        interdit, haut risque (Annexe III), risque limité (Art. 50) ou risque minimal. 
        Avec la liste complète des obligations, délais et coûts estimés.
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Description du système IA</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nom du système *</label>
                <input value={form.system_name} onChange={e => set("system_name", e.target.value)}
                  placeholder="RecrutBot Pro" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Secteur</label>
                <select value={form.sector} onChange={e => set("sector", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Mode de déploiement</label>
                <input value={form.deployment} onChange={e => set("deployment", e.target.value)}
                  placeholder="API SaaS B2B, usage interne, application mobile..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Types de données utilisées</label>
                <input value={form.data_types} onChange={e => set("data_types", e.target.value)}
                  placeholder="CV, comportement web, données financières..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description du système *</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Système IA d'analyse de candidatures qui note les CV de 0 à 100 et recommande ou écarte automatiquement des candidats..."
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Cas d&apos;usage principal *</label>
              <textarea value={form.use_case} onChange={e => set("use_case", e.target.value)}
                placeholder="Tri automatique de CV pour des postes de cadres, décision finale prise par le RH mais fortement influencée par le score IA..."
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Impact des décisions sur les personnes</label>
              <input value={form.decision_impact} onChange={e => set("decision_impact", e.target.value)}
                placeholder="Écartement ou sélection pour un entretien, impact direct sur l'accès à l'emploi..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_public} onChange={e => set("is_public", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-slate-700">Utilisé par une entité publique ou pour un service public</span>
            </label>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button onClick={classify} disabled={loading || !canClassify} className="w-full bg-violet-600 hover:bg-violet-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Classification en cours (20-40s)…</> : "Classifier selon l'AI Act"}
            </Button>
          </CardContent>
        </Card>
      ) : cfg && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{result.system_name}</h2>
            <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouveau système</Button>
          </div>

          {/* Classification badge */}
          <div className={`rounded-2xl border-2 p-6 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start gap-4">
              <cfg.icon className={`h-10 w-10 ${cfg.color} flex-shrink-0`} />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className={`text-2xl font-bold ${cfg.color}`}>{result.classification}</h3>
                  {result.high_risk_annex && (
                    <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${cfg.border} ${cfg.color}`}>
                      {result.high_risk_annex}
                    </span>
                  )}
                  {result.gpai && (
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-purple-100 text-purple-700 border border-purple-200">
                      GPAI
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${cfg.color}`}>{result.classification_justification}</p>

                {result.prohibited && result.prohibited_reason && (
                  <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
                    <p className="text-sm font-semibold text-red-800">⛔ Pratique interdite</p>
                    {result.prohibited_article && (
                      <p className="text-xs font-mono text-red-900 mt-1">{result.prohibited_article}</p>
                    )}
                    <p className="text-sm text-red-700 mt-1">{result.prohibited_reason}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  {result.registration_required && (
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white border border-current font-medium">
                      📋 Enregistrement base EU ({result.registration_article_note ?? "Art. 49"})
                    </span>
                  )}
                  {result.ce_marking_required && (
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white border border-current font-medium">
                      🏷️ Marquage CE requis
                    </span>
                  )}
                  {result.sandbox_eligible && (
                    <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-white border border-current font-medium">
                      🧪 Éligible sandbox réglementaire
                    </span>
                  )}
                </div>
              </div>

              <div className="text-center flex-shrink-0">
                <p className="text-4xl font-bold text-slate-700">
                  {result.compliance_score_estimate != null ? result.compliance_score_estimate : "—"}
                </p>
                <p className="text-xs text-slate-500">Score estimé</p>
                <p className="text-xs text-slate-400">sans mesures</p>
              </div>
            </div>
          </div>

          {result.legal_basis && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Base légale</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.legal_basis}</p>
              </CardContent>
            </Card>
          )}

          {result.uncertainty_zones?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Zones d&apos;incertitude</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  {result.uncertainty_zones.map((z: string, i: number) => (
                    <li key={i}>{z}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.intake_followup_questions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Précisions utiles</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-decimal pl-5 space-y-1 text-sm text-amber-900">
                  {result.intake_followup_questions.map((q: string, i: number) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.rgpd_overlap_note && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Croisement RGPD</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed">{result.rgpd_overlap_note}</p>
              </CardContent>
            </Card>
          )}

          {(result.estimated_compliance_cost_eur_min != null || result.estimated_compliance_cost_eur_max != null) && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Fourchette de coûts (indicatif)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-800">
                  {result.estimated_compliance_cost_eur_min != null && result.estimated_compliance_cost_eur_max != null ?
                    `${result.estimated_compliance_cost_eur_min.toLocaleString("fr-FR")} € — ${result.estimated_compliance_cost_eur_max.toLocaleString("fr-FR")} €`
                  : result.estimated_compliance_cost_eur_min != null ?
                    `≥ ${result.estimated_compliance_cost_eur_min.toLocaleString("fr-FR")} €`
                  : `≤ ${result.estimated_compliance_cost_eur_max.toLocaleString("fr-FR")} €`}
                </p>
              </CardContent>
            </Card>
          )}

          {result.cost_estimate_table_markdown && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Détail des coûts estimés</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-slate-800 prose prose-sm max-w-none
                  prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:mt-3 prose-headings:mb-1
                  prose-p:my-2 prose-ul:my-2 prose-li:my-0.5
                  prose-table:text-xs prose-th:bg-slate-100 prose-th:p-2 prose-td:p-2 prose-td:border-b">
                  <ReactMarkdown>{result.cost_estimate_table_markdown}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {result.fiche_classification_markdown && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Fiche de classification</CardTitle></CardHeader>
              <CardContent>
                <div className="text-sm text-slate-800 prose prose-sm max-w-none
                  prose-headings:font-semibold prose-headings:text-slate-900 prose-headings:mt-4 prose-headings:mb-2
                  prose-p:my-2 prose-ul:my-2 prose-li:my-0.5
                  prose-strong:text-slate-900 prose-blockquote:border-l-4 prose-blockquote:border-violet-200 prose-blockquote:pl-4">
                  <ReactMarkdown>{result.fiche_classification_markdown}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          )}

          {result.sandbox_suggestion && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Sandbox — pistes à simuler</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{result.sandbox_suggestion}</p>
              </CardContent>
            </Card>
          )}

          {/* Conformity Assessment */}
          {result.conformity_assessment && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Évaluation de conformité requise</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div><p className="text-xs text-slate-500 mb-1">Méthode</p><p className="font-medium">{result.conformity_assessment.method}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Coût estimé</p><p className="font-medium">{result.conformity_assessment.estimated_cost}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Durée estimée</p><p className="font-medium">{result.conformity_assessment.estimated_duration}</p></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{result.conformity_assessment.article}</p>
              </CardContent>
            </Card>
          )}

          {/* Obligations */}
          {result.obligations?.filter((o: any) => o.applicable).length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Obligations applicables</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.obligations.filter((o: any) => o.applicable).map((o: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{o.obligation}</p>
                          <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{o.article}</span>
                        </div>
                        <p className="text-xs text-slate-500">{o.description}</p>
                        {o.deadline && <p className="text-xs text-slate-400 mt-0.5">⏱ {o.deadline}</p>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${EFFORT_COLORS[o.effort] ?? ""}`}>
                        {o.effort === "low" ? "Faible" : o.effort === "medium" ? "Moyen" : "Élevé"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transparency */}
          {result.transparency_obligations?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Obligations de transparence (Art. 50)</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {result.transparency_obligations.map((o: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action plan */}
          {result.recommended_actions?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Plan d&apos;action recommandé</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.recommended_actions.map((a: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">{a.priority}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{a.action}</p>
                        <p className="text-xs text-slate-400">{a.deadline} — {a.article_ref}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-400 text-center">
            Classification à titre indicatif. Consultez un juriste ou l&apos;autorité nationale compétente pour confirmation.
          </p>
        </div>
      )}
    </div>
  );
}
