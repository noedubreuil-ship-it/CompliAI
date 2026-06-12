"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft, Gavel, Loader2, Upload, FileText, ExternalLink, X,
  AlertCircle, CheckCircle, ChevronDown, ChevronUp, Scale, BookOpen,
  Globe, Users, Building2, AlertTriangle, Sparkles, Link as LinkIcon,
  GraduationCap, FileDown,
} from "lucide-react";
import Link from "next/link";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

interface CommentaireAxes {
  section_1_identification_contexte?: string;
  section_2_faits_procedure_eu?: string;
  section_3_sens?: {
    syllogisme?: { majeure?: string; mineure?: string; conclusion?: string };
    notions_centrales?: Array<{
      notion?: string;
      definition_ue?: string;
      interpretation_retenue?: string;
      nouveau_ou_confirme?: string;
    }>;
    position_droit_anterieur?: { categorie?: string; developpement?: string };
    methode_interpretation?: string;
  };
  section_3bis_valeur?: {
    pertinence_juridique?: {
      niveau?: string;
      developpement?: string;
      confrontation_ag_ou_dissidence?: string;
    };
    pertinence_extra_juridique?: {
      economique?: string;
      social_et_droits_fondamentaux?: string;
      ethique_et_equilibre_valeurs?: string;
      coherence_institutions_contentieux?: string;
    };
    appreciation_globale_obligatoire?: string;
  };
  section_3ter_portee?: {
    ratione_temporis?: {
      nature_de_l_arret?: string;
      indices?: string;
      suites_connues_ou_probables?: string;
    };
    ratione_materiae?: {
      conditions_necessaires?: string[];
      situations_couvertes?: string[];
      situations_exclues?: string[];
      zones_ambiguës?: string[];
    };
    consequences_pour_justiciables?: string;
    consequences_pour_le_droit_positif_et_avvenir?: string;
  };
  section_4_dispositions_interpretées_table?: Array<{
    instrument?: string;
    articles?: string[];
    lecture_retenue_par_la_juridiction?: string;
  }>;
  section_5_place_dans_la_jurisprudence_europeenne?: string;
  section_6_implications_pratiques_renvoi?: string;
  section_7_ressources_compliai?: Array<{ outil?: string; chemin?: string; usage?: string }>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisResult {
  reference: string;
  limitations_sources?: string[];
  commentaire_axes?: CommentaireAxes;
  title: string;
  juridiction: string;
  date: string;
  parties: string;
  ecli: string | null;
  executive_summary: string;
  eu_legal_context: {
    applicable_regulations: Array<{
      regulation: string; celex: string; articles: string[];
      role: string; eurlex_url: string;
    }>;
    fundamental_rights: Array<{
      right: string; charter_article: string; cedh_article?: string; analysis: string;
    }>;
    key_principles: Array<{ principle: string; source: string; application: string }>;
  };
  jurisprudence_map: Array<{
    case: string; ecli: string; court: string; date: string;
    relevance: string; link_type: string;
  }>;
  regulatory_positions: Array<{
    authority: string; document: string; date: string; position: string; url?: string;
  }>;
  legal_analysis: {
    facts: string; procedure: string; legal_issues: string[];
    reasoning: string; decision: string; dissenting_opinions?: string;
  };
  practical_implications: {
    for_companies: Array<{
      implication: string; action_required: string;
      urgency: string; concerns: string[];
    }>;
    for_dpos: string; for_ai_systems: string;
    financial_exposure: string; compliance_actions: string[];
  };
  significance: {
    scope: string; importance: string; novelty: string;
    precedent_value: string; open_questions: string[];
  };
  related_developments: Array<{ type: string; description: string; url?: string }>;
  overall_assessment: string;
  legal_certainty: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const IMPORTANCE_CONFIG: Record<string, { label: string; color: string }> = {
  landmark: { label: "Décision fondatrice", color: "bg-red-100 text-red-700 border-red-200" },
  significant: { label: "Décision importante", color: "bg-orange-100 text-orange-700 border-orange-200" },
  routine: { label: "Application courante", color: "bg-blue-100 text-blue-700 border-blue-200" },
  informative: { label: "Informative", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const LINK_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  confirme: { label: "Confirme", color: "bg-green-100 text-green-700" },
  étend: { label: "Étend", color: "bg-blue-100 text-blue-700" },
  applique: { label: "Applique", color: "bg-indigo-100 text-indigo-700" },
  distingue: { label: "Distingue", color: "bg-amber-100 text-amber-700" },
  contredit: { label: "Contredit", color: "bg-red-100 text-red-700" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  immediate: { label: "Immédiat", color: "text-red-600 bg-red-50" },
  short_term: { label: "Court terme", color: "text-orange-600 bg-orange-50" },
  medium_term: { label: "Moyen terme", color: "text-amber-600 bg-amber-50" },
};

const SCOPE_LABELS: Record<string, string> = {
  local: "Local", national: "National", EU: "Union Européenne", international: "International",
};

const CERTAINTY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "Certitude élevée", color: "text-green-700 bg-green-50" },
  medium: { label: "Certitude moyenne", color: "text-amber-700 bg-amber-50" },
  low: { label: "Certitude faible", color: "text-red-700 bg-red-50" },
};

const VALEUR_JURIDIQUE_LABELS: Record<string, { label: string; color: string }> = {
  conforme: { label: "Conforme au droit EU", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  partiellement_critiquable: { label: "Partiellement critiquable", color: "bg-amber-100 text-amber-900 border-amber-200" },
  critiquable: { label: "Critiquable", color: "bg-red-100 text-red-800 border-red-200" },
};

const FAMOUS_CASES = [
  { ref: "Schrems II (C-311/18)", desc: "Invalidation Privacy Shield — transferts EU-USA" },
  { ref: "Google Spain (C-131/12)", desc: "Droit à l'oubli — RGPD, moteurs de recherche" },
  { ref: "Meta Platforms (C-252/21)", desc: "Données personnelles — publicité comportementale" },
  { ref: "Ligue des droits humains (C-817/19)", desc: "API PNR Belgique — surveillance de masse EU" },
  { ref: "Fashion ID (C-40/17)", desc: "Co-responsabilité boutons «J'aime» Facebook" },
  { ref: "ASNEF-EQUIFAX (C-238/05)", desc: "Bases légales traitement données clients EU" },
];

// ─── Section collapsible ──────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, defaultOpen = true, badge }: {
  title: string; icon: React.ComponentType<any>; children: React.ReactNode;
  defaultOpen?: boolean; badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button className="w-full" onClick={() => setOpen(o => !o)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4 text-slate-600" />
              {title}
              {badge && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">{badge}</span>}
            </CardTitle>
            {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </CardHeader>
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function JurisprudenceAnalyzerPage() {
  const [inputMode, setInputMode] = useState<"reference" | "text" | "pdf">("reference");
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [analysisFocus, setAnalysisFocus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError("Fichier trop volumineux (max 10 Mo)"); return; }
    if (!f.name.match(/\.(pdf|txt)$/i)) { setError("Format non supporté. Utilisez PDF ou TXT."); return; }
    setFile(f); setError("");
  }

  async function analyze() {
    setLoading(true); setError(""); setResult(null);

    try {
      let res: Response;

      if (inputMode === "pdf" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("reference", reference);
        formData.append("analysis_focus", analysisFocus);
        if (text.trim()) formData.append("text", text);
        res = await fetch("/api/generate/jurisprudence", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/generate/jurisprudence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference, text, analysis_focus: analysisFocus }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur analyse");
      setResult(data.content as AnalysisResult);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = reference.trim() || text.trim() || (inputMode === "pdf" && file);

  async function downloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      const la = result.legal_analysis;
      const pi = result.practical_implications;
      await downloadToolExportPdf({
        title: result.title || result.reference,
        subtitle: [result.juridiction, result.date, result.ecli].filter(Boolean).join(" · "),
        sections: [
          { heading: "Synthèse exécutive", body: result.executive_summary },
          ...(la ? [{
            heading: "Analyse juridique",
            body: [
              la.facts && `Faits\n${la.facts}`,
              la.procedure && `Procédure\n${la.procedure}`,
              la.legal_issues?.length && `Questions de droit\n${la.legal_issues.map((q) => `• ${q}`).join("\n")}`,
              la.reasoning && `Raisonnement\n${la.reasoning}`,
              la.decision && `Décision\n${la.decision}`,
            ].filter(Boolean).join("\n\n"),
          }] : []),
          ...(result.jurisprudence_map?.length ? [{
            heading: "Jurisprudence liée",
            body: result.jurisprudence_map.map((j) => `• ${j.case} (${j.court}, ${j.date}) — ${j.relevance}`).join("\n"),
          }] : []),
          ...(pi ? [{
            heading: "Implications pratiques",
            body: [
              pi.for_companies?.map((c) => `• ${c.implication} — ${c.action_required} [${c.urgency}]`).join("\n"),
              pi.for_dpos && `DPO : ${pi.for_dpos}`,
              pi.for_ai_systems && `Systèmes IA : ${pi.for_ai_systems}`,
              pi.compliance_actions?.length && `Actions : ${pi.compliance_actions.map((a) => `• ${a}`).join("\n")}`,
            ].filter(Boolean).join("\n\n"),
          }] : []),
          ...(result.significance ? [{
            heading: "Portée et importance",
            body: [
              result.significance.scope && `Portée : ${result.significance.scope}`,
              result.significance.importance && `Importance : ${result.significance.importance}`,
              result.significance.precedent_value && `Valeur de précédent : ${result.significance.precedent_value}`,
              result.significance.open_questions?.length && `Questions ouvertes :\n${result.significance.open_questions.map((q) => `• ${q}`).join("\n")}`,
            ].filter(Boolean).join("\n"),
          }] : []),
          { heading: "Évaluation globale", body: result.overall_assessment },
        ],
        filename: "analyse-jurisprudence",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/tools"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Gavel className="h-5 w-5 text-indigo-600" /> Analyseur IA de jurisprudence
          </h1>
          <p className="text-sm text-muted-foreground">
            Méthode académique UE — <strong>sens</strong>, <strong>valeur</strong> (prise de position), <strong>portée</strong> — CJUE, CEDH, RGPD, AI Act, DSA, Charte UE
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
        <strong>Comment ça fonctionne ?</strong> Entrez une référence d&apos;affaire (ECLI, nom), collez le texte d&apos;une décision,
        ou uploadez un PDF. L&apos;IA rédige un commentaire structuré selon trois axes obligatoires — <strong>sens</strong> (syllogisme et méthode),
        <strong>valeur</strong> (pertinence juridique et extra-juridique, avec appréciation non neutre), <strong>portée</strong> (
        <em>ratione temporis</em> et <em>ratione materiae</em>) — sous le prisme du droit européen et du Conseil de l&apos;Europe lorsque pertinent.
      </div>

      {!result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source de la décision à analyser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode selector */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {([
                { id: "reference", label: "Par référence", icon: BookOpen },
                { id: "text", label: "Coller le texte", icon: FileText },
                { id: "pdf", label: "Upload PDF", icon: Upload },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setInputMode(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>

            {/* Common: reference field */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Référence de l&apos;affaire
                {inputMode === "reference" ? " *" : " (optionnel — aide à l'identification)"}
              </label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder="Ex: ECLI:EU:C:2020:559 (Schrems II) ou C-311/18 ou « Meta Platforms vs DPC »"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {/* Famous cases shortcuts */}
            {inputMode === "reference" && (
              <div>
                <p className="text-xs text-slate-500 mb-2">Affaires célèbres — clic pour pré-remplir :</p>
                <div className="flex flex-wrap gap-2">
                  {FAMOUS_CASES.map(c => (
                    <button key={c.ref} onClick={() => setReference(c.ref)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-700 transition-colors group">
                      <span className="font-medium">{c.ref}</span>
                      <span className="hidden group-hover:inline ml-1 text-slate-400">— {c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text mode */}
            {inputMode === "text" && (
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Texte de la décision *</label>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Collez le texte intégral ou le résumé de l'arrêt / de la décision / de la sanction DPA... L'IA analysera jusqu'à 12 000 caractères."
                  rows={10} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono leading-relaxed" />
                <p className="text-xs text-slate-400 mt-1">{text.length.toLocaleString()} / 12 000 caractères</p>
              </div>
            )}

            {/* PDF mode */}
            {inputMode === "pdf" && (
              <div>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    file ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                  }`}>
                  {file ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-8 w-8 text-indigo-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">{file.name}</p>
                        <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(0)} Ko</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="ml-2 p-1 hover:bg-red-50 rounded-full transition-colors">
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-700">Cliquez ou glissez un fichier PDF ou TXT</p>
                      <p className="text-xs text-slate-400 mt-1">Max 10 Mo — PDF d&apos;arrêts CJUE, CEDH, décisions DPA, EDPB...</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFile} />
              </div>
            )}

            {/* Analysis focus */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Focus d&apos;analyse (optionnel)</label>
              <input value={analysisFocus} onChange={e => setAnalysisFocus(e.target.value)}
                placeholder="Ex: implications pour les DPO, impact sur la publicité ciblée, conformité AI Act, transferts de données..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
              </div>
            )}

            <Button onClick={analyze} disabled={loading || !canAnalyze} className="w-full bg-indigo-600 hover:bg-indigo-700">
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Analyse en cours (30-60s)…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Analyser selon le droit européen</>
              )}
            </Button>

            <p className="text-xs text-slate-400 text-center">
              Analyse basée sur : CJUE, CEDH, AI Act, RGPD, DSA, DMA, NIS2, DORA, Charte EU, TUE/TFUE, CETS 225, EDPB, AI Office, DPA nationales
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Header card */}
          <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-slate-50">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-mono bg-white border px-2 py-0.5 rounded text-slate-600">{result.juridiction}</span>
                    <span className="text-xs text-slate-500">{result.date}</span>
                    {result.ecli && (
                      <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{result.ecli}</span>
                    )}
                    {result.significance?.importance && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${IMPORTANCE_CONFIG[result.significance.importance]?.color ?? ""}`}>
                        {IMPORTANCE_CONFIG[result.significance.importance]?.label ?? result.significance.importance}
                      </span>
                    )}
                    {result.significance?.scope && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Portée : {SCOPE_LABELS[result.significance.scope] ?? result.significance.scope}
                      </span>
                    )}
                    {result.legal_certainty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CERTAINTY_CONFIG[result.legal_certainty]?.color ?? ""}`}>
                        {CERTAINTY_CONFIG[result.legal_certainty]?.label}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">{result.title}</h2>
                  {result.parties && <p className="text-sm text-slate-600 italic mb-3">{result.parties}</p>}
                  <p className="text-sm text-slate-700 leading-relaxed">{result.executive_summary}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
                    {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResult(null)}>
                    Nouvelle analyse
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {result.limitations_sources && result.limitations_sources.filter(Boolean).length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
              <p className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> Sources et honnêteté méthodologique
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                {result.limitations_sources.filter(Boolean).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          {result.commentaire_axes && (
            <Section title="Commentaire académique UE — Sens · Valeur · Portée" icon={GraduationCap} badge="Trois axes">
              <div className="space-y-6 text-sm">
                {(result.commentaire_axes.section_1_identification_contexte ||
                  result.commentaire_axes.section_2_faits_procedure_eu) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.commentaire_axes.section_1_identification_contexte && (
                      <div className="p-3 border rounded-lg bg-slate-50/80">
                        <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">§ 1 Identification et contexte</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{result.commentaire_axes.section_1_identification_contexte}</p>
                      </div>
                    )}
                    {result.commentaire_axes.section_2_faits_procedure_eu && (
                      <div className="p-3 border rounded-lg bg-slate-50/80">
                        <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">§ 2 Faits et procédure (EU)</p>
                        <p className="text-slate-700 whitespace-pre-wrap">{result.commentaire_axes.section_2_faits_procedure_eu}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.commentaire_axes.section_3_sens && (
                  <div className="border border-indigo-200 rounded-xl p-4 bg-white">
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-3">§ 3 Sens de l&apos;arrêt</p>
                    {result.commentaire_axes.section_3_sens.syllogisme && (
                      <div className="grid grid-cols-1 gap-2 mb-4 text-xs">
                        <div className="p-2 rounded bg-indigo-50 border border-indigo-100">
                          <span className="font-semibold text-indigo-900">Majeure · </span>
                          <span className="text-slate-700">{result.commentaire_axes.section_3_sens.syllogisme.majeure}</span>
                        </div>
                        <div className="p-2 rounded bg-indigo-50 border border-indigo-100">
                          <span className="font-semibold text-indigo-900">Mineure · </span>
                          <span className="text-slate-700">{result.commentaire_axes.section_3_sens.syllogisme.mineure}</span>
                        </div>
                        <div className="p-2 rounded bg-indigo-50 border border-indigo-100">
                          <span className="font-semibold text-indigo-900">Conclusion · </span>
                          <span className="text-slate-700">{result.commentaire_axes.section_3_sens.syllogisme.conclusion}</span>
                        </div>
                      </div>
                    )}
                    {result.commentaire_axes.section_3_sens.notions_centrales &&
                      result.commentaire_axes.section_3_sens.notions_centrales.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Notions juridiques centrales</p>
                        <ul className="space-y-2">
                          {result.commentaire_axes.section_3_sens.notions_centrales.map((n, i) => (
                            <li key={i} className="p-2 border rounded-lg text-xs">
                              <span className="font-semibold text-slate-900">{n.notion}</span>
                              {n.nouveau_ou_confirme && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{n.nouveau_ou_confirme}</span>
                              )}
                              {n.definition_ue && <p className="text-slate-600 mt-1"><em>Définition EU :</em> {n.definition_ue}</p>}
                              {n.interpretation_retenue && <p className="text-slate-700 mt-1">{n.interpretation_retenue}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.commentaire_axes.section_3_sens.position_droit_anterieur?.developpement && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Position par rapport au droit antérieur</p>
                        {result.commentaire_axes.section_3_sens.position_droit_anterieur.categorie && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 mr-2">
                            {result.commentaire_axes.section_3_sens.position_droit_anterieur.categorie.replace(/_/g, " ")}
                          </span>
                        )}
                        <p className="text-xs text-slate-700 mt-1">{result.commentaire_axes.section_3_sens.position_droit_anterieur.developpement}</p>
                      </div>
                    )}
                    {result.commentaire_axes.section_3_sens.methode_interpretation && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Méthode d&apos;interprétation</p>
                        <p className="text-xs text-slate-700">{result.commentaire_axes.section_3_sens.methode_interpretation}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.commentaire_axes.section_3bis_valeur && (
                  <div className="border border-rose-200 rounded-xl p-4 bg-rose-50/40">
                    <p className="text-xs font-bold text-rose-900 uppercase tracking-wide mb-3">§ 3bis Valeur de l&apos;arrêt (prise de position)</p>
                    {result.commentaire_axes.section_3bis_valeur.pertinence_juridique && (
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-600">Pertinence juridique</span>
                          {result.commentaire_axes.section_3bis_valeur.pertinence_juridique.niveau && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VALEUR_JURIDIQUE_LABELS[result.commentaire_axes.section_3bis_valeur.pertinence_juridique.niveau]?.color ?? "bg-slate-100 text-slate-700"}`}>
                              {VALEUR_JURIDIQUE_LABELS[result.commentaire_axes.section_3bis_valeur.pertinence_juridique.niveau]?.label ?? result.commentaire_axes.section_3bis_valeur.pertinence_juridique.niveau}
                            </span>
                          )}
                        </div>
                        {result.commentaire_axes.section_3bis_valeur.pertinence_juridique.developpement && (
                          <p className="text-xs text-slate-800 leading-relaxed">{result.commentaire_axes.section_3bis_valeur.pertinence_juridique.developpement}</p>
                        )}
                        {result.commentaire_axes.section_3bis_valeur.pertinence_juridique.confrontation_ag_ou_dissidence && (
                          <div className="mt-2 p-2 bg-white/80 rounded border border-rose-100 text-xs text-slate-700">
                            <span className="font-semibold">AG / dissidence · </span>
                            {result.commentaire_axes.section_3bis_valeur.pertinence_juridique.confrontation_ag_ou_dissidence}
                          </div>
                        )}
                      </div>
                    )}
                    {result.commentaire_axes.section_3bis_valeur.pertinence_extra_juridique && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                        {[
                          ["Économique", result.commentaire_axes.section_3bis_valeur.pertinence_extra_juridique.economique],
                          ["Social & droits fondamentaux", result.commentaire_axes.section_3bis_valeur.pertinence_extra_juridique.social_et_droits_fondamentaux],
                          ["Éthique & équilibre des valeurs", result.commentaire_axes.section_3bis_valeur.pertinence_extra_juridique.ethique_et_equilibre_valeurs],
                          ["Institutions & contentieux", result.commentaire_axes.section_3bis_valeur.pertinence_extra_juridique.coherence_institutions_contentieux],
                        ].map(([label, val]) =>
                          val ?
                            <div key={String(label)} className="p-2 rounded-lg bg-white border border-rose-100">
                              <p className="font-semibold text-rose-900 mb-1">{label}</p>
                              <p className="text-slate-700">{val}</p>
                            </div>
                          : null
                        )}
                      </div>
                    )}
                    {result.commentaire_axes.section_3bis_valeur.appreciation_globale_obligatoire && (
                      <div className="p-3 rounded-lg bg-white border-2 border-rose-300">
                        <p className="text-xs font-semibold text-rose-950 uppercase mb-1">Appréciation globale</p>
                        <p className="text-sm text-slate-900 font-medium leading-relaxed">{result.commentaire_axes.section_3bis_valeur.appreciation_globale_obligatoire}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.commentaire_axes.section_3ter_portee && (
                  <div className="border border-sky-200 rounded-xl p-4 bg-sky-50/40">
                    <p className="text-xs font-bold text-sky-900 uppercase tracking-wide mb-3">§ 3ter Portée de l&apos;arrêt</p>
                    {result.commentaire_axes.section_3ter_portee.ratione_temporis && (
                      <div className="mb-4 text-xs">
                        <p className="font-semibold text-slate-700 mb-1"><em>Ratione temporis</em></p>
                        <div className="space-y-1 text-slate-700">
                          {result.commentaire_axes.section_3ter_portee.ratione_temporis.nature_de_l_arret && (
                            <p><strong>Nature :</strong> {result.commentaire_axes.section_3ter_portee.ratione_temporis.nature_de_l_arret}</p>
                          )}
                          {result.commentaire_axes.section_3ter_portee.ratione_temporis.indices && (
                            <p><strong>Indices :</strong> {result.commentaire_axes.section_3ter_portee.ratione_temporis.indices}</p>
                          )}
                          {result.commentaire_axes.section_3ter_portee.ratione_temporis.suites_connues_ou_probables && (
                            <p><strong>Suites connues ou probables :</strong> {result.commentaire_axes.section_3ter_portee.ratione_temporis.suites_connues_ou_probables}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {result.commentaire_axes.section_3ter_portee.ratione_materiae && (
                      <div className="mb-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(["conditions_necessaires", "situations_couvertes", "situations_exclues", "zones_ambiguës"] as const).map(key => {
                          const arr = result.commentaire_axes!.section_3ter_portee!.ratione_materiae![key];
                          if (!arr?.length) return null;
                          const label =
                            key === "conditions_necessaires" ? "Conditions nécessaires"
                            : key === "situations_couvertes" ? "Situations couvertes"
                            : key === "situations_exclues" ? "Situations exclues"
                            : "Zones ambiguës";
                          return (
                            <div key={key} className="p-2 bg-white rounded border border-sky-100">
                              <p className="font-semibold text-sky-900 mb-1">{label}</p>
                              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                                {arr.map((x, i) => (
                                  <li key={i}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {result.commentaire_axes.section_3ter_portee.consequences_pour_justiciables && (
                      <div className="mb-3 text-xs">
                        <p className="font-semibold text-slate-700 mb-1">Conséquences pour les justiciables</p>
                        <p className="text-slate-700">{result.commentaire_axes.section_3ter_portee.consequences_pour_justiciables}</p>
                      </div>
                    )}
                    {result.commentaire_axes.section_3ter_portee.consequences_pour_le_droit_positif_et_avvenir && (
                      <div className="text-xs">
                        <p className="font-semibold text-slate-700 mb-1">Droit positif et suites</p>
                        <p className="text-slate-700">{result.commentaire_axes.section_3ter_portee.consequences_pour_le_droit_positif_et_avvenir}</p>
                      </div>
                    )}
                  </div>
                )}

                {result.commentaire_axes.section_4_dispositions_interpretées_table &&
                  result.commentaire_axes.section_4_dispositions_interpretées_table.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">§ 4 Dispositions EU interprétées</p>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2 font-semibold">Instrument</th>
                            <th className="text-left p-2 font-semibold">Articles</th>
                            <th className="text-left p-2 font-semibold">Lecture retenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.commentaire_axes.section_4_dispositions_interpretées_table.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2 align-top font-medium">{row.instrument}</td>
                              <td className="p-2 align-top">{(row.articles ?? []).join(", ")}</td>
                              <td className="p-2 align-top text-slate-700">{row.lecture_retenue_par_la_juridiction}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.commentaire_axes.section_5_place_dans_la_jurisprudence_europeenne && (
                  <div className="p-3 border rounded-lg bg-slate-50">
                    <p className="text-xs font-semibold text-indigo-700 uppercase mb-2">§ 5 Place dans la jurisprudence européenne</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{result.commentaire_axes.section_5_place_dans_la_jurisprudence_europeenne}</p>
                  </div>
                )}

                {result.commentaire_axes.section_6_implications_pratiques_renvoi && (
                  <div className="p-3 border border-dashed border-slate-300 rounded-lg text-xs text-slate-600 italic">
                    <span className="font-semibold not-italic text-slate-800">§ 6 Implications pratiques · </span>
                    {result.commentaire_axes.section_6_implications_pratiques_renvoi}
                  </div>
                )}

                {result.commentaire_axes.section_7_ressources_compliai &&
                  result.commentaire_axes.section_7_ressources_compliai.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">§ 7 Ressources CompliAI</p>
                    <div className="flex flex-wrap gap-2">
                      {result.commentaire_axes.section_7_ressources_compliai.map((r, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          {r.chemin?.startsWith("/") ?
                            <Link href={r.chemin} className="text-xs px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                              {r.outil ?? r.chemin}
                            </Link>
                          : (
                            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">{r.outil}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* EU Legal Context */}
          {result.eu_legal_context?.applicable_regulations?.length > 0 && (
            <Section title="Droit européen applicable" icon={Scale} badge={`${result.eu_legal_context.applicable_regulations.length} texte(s)`}>
              <div className="space-y-3">
                {result.eu_legal_context.applicable_regulations.map((reg, i) => (
                  <div key={i} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-indigo-700">{reg.regulation}</span>
                        {reg.celex && <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{reg.celex}</span>}
                        {reg.articles?.map((a, j) => (
                          <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{a}</span>
                        ))}
                      </div>
                      {reg.eurlex_url && (
                        <a href={reg.eurlex_url} target="_blank" rel="noopener" className="text-slate-400 hover:text-indigo-600 flex-shrink-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{reg.role}</p>
                  </div>
                ))}
              </div>

              {result.eu_legal_context.key_principles?.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Principes de droit EU en jeu</p>
                  <div className="space-y-2">
                    {result.eu_legal_context.key_principles.map((p, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-slate-800">{p.principle}</span>
                          <span className="text-xs text-slate-400 ml-2">({p.source})</span>
                          <p className="text-xs text-slate-600 mt-0.5">{p.application}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Fundamental rights */}
          {result.eu_legal_context?.fundamental_rights?.length > 0 && (
            <Section title="Droits fondamentaux en jeu" icon={Users} defaultOpen={false} badge={`${result.eu_legal_context.fundamental_rights.length} droit(s)`}>
              <div className="space-y-3">
                {result.eu_legal_context.fundamental_rights.map((r, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{r.right}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{r.charter_article} — Charte EU</span>
                      {r.cedh_article && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.cedh_article} — CEDH</span>}
                    </div>
                    <p className="text-xs text-slate-600">{r.analysis}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Legal analysis */}
          {result.legal_analysis && (
            <Section title="Analyse juridique" icon={BookOpen}>
              <div className="space-y-4">
                {result.legal_analysis.facts && (
                  <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Faits</p><p className="text-sm text-slate-700">{result.legal_analysis.facts}</p></div>
                )}
                {result.legal_analysis.legal_issues?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Questions de droit</p>
                    <ul className="space-y-1">
                      {result.legal_analysis.legal_issues.map((q, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.legal_analysis.reasoning && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Raisonnement</p>
                    <p className="text-sm text-slate-700 leading-relaxed border-l-4 border-indigo-200 pl-3">{result.legal_analysis.reasoning}</p>
                  </div>
                )}
                {result.legal_analysis.decision && (
                  <div className="bg-slate-50 border rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Dispositif</p>
                    <p className="text-sm text-slate-900 font-medium">{result.legal_analysis.decision}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Jurisprudence map */}
          {result.jurisprudence_map?.length > 0 && (
            <Section title="Carte jurisprudentielle EU" icon={Globe} badge={`${result.jurisprudence_map.length} arrêt(s) lié(s)`}>
              <div className="space-y-3">
                {result.jurisprudence_map.map((j, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-slate-900">{j.case}</span>
                        <span className="text-xs text-slate-400">{j.court} · {j.date}</span>
                        {j.ecli && <span className="text-xs font-mono text-slate-400">{j.ecli}</span>}
                      </div>
                      <p className="text-xs text-slate-600">{j.relevance}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${LINK_TYPE_CONFIG[j.link_type]?.color ?? "bg-slate-100 text-slate-600"}`}>
                      {LINK_TYPE_CONFIG[j.link_type]?.label ?? j.link_type}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Regulatory positions */}
          {result.regulatory_positions?.length > 0 && (
            <Section title="Positions des régulateurs EU" icon={Building2} defaultOpen={false} badge={`${result.regulatory_positions.length} autorité(s)`}>
              <div className="space-y-3">
                {result.regulatory_positions.map((r, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{r.authority}</span>
                        <span className="text-xs text-slate-400">{r.date}</span>
                      </div>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener" className="text-slate-400 hover:text-indigo-600">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 italic mb-1">{r.document}</p>
                    <p className="text-xs text-slate-700">{r.position}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Practical implications */}
          {result.practical_implications && (
            <Section title="Implications pratiques" icon={AlertTriangle}>
              <div className="space-y-4">
                {/* For companies */}
                {result.practical_implications.for_companies?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Pour les entreprises</p>
                    <div className="space-y-2">
                      {result.practical_implications.for_companies.map((imp, i) => {
                        const urgency = URGENCY_CONFIG[imp.urgency] ?? { label: imp.urgency, color: "text-slate-600 bg-slate-50" };
                        return (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-start gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${urgency.color}`}>{urgency.label}</span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-800">{imp.implication}</p>
                                <p className="text-xs text-green-700 mt-1">→ {imp.action_required}</p>
                                {imp.concerns?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {imp.concerns.map((c, j) => <span key={j} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{c}</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.practical_implications.for_dpos && (
                    <div className="p-3 border rounded-lg bg-blue-50">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Pour les DPO</p>
                      <p className="text-xs text-blue-800">{result.practical_implications.for_dpos}</p>
                    </div>
                  )}
                  {result.practical_implications.for_ai_systems && (
                    <div className="p-3 border rounded-lg bg-violet-50">
                      <p className="text-xs font-semibold text-violet-700 mb-1">Pour les systèmes IA</p>
                      <p className="text-xs text-violet-800">{result.practical_implications.for_ai_systems}</p>
                    </div>
                  )}
                </div>

                {result.practical_implications.financial_exposure && (
                  <div className="p-3 border border-red-100 rounded-lg bg-red-50">
                    <p className="text-xs font-semibold text-red-700 mb-1">Exposition financière / Risque de sanction</p>
                    <p className="text-xs text-red-800">{result.practical_implications.financial_exposure}</p>
                  </div>
                )}

                {result.practical_implications.compliance_actions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Actions de conformité prioritaires</p>
                    <ul className="space-y-1.5">
                      {result.practical_implications.compliance_actions.map((a, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />{a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Significance & open questions */}
          {result.significance && (
            <Section title="Portée & questions ouvertes" icon={Sparkles} defaultOpen={false}>
              <div className="space-y-3">
                {result.significance.novelty && (
                  <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Nouveauté apportée</p><p className="text-sm text-slate-700">{result.significance.novelty}</p></div>
                )}
                {result.significance.precedent_value && (
                  <div><p className="text-xs font-semibold text-slate-500 uppercase mb-1">Valeur de précédent</p><p className="text-sm text-slate-700">{result.significance.precedent_value}</p></div>
                )}
                {result.significance.open_questions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Questions encore ouvertes</p>
                    <ul className="space-y-1.5">
                      {result.significance.open_questions.map((q, i) => (
                        <li key={i} className="text-sm flex gap-2 items-start text-amber-800 bg-amber-50 rounded-lg p-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />{q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Related developments */}
          {result.related_developments?.length > 0 && (
            <Section title="Développements connexes" icon={LinkIcon} defaultOpen={false}>
              <div className="space-y-2">
                {result.related_developments.map((d, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 border rounded-lg">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 flex-shrink-0">{d.type}</span>
                    <div className="flex-1">
                      <p className="text-xs text-slate-700">{d.description}</p>
                    </div>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener" className="text-slate-400 hover:text-indigo-600 flex-shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Overall assessment */}
          {result.overall_assessment && (
            <Card className="border-indigo-200">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-indigo-600 uppercase mb-2">Évaluation globale</p>
                <p className="text-sm text-slate-700 leading-relaxed">{result.overall_assessment}</p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-400 text-center">
            Analyse générée par IA à titre informatif. Elle ne constitue pas un avis juridique. 
            Consultez un avocat spécialisé en droit européen pour valider votre situation.
          </p>
        </div>
      )}
    </div>
  );
}
