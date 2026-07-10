"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { HelpCircle, Loader2, ChevronRight, CheckCircle2, XCircle, RotateCcw, Trophy, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

const TOPICS = [
  "RGPD — bases et droits des personnes",
  "RGPD — Art. 22 décisions automatisées",
  "AI Act — Art. 5 pratiques interdites",
  "AI Act — Classification et haut risque",
  "AI Act — GPAI et calendrier",
  "DSA / DMA — plateformes et gatekeepers",
  "Charte UE — droits fondamentaux",
  "CEDH — vie privée et numérique",
  "Jurisprudence CJUE — données et numérique",
  "Transferts internationaux (Schrems)",
  "Méthode — sens · valeur · portée",
  "Mix — droit européen du numérique",
];

type ExamMode = "apprentissage" | "rapide" | "examen_blanc" | "methodologie";

interface LegalReasoning {
  majeure?: string;
  mineure?: string;
  conclusion?: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  article_ref: string;
  theme_hint?: string;
  level_band?: string;
  difficulty_step?: string;
  question_type?: string;
  verbatim_quote?: string;
  why_others_wrong?: string[];
  legal_reasoning?: LegalReasoning;
  common_trap?: string;
}

interface QuizData {
  title: string;
  level: string;
  exam_mode?: string;
  questions: Question[];
}

