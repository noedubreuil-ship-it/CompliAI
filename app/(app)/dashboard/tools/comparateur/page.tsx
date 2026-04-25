"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, Loader2, RotateCcw, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DIRECTIVES = [
  "AI Act (UE 2024/1689)",
  "RGPD (UE 2016/679)",
  "DSA (UE 2022/2065)",
  "DMA (UE 2022/1925)",
  "NIS2 (UE 2022/2555)",
  "DORA (UE 2022/2554)",
  "Data Act (UE 2023/2854)",
  "eIDAS 2 (UE 2024/1183)",
];

const EU_COUNTRIES = [
  "France", "Allemagne", "Italie", "Espagne", "Pays-Bas", "Belgique", "Pologne",
  "Suède", "Autriche", "Danemark", "Finlande", "Portugal", "Irlande", "Luxembourg",
  "Grèce", "République tchèque", "Hongrie", "Roumanie", "Croatie", "Estonie",
];

const DIVERGENCE_COLOR: Record<string, string> = {
  "Forte": "bg-red-100 text-red-700",
  "Moyenne": "bg-amber-100 text-amber-700",
  "Faible": "bg-green-100 text-green-700",
};

interface ComparateurData {
  directive: string; pays: string[];
  synthese: string;
  tableau: Array<{ aspect: string; pays1: string; pays2: string; divergence: string; commentaire: string }>;
  points_convergence: string[];
  points_divergence: Array<{ point: string; avantage: string; explication: string }>;
  implications_pratiques: string;
  sources: string[];
}

export default function ComparateurPage() {
  const [directive, setDirective] = useState(DIRECTIVES[0]);
  const [pays1, setPays1] = useState("France");
  const [pays2, setPays2] = useState("Allemagne");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparateurData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (pays1 === pays2) { setError("Veuillez sélectionner deux pays différents."); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "comparateur", directive, pays1, pays2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-cyan-100 rounded-xl"><Globe2 className="h-6 w-6 text-cyan-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Comparateur de législations nationales</h1>
            <p className="text-muted-foreground mt-1">Comparez comment deux États membres ont transposé une directive IA. Tableau côte-à-côte avec divergences mises en évidence.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">27 États membres</Badge>
              <Badge variant="outline">Transposition AI Act</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Règlement / Directive</label>
            <div className="flex flex-wrap gap-2">
              {DIRECTIVES.map((d) => (
                <button key={d} onClick={() => setDirective(d)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs border transition-colors", directive === d ? "bg-cyan-600 text-white border-cyan-600" : "border-slate-300 hover:border-slate-400")}>
                  {d.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[{ label: "Premier pays", value: pays1, set: setPays1 }, { label: "Deuxième pays", value: pays2, set: setPays2 }].map((p) => (
              <div key={p.label} className="space-y-2">
                <label className="text-sm font-medium">{p.label}</label>
                <select value={p.value} onChange={(e) => p.set(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-cyan-500">
                  {EU_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Comparaison en cours...</> : <><ArrowLeftRight className="h-4 w-4" />Comparer {pays1} vs {pays2}</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{result.directive}</h1>
          <p className="text-sm text-muted-foreground">{result.pays[0]} vs {result.pays[1]}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setResult(null)}><RotateCcw className="h-4 w-4" />Nouveau</Button>
      </div>

      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide mb-1">Synthèse</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.synthese}</p>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="grid grid-cols-3 bg-slate-800 text-white text-xs font-semibold">
          <div className="px-4 py-3">Aspect comparé</div>
          <div className="px-4 py-3 border-l border-slate-600">{result.pays[0]}</div>
          <div className="px-4 py-3 border-l border-slate-600">{result.pays[1]}</div>
        </div>
        <div className="divide-y">
          {result.tableau.map((row, i) => (
            <div key={i} className="grid grid-cols-3 hover:bg-slate-50 transition-colors">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-700">{row.aspect}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block", DIVERGENCE_COLOR[row.divergence] || "bg-slate-100 text-slate-600")}>{row.divergence}</span>
                {row.commentaire && <p className="text-[10px] text-slate-500 mt-1 leading-tight">{row.commentaire}</p>}
              </div>
              <div className="px-4 py-3 border-l text-xs text-slate-700 leading-relaxed">{row.pays1}</div>
              <div className="px-4 py-3 border-l text-xs text-slate-700 leading-relaxed">{row.pays2}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">✓ Points de convergence</p>
          <ul className="space-y-1">{result.points_convergence.map((p, i) => <li key={i} className="text-xs text-slate-700">• {p}</li>)}</ul>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">✗ Divergences majeures</p>
          {result.points_divergence.map((d, i) => (
            <div key={i} className="mb-2">
              <p className="text-xs font-medium text-slate-800">{d.point}</p>
              <p className="text-[10px] text-slate-500">Avantage : {d.avantage} — {d.explication}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Implications pratiques</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.implications_pratiques}</p>
      </div>

      {result.sources.length > 0 && (
        <div className="text-xs text-slate-500">
          <strong>Sources :</strong> {result.sources.join(" · ")}
        </div>
      )}
    </div>
  );
}
