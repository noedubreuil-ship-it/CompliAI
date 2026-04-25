"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gavel, Loader2, RotateCcw, Download, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const EXEMPLES = [
  "CNIL — Délibération n°SAN-2023-009 : 5 millions d'euros contre CRITEO pour violations des bases légales RGPD dans la publicité ciblée",
  "DPC Ireland — Decision IN-20-1-1 : 1,2 milliard d'euros contre Meta Platforms (transferts de données UE vers USA)",
  "EDPB — Guidelines 05/2022 : lignes directrices sur l'utilisation de l'IA dans les décisions d'embauche",
  "Garante Privacy — Provvedimento 9870832 : 15 millions d'euros contre OpenAI pour violation du RGPD en Italie",
];

interface AnalyseData {
  reference: string; autorite: string; date: string; montant_sanction: string;
  fiche: {
    entite_sanctionnee: string; faits: string;
    violation_retenue: string[];
    raisonnement: string;
    circonstances_aggravantes: string[];
    circonstances_attenuantes: string[];
    mesures_imposees: string[];
  };
  portee: { principe_degage: string; impact_sectoriel: string; impact_technologique: string };
  implications_entreprises: Array<{ action: string; priorite: string; ref: string }>;
  jurisprudence_liee: string[];
}

export default function AnalyseDecisionPage() {
  const [texteDecision, setTexteDecision] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!texteDecision.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "analyse-decision", texteDecision }),
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
          <div className="p-3 bg-orange-100 rounded-xl"><Gavel className="h-6 w-6 text-orange-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Analyse de décisions d'autorités</h1>
            <p className="text-muted-foreground mt-1">Collez une décision de sanction CNIL, DPC, EDPB → Claude génère une analyse structurée avec faits, raisonnement et implications.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Jurisprudence DPA</Badge>
              <Badge variant="outline">Sanctions RGPD/AI Act</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Décision à analyser</label>
            <Textarea
              placeholder="Collez le texte de la décision, ou saisissez sa référence et un résumé..."
              value={texteDecision}
              onChange={(e) => setTexteDecision(e.target.value)}
              className="min-h-[200px] text-sm"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Exemples d'utilisation</p>
            {EXEMPLES.map((ex, i) => (
              <button key={i} onClick={() => setTexteDecision(ex)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors">
                → {ex}
              </button>
            ))}
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading || texteDecision.trim().length < 20} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Analyse en cours...</> : <><Gavel className="h-4 w-4" />Analyser cette décision</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{result.reference}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge>{result.autorite}</Badge>
            <span className="text-sm text-muted-foreground">{result.date}</span>
            {result.montant_sanction && <span className="text-sm font-semibold text-red-600">{result.montant_sanction}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setTexteDecision(""); }}><RotateCcw className="h-4 w-4" />Nouvelle analyse</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-bold text-slate-900 border-b pb-2">Fiche de décision</h2>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Entité sanctionnée</p>
            <p className="text-sm text-slate-800">{result.fiche.entite_sanctionnee}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Faits</p>
            <p className="text-sm text-slate-700 leading-relaxed">{result.fiche.faits}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Violations retenues</p>
            <ul className="space-y-1">
              {result.fiche.violation_retenue.map((v, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-slate-700">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Raisonnement</p>
            <p className="text-sm text-slate-700 leading-relaxed">{result.fiche.raisonnement}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {result.fiche.circonstances_aggravantes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 mb-1">Circonstances aggravantes</p>
                {result.fiche.circonstances_aggravantes.map((c, i) => <p key={i} className="text-xs text-slate-600">▲ {c}</p>)}
              </div>
            )}
            {result.fiche.circonstances_attenuantes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 mb-1">Circonstances atténuantes</p>
                {result.fiche.circonstances_attenuantes.map((c, i) => <p key={i} className="text-xs text-slate-600">▼ {c}</p>)}
              </div>
            )}
          </div>
          {result.fiche.mesures_imposees.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mesures imposées</p>
              <ul className="space-y-0.5">
                {result.fiche.mesures_imposees.map((m, i) => <li key={i} className="text-xs text-slate-600">→ {m}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <h2 className="font-bold text-slate-900">Portée de la décision</h2>
          {[
            { label: "Principe dégagé", value: result.portee.principe_degage },
            { label: "Impact sectoriel", value: result.portee.impact_sectoriel },
            { label: "Impact technologique", value: result.portee.impact_technologique },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs font-semibold text-blue-700 mb-0.5">{item.label}</p>
              <p className="text-sm text-slate-700">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" />Implications pour votre entreprise</h2>
          <div className="space-y-2">
            {result.implications_entreprises.map((impl, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", impl.priorite === "Haute" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                  {impl.priorite}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{impl.action}</p>
                  <p className="text-xs text-muted-foreground">{impl.ref}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {result.jurisprudence_liee.length > 0 && (
          <div className="bg-white border rounded-xl p-5">
            <h2 className="font-bold text-slate-900 mb-3">Jurisprudence liée</h2>
            <ul className="space-y-1">
              {result.jurisprudence_liee.map((j, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />{j}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
