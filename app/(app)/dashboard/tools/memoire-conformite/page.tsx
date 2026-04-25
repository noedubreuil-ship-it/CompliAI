"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Loader2, Download, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MemoireData {
  titre: string; date: string; synthese_executive: string;
  sections: Array<{ id: string; titre: string; contenu: string; refs: string[] }>;
  tableau_risques: Array<{ risque: string; probabilite: string; impact: string; ref: string }>;
  plan_action: Array<{ priorite: string; action: string; delai: string; ref: string }>;
  disclaimer: string;
}

const PRIORITE_COLOR: Record<string, string> = {
  "Urgent": "bg-red-100 text-red-700",
  "Haute": "bg-orange-100 text-orange-700",
  "Moyenne": "bg-amber-100 text-amber-700",
  "Faible": "bg-green-100 text-green-700",
};

const IMPACT_COLOR: Record<string, string> = {
  "Critique": "text-red-600 font-bold",
  "Élevée": "text-red-500",
  "Moyen": "text-amber-600",
  "Moyen ": "text-amber-600",
  "Faible": "text-green-600",
};

export default function MemoireConformitePage() {
  const [situation, setSituation] = useState("");
  const [contexte, setContexte] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MemoireData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!situation.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "memoire-conformite", situation, contexte }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  function download() {
    if (!result) return;
    const lines = [result.titre, "=".repeat(60), `Date : ${result.date}`, "", "SYNTHÈSE EXÉCUTIVE", result.synthese_executive, "",
      ...result.sections.flatMap(s => [`\n${s.titre}`, s.contenu, `Références : ${s.refs.join(", ")}`, ""]),
      "\nTABLEAU DES RISQUES",
      ...result.tableau_risques.map(r => `• ${r.risque} | Probabilité: ${r.probabilite} | Impact: ${r.impact} | ${r.ref}`),
      "\nPLAN D'ACTION",
      ...result.plan_action.map(a => `[${a.priorite}] ${a.action} — ${a.delai} (${a.ref})`),
      "", result.disclaimer];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "memoire-conformite-ia.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 rounded-xl"><Briefcase className="h-6 w-6 text-slate-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Mémoire de conformité IA</h1>
            <p className="text-muted-foreground mt-1">Décrivez la situation client → Claude rédige un mémoire juridique structuré avec tableau de risques et plan d'action.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Pour avocats et juristes</Badge>
              <Badge className="bg-slate-100 text-slate-700 border-0">Nouveau</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Situation client *</label>
            <Textarea
              placeholder="Ex : Mon client est une startup EdTech qui déploie un système d'IA pour évaluer automatiquement les élèves et recommander des parcours de formation. Le système est utilisé dans 12 établissements scolaires publics en France. Ils n'ont pas encore fait d'analyse de risque..."
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              className="min-h-[180px] text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Contexte supplémentaire (optionnel)</label>
            <Textarea
              placeholder="Délais particuliers, contraintes réglementaires spécifiques, historique du dossier..."
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading || situation.trim().length < 30} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Rédaction en cours...</> : <><Briefcase className="h-4 w-4" />Rédiger le mémoire de conformité</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{result.titre}</h1>
          <p className="text-xs text-muted-foreground">Généré le {result.date}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />Télécharger</Button>
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setSituation(""); setContexte(""); }}><RotateCcw className="h-4 w-4" />Nouveau</Button>
        </div>
      </div>

      <div className="bg-slate-800 text-white rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Synthèse exécutive</p>
        <p className="text-sm leading-relaxed">{result.synthese_executive}</p>
      </div>

      {result.sections.map((s) => (
        <div key={s.id} className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-slate-900">{s.titre}</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{s.contenu}</p>
          <div className="flex flex-wrap gap-2">
            {s.refs.map((r, i) => <Badge key={i} variant="outline" className="text-xs">{r}</Badge>)}
          </div>
        </div>
      ))}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="bg-red-50 border-b px-5 py-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="font-bold text-slate-900">Tableau des risques</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b">
              <th className="text-left px-4 py-2 font-medium text-slate-600">Risque</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Probabilité</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Impact</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Référence</th>
            </tr></thead>
            <tbody className="divide-y">
              {result.tableau_risques.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{r.risque}</td>
                  <td className="px-4 py-3">{r.probabilite}</td>
                  <td className={cn("px-4 py-3", IMPACT_COLOR[r.impact] || "")}>{r.impact}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.ref}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="bg-green-50 border-b px-5 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <h2 className="font-bold text-slate-900">Plan d'action</h2>
        </div>
        <div className="divide-y">
          {result.plan_action.map((a, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3">
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", PRIORITE_COLOR[a.priorite] || "bg-slate-100 text-slate-700")}>{a.priorite}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-800">{a.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.delai} · {a.ref}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center italic">{result.disclaimer}</p>
    </div>
  );
}
