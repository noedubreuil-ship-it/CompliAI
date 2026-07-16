"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Loader2, RotateCcw, Download, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";
import { cn } from "@/lib/utils";

const SECTEURS = ["Santé", "Finance & Banque", "RH & Recrutement", "Éducation", "Transport", "Sécurité", "Justice", "Administration publique", "Industrie", "Autre"];

const CRITICITE_COLOR: Record<string, string> = {
  "Critique": "bg-red-100 text-red-700 border-red-200",
  "Haute": "bg-orange-100 text-orange-700 border-orange-200",
  "Moyenne": "bg-amber-100 text-amber-700 border-amber-200",
};

interface Question {
  numero: number; categorie: string; question: string;
  article_vise: string; type_reponse: string; criticite: string; indice: string;
}

interface AuditData {
  contexte_audit: string; systeme_audite: string;
  questions: Question[];
  categories_couvertes: string[];
  preparation_conseils: string;
}

function QuestionCard({ q, index }: { q: Question; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors", open && "bg-slate-50 border-b")}>
        <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{q.numero}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{q.question}</p>
          <p className="text-xs text-muted-foreground">{q.categorie}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", CRITICITE_COLOR[q.criticite] || "bg-slate-100 text-slate-600 border-slate-200")}>{q.criticite}</span>
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-4 py-3 bg-white space-y-2">
          <p className="text-sm text-slate-800 font-medium">{q.question}</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-blue-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-blue-700 mb-0.5">Article visé</p>
              <p className="text-slate-700">{q.article_vise}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-slate-600 mb-0.5">Type de réponse attendu</p>
              <p className="text-slate-700">{q.type_reponse}</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
            <span className="font-semibold text-amber-700">Ce que cherche l'auditeur : </span>
            <span className="text-slate-700">{q.indice}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditQRPage() {
  const locale = useLocale();
  const [systemDescription, setSystemDescription] = useState("");
  const [secteur, setSecteur] = useState("Santé");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterCrit, setFilterCrit] = useState<string>("Toutes");

  async function generate() {
    if (!systemDescription.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate/audit-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemDescription, secteur, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  function buildExportSections() {
    if (!result) return { title: "Audit QR", sections: [] as { heading: string; body: string }[] };
    return {
      title: `Questions d'audit — ${result.systeme_audite}`,
      sections: [
        { heading: "Contexte", body: result.contexte_audit },
        {
          heading: "Questions d'audit",
          body: result.questions
            .map((q) => `Q${q.numero} [${q.criticite}] — ${q.categorie}\n${q.question}\nArticle : ${q.article_vise} | Réponse attendue : ${q.type_reponse}`)
            .join("\n\n"),
        },
        { heading: "Conseils de préparation", body: result.preparation_conseils },
      ],
    };
  }

  function download() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    const lines = [title, "=".repeat(60), "", ...sections.flatMap((s) => [s.heading.toUpperCase(), s.body, ""])];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit-qr-ia.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({ title, sections, filename: "audit-qr-ia" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-100 rounded-xl"><ClipboardCheck className="h-6 w-6 text-teal-700" /></div>
          <div>
            <h1 className="text-2xl font-bold">Générateur de Q&R pour audits réglementaires</h1>
            <p className="text-muted-foreground mt-1">Claude joue le rôle de l'auditeur et pose les 20 questions types qu'un régulateur poserait sur votre système IA haut risque.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Art. 74-80 AI Act</Badge>
              <Badge variant="outline">Préparation audit</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Description du système IA à auditer *</label>
            <Textarea
              placeholder="Ex : Système de scoring algorithmique de crédit bancaire. Utilise un modèle XGBoost entraîné sur 5 ans d'historique de remboursement. Prend des décisions automatiques d'octroi ou de refus de crédit jusqu'à 50 000€. 10 000 décisions/mois. Déployé depuis 6 mois..."
              value={systemDescription}
              onChange={(e) => setSystemDescription(e.target.value)}
              className="min-h-[160px] text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Secteur</label>
            <div className="flex flex-wrap gap-2">
              {SECTEURS.map((s) => (
                <button key={s} onClick={() => setSecteur(s)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors", secteur === s ? "bg-teal-600 text-white border-teal-600" : "border-slate-300 hover:border-slate-400")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading || systemDescription.trim().length < 20} className="w-full bg-teal-600 hover:bg-teal-700">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération des questions...</> : <><ClipboardCheck className="h-4 w-4" />Générer les questions d'audit</>}
          </Button>
        </div>
      </div>
    );
  }

  const filteredQ = filterCrit === "Toutes" ? result.questions : result.questions.filter(q => q.criticite === filterCrit);
  const critCounts = { "Critique": result.questions.filter(q => q.criticite === "Critique").length, "Haute": result.questions.filter(q => q.criticite === "Haute").length, "Moyenne": result.questions.filter(q => q.criticite === "Moyenne").length };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Questions d'audit réglementaire</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{result.systeme_audite}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />TXT</Button>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}><RotateCcw className="h-4 w-4" />Nouveau</Button>
        </div>
      </div>

      <div className="bg-slate-800 text-white rounded-xl p-4 text-sm">{result.contexte_audit}</div>

      <div className="grid grid-cols-3 gap-3">
        {Object.entries(critCounts).map(([crit, count]) => (
          <div key={crit} className={cn("rounded-xl p-3 text-center border", CRITICITE_COLOR[crit] || "")}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs font-medium">{crit}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {["Toutes", "Critique", "Haute", "Moyenne"].map((f) => (
          <button key={f} onClick={() => setFilterCrit(f)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors", filterCrit === f ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:border-slate-400")}>
            {f} {f !== "Toutes" && `(${critCounts[f as keyof typeof critCounts] ?? 0})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredQ.map((q, i) => <QuestionCard key={i} q={q} index={i} />)}
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">Conseils de préparation</p>
        <p className="text-sm text-slate-700">{result.preparation_conseils}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">Catégories couvertes :</p>
        {result.categories_couvertes.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}
      </div>
    </div>
  );
}
