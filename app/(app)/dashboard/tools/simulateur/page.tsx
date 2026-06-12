"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Swords, Loader2, Send, RotateCcw, Trophy, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

type Niveau = "L2_L3" | "M1" | "M2_Bar";
type Theme = "rgpd" | "ai_act" | "dsa_dma" | "droits_fondamentaux" | "transferts" | "biometrie" | "random";
type Format = "court" | "standard" | "intensif";

const NIVEAUX: { id: Niveau; label: string; desc: string }[] = [
  { id: "L2_L3", label: "L2 / L3", desc: "Articles fondamentaux RGPD + Charte EU" },
  { id: "M1", label: "M1", desc: "Jurisprudence + AI Act + DSA" },
  { id: "M2_Bar", label: "M2 / Bar", desc: "Cumul de normes · nuances" },
];

const THEMES: { id: Theme; label: string }[] = [
  { id: "rgpd", label: "RGPD" },
  { id: "ai_act", label: "AI Act" },
  { id: "dsa_dma", label: "DSA / DMA" },
  { id: "droits_fondamentaux", label: "Droits fondamentaux" },
  { id: "transferts", label: "Transferts internationaux" },
  { id: "biometrie", label: "Biométrie / IA au travail" },
  { id: "random", label: "Aléatoire (recommandé)" },
];

const FORMATS: { id: Format; label: string; desc: string }[] = [
  { id: "court", label: "Court", desc: "1 problème de droit" },
  { id: "standard", label: "Standard", desc: "2 problèmes distincts" },
  { id: "intensif", label: "Intensif", desc: "3 problèmes + interférences" },
];

function scoreBadge(score: number) {
  if (score >= 85) return { label: "Expert", className: "bg-emerald-100 text-emerald-900" };
  if (score >= 70) return { label: "Solide", className: "bg-green-100 text-green-800" };
  if (score >= 55) return { label: "Correct", className: "bg-amber-100 text-amber-900" };
  if (score >= 40) return { label: "À retravailler", className: "bg-orange-100 text-orange-900" };
  return { label: "Lacunes importantes", className: "bg-red-100 text-red-900" };
}

function ProseBlock({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed",
        className,
      )}
    >
      {content}
    </div>
  );
}

type ApiResult = {
  markdown: string;
  scenario_id: string | null;
  score: number | null;
};

