"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Download, RotateCcw, ChevronDown, ChevronRight, BookOpen, Lightbulb, FileDown } from "lucide-react";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";
import { cn } from "@/lib/utils";

const EXEMPLES = [
  "La responsabilité civile des développeurs de systèmes d'intelligence artificielle",
  "L'encadrement des systèmes IA à haut risque par l'AI Act : analyse critique",
  "Protection des données personnelles et modèles de langage de grande taille",
  "Le droit au déréférencement à l'ère de l'IA générative",
  "La gouvernance algorithmique dans les ressources humaines",
];

interface PlanData {
  titre_propose: string;
  problematique: string;
  introduction_amorce: string;
  plan: Array<{
    partie: string;
    sous_parties: Array<{
      titre: string;
      sections: Array<{ titre: string; idees: string[] }>;
    }>;
  }>;
  bibliographie: Array<{ type: string; references: string[] }>;
  conseils_directeur: string;
}

function SectionCollapse({ title, children, accent = false }: { title: string; children: React.ReactNode; accent?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("border rounded-xl overflow-hidden", accent && "border-blue-200")}>
      <button onClick={() => setOpen(!open)} className={cn("w-full flex items-center justify-between px-5 py-3 text-left transition-colors", accent ? "bg-blue-50 hover:bg-blue-100" : "bg-slate-50 hover:bg-slate-100")}>
        <span className={cn("font-semibold text-sm", accent ? "text-blue-900" : "text-slate-900")}>{title}</span>
        {open ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
      </button>
      {open && <div className="px-5 py-4 bg-white">{children}</div>}
    </div>
  );
}

export default function PlanMemoirePage() {
  const [sujet, setSujet] = useState("");
  const [niveau, setNiveau] = useState("Master 2");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<PlanData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!sujet.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate/plan-memoire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sujet, niveau }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  function buildExportSections() {
    if (!result) return { title: "Plan de mémoire", sections: [] as { heading: string; body: string }[] };
    return {
      title: result.titre_propose,
      sections: [
        { heading: "Problématique", body: result.problematique },
        { heading: "Amorce d'introduction", body: result.introduction_amorce },
        {
          heading: "Plan",
          body: result.plan
            .map((p) => `${p.partie}\n${p.sous_parties.map((sp) =>
              `  ${sp.titre}\n${sp.sections.map((s) => `    ${s.titre}\n${s.idees.map((i) => `      • ${i}`).join("\n")}`).join("\n")}`,
            ).join("\n")}`)
            .join("\n\n"),
        },
        {
          heading: "Bibliographie",
          body: result.bibliographie.map((b) => `${b.type}\n${b.references.map((r) => `  • ${r}`).join("\n")}`).join("\n\n"),
        },
        { heading: "Conseils du directeur", body: result.conseils_directeur },
      ],
    };
  }

  function downloadPlan() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    const lines = [title, "=".repeat(title.length), "", ...sections.flatMap((s) => [s.heading.toUpperCase(), s.body, ""])];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "plan-memoire.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title,
        subtitle: `Niveau : ${niveau}`,
        sections,
        filename: "plan-memoire",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl"><GraduationCap className="h-6 w-6 text-indigo-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Générateur de plans de mémoires / thèses</h1>
            <p className="text-muted-foreground mt-1">Soumettez votre sujet → Claude génère un plan en 2 parties / 4 sous-parties avec bibliographie et problématique.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Master 1&2</Badge>
              <Badge variant="outline">Thèse de doctorat</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sujet du mémoire</label>
            <Input
              placeholder="Ex : La responsabilité civile des développeurs d'IA..."
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500">Exemples de sujets</label>
            <div className="space-y-1.5">
              {EXEMPLES.map((ex) => (
                <button key={ex} onClick={() => setSujet(ex)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors">
                  → {ex}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Niveau</label>
            <div className="flex gap-2 flex-wrap">
              {["Licence 3", "Master 1", "Master 2", "Doctorat"].map((n) => (
                <button key={n} onClick={() => setNiveau(n)}
                  className={cn("px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors", niveau === n ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 hover:border-slate-400")}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading || sujet.trim().length < 10} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération...</> : <><GraduationCap className="h-4 w-4" />Générer le plan</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{result.titre_propose}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPlan}><Download className="h-4 w-4" />TXT</Button>
          <Button variant="outline" size="sm" onClick={() => { setResult(null); setSujet(""); }}><RotateCcw className="h-4 w-4" />Nouveau</Button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Problématique</p>
        <p className="text-slate-900 leading-relaxed">{result.problematique}</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Amorce d'introduction suggérée</p>
        <p className="text-sm text-slate-700 italic">{result.introduction_amorce}</p>
      </div>

      {result.plan.map((partie, pi) => (
        <div key={pi} className="border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-900 text-white px-5 py-3">
            <p className="font-bold">{partie.partie}</p>
          </div>
          {partie.sous_parties.map((sp, si) => (
            <div key={si} className={cn("border-t", si > 0 && "border-slate-100")}>
              <div className="bg-slate-100 px-5 py-2.5">
                <p className="font-semibold text-slate-800 text-sm">{sp.titre}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-slate-100">
                {sp.sections.map((sec, secI) => (
                  <div key={secI} className="px-5 py-3">
                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">{sec.titre}</p>
                    <ul className="space-y-1">
                      {sec.idees.map((idee, ii) => (
                        <li key={ii} className="flex items-start gap-1.5 text-xs text-slate-600">
                          <span className="text-slate-400 flex-shrink-0">•</span>{idee}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <SectionCollapse title="Bibliographie indicative">
        <div className="space-y-4">
          {result.bibliographie.map((b, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />{b.type}</p>
              <ul className="space-y-1">
                {b.references.map((r, ri) => <li key={ri} className="text-sm text-slate-700 flex items-start gap-2"><span className="text-slate-400 flex-shrink-0 mt-0.5">—</span>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionCollapse>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Conseils du directeur de thèse</p>
          <p className="text-sm text-slate-700">{result.conseils_directeur}</p>
        </div>
      </div>
    </div>
  );
}
