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
  none: "Aucun impact", low: "Impact faible", medium: "Impact modéré",
  high: "Impact élevé", critical: "Impact critique",
};

export default function FRIAPage() {
  const [form, setForm] = useState({
    system_name: "", purpose: "", affected_population: "",
    sector: "Santé", is_public_entity: false,
    fundamental_rights_at_stake: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [registeredSystems, setRegisteredSystems] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);

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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const [downloading, setDownloading] = useState(false);

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" /> FRIA — Évaluation d&apos;Impact Droits Fondamentaux
          </h1>
          <p className="text-sm text-muted-foreground">Art. 27 AI Act — Obligatoire pour les entités publiques</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Informations sur le système</CardTitle>
              {registeredSystems.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowPicker(!showPicker)}>
                  <BookOpen className="h-4 w-4" /> Importer depuis le Registre
                </Button>
              )}
            </div>
            {showPicker && (
              <div className="mt-3 border rounded-lg divide-y bg-white shadow-sm">
                {registeredSystems.map((s: any) => (
                  <button key={s.id} onClick={() => prefillFromRegister(s)}
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
                { key: "system_name", label: "Nom du système *", placeholder: "RecrutAI" },
                { key: "sector", label: "Secteur *", placeholder: "Santé" },
                { key: "affected_population", label: "Population impactée *", placeholder: "Candidats à l'emploi, adultes..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="public_entity" checked={form.is_public_entity}
                  onChange={e => setForm(f => ({ ...f, is_public_entity: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <label htmlFor="public_entity" className="text-sm font-medium text-slate-700">Entité publique</label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Objectif et fonctionnement *</label>
              <textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                placeholder="Décrivez le but du système, comment il fonctionne, quelles décisions il prend..." rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Droits fondamentaux potentiellement affectés</label>
              <div className="flex flex-wrap gap-2">
                {RIGHTS.map(r => (
                  <button key={r} onClick={() => toggleRight(r)}
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
            <Button onClick={generate} disabled={loading || !form.system_name || !form.purpose} className="w-full bg-purple-600 hover:bg-purple-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Évaluation en cours (30-60s)…</> : "Générer la FRIA"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{result.title}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouvelle FRIA</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading}>
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-sm">Résumé exécutif</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed">{result.executive_summary}</p>
              <div className="mt-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${IMPACT_COLORS[result.overall_risk_level] ?? ""}`}>
                  Niveau de risque global : {IMPACT_LABELS[result.overall_risk_level] ?? result.overall_risk_level}
                </span>
              </div>
            </CardContent>
          </Card>

          {result.rights_assessment?.map((item: any, i: number) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{item.right}</p>
                    <p className="text-xs text-slate-500 mb-2">{item.charter_article}</p>
                    <p className="text-sm text-slate-700">{item.description}</p>
                    {item.mitigation && (
                      <p className="text-sm text-green-700 mt-2 bg-green-50 rounded p-2">
                        <strong>Mitigation :</strong> {item.mitigation}
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

          <Card>
            <CardHeader><CardTitle className="text-sm">Conclusion et recommandations</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 mb-3">{result.conclusion}</p>
              {result.required_actions?.length > 0 && (
                <ul className="space-y-1">
                  {result.required_actions.map((a: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              {result.consultation_required && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  ⚠️ Une consultation des parties prenantes est requise avant déploiement.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
