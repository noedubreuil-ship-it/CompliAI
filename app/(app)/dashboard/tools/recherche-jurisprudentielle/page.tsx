"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale, Loader2, Search, RotateCcw, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Droit à l'explication des décisions algorithmiques",
  "Responsabilité des plateformes pour les contenus IA",
  "Transfert de données UE vers pays tiers",
  "Profilage et ciblage publicitaire",
  "Biais algorithmiques et discrimination",
  "Reconnaissance faciale dans les espaces publics",
  "Décisions automatisées en matière de crédit",
];

const JURIDICTIONS = ["Toutes juridictions", "CJUE", "CEDH", "CNIL", "DPC", "EDPB", "AEPD", "Garante", "ICO"];

interface Decision {
  ecli: string; titre: string; juridiction: string; date: string; parties: string;
  theme: string; faits_resume: string; solution: string;
  articles_appliques: string[]; portee: string; pertinence: number;
}

interface RechercheData {
  requete: string; nb_resultats: number;
  decisions: Decision[];
  synthese_thematique: string;
  evolution: string;
  conseil_pratique: string;
}

function DecisionCard({ d }: { d: Decision }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className={cn("w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors", open && "bg-slate-50 border-b")}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900 text-sm">{d.titre}</span>
            <Badge variant="outline" className="text-xs">{d.juridiction}</Badge>
            <span className="text-xs text-muted-foreground">{d.date}</span>
          </div>
          <p className="text-xs text-mono text-slate-500 mt-0.5">{d.ecli}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <p className={cn("text-sm font-bold", d.pertinence >= 90 ? "text-green-600" : d.pertinence >= 70 ? "text-amber-600" : "text-slate-500")}>{d.pertinence}%</p>
            <p className="text-[10px] text-muted-foreground">pertinence</p>
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-5 py-4 bg-white space-y-4">
          {d.parties && <p className="text-xs text-slate-500"><strong>Parties :</strong> {d.parties}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Faits</p>
              <p className="text-sm text-slate-700">{d.faits_resume}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Solution</p>
              <p className="text-sm text-slate-700">{d.solution}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Portée pratique</p>
            <p className="text-sm text-slate-700">{d.portee}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {d.articles_appliques.map((a, i) => <Badge key={i} variant="outline" className="text-xs">{a}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RechercheJurisprudentiellePage() {
  const [requete, setRequete] = useState("");
  const [juridiction, setJuridiction] = useState("Toutes juridictions");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RechercheData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!requete.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "recherche-jurisprudentielle", requete, filtres: juridiction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl"><Scale className="h-6 w-6 text-indigo-700" /></div>
        <div>
          <h1 className="text-2xl font-bold">Recherche jurisprudentielle IA</h1>
          <p className="text-muted-foreground mt-1">Recherchez dans la base CJUE + CEDH + DPA nationales par thème, article ou mots-clés. Résumés structurés avec implications.</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">RAG jurisprudentiel</Badge>
            <Badge variant="outline">Citations ECLI</Badge>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex: décision automatisée et crédit bancaire..."
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="pl-9"
            />
          </div>
          <Button onClick={search} disabled={loading || !requete.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {JURIDICTIONS.map((j) => (
            <button key={j} onClick={() => setJuridiction(j)}
              className={cn("px-2.5 py-1 rounded-lg text-xs border transition-colors", juridiction === j ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 hover:border-slate-400")}>
              {j}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setRequete(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200">
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}

      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">{result.nb_resultats} décisions trouvées</h2>
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setRequete(""); }}><RotateCcw className="h-4 w-4" />Nouvelle recherche</Button>
          </div>

          <div className="space-y-2">
            {result.decisions.map((d, i) => <DecisionCard key={i} d={d} />)}
          </div>

          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1">Synthèse thématique</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.synthese_thematique}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Évolution récente</p>
                <p className="text-sm text-slate-700">{result.evolution}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Conseil pratique</p>
                <p className="text-sm text-slate-700">{result.conseil_pratique}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
