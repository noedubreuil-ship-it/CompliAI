"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Swords, Loader2, Send, RotateCcw, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { id: "healthtech", label: "HealthTech — Diagnostic IA", desc: "Startup utilisant un LLM pour diagnostiquer des maladies rares à partir de symptômes" },
  { id: "rh-scoring", label: "RH — Scoring de candidats", desc: "Système de scoring algorithmique pour trier 10 000 CVs et recommander 50 finalistes" },
  { id: "deepfake", label: "Deepfake détecté", desc: "Réseau social ayant laissé circuler un deepfake politique généré par IA pendant 48h" },
  { id: "voiture", label: "Véhicule autonome", desc: "Constructeur auto déployant un système IA de conduite semi-autonome dans des villes françaises" },
  { id: "credit", label: "Scoring crédit bancaire", desc: "Banque utilisant un modèle IA pour décider automatiquement l'octroi ou le refus de crédit" },
  { id: "custom", label: "Scénario personnalisé", desc: "" },
];

const ROLES = [
  { id: "regulateur", label: "Régulateur (ANC AI Act)", emoji: "🏛️", desc: "Autorité nationale compétente mandatée pour auditer votre système" },
  { id: "dpo", label: "DPO / CNIL", emoji: "🔒", desc: "Délégué à la protection des données vous questionnant sur votre DPIA" },
  { id: "avocat", label: "Avocat adverse", emoji: "⚖️", desc: "Avocat représentant une personne lésée par votre système IA" },
];

interface SimulateurState {
  role: string;
  introduction: string;
  premiere_question: string;
  article_vise: string;
  indice_pedagogique: string;
  scenario_resume: string;
}

interface EchangeState {
  question: string; article_vise: string;
  reponse?: string;
  evaluation?: {
    score: number; sur: number;
    points_forts: string[]; points_manquants: string[];
    article_attendu: string; correction: string;
  };
  reaction_role?: string;
  prochaine_question?: string | null;
  est_termine?: boolean;
  score_final?: { total: number; sur: number; niveau: string; bilan: string } | null;
}

