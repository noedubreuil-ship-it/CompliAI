"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, ChevronRight, CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const TOPICS = [
  "AI Act — Art. 5 pratiques interdites",
  "AI Act — Classification des risques",
  "AI Act — Obligations haut risque (Art. 9-15)",
  "AI Act — Littératie IA Art. 4",
  "AI Act — Modèles GPAI",
  "RGPD — Art. 22 décision automatisée",
  "RGPD — Bases légales du traitement",
  "RGPD — Droits des personnes",
  "DSA — Obligations des plateformes",
  "DMA — Marchés numériques",
];

interface Question {
  id: number; question: string; options: string[];
  correct: number; explanation: string; article_ref: string;
}

interface QuizData { title: string; level: string; questions: Question[] }

export default function QuizPage() {
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [level, setLevel] = useState("Master 1");
  const [count, setCount] = useState("5");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);

  async function generate() {
    setLoading(true); setError(null); setQuiz(null); setCurrentQ(0); setAnswers([]); setFinished(false); setSelected(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "quiz", topic: customTopic || topic, level, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuiz(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    setShowExplanation(true);
  }

  function nextQuestion() {
    if (!quiz) return;
    const newAnswers = [...answers, selected!];
    setAnswers(newAnswers);
    setSelected(null); setShowExplanation(false);
    if (currentQ + 1 >= quiz.questions.length) { setFinished(true); }
    else { setCurrentQ(currentQ + 1); }
  }

  const score = answers.filter((a, i) => quiz && a === quiz.questions[i].correct).length;

  if (!quiz) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-100 rounded-xl"><HelpCircle className="h-6 w-6 text-yellow-600" /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quiz de droit de l'IA interactif</h1>
            <p className="text-muted-foreground mt-1">QCM générés par Claude sur le thème de votre choix. Correction immédiate avec citation du texte.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Révisions examen</Badge>
              <Badge variant="outline">Littératie IA Art. 4</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-white border rounded-xl p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Thème</label>
            <div className="grid grid-cols-1 gap-2">
              {TOPICS.map((t) => (
                <button key={t} onClick={() => { setTopic(t); setCustomTopic(""); }}
                  className={cn("text-left text-sm px-3 py-2 rounded-lg border transition-colors", topic === t && !customTopic ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 hover:border-slate-300")}>
                  {t}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                placeholder="Ou saisissez un thème personnalisé..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Niveau</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-lg">
                {["L3", "Master 1", "Master 2", "Doctorat", "Professionnel"].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de questions</label>
              <select value={count} onChange={(e) => setCount(e.target.value)} className="w-full text-sm px-3 py-2 border rounded-lg">
                {["3", "5", "8", "10"].map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération des questions...</> : <><HelpCircle className="h-4 w-4" />Lancer le quiz</>}
          </Button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="space-y-6 max-w-2xl mx-auto text-center">
        <div className="bg-white border rounded-2xl p-8 space-y-4">
          <Trophy className={cn("h-16 w-16 mx-auto", pct >= 80 ? "text-yellow-500" : pct >= 60 ? "text-slate-400" : "text-red-400")} />
          <h2 className="text-2xl font-bold">{score}/{quiz.questions.length} bonnes réponses</h2>
          <div className={cn("text-lg font-semibold", pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600")}>
            {pct >= 80 ? "Excellent !" : pct >= 60 ? "Bien — continuez à réviser" : "À travailler davantage"}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div className={cn("h-3 rounded-full transition-all", pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
          </div>

          <div className="text-left space-y-2 mt-4">
            {quiz.questions.map((q, i) => (
              <div key={i} className={cn("flex items-start gap-2 p-3 rounded-lg text-sm", answers[i] === q.correct ? "bg-green-50" : "bg-red-50")}>
                {answers[i] === q.correct ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium text-slate-900">{q.question}</p>
                  {answers[i] !== q.correct && <p className="text-red-700 text-xs mt-0.5">Bonne réponse : {q.options[q.correct]}</p>}
                  <p className="text-xs text-slate-500 mt-0.5">{q.article_ref}</p>
                </div>
              </div>
            ))}
          </div>

          <Button onClick={() => { setQuiz(null); setFinished(false); setAnswers([]); setCurrentQ(0); }} className="w-full">
            <RotateCcw className="h-4 w-4" />Nouveau quiz
          </Button>
        </div>
      </div>
    );
  }

  const q = quiz.questions[currentQ];
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-900">{quiz.title}</h1>
        <span className="text-sm text-muted-foreground">Question {currentQ + 1}/{quiz.questions.length}</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${((currentQ) / quiz.questions.length) * 100}%` }} />
      </div>

      <div className="bg-white border rounded-xl p-6 space-y-4">
        <p className="text-base font-semibold text-slate-900 leading-relaxed">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => {
            let cls = "border-slate-200 hover:border-slate-300 hover:bg-slate-50";
            if (selected !== null) {
              if (i === q.correct) cls = "border-green-500 bg-green-50";
              else if (i === selected) cls = "border-red-400 bg-red-50";
              else cls = "border-slate-200 opacity-60";
            }
            return (
              <button key={i} onClick={() => handleAnswer(i)}
                className={cn("w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm", cls)}>
                <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>{opt.replace(/^[A-D]\.\s*/, "")}
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className={cn("rounded-lg p-4 space-y-2", selected === q.correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
            <div className="flex items-center gap-2">
              {selected === q.correct ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-sm font-semibold">{selected === q.correct ? "Correct !" : "Incorrect"}</span>
              <Badge variant="outline" className="text-xs ml-auto">{q.article_ref}</Badge>
            </div>
            <p className="text-sm text-slate-700">{q.explanation}</p>
          </div>
        )}

        {showExplanation && (
          <Button onClick={nextQuestion} className="w-full">
            {currentQ + 1 >= quiz.questions.length ? "Voir les résultats" : "Question suivante"}
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
