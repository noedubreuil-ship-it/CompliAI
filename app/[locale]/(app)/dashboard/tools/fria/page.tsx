"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Loader2, Download, BookOpen } from "lucide-react";

import Link from "next/link";

const RIGHTS = [
  "Dignité humaine", "Vie privée", "Protection des données",
  "Non-discrimination", "Liberté d'expression", "Liberté de réunion",
  "Accès à l'emploi", "Présomption d'innocence", "Droit à l'éducation",
  "Accès aux soins de santé",
];

const IMPACT_COLORS: Record<string, string> = {
  none: "bg-green-100 text-green-700",
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const IMPACT_LABELS: Record<string, string> = {
  none: "Faible risque agrégé / acceptable", low: "Impact faible", medium: "Impact modéré",
  high: "Impact élevé", critical: "Impact critique",
};

const DEPLOY_REC_UI: Record<string, { label: string; cls: string }> = {
  recommended_as_is: { label: "Déploiement recommandé en l'état", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  conditional: { label: "Déploiement conditionnel", cls: "bg-amber-100 text-amber-900 border-amber-200" },
  not_recommended: { label: "Déploiement non recommandé en l'état", cls: "bg-red-100 text-red-900 border-red-200" },
};

function renderStringRecord(title: string, obj: Record<string, unknown> | undefined) {
  if (!obj || typeof obj !== "object") return null;
  const pairs = Object.entries(obj).filter(([, v]) => typeof v === "string" && (v as string).trim());
  if (!pairs.length) return null;
  return (
    <Card className="mt-2 border-slate-200">
      <CardHeader className="py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0 space-y-2 text-xs">
        {pairs.map(([k, v]) => (
          <div key={k} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 border-b border-slate-100 pb-2 last:border-0">
            <span className="font-medium text-slate-600">{k}</span>
            <span className="text-slate-800 whitespace-pre-wrap">{String(v)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function FRIAPage() {
  const [form, setForm] = useState({
    system_name: "",
    purpose: "",
    affected_population: "",
    sector: "Santé",
    is_public_entity: false,
    fundamental_rights_at_stake: [] as string[],
    organisation_name: "",
    organisation_legal_nature: "",
    deployment_country: "",
    mission_sector: "",
    system_description_io: "",
    system_provider: "",
    annex_iii_category: "",
    decision_role: "",
    usage_frequency_duration: "",
    affected_categories: "",
    volume_band: "",
    vulnerable_groups: "",
    personal_data_detail: "",
    legal_effects_detail: "",
    remedy_paths: "",
    intake_notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [registeredSystems, setRegisteredSystems] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/register-list").then(r => r.json()).then(d => setRegisteredSystems(d.systems ?? [])).catch(() => {});
  }, []);

  function prefillFromRegister(system: any) {
    setForm(f => ({
      ...f,
      system_name: system.system_name ?? f.system_name,
      purpose: system.purpose ?? f.purpose,
    }));
    setShowPicker(false);
  }

  function toggleRight(right: string) {
    setForm(f => ({
      ...f,
      fundamental_rights_at_stake: f.fundamental_rights_at_stake.includes(right)
        ? f.fundamental_rights_at_stake.filter(r => r !== right)
        : [...f.fundamental_rights_at_stake, right],
    }));
  }

  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/fria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function downloadPdf() {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/generate/fria/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, systemName: form.system_name }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `fria-${form.system_name.replace(/\s/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    finally { setDownloading(false); }
  }

  const dre = result?.deployment_recommendation as string | undefined;
  const dreUi = dre && DEPLOY_REC_UI[dre];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" /> FRIA — Évaluation d&apos;Impact Droits Fondamentaux
          </h1>
          <p className="text-sm text-muted-foreground">
            Art. 27 AI Act (UE) 2024/1689 · Charte UE &amp; CEDH · Obligatoire entités publiques / certaines fonctions · EU AIDA (rappel)
          </p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Questionnaire système · Art. 27</CardTitle>
              {registeredSystems.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowPicker(!showPicker)}>
                  <BookOpen className="h-4 w-4" /> Importer depuis le Registre
                </Button>
              )}
            </div>
            {showPicker && (
              <div className="mt-3 border rounded-lg divide-y bg-white shadow-sm">
                {registeredSystems.map((s: any) => (
                  <button key={s.id} type="button" onClick={() => prefillFromRegister(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium">{s.system_name}</p>
                    <p className="text-xs text-slate-500">{s.risk_category} risque</p>
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "system_name", label: "Nom du système *", placeholder: "Ex : assisteDécisionSociale-v2" },
                { key: "sector", label: "Secteur / mission courte *", placeholder: "Éducation, justice, aides sociales…" },
                { key: "organisation_name", label: "Nom organisation déployeur", placeholder: "" },
                { key: "organisation_legal_nature", label: "Nature juridique", placeholder: "EPIC, commune, entreprise SSP…" },
                { key: "deployment_country", label: "Pays déploiement", placeholder: "France" },
                { key: "annex_iii_category", label: "Qualif. haut risque / Annexe III", placeholder: "§4 emploi, §8 justice…" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-5 sm:col-span-2">
                <input type="checkbox" id="public_entity" checked={form.is_public_entity}
                  onChange={e => setForm(f => ({ ...f, is_public_entity: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <label htmlFor="public_entity" className="text-sm font-medium text-slate-700">Entité publique / SSP (déclaratif intake)</label>
              </div>
              <div key="population">
                <label className="text-sm font-medium text-slate-700 block mb-1">Population impactée *</label>
                <input value={form.affected_population} onChange={e => setForm(f => ({ ...f, affected_population: e.target.value }))}
                  placeholder="Candidats, usagers prestations, élèves…"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Objectif, chaîne décisionnelle &amp; données *</label>
              <textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Cas d&apos;usage, inputs/outputs, degré d&apos;automatisation, effets potentiels pour les personnes…" rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Description I/O synthétique (optionnel si déjà ci-dessus)</label>
              <textarea value={form.system_description_io} onChange={e => setForm(f => ({ ...f, system_description_io: e.target.value }))}
                rows={2}
                placeholder="Schématiser inputs → étapes → outputs"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>

            <details className="rounded-lg border bg-slate-50/70 px-3 py-2">
              <summary className="text-sm font-medium cursor-pointer text-slate-800">Sections B–D questionnaire (cadre officiel §Partie 1)</summary>
              <div className="grid gap-3 pt-3 sm:grid-cols-2">
                {[
                  { k: "system_provider", lab: "Fournisseur système", ph: "Interne / Google / etc." },
                  { k: "decision_role", lab: "Rôle dans la décision", ph: "Automatisé total / aide décision…" },
                  { k: "usage_frequency_duration", lab: "Fréquence & durée usage", ph: "" },
                  { k: "affected_categories", lab: "Catégories personnes précises", ph: "" },
                  { k: "volume_band", lab: "Volume approximatif", ph: "&lt;100 / 100–10 k / …" },
                  { k: "vulnerable_groups", lab: "Groupes vulnérables identifiés", ph: "" },
                  { k: "personal_data_detail", lab: "Données personnelles (catég.)", ph: "" },
                  { k: "legal_effects_detail", lab: "Effets juridiques/significatifs", ph: "" },
                  { k: "remedy_paths", lab: "Voies recours disponibles ou à créer", ph: "" },
                ].map(({ k, lab, ph }) => (
                  <div key={k}>
                    <label className="text-xs font-medium text-slate-600">{lab}</label>
                    <input value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      placeholder={ph} className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-600">Notes libres mission / périmètre</label>
                  <textarea value={form.intake_notes} onChange={e => setForm(f => ({ ...f, intake_notes: e.target.value }))}
                    rows={2} className="mt-1 w-full border rounded-md px-2 py-1.5 text-xs resize-none" />
                </div>
              </div>
            </details>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Droits fondamentaux — signalisation préalable</label>
              <div className="flex flex-wrap gap-2">
                {RIGHTS.map(r => (
                  <button key={r} type="button" onClick={() => toggleRight(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.fundamental_rights_at_stake.includes(r)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={generate} disabled={loading || !form.system_name || !form.purpose.trim() || !form.affected_population.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération FRIA (~30–90 s)…</> : "Générer la FRIA conforme § Art. 27"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-bold flex-1 min-w-[200px]">{result.title}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouvelle FRIA</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-purple-600 hover:bg-purple-700">
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          {dreUi && (
            <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${dreUi.cls}`}>
              Avis §6 · {dreUi.label}
            </div>
          )}

          {result.deployment_conditions?.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="py-3"><CardTitle className="text-sm text-amber-900">Conditions préalables ou correctives</CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm space-y-1 list-disc pl-5 text-amber-950">
                  {result.deployment_conditions.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.honesty_notes?.length > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="py-3"><CardTitle className="text-sm">Limites d&apos;analyse / hypothèses déclarées</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1 pt-0 text-slate-700">
                {result.honesty_notes.map((n: string, i: number) => <p key={i}>• {n}</p>)}
              </CardContent>
            </Card>
          )}

          {renderStringRecord("Identification", result.identification)}
          {renderStringRecord("Section 1 · Système & contexte", result.section1_system_context)}
          {renderStringRecord("Section 5 · Résiduels", result.section5_residual_acceptability)}

          {result.section2_persons?.vulnerable_groups_specific_analysis?.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm text-red-800">§2 Groupes vulnérables — analyse contextualisée</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-0">
                {result.section2_persons.vulnerable_groups_specific_analysis.map((g: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 bg-slate-50 text-sm space-y-1">
                    <p className="font-semibold">{g.group}</p>
                    <p className="text-slate-700"><strong>Exposition :</strong> {g.why_more_exposed}</p>
                    <p className="text-slate-700"><strong>Biais :</strong> {g.potential_biases}</p>
                    <p className="text-green-900"><strong>Mesures :</strong> {g.specific_measures}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {result.section3_fundamental_rights?.synthesis_rows?.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Synthèse matrice §3 — droits</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto pt-0">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left bg-slate-50 border-b">
                      <th className="py-2 pr-2">Droit</th>
                      <th className="py-2 pr-2">Score brut</th>
                      <th className="py-2 pr-2">Atténuations</th>
                      <th className="py-2 pr-2">Résiduel</th>
                      <th className="py-2">Niveau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.section3_fundamental_rights.synthesis_rows.map((row: any, i: number) => (
                      <tr key={i} className="border-b align-top">
                        <td className="py-2 pr-2">{row.fundamental_right}</td>
                        <td className="py-2 pr-2">{row.raw_score_aggregate}</td>
                        <td className="py-2 pr-2">{row.attenuations}</td>
                        <td className="py-2 pr-2">{row.residual_score}</td>
                        <td className="py-2">{row.level_indicator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {result.section6_motivated_conclusion?.motivated_conclusion_text && (
            <Card className="border-purple-100">
              <CardHeader className="py-3"><CardTitle className="text-sm">Conclusion motivée §6</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-800 whitespace-pre-wrap pt-0">
                {result.section6_motivated_conclusion.motivated_conclusion_text}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Résumé exécutif</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.executive_summary}</p>
              <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${IMPACT_COLORS[result.overall_risk_level] ?? "bg-slate-100 text-slate-700"}`}>
                Niveau agrégé §3 (modèle) : {IMPACT_LABELS[result.overall_risk_level] ?? result.overall_risk_level}
              </span>
            </CardContent>
          </Card>

          {(result.rights_assessment ?? []).map((item: any, i: number) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.right}</p>
                    <p className="text-xs text-slate-500 mb-2">{item.charter_article}</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.description}</p>
                    {(item.probability_1_to_5 != null || item.gravity_1_to_5 != null || item.score_px_g != null) && (
                      <p className="text-xs text-slate-500 mt-1">
                        P×G — P:{item.probability_1_to_5 ?? "—"} G:{item.gravity_1_to_5 ?? "—"} score:{item.score_px_g ?? "—"}
                      </p>
                    )}
                    {item.mitigation && (
                      <p className="text-sm text-green-700 mt-2 bg-green-50 rounded p-2 whitespace-pre-wrap">
                        <strong>Atténuation :</strong> {item.mitigation}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${IMPACT_COLORS[item.impact_level] ?? ""}`}>
                    {IMPACT_LABELS[item.impact_level] ?? item.impact_level}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {result.section4_mitigation_human_oversight && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">§4 Mesures · contrôle humain &amp; griefs</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2 pt-0 text-slate-700 whitespace-pre-wrap">
                <p><strong>Résumé Arts 13–14 :</strong> {result.section4_mitigation_human_oversight.art13_art14_human_control_summary}</p>
                <p><strong>Formation (Art. 4) :</strong> {result.section4_mitigation_human_oversight.training_art4_summary}</p>
              </CardContent>
            </Card>
          )}

          {result.affected_groups?.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Groupes &amp; vulnérabilités (liste synthétique)</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-0">
                {result.affected_groups.map((g: any, i: number) => (
                  <div key={i} className="border rounded-md p-3 text-sm">
                    <p className="font-medium">{g.group}</p>
                    <p className="text-slate-700">{g.specific_risks}</p>
                    <p className="text-green-900 text-xs mt-1">{g.protections}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Synthèse · actions et consultation</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-0">
              {(result.required_actions ?? []).length > 0 ? (
                <ul className="space-y-1">
                  {(result.required_actions as string[]).map((a, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : null}
              {result.consultation_required && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Consultation des parties prenantes ou représentants : à planifier ou confirmer.
                </div>
              )}
            </CardContent>
          </Card>

          {renderStringRecord("§7 EU AIDA & validation", result.section7_registration_governance)}
          {typeof result.signatures_block_markdown === "string" && result.signatures_block_markdown.trim() && (
            <Card><CardHeader className="py-3"><CardTitle className="text-sm">Bloc signatures modèle</CardTitle></CardHeader>
              <CardContent className="text-xs whitespace-pre-wrap font-mono text-slate-700 pt-0">{result.signatures_block_markdown}</CardContent></Card>)}

          {result.professional_disclaimer && (
            <p className="text-[11px] text-slate-500 leading-relaxed border-t pt-4 whitespace-pre-wrap">{result.professional_disclaimer}</p>
          )}
        </div>
      )}
    </div>
  );
}