export default function SimulateurPage() {
  const [niveau, setNiveau] = useState<Niveau>("L2_L3");
  const [theme, setTheme] = useState<Theme>("random");
  const [format, setFormat] = useState<Format>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [caseMarkdown, setCaseMarkdown] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [playedIds, setPlayedIds] = useState<string[]>([]);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluationMarkdown, setEvaluationMarkdown] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPdf() {
    if (!caseMarkdown) return;
    setPdfLoading(true);
    try {
      const sections = [{ heading: "Énoncé du cas", body: caseMarkdown }];
      if (studentAnswer.trim()) {
        sections.push({ heading: "Votre réponse", body: studentAnswer });
      }
      if (evaluationMarkdown) {
        sections.push({
          heading: lastScore !== null ? `Correction (${lastScore}/100)` : "Correction",
          body: evaluationMarkdown,
        });
      }
      await downloadToolExportPdf({
        title: "Cas pratique — simulateur",
        subtitle: scenarioId ? `Scénario ${scenarioId}` : undefined,
        sections,
        filename: "simulateur-cas-pratique",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  async function callApi(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/generate/simulateur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        niveau,
        theme,
        format,
        played_scenario_ids: playedIds,
        ...extra,
      }),
    });
    const data = (await res.json()) as { error?: string; result?: ApiResult };
    if (!res.ok) throw new Error(data.error ?? "Erreur");
    return data.result!;
  }

  function trackScenario(id: string | null) {
    if (!id) return;
    setScenarioId(id);
    setPlayedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function resetAll() {
    setCaseMarkdown(null);
    setScenarioId(null);
    setPlayedIds([]);
    setStudentAnswer("");
    setEvaluationMarkdown(null);
    setLastScore(null);
    setError(null);
  }

  async function startSession() {
    setLoading(true);
    setError(null);
    setEvaluationMarkdown(null);
    setLastScore(null);
    setStudentAnswer("");
    try {
      const result = await callApi("start");
      setCaseMarkdown(result.markdown);
      trackScenario(result.scenario_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function submitAnswer() {
    if (!caseMarkdown) return;
    setLoading(true);
    setError(null);
    try {
      const result = await callApi("evaluate", {
        enonce: caseMarkdown,
        student_answer: studentAnswer,
        scenario_id: scenarioId,
      });
      setEvaluationMarkdown(result.markdown);
      setLastScore(result.score);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  async function newCase(harder: boolean) {
    setLoading(true);
    setError(null);
    setEvaluationMarkdown(null);
    setLastScore(null);
    setStudentAnswer("");
    if (harder) {
      if (niveau === "L2_L3") setNiveau("M1");
      else if (niveau === "M1") setNiveau("M2_Bar");
      if (format === "court") setFormat("standard");
      else if (format === "standard") setFormat("intensif");
    }
    try {
      const result = await callApi(harder ? "plus_difficile" : "nouveau_cas");
      setCaseMarkdown(result.markdown);
      trackScenario(result.scenario_id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  if (!caseMarkdown) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl">
            <Swords className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Simulateur de cas pratique</h1>
            <p className="text-muted-foreground mt-1">
              Méthode du cas pratique : syllogisme, nuances, barème /100. Scénarios aléatoires (RGPD, AI Act, DSA, droits fondamentaux).
            </p>
            <Badge className="mt-2 bg-red-100 text-red-800 border-0">L2 à M2</Badge>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Votre niveau</label>
            <div className="space-y-2">
              {NIVEAUX.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNiveau(n.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border-2 transition-colors",
                    niveau === n.id ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <p className="font-medium text-sm">{n.label}</p>
                  <p className="text-xs text-slate-500">{n.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Thème</label>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm border transition-colors",
                    theme === t.id ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-colors",
                    format === f.id ? "border-red-400 bg-red-50" : "border-slate-200",
                  )}
                >
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}
          <Button onClick={startSession} disabled={loading} className="w-full bg-red-600 hover:bg-red-700">
            {loading ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Tirage du cas…
              </>
            : <>
                <Swords className="h-4 w-4" />
                Commencer
              </>
            }
          </Button>
        </div>
      </div>
    );
  }

  const badge = lastScore !== null ? scoreBadge(lastScore) : null;

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-10">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Cas pratique</h1>
          <p className="text-xs text-muted-foreground">
            {scenarioId ? `Scénario ${scenarioId}` : "Scénario en cours"} · {niveau} · {format}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="h-4 w-4" />
            Reconfigurer
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Phase 1 — Énoncé</p>
        <ProseBlock content={caseMarkdown} />
      </div>

      {!evaluationMarkdown && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <label className="text-sm font-medium">Votre réponse (syllogisme par problème de droit)</label>
          <Textarea
            placeholder="Faits pertinents, problèmes de droit, majeure / mineure / conclusion, nuances…"
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            className="min-h-[160px] text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            onClick={submitAnswer}
            disabled={loading || studentAnswer.trim().length < 40}
            className="w-full"
          >
            {loading ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Évaluation…
              </>
            : <>
                <Send className="h-4 w-4" />
                Soumettre pour correction
              </>
            }
          </Button>
        </div>
      )}

      {evaluationMarkdown && (
        <>
          {lastScore !== null && badge && (
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6 text-center space-y-2">
              <Trophy className="h-10 w-10 mx-auto text-yellow-400" />
              <p className="text-3xl font-bold">{lastScore}/100</p>
              <Badge className={cn("border-0", badge.className)}>{badge.label}</Badge>
            </div>
          )}
          <div className="bg-white border rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Phases 2 à 4 — Évaluation · Retour · Corrigé type
            </p>
            <ProseBlock content={evaluationMarkdown} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => newCase(false)} disabled={loading}>
              Nouveau cas
            </Button>
            <Button variant="outline" onClick={() => newCase(true)} disabled={loading}>
              Plus difficile
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEvaluationMarkdown(null);
                setLastScore(null);
                setStudentAnswer("");
              }}
            >
              Réessayer ce cas
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
