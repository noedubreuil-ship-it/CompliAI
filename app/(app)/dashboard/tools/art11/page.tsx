"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Loader2, Download, CheckCircle2, XCircle, Clock, BookOpen } from "lucide-react";
import Link from "next/link";

const SECTORS = ["Santé", "RH & Recrutement", "Finance & Crédit", "Éducation", "Sécurité", "Transport", "Justice", "Infrastructure critique", "Autre"];
const RISK_CATEGORIES = ["Haut", "Limité", "Minimal"];

export default function Art11Page() {
  const [form, setForm] = useState({
    system_name: "", version: "1.0.0", description: "", purpose: "",
    risk_category: "Haut", ai_model_type: "", training_data: "", sector: "Santé", provider: "",
  });
  const [registeredSystems, setRegisteredSystems] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch("/api/register-list")
      .then(r => r.json())
      .then(d => setRegisteredSystems(d.systems ?? []))
      .catch(() => {});
  }, []);

  function prefillFromRegister(system: any) {
    setForm(f => ({
      ...f,
      system_name: system.system_name ?? f.system_name,
      version: system.version ?? f.version,
      description: system.description ?? f.description,
      purpose: system.purpose ?? f.purpose,
      risk_category: system.risk_category ?? f.risk_category,
      provider: system.provider_name ?? f.provider,
    }));
    setShowPicker(false);
  }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/art11", {
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
      const res = await fetch("/api/generate/art11/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, systemName: form.system_name }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `doc-art11-${form.system_name.replace(/\s/g, "_")}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    finally { setDownloading(false); }
  }

  const STATUS_ICON = { compliant: <CheckCircle2 className="h-4 w-4 text-green-500" />, to_do: <Clock className="h-4 w-4 text-amber-500" />, not_applicable: <XCircle className="h-4 w-4 text-slate-300" /> };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Documentation Technique Art. 11
          </h1>
          <p className="text-sm text-muted-foreground">Annexe IV AI Act — Obligatoire pour les systèmes haut risque</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Informations sur le système IA</CardTitle>
              {registeredSystems.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowPicker(!showPicker)}>
                  <BookOpen className="h-4 w-4" />
                  Importer depuis le Registre
                </Button>
              )}
            </div>
            {showPicker && (
              <div className="mt-3 border rounded-lg divide-y bg-white shadow-sm">
                {registeredSystems.map((s: any) => (
                  <button key={s.id} onClick={() => prefillFromRegister(s)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-medium">{s.system_name} {s.version && `v${s.version}`}</p>
                    <p className="text-xs text-slate-500">{s.risk_category} risque · {s.ai_act_classification}</p>
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "system_name", label: "Nom du système *", placeholder: "RecrutAI" },
                { key: "version", label: "Version", placeholder: "1.0.0" },
                { key: "provider", label: "Fournisseur / Développeur", placeholder: "Acme Corp" },
                { key: "ai_model_type", label: "Type de modèle IA", placeholder: "LLM, vision, classification..." },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Secteur</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Catégorie de risque</label>
                <select value={form.risk_category} onChange={e => setForm(f => ({ ...f, risk_category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {RISK_CATEGORIES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            {[
              { key: "description", label: "Description générale *", placeholder: "Décrivez le système, son architecture, ses fonctionnalités..." },
              { key: "purpose", label: "Objectif et cas d'usage *", placeholder: "Pour quoi ce système est-il utilisé ? Qui sont les utilisateurs ?" },
              { key: "training_data", label: "Données d'entraînement", placeholder: "Source, nature, volume des données utilisées pour entraîner le modèle..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-700 block mb-1">{label}</label>
                <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder} rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={generate} disabled={loading || !form.system_name || !form.description} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours (30-60s)…</> : "Générer la documentation Art. 11"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{result.title}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouveau document</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading}>
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          {result.sections?.map((section: any) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{section.id}. {section.title}</span>
                  <span className="text-xs text-blue-600 font-normal">{section.article_ref}</span>
                </CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p></CardContent>
            </Card>
          ))}

          {result.compliance_checklist?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Checklist de conformité</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.compliance_checklist.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      {STATUS_ICON[item.status as keyof typeof STATUS_ICON] ?? STATUS_ICON.to_do}
                      <span className="flex-1">{item.item}</span>
                      <span className="text-xs text-slate-400">{item.ref}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result.next_steps?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Prochaines étapes</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {result.next_steps.map((step: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
