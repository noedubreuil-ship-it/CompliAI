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

export default function ContractsPage() {
  const [providerName, setProviderName] = useState("");
  const [contractText, setContractText] = useState("");
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
        body: JSON.stringify({ contract_text: contractText, provider_name: providerName }),
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FileSearch2 className="h-5 w-5 text-amber-600" /> Analyse de contrat tiers
          </h1>
          <p className="text-sm text-muted-foreground">Art. 25 RGPD + Art. 28 AI Act — Sous-traitance IA</p>
        </div>
      </div>

      {!result ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Contrat à analyser</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Nom du fournisseur *</label>
              <input value={providerName} onChange={e => setProviderName(e.target.value)}
                placeholder="OpenAI, AWS, Google, Azure, Mistral..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Importer un fichier texte (.txt)</label>
              <input type="file" accept=".txt,.text" onChange={handleFile}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Ou collez le texte du contrat *
                <span className="text-slate-400 font-normal ml-1">(8 000 caractères max analysés)</span>
              </label>
              <textarea value={contractText} onChange={e => setContractText(e.target.value)}
                placeholder="Collez ici le texte de votre contrat de sous-traitance / DPA / accord IA..." rows={10}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-mono text-xs" />
              <p className="text-xs text-slate-400 mt-1">{contractText.length} caractères</p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={analyze} disabled={loading || !providerName || !contractText.trim()} className="w-full bg-amber-600 hover:bg-amber-700">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours (30-60s)…</> : "Analyser le contrat"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Analyse — {result.provider}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResult(null)}>Nouveau contrat</Button>
              <Button size="sm" onClick={downloadPdf} disabled={downloading} className="bg-amber-600 hover:bg-amber-700">
                {downloading ? <><Loader2 className="h-4 w-4 animate-spin" /> PDF…</> : <><Download className="h-4 w-4" /> Télécharger PDF</>}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-6">
                <ComplianceScore score={result.risk_score ?? 50} size="lg" />
                <div className="flex-1">
                  <p className="text-sm leading-relaxed text-slate-700">{result.overall_assessment}</p>
                  <div className="flex gap-3 mt-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${result.gdpr_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      RGPD : {result.gdpr_compliant ? "Conforme" : "Non conforme"}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${result.ai_act_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      AI Act : {result.ai_act_compliant ? "Conforme" : "Non conforme"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.findings?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Analyse détaillée ({result.findings.length} points)</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-sm text-red-700">Clauses obligatoires manquantes</CardTitle></CardHeader>
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
        </div>
      )}
    </div>
  );
}
