"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Loader2, Download } from "lucide-react";
import Link from "next/link";

const SECTORS = ["Tech / SaaS", "Finance", "Santé", "RH & Recrutement", "Retail / E-commerce", "Industrie", "Consulting", "Éducation", "Autre"];
const EMPLOYEE_COUNTS = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function PolicyPage() {
  const [form, setForm] = useState({
    company_name: "", sector: "Tech / SaaS",
    ai_tools_used: "", employee_count: "11-50",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate/policy", {
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
      const res = await fetch("/api/generate/policy/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: result, companyName: form.company_name }),
      });
      if (!res.ok) throw new Error("Erreur génération PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `politique-ia-${form.company_name.replace(/\s/g, "_")}.pdf`; a.click();
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
            <Users className="h-5 w-5 text-green-600" /> Politique d&apos;Usage IA Employés
          </h1>
          <p className="text-sm text-muted-foreground">Art. 4 AI Act (littératie IA) — PDF signable</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Informations sur votre entreprise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nom de l&apos;entreprise *</label>
                <input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Secteur</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {SECTORS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Nombre d&apos;employés</label>
                <select value={form.employee_count} onChange={e => setForm(f => ({ ...f, employee_count: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  {EMPLOYEE_COUNTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Outils IA utilisés par les employés *</label>
              <textarea value={form.ai_tools_used} onChange={e => setForm(f => ({ ...f, ai_tools_used: e.target.value }))}
                placeholder="ChatGPT, Claude, Copilot, Midjourney, Cursor, Gemini, outils IA internes..." rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={generate} disabled={loading || !form.company_name || !form.ai_tools_used} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours (30-60s)…</> : "Générer la politique IA"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{result.title}</h2>
              <p className="text-sm text-muted-foreground">Version {result.version} · Conforme Art. 4 AI Act + RGPD</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouvelle politique</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-green-600 hover:bg-green-700">
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          {result.key_rules?.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader><CardTitle className="text-sm text-green-800">5 règles clés à retenir</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-1">
                  {result.key_rules.map((rule: string, i: number) => (
                    <li key={i} className="text-sm text-green-800 flex gap-2">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span> {rule}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.sections?.map((section: any) => (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{section.id}. {section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section.content}</p>
              </CardContent>
            </Card>
          ))}

          <div className="bg-slate-50 border rounded-lg p-4 text-xs text-slate-500">
            Ce document constitue une information juridique générale. Faites valider par un DPO ou un avocat spécialisé avant diffusion aux employés.
          </div>
        </div>
      )}
    </div>
  );
}