export default function QuizPage() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [niveau, setNiveau] = useState("L3");
  const [examMode, setExamMode] = useState<ExamMode>("apprentissage");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isExamenBlanc = examMode === "examen_blanc";
  const isRapide = examMode === "rapide";

  async function generate() {
    setLoading(true);
    setError(null);
    setQuiz(null);
    setCurrentQ(0);
    setAnswers([]);
    setFinished(false);
    setSelected(null);
    setShowExplanation(false);
    try {
      const res = await fetch("/api/generate/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: customTopic || topic,
          niveau,
          count: parseInt(count, 10),
          exam_mode: examMode,
        }),
      });
      const data = (await res.json()) as { error?: string; result?: QuizData };
      if (!res.ok) throw new Error(data.error);
      setQuiz(data.result ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (!isExamenBlanc) setShowExplanation(true);
  }

  function nextQuestion() {
    if (!quiz) return;
    const newAnswers = [...answers, selected!];
    setAnswers(newAnswers);
    setSelected(null);
    setShowExplanation(false);
    if (currentQ + 1 >= quiz.questions.length) {
      setFinished(true);
    } else {
      setCurrentQ(currentQ + 1);
    }
  }

  const score = answers.filter((a, i) => quiz && a === quiz.questions[i].correct).length;

  async function downloadPdf() {
    if (!quiz) return;
    const score = answers.filter((a, i) => a === quiz.questions[i]?.correct).length;
    const pct = Math.round((score / quiz.questions.length) * 100);
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title: quiz.title || "Quiz droit européen du numérique",
        subtitle: `${score}/${quiz.questions.length} (${pct}%) — ${quiz.level}`,
        sections: quiz.questions.map((q, i) => {
          const userAnswer = answers[i] ?? -1;
          const isCorrect = userAnswer === q.correct;
          return {
            heading: `Q${i + 1}. ${q.question}`,
            body: [
              `Votre réponse : ${userAnswer >= 0 ? String.fromCharCode(65 + userAnswer) : "—"}`,
              `Bonne réponse : ${String.fromCharCode(65 + q.correct)} — ${q.options[q.correct]}`,
              isCorrect ? "✓ Correct" : "✗ Incorrect",
              q.explanation,
              q.article_ref ? `Réf. : ${q.article_ref}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          };
        }),
        filename: "quiz-eu",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  function renderCorrection(q: Question, userAnswer: number) {
    const detailed = !isRapide;
    const isCorrect = userAnswer === q.correct;
    return (
      <div className={cn("rounded-lg p-4 space-y-3", isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
        <div className="flex items-center gap-2 flex-wrap">
          {isCorrect ?
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          : <XCircle className="h-4 w-4 text-red-500" />}
          <span className="text-sm font-semibold">{isCorrect ? "Correct" : "Incorrect"}</span>
          {!isCorrect && (
            <span className="text-xs text-red-700">
              Bonne réponse : {String.fromCharCode(65 + q.correct)} — {q.options[q.correct]?.replace(/^[A-D]\.\s*/, "")}
            </span>
          )}
          <Badge variant="outline" className="text-xs ml-auto">
            {q.article_ref}
          </Badge>
        </div>
        {q.verbatim_quote && q.verbatim_quote.trim().length > 0 && (
          <blockquote className="text-sm border-l-4 border-slate-400 pl-3 italic text-slate-700 whitespace-pre-wrap">
            « {q.verbatim_quote} »
          </blockquote>
        )}
        <p className="text-sm text-slate-700">{q.explanation}</p>
        {detailed && q.why_others_wrong && q.why_others_wrong.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Pourquoi les autres options sont fausses</p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              {q.why_others_wrong.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {detailed && q.legal_reasoning?.majeure && (
          <div className="text-sm bg-white/60 rounded-lg p-3 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Raisonnement juridique</p>
            <p>
              <span className="font-medium">Majeure :</span> {q.legal_reasoning.majeure}
            </p>
            {q.legal_reasoning.mineure && (
              <p>
                <span className="font-medium">Mineure :</span> {q.legal_reasoning.mineure}
              </p>
            )}
            {q.legal_reasoning.conclusion && (
              <p>
                <span className="font-medium">Conclusion :</span> {q.legal_reasoning.conclusion}
              </p>
            )}
          </div>
        )}
        {detailed && q.common_trap && q.common_trap.trim().length > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            Piège fréquent : {q.common_trap}
          </p>
        )}
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-xl">
            <HelpCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quiz de droit européen interactif</h1>
            <p className="text-muted-foreground mt-1">
              QCM pédagogiques avec correction citant le texte ou l&apos;arrêt — types 1 à 5, méthode sens · valeur · portée.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">L1 à Doctorat</Badge>
              <Badge variant="outline">Révisions examen</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white border rounded-xl p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Thème</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    setCustomTopic("");
                  }}
                  className={cn(
                    "text-left text-sm px-3 py-2 rounded-lg border transition-colors",
                    topic === t && !customTopic ?
                      "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Thème personnalisé…"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Niveau</label>
              <Select value={niveau} onChange={(e) => setNiveau(e.target.value)}>
                <option value="L1-L2">L1 / L2</option>
                <option value="L3">L3</option>
                <option value="M1">M1</option>
                <option value="L3-M1">L3 / M1</option>
                <option value="M2">M2</option>
                <option value="Doctorat">Doctorat</option>
                <option value="M2-Doc">M2 / Doctorat</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Nombre de questions</label>
              <Select value={count} onChange={(e) => setCount(e.target.value)}>
                {["5", "10", "20"].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Mode d&apos;examen</label>
            <Select value={examMode} onChange={(e) => setExamMode(e.target.value as ExamMode)}>
              <option value="apprentissage">Apprentissage — correction détaillée</option>
              <option value="rapide">Entraînement rapide</option>
              <option value="examen_blanc">Examen blanc — correction en fin de session</option>
              <option value="methodologie">Méthodologie (sens · valeur · portée)</option>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <Button onClick={() => void generate()} disabled={loading} className="w-full">
            {loading ?
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération et relecture juridique…
              </>
            : <>
                <HelpCircle className="h-4 w-4" />
                Lancer le quiz
              </>
            }
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Deux passes : génération (temp. 0,3) puis vérification des articles et citations (temp. 0,1).
          </p>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-white border rounded-2xl p-8 space-y-4 text-center">
          <Trophy className={cn("h-16 w-16 mx-auto", pct >= 90 ? "text-yellow-500" : pct >= 70 ? "text-green-500" : pct >= 50 ? "text-amber-500" : "text-red-400")} />
          <h2 className="text-2xl font-bold">
            {score}/{quiz.questions.length} bonnes réponses ({pct}%)
          </h2>
          <p className={cn("text-lg font-semibold", pct >= 90 ? "text-green-600" : pct >= 70 ? "text-blue-600" : pct >= 50 ? "text-amber-600" : "text-red-600")}>
            {pct >= 90 ? "Excellent" : pct >= 70 ? "Bon — continuez" : pct >= 50 ? "À retravailler" : "Reprenez les bases"}
          </p>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className={cn("h-3 rounded-full", pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="bg-white border rounded-xl p-4 space-y-3 text-left">
              <p className="font-medium text-slate-900">
                Q{i + 1}. {q.question}
              </p>
              {renderCorrection(q, answers[i] ?? -1)}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export PDF
          </Button>
          <Button
            onClick={() => {
              setQuiz(null);
              setFinished(false);
              setAnswers([]);
              setCurrentQ(0);
            }}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4" />
            Nouveau quiz
          </Button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-bold text-slate-900">{quiz.title}</h1>
        <span className="text-sm text-muted-foreground">
          Question {currentQ + 1}/{quiz.questions.length}
        </span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="h-2 bg-blue-500 rounded-full transition-all"
          style={{ width: `${(currentQ / quiz.questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {q.question_type && <Badge variant="secondary" className="text-xs">{q.question_type}</Badge>}
          {(q.level_band || q.difficulty_step) && (
            <Badge variant="outline" className="text-xs">
              {q.level_band ?? q.difficulty_step}
            </Badge>
          )}
          {q.theme_hint && <Badge variant="outline" className="text-xs">{q.theme_hint}</Badge>}
        </div>
        <p className="text-base font-semibold text-slate-900 leading-relaxed">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            let cls = "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
            if (selected !== null && !isExamenBlanc) {
              if (i === q.correct) cls = "border-green-500 bg-green-50";
              else if (i === selected) cls = "border-red-400 bg-red-50";
              else cls = "border-slate-200 opacity-60";
            } else if (selected === i) {
              cls = "border-blue-500 bg-blue-50";
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleAnswer(i)}
                className={cn("w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm", cls)}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt.replace(/^[A-D]\.\s*/, "")}
              </button>
            );
          })}
        </div>

        {showExplanation && selected !== null && renderCorrection(q, selected)}

        {(showExplanation || (isExamenBlanc && selected !== null)) && (
          <Button onClick={nextQuestion} className="w-full">
            {currentQ + 1 >= quiz.questions.length ? "Voir les résultats" : "Question suivante"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