export default function SimulateurPage() {
  const [scenario, setScenario] = useState(SCENARIOS[0].id);
  const [customScenario, setCustomScenario] = useState("");
  const [roleIA, setRoleIA] = useState(ROLES[0].id);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SimulateurState | null>(null);
  const [echanges, setEchanges] = useState<EchangeState[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const scenarioCfg = SCENARIOS.find(s => s.id === scenario)!;
  const roleCfg = ROLES.find(r => r.id === roleIA)!;
  const scenarioText = scenario === "custom" ? customScenario : scenarioCfg.desc;

  async function startSimulation() {
    if (!scenarioText) return;
    setLoading(true); setError(null); setState(null); setEchanges([]); setFinished(false);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "simulateur-init", scenario: scenarioText, roleIA: roleCfg.label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setState(data.result);
      setEchanges([{ question: data.result.premiere_question, article_vise: data.result.article_vise }]);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  async function sendAnswer() {
    if (!currentAnswer.trim() || !state) return;
    const lastEchange = echanges[echanges.length - 1];
    const historique = echanges.map((e, i) => `Q${i + 1}: ${e.question}\nRéponse: ${e.reponse || "(en attente)"}`).join("\n\n");

    setLoading(true);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "simulateur-reponse",
          scenario: scenarioText,
          roleIA: roleCfg.label,
          historique,
          reponseEtudiant: currentAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const result = data.result;
      const updatedEchange: EchangeState = {
        ...lastEchange,
        reponse: currentAnswer,
        evaluation: result.evaluation,
        reaction_role: result.suite.reaction_role,
        prochaine_question: result.suite.prochaine_question,
        est_termine: result.suite.est_termine,
        score_final: result.score_final,
      };

      const newEchanges = [...echanges.slice(0, -1), updatedEchange];
      if (!result.suite.est_termine && result.suite.prochaine_question) {
        newEchanges.push({ question: result.suite.prochaine_question, article_vise: "" });
      }
      setEchanges(newEchanges);
      setCurrentAnswer("");
      if (result.suite.est_termine) setFinished(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  if (!state) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-xl"><Swords className="h-6 w-6 text-red-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Simulateur de cas pratique</h1>
            <p className="text-muted-foreground mt-1">Jeu de rôle réglementaire — défendez votre position en citant les bons articles. Score final + retour pédagogique.</p>
            <Badge className="mt-2 bg-red-100 text-red-800 border-0">Très différenciant</Badge>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Scénario</label>
            <div className="space-y-2">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => setScenario(s.id)}
                  className={cn("w-full text-left p-3 rounded-xl border-2 transition-colors", scenario === s.id ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300")}>
                  <p className="font-medium text-sm text-slate-900">{s.label}</p>
                  {s.desc && <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>}
                </button>
              ))}
            </div>
            {scenario === "custom" && (
              <Textarea
                placeholder="Décrivez votre scénario personnalisé..."
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Votre interlocuteur</label>
            <div className="grid grid-cols-1 gap-2">
              {ROLES.map((r) => (
                <button key={r.id} onClick={() => setRoleIA(r.id)}
                  className={cn("flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors", roleIA === r.id ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300")}>
                  <span className="text-2xl flex-shrink-0">{r.emoji}</span>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-500">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={startSimulation} disabled={loading || (!scenarioText)} className="w-full bg-red-600 hover:bg-red-700">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Préparation...</> : <><Swords className="h-4 w-4" />Démarrer la simulation</>}
          </Button>
        </div>
      </div>
    );
  }

  const totalScore = echanges.filter(e => e.evaluation).reduce((s, e) => s + (e.evaluation?.score || 0), 0);
  const totalPossible = echanges.filter(e => e.evaluation).reduce((s, e) => s + (e.evaluation?.sur || 10), 0);

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{roleCfg.emoji}</span>
          <div>
            <h1 className="font-bold text-slate-900">{roleCfg.label}</h1>
            <p className="text-xs text-muted-foreground">{state.scenario_resume}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalPossible > 0 && (
            <span className="text-sm font-medium text-slate-700">{totalScore}/{totalPossible} pts</span>
          )}
          <Button variant="outline" size="sm" onClick={() => { setState(null); setEchanges([]); setFinished(false); }}><RotateCcw className="h-4 w-4" />Recommencer</Button>
        </div>
      </div>

      <div className="bg-slate-800 text-white rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{roleCfg.label} — Introduction</p>
        <p className="text-sm leading-relaxed">{state.introduction}</p>
      </div>

      {/* Exchanges */}
      <div className="space-y-4">
        {echanges.map((e, i) => (
          <div key={i} className="space-y-3">
            {/* Question */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-2 justify-between">
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-1">{roleCfg.emoji} Question {i + 1}</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{e.question}</p>
                </div>
                {e.article_vise && <Badge variant="outline" className="text-xs flex-shrink-0">{e.article_vise}</Badge>}
              </div>
            </div>

            {/* Response */}
            {e.reponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 ml-6">
                <p className="text-xs font-semibold text-blue-700 mb-1">📝 Votre réponse</p>
                <p className="text-sm text-slate-700">{e.reponse}</p>
              </div>
            )}

            {/* Evaluation */}
            {e.evaluation && (
              <div className="border rounded-xl overflow-hidden ml-6">
                <div className={cn("px-4 py-3 flex items-center justify-between", e.evaluation.score >= 7 ? "bg-green-50 border-b border-green-200" : e.evaluation.score >= 5 ? "bg-amber-50 border-b border-amber-200" : "bg-red-50 border-b border-red-200")}>
                  <div className="flex items-center gap-2">
                    {[...Array(e.evaluation.sur)].map((_, s) => (
                      <Star key={s} className={cn("h-3 w-3", s < e.evaluation!.score ? "text-yellow-500 fill-yellow-500" : "text-slate-300")} />
                    ))}
                  </div>
                  <span className="text-sm font-bold">{e.evaluation.score}/{e.evaluation.sur}</span>
                </div>
                <div className="p-4 bg-white space-y-3">
                  {e.evaluation.points_forts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-green-700 mb-1">✓ Points forts</p>
                      {e.evaluation.points_forts.map((p, j) => <p key={j} className="text-xs text-slate-600">• {p}</p>)}
                    </div>
                  )}
                  {e.evaluation.points_manquants.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-700 mb-1">✗ Points manquants</p>
                      {e.evaluation.points_manquants.map((p, j) => <p key={j} className="text-xs text-slate-600">• {p}</p>)}
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-1">Correction complète <Badge variant="outline" className="text-[10px] ml-1">{e.evaluation.article_attendu}</Badge></p>
                    <p className="text-xs text-slate-600 leading-relaxed">{e.evaluation.correction}</p>
                  </div>
                  {e.reaction_role && <p className="text-xs italic text-slate-500 border-l-2 border-slate-200 pl-3">{e.reaction_role}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final score */}
      {finished && echanges[echanges.length - 1]?.score_final && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-6 text-center space-y-3">
          <Trophy className="h-12 w-12 mx-auto text-yellow-400" />
          <p className="text-2xl font-bold">{echanges[echanges.length - 1].score_final!.total}/{echanges[echanges.length - 1].score_final!.sur}</p>
          <Badge className="bg-yellow-500 text-slate-900">{echanges[echanges.length - 1].score_final!.niveau}</Badge>
          <p className="text-sm text-slate-300 leading-relaxed">{echanges[echanges.length - 1].score_final!.bilan}</p>
          <Button onClick={() => { setState(null); setEchanges([]); setFinished(false); }} variant="outline" className="text-white border-white hover:bg-white/10">
            <RotateCcw className="h-4 w-4" />Nouvelle simulation
          </Button>
        </div>
      )}

      {/* Answer input */}
      {!finished && echanges.length > 0 && !echanges[echanges.length - 1].reponse && (
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <Textarea
            placeholder="Votre réponse — citez les articles applicables et argumentez votre position..."
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={sendAnswer} disabled={loading || !currentAnswer.trim()} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Évaluation...</> : <><Send className="h-4 w-4" />Envoyer ma réponse</>}
          </Button>
        </div>
      )}
    </div>
  );
}
