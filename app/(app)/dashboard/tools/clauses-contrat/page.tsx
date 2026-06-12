"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FilePen, Loader2, Download, RotateCcw, Copy, Check, AlertTriangle, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";
import { CLAUSES_IA_AVERTISSEMENT } from "@/lib/ai/prompts/generateur-clauses-ia.constants";

const TYPES_CLAUSES = [
  { id: "responsabilite_ia", label: "Responsabilité IA", desc: "Limitation, indemnisation, garanties sur les outputs" },
  { id: "transparence_algo", label: "Transparence algorithmique", desc: "Logique, biais, droit d'explication" },
  { id: "dpa_rgpd", label: "Sous-traitance RGPD (DPA)", desc: "Art. 28 RGPD — contrat sous-traitant complet" },
  { id: "conformite_ai_act", label: "Conformité AI Act", desc: "Obligations fournisseur / déployeur Art. 25-30" },
  { id: "audit", label: "Droit d'audit et d'accès", desc: "Logs, documentation, audits" },
  { id: "propriete_intellectuelle", label: "Propriété intellectuelle IA", desc: "Outputs, entraînement, fine-tuning" },
  { id: "portabilite", label: "Portabilité des données", desc: "Restitution et export en fin de contrat" },
  { id: "package_complet", label: "Package complet", desc: "Les 7 familles de clauses du catalogue" },
] as const;

const NIVEAUX = [
  { id: "essentielle", label: "Essentielle", desc: "Minimum légalement requis" },
  { id: "standard", label: "Standard", desc: "Équilibre protection / praticabilité" },
  { id: "renforcee", label: "Renforcée", desc: "Protection maximale B2B" },
] as const;

type ClauseTypeId = (typeof TYPES_CLAUSES)[number]["id"];
type NiveauId = (typeof NIVEAUX)[number]["id"];

interface Clause {
  numero: string;
  titre: string;
  texte: string;
  base_legale: string;
  commentaire: string;
  variante?: string;
  niveau?: string;
  placeholders?: string[];
}

