"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookMarked, Loader2, RotateCcw, ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TEXTES: Record<string, string[]> = {
  "AI Act (UE 2024/1689)": [
    "Art. 5 — Pratiques interdites", "Art. 6 — Classification haut risque",
    "Art. 9 — Gestion des risques", "Art. 10 — Données d'entraînement",
    "Art. 13 — Transparence", "Art. 14 — Supervision humaine",
    "Art. 22 — Décisions purement automatisées (IA)", "Art. 27 — FRIA",
    "Art. 50 — Obligations IA générative", "Art. 53 — Obligations GPAI",
    "Art. 4 — Littératie IA",
  ],
  "RGPD (UE 2016/679)": [
    "Art. 5 — Principes relatifs au traitement", "Art. 6 — Licéité du traitement",
    "Art. 9 — Données sensibles", "Art. 13 — Information",
    "Art. 17 — Droit à l'effacement", "Art. 22 — Décision automatisée",
    "Art. 25 — Protection by design", "Art. 28 — Sous-traitants",
    "Art. 35 — DPIA", "Art. 83 — Amendes",
  ],
  "DSA (UE 2022/2065)": [
    "Art. 14 — Conditions générales", "Art. 24 — Transparence algorithmes de recommandation",
    "Art. 26 — Publicité ciblée", "Art. 34 — Évaluation des risques",
    "Art. 40 — Accès aux données chercheurs",
  ],
  "DMA (UE 2022/1925)": [
    "Art. 5 — Obligations gatekeepers", "Art. 6 — Interopérabilité",
    "Art. 10 — Désignation gatekeepers",
  ],
};

const NIVEAUX = ["L1/L2", "L3", "Master 1", "Master 2", "Doctorat", "Professionnel"];

interface ExplicationData {
  article: string; texte: string;
  niveau_1: { titre: string; explication: string };
  niveau_2: { titre: string; scenario: string; application: string; obligations_concretes: string[] };
  niveau_3: { titre: string; debats: string; lacunes: string; perspectives: string };
  liens: string[];
  jurisprudence_cle: string[];
}

export default function ExplicationArticlePage() {
  const locale = useLocale();
  const [selectedTexte, setSelectedTexte] = useState("AI Act (UE 2024/1689)");
  const [selectedArticle, setSelectedArticle] = useState(TEXTES["AI Act (UE 2024/1689)"][0]);
  const [niveau, setNiveau] = useState("Master 1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplicationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<"niveau_1" | "niveau_2" | "niveau_3">("niveau_1");

  async function generate() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/generate/explication-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article: selectedArticle, texte: selectedTexte, niveau, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Erreur"); }
    setLoading(false);
  }

  const LEVELS: Array<{ key: "niveau_1" | "niveau_2" | "niveau_3"; emoji: string; label: string; color: string }> = [
    { key: "niveau_1", emoji: "📖", label: "Langage clair", color: "bg-green-100 text-green-800 border-green-300" },
    { key: "niveau_2", emoji: "💼", label: "Cas pratique", color: "bg-blue-100 text-blue-800 border-blue-300" },
    { key: "niveau_3", emoji: "🔬", label: "Analyse doctrinale", color: "bg-purple-100 text-purple-800 border-purple-300" },
  ];

  if (!result) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-xl"><BookMarked className="h-6 w-6 text-green-600" /></div>
          <div>
            <h1 className="text-2xl font-bold">Explication d'articles de loi en langage clair</h1>
            <p className="text-muted-foreground mt-1">Sélectionnez un article → Claude l'explique à 3 niveaux : clair, cas pratique, analyse doctrinale.</p>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">Du L1 au doctorat</Badge>
              <Badge variant="outline">Pédagogie différenciée</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Texte législatif</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEXTES).map((t) => (
                <button key={t} onClick={() => { setSelectedTexte(t); setSelectedArticle(TEXTES[t][0]); }}
                  className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors", selectedTexte === t ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 hover:border-slate-400")}>
                  {t.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Article</label>
            <select value={selectedArticle} onChange={(e) => setSelectedArticle(e.target.value)}
              className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
              {TEXTES[selectedTexte].map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Niveau d'explication</label>
            <div className="flex flex-wrap gap-2">
              {NIVEAUX.map((n) => (
                <button key={n} onClick={() => setNiveau(n)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm border transition-colors", niveau === n ? "bg-green-600 text-white border-green-600" : "border-slate-300 hover:border-slate-400")}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération...</> : <><BookMarked className="h-4 w-4" />Expliquer cet article</>}
          </Button>
        </div>
      </div>
    );
  }

  const current = result[activeLevel];
  const levelCfg = LEVELS.find(l => l.key === activeLevel)!;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{result.article}</h1>
          <p className="text-sm text-muted-foreground">{result.texte} — Niveau {result.niveau_1.titre && niveau}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setResult(null); }}><RotateCcw className="h-4 w-4" />Autre article</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {LEVELS.map((l) => (
          <button key={l.key} onClick={() => setActiveLevel(l.key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all", activeLevel === l.key ? l.color + " shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300")}>
            <span>{l.emoji}</span>{l.label}
          </button>
        ))}
      </div>

      {activeLevel === "niveau_1" && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="font-bold text-lg text-slate-900 mb-3">📖 {result.niveau_1.titre}</h2>
          <p className="text-slate-700 leading-relaxed">{result.niveau_1.explication}</p>
        </div>
      )}

      {activeLevel === "niveau_2" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Scénario</p>
            <p className="text-slate-800 leading-relaxed">{result.niveau_2.scenario}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Application de l'article</p>
            <p className="text-slate-700 leading-relaxed">{result.niveau_2.application}</p>
          </div>
          <div className="bg-white border rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Obligations concrètes</p>
            <ul className="space-y-2">
              {result.niveau_2.obligations_concretes.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeLevel === "niveau_3" && (
        <div className="space-y-4">
          {[
            { label: "Débats doctrinaux", value: result.niveau_3.debats },
            { label: "Lacunes et ambiguïtés", value: result.niveau_3.lacunes },
            { label: "Perspectives d'évolution", value: result.niveau_3.perspectives },
          ].map((item) => (
            <div key={item.label} className="bg-white border rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{item.label}</p>
              <p className="text-slate-700 leading-relaxed">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Articles liés</p>
          <ul className="space-y-1">{result.liens.map((l, i) => <li key={i} className="text-sm text-blue-700">→ {l}</li>)}</ul>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">⚖️ Jurisprudence clé</p>
          <ul className="space-y-1">{result.jurisprudence_cle.map((j, i) => <li key={i} className="text-sm text-slate-700">• {j}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
