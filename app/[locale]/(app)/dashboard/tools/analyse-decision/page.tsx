"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gavel, Loader2, RotateCcw, Download, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";
import { useAIToast } from "@/components/ui/toast-provider";
import { parseJsonWithAiErrors } from "@/lib/ai/client-ai-errors";

const PROFILS = [
  {
    id: "professionnel",
    label: "Professionnel",
    desc: "Faits, violations, Art. 83(2), injonctions, sens/valeur/portée, checklist compliance",
  },
  {
    id: "etudiant",
    label: "Étudiant",
    desc: "Méthode, syllogismes, plan de commentaire — sans rédaction intégrale",
  },
  { id: "rapide", label: "Rapide", desc: "Synthèse exécutive 1 page" },
] as const;

type ProfilId = (typeof PROFILS)[number]["id"];

const EXEMPLES = [
  {
    label: "CNIL — SAN-2023-009 Criteo",
    text: "CNIL — Délibération SAN-2023-009 : sanction de 40 millions d'euros contre CRITEO pour manquements aux obligations d'information et de consentement en matière de cookies et publicité ciblée (bases légales RGPD, Art. 82).",
  },
  {
    label: "DPC — Meta transferts",
    text: "DPC Ireland — Decision IN-20-1-1 : amende record contre Meta Platforms pour transferts de données personnelles vers les États-Unis sans garanties appropriées post-Schrems II.",
  },
  {
    label: "EDPB — Guidelines",
    text: "EDPB — Guidelines 05/2022 sur les cookie walls et le consentement (soft law, non contraignant mais suivi par les DPA).",
  },
];

function ProseBlock({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">
      {content}
    </div>
  );
}

export default function AnalyseDecisionPage() {
  const [texteDecision, setTexteDecision] = useState("");
  const [reference, setReference] = useState("");
  const [profil, setProfil] = useState<ProfilId>("professionnel");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<{
    markdown: string;
    profil: ProfilId;
    headline: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aiToast = useAIToast();

  async function generate() {
    if (texteDecision.trim().length < 80) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/analyse-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texte_decision: texteDecision,
          reference: reference.trim() || undefined,
          profil,
        }),
      });
      const parsed = await parseJsonWithAiErrors<{
        result?: { markdown: string; profil: ProfilId; headline: string | null };
      }>(res, aiToast);
      if (!parsed.ok) return;
      setResult(parsed.data.result ?? null);
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
        title: "Analyse de décision d'autorité",
        subtitle: result.headline ?? `Profil ${result.profil}`,
        sections: [{ heading: "Analyse", body: result.markdown }],
        filename: `analyse-decision-${result.profil}`,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analyse-decision-${result.profil}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <Gavel className="h-6 w-6 text-orange-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analyseur de décisions d&apos;autorités</h1>
            <p className="text-muted-foreground mt-1">
              CNIL, DPC, Garante, AEPD, ICO, EDPB, AI Office — faits, syllogisme, Art. 83(2), sens · valeur · portée.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">Sanctions RGPD / AI Act</Badge>
              <Badge variant="outline">3 profils</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Profil d&apos;analyse</label>
            <div className="space-y-2">
              {PROFILS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfil(p.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-colors",
                    profil === p.id ? "border-orange-500 bg-orange-50" : "border-slate-200",
                  )}
                >
                  <p className="font-medium text-sm">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Référence (optionnel)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex. SAN-2023-009, DPC Case Ref IN-20-1-1"
              className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Texte de la décision</label>
            <Textarea
              placeholder="Collez le texte intégral ou un extrait substantiel de la décision…"
              value={texteDecision}
              onChange={(e) => setTexteDecision(e.target.value)}
              className="min-h-[200px] text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Exemples</p>
            {EXEMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => {
                  setTexteDecision(ex.text);
                  setReference(ex.label);
                }}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
              >
                → {ex.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}
          <Button
            onClick={generate}
            disabled={loading || texteDecision.trim().length < 80}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {loading ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours…
              </>
            : <>
                <Gavel className="h-4 w-4" />
                Analyser cette décision
              </>
            }
          </Button>
        </div>
      </div>
    );
  }

  const profilLabel = PROFILS.find((p) => p.id === result.profil)?.label ?? result.profil;

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Analyse de décision</h1>
          <p className="text-sm text-muted-foreground">Profil {profilLabel}</p>
          {result.headline && <p className="text-sm text-slate-700 mt-1 italic">{result.headline}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" />
            Markdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Nouvelle analyse
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <ProseBlock content={result.markdown} />
      </div>
    </div>
  );
}