interface ClausesData {
  type_clause: string;
  niveau?: string;
  avertissement_professionnel?: string;
  clauses: Clause[];
  notes_personnalisation?: string[];
  annexes_recommandees?: string[];
  checklist_livraison?: string[];
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
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b gap-2 flex-wrap">
        <div>
          <span className="text-xs font-mono text-slate-500 mr-2">{clause.numero}</span>
          <span className="font-semibold text-slate-900">{clause.titre}</span>
        </div>
        <div className="flex items-center gap-2">
          {clause.niveau && <Badge variant="outline" className="text-xs">{clause.niveau}</Badge>}
          <Badge variant="outline" className="text-xs max-w-[200px] truncate">{clause.base_legale}</Badge>
          <button type="button" onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="bg-slate-50 rounded-lg p-4 font-serif text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {clause.texte}
        </div>
        <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {clause.commentaire}
        </div>
        {clause.variante && (
          <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <strong>Variante :</strong> {clause.variante}
          </div>
        )}
        {clause.placeholders && clause.placeholders.length > 0 && (
          <p className="text-[10px] text-slate-500">Placeholders : {clause.placeholders.join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

export default function ClausesContratPage() {
  const [clauseType, setClauseType] = useState<ClauseTypeId>("responsabilite_ia");
  const [niveau, setNiveau] = useState<NiveauId>("standard");
  const [partieA, setPartieA] = useState("le Prestataire");
  const [roleA, setRoleA] = useState("Fournisseur (développe/commercialise)");
  const [partieB, setPartieB] = useState("le Client");
  const [roleB, setRoleB] = useState("Déployeur");
  const [contractType, setContractType] = useState("SaaS");
  const [domain, setDomain] = useState("");
  const [personalData, setPersonalData] = useState("Oui — données ordinaires");
  const [aiClassification, setAiClassification] = useState("Inconnu");
  const [applicableLaw, setApplicableLaw] = useState("Français");
  const [language, setLanguage] = useState("Français");
  const [contexte, setContexte] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<ClausesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/clauses-contrat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clause_type: clauseType,
          niveau,
          partie_a: partieA,
          role_a: roleA,
          partie_b: partieB,
          role_b: roleB,
          contract_type: contractType,
          domain,
          personal_data: personalData,
          ai_classification: aiClassification,
          applicable_law: applicableLaw,
          language,
          contexte,
        }),
      });
      const data = (await res.json()) as { error?: string; result?: ClausesData };
      if (!res.ok) throw new Error(data.error);
      setResult(data.result ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function downloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title: `Clauses — ${result.type_clause}`,
        subtitle: result.niveau ? `Niveau ${result.niveau}` : undefined,
        sections: [
          { heading: "Avertissement", body: result.avertissement_professionnel ?? CLAUSES_IA_AVERTISSEMENT },
          ...result.clauses.map((c) => ({
            heading: `${c.numero} — ${c.titre}`,
            body: `${c.texte}\n\nBase légale : ${c.base_legale}\n${c.commentaire}`,
          })),
          { heading: "Notes de négociation", body: result.notes_negociation },
          { heading: "Risques sans ces clauses", body: result.risques_sans_clause },
          { heading: "Disclaimer", body: result.disclaimer },
        ],
        filename: "clauses-contrat",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  function download() {
    if (!result) return;
    const lines = [
      result.type_clause,
      result.niveau ? `Niveau : ${result.niveau}` : "",
      "=".repeat(60),
      result.avertissement_professionnel ?? CLAUSES_IA_AVERTISSEMENT,
      "",
      ...result.clauses.flatMap((c) => [
        `\n${c.numero} — ${c.titre}`,
        c.texte,
        `Base légale : ${c.base_legale}`,
        c.commentaire,
        "",
      ]),
      "\nNOTES DE PERSONNALISATION",
      ...(result.notes_personnalisation ?? []).map((n) => `- ${n}`),
      "\nANNEXES RECOMMANDÉES",
      ...(result.annexes_recommandees ?? []).map((n) => `- ${n}`),
      "\nNOTES DE NÉGOCIATION",
      result.notes_negociation,
      "\nRISQUES SANS CES CLAUSES",
      result.risques_sans_clause,
      "",
      result.disclaimer,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clauses-contrat-ia.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-100 rounded-xl">
            <FilePen className="h-6 w-6 text-violet-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Générateur de clauses contractuelles IA</h1>
            <p className="text-muted-foreground mt-1">
              Clauses prêtes à insérer — Art. 28 RGPD, Art. 25-30 AI Act, PI, audit. 3 niveaux de protection.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">Art. 28 RGPD</Badge>
              <Badge variant="outline">AI Act</Badge>
              <Badge variant="outline">Essentielle / Standard / Renforcée</Badge>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{CLAUSES_IA_AVERTISSEMENT}</p>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de clause</label>
            <div className="space-y-2">
              {TYPES_CLAUSES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setClauseType(t.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-colors",
                    clauseType === t.id ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <p className="font-medium text-sm text-slate-900">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Niveau de protection</label>
            <div className="grid grid-cols-3 gap-2">
              {NIVEAUX.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNiveau(n.id)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left text-sm transition-colors",
                    niveau === n.id ? "border-violet-500 bg-violet-50" : "border-slate-200",
                  )}
                >
                  <p className="font-medium">{n.label}</p>
                  <p className="text-[10px] text-slate-500">{n.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Partie A (Prestataire)</label>
              <input
                type="text"
                value={partieA}
                onChange={(e) => setPartieA(e.target.value)}
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={roleA}
                onChange={(e) => setRoleA(e.target.value)}
                placeholder="Rôle AI Act"
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Partie B (Client)</label>
              <input
                type="text"
                value={partieB}
                onChange={(e) => setPartieB(e.target.value)}
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input
                type="text"
                value={roleB}
                onChange={(e) => setRoleB(e.target.value)}
                placeholder="Rôle AI Act"
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type de contrat</label>
              <input
                type="text"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Domaine</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="RH, Santé, Finance…"
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Données personnelles</label>
              <input
                type="text"
                value={personalData}
                onChange={(e) => setPersonalData(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Classification AI Act</label>
              <select
                value={aiClassification}
                onChange={(e) => setAiClassification(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                {["Inconnu", "Haut risque", "Risque limité", "Risque minimal", "GPAI"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Droit applicable</label>
              <input
                type="text"
                value={applicableLaw}
                onChange={(e) => setApplicableLaw(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Langue</label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Contexte complémentaire</label>
            <Textarea
              placeholder="Prestation, SLA, sous-traitants connus, transferts hors UE…"
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}
          <Button onClick={generate} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700">
            {loading ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération des clauses…
              </>
            : <>
                <FilePen className="h-4 w-4" />
                Générer les clauses
              </>
            }
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">{result.type_clause}</h1>
          {result.niveau && <p className="text-sm text-muted-foreground">Niveau {result.niveau}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" />
            TXT
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
        {result.avertissement_professionnel ?? CLAUSES_IA_AVERTISSEMENT}
      </div>

      {result.clauses.map((c, i) => (
        <ClauseCard key={i} clause={c} />
      ))}

      {result.notes_personnalisation && result.notes_personnalisation.length > 0 && (
        <div className="bg-slate-50 border rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Notes de personnalisation</p>
          <ul className="text-sm text-slate-700 space-y-1">
            {result.notes_personnalisation.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        </div>
      )}

      {result.annexes_recommandees && result.annexes_recommandees.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-2">Annexes recommandées</p>
          <ul className="text-sm text-slate-700 space-y-1">
            {result.annexes_recommandees.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Notes de négociation</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.notes_negociation}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Risques sans ces clauses</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.risques_sans_clause}</p>
        </div>
      </div>

      <p className="text-xs text-slate-400 italic text-center">{result.disclaimer}</p>
    </div>
  );
}
