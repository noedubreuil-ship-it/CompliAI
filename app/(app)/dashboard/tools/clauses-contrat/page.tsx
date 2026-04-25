"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FilePen, Loader2, Download, RotateCcw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES_CLAUSES = [
  { id: "responsabilite-ia", label: "Clause de responsabilité IA", desc: "Limitation de responsabilité, indemnisation, garanties sur les outputs IA" },
  { id: "transparence-algo", label: "Transparence algorithmique", desc: "Obligation d'information sur la logique, les biais, le droit d'explication" },
  { id: "sous-traitance-rgpd", label: "Sous-traitance RGPD (DPA)", desc: "Clause DPA Art. 28 RGPD pour les prestataires IA traitant des données personnelles" },
  { id: "conformite-ai-act", label: "Conformité AI Act", desc: "Obligations de conformité AI Act pour fournisseurs et déployeurs" },
  { id: "audit-droit-acces", label: "Droit d'audit et d'accès", desc: "Droit du client d'auditer le système IA, d'accéder aux logs et à la documentation" },
  { id: "propriete-intellectuelle", label: "Propriété intellectuelle IA", desc: "Droits sur les outputs générés, données d'entraînement, modèles fine-tunés" },
  { id: "portabilite-donnees", label: "Portabilité des données", desc: "Récupération des données à la fin du contrat" },
  { id: "custom", label: "Type de clause personnalisé", desc: "" },
];

interface Clause {
  numero: string; titre: string; texte: string; base_legale: string; commentaire: string; variante?: string;
}

interface ClausesData {
  type_clause: string;
  clauses: Clause[];
  notes_negociation: string;
  risques_sans_clause: string;
  disclaimer: string;
}

function ClauseCard({ clause }: { clause: Clause }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(`${clause.numero} — ${clause.titre}\n\n${clause.texte}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b">
        <div>
          <span className="text-xs font-mono text-slate-500 mr-2">{clause.numero}</span>
          <span className="font-semibold text-slate-900">{clause.titre}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{clause.base_legale}</Badge>
          <button onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="bg-slate-50 rounded-lg p-4 font-serif text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {clause.texte}
        </div>
        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          💡 {clause.commentaire}
        </div>
        {clause.variante && (
          <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            🔄 <strong>Variante possible :</strong> {clause.variante}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClausesContratPage() {
  const [typeClause, setTypeClause] = useState(TYPES_CLAUSES[0].id);
  const [customType, setCustomType] = useState("");
  const [contexte, setContexte] = useState("");
  const [parties, setParties] = useState("Prestataire IA / Client entreprise");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClausesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const typeCfg = TYPES_CLAUSES.find(t => t.id === typeClause)!;

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "clauses-contrat", typeClause: customType || typeCfg.label, contexte, parties }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  function download() {
    if (!result) return;
    const lines = [result.type_clause, "=".repeat(60), "",
      ...result.clauses.flatMap(c => [`\n${c.numero} — ${c.titre}`, c.texte, `Base légale : ${c.base_legale}`, c.commentaire, ""]),
      "\nNOTES DE NÉGOCIATION", result.notes_negociation,
      "\nRISQUES SANS CES CLAUSES", result.risques_sans_clause,
      "", result.disclaimer];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "clauses-contrat-ia.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 rounded-xl"><FilePen className="h-6 w-6 text-violet-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Générateur de clauses contractuelles IA</h1>
            <p className="text-muted-foreground mt-1">Générez des clauses prêtes à insérer dans vos contrats — responsabilité IA, DPA RGPD, conformité AI Act.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Art. 28 RGPD</Badge>
              <Badge variant="outline">Art. 25-28 AI Act</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de clause</label>
            <div className="space-y-2">
              {TYPES_CLAUSES.map((t) => (
                <button key={t.id} onClick={() => { setTypeClause(t.id); setCustomType(""); }}
                  className={cn("w-full text-left p-3 rounded-xl border-2 transition-colors", typeClause === t.id ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300")}>
                  <p className="font-medium text-sm text-slate-900">{t.label}</p>
                  {t.desc && <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>}
                </button>
              ))}
            </div>
            {typeClause === "custom" && (
              <input type="text" placeholder="Décrivez le type de clause souhaité..." value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500 mt-2" />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Parties au contrat</label>
            <input type="text" value={parties} onChange={(e) => setParties(e.target.value)}
              className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Ex : Fournisseur IA / Client PME du secteur santé" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Contexte du contrat (optionnel)</label>
            <Textarea placeholder="Type de prestation, données traitées, secteur..." value={contexte}
              onChange={(e) => setContexte(e.target.value)} className="min-h-[80px] text-sm" />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération des clauses...</> : <><FilePen className="h-4 w-4" />Générer les clauses</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{result.type_clause}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />Télécharger</Button>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}><RotateCcw className="h-4 w-4" />Nouveau</Button>
        </div>
      </div>

      {result.clauses.map((c, i) => <ClauseCard key={i} clause={c} />)}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Notes de négociation</p>
          <p className="text-sm text-slate-700">{result.notes_negociation}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Risques sans ces clauses</p>
          <p className="text-sm text-slate-700">{result.risques_sans_clause}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 italic text-center">{result.disclaimer}</p>
    </div>
  );
}
