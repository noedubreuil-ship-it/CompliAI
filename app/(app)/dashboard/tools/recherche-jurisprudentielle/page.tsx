"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Scale,
  Loader2,
  Search,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Star,
  Gavel,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

const SUGGESTIONS = [
  "Art. 22 RGPD — décisions automatisées",
  "Transferts de données vers les USA",
  "Cookies et consentement",
  "Droit à l'effacement moteurs de recherche",
  "Reconnaissance faciale espace public",
  "Scoring crédit SCHUFA",
  "Sanctions RGPD DPA",
];

const JURIDICTIONS = ["Toutes juridictions", "CJUE", "CEDH", "CNIL", "DPC", "EDPB", "AEPD", "Garante", "ICO"];
const TEXTES_EU = ["", "RGPD", "AI Act", "DSA", "DMA", "NIS2", "Charte EU"];
const PERIODES = [
  { value: "", label: "Toute période" },
  { value: "depuis_2018", label: "Depuis 2018 (RGPD)" },
  { value: "depuis_2024", label: "Depuis 2024 (AI Act)" },
];

const TYPE_LABELS: Record<string, string> = {
  fondateur: "Fondateur",
  confirmatif: "Confirmatif",
  revirement: "Revirement",
  application: "Application",
  sanction: "Sanction DPA",
  normatif: "EDPB / normatif",
};

interface DecisionPanorama {
  importance?: number;
  type_decision?: string;
  reference?: string;
  juridiction?: string;
  date?: string;
  ecli?: string | null;
  parties?: string;
  formation?: string;
  en_une_ligne?: string;
  textes_eu_interpretes?: string[];
  ce_que_la_juridiction_a_decide?: string;
  apport_au_droit_positif?: string;
  implication_pratique?: string;
  rag_source?: string;
  titre?: string;
  faits_resume?: string;
  solution?: string;
  portee?: string;
  pertinence?: number;
}

interface RechercheResult {
  requete: string;
  nb_resultats: number;
  lacunes_signalees?: string[];
  etat_du_droit?: string[];
  decisions: DecisionPanorama[];
  edpb_et_soft_law?: { document?: string; date?: string; objet?: string; pertinence?: string }[];
  questions_ouvertes?: string[];
  evolution_chronologique?: { annee?: string; decision?: string; apport?: string }[];
  synthese_thematique?: string;
  evolution?: string;
  conseil_pratique?: string;
  pour_approfondir?: { outil?: string; chemin?: string; usage?: string }[];
  sources_officielles?: string[];
  disclaimer?: string;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3].map(i => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i <= n ? "fill-amber-400 text-amber-500" : "text-slate-200")}
        />
      ))}
    </span>
  );
}

function DecisionCard({ d, index }: { d: DecisionPanorama; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const title = d.reference || d.titre || d.en_une_ligne || "Décision";
  const ratio = d.ce_que_la_juridiction_a_decide || d.faits_resume || "";
  const apport = d.apport_au_droit_positif || d.solution || "";
  const implication = d.implication_pratique || d.portee || "";
  const importance = d.importance ?? (d.pertinence && d.pertinence >= 90 ? 3 : d.pertinence && d.pertinence >= 70 ? 2 : 1);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors",
          open && "bg-slate-50 border-b",
        )}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Stars n={importance} />
            {d.type_decision && (
              <Badge variant="secondary" className="text-[10px]">
                {TYPE_LABELS[d.type_decision] ?? d.type_decision}
              </Badge>
            )}
            <span className="font-semibold text-slate-900 text-sm">{title}</span>
            {d.juridiction && <Badge variant="outline" className="text-xs">{d.juridiction}</Badge>}
            {d.date && <span className="text-xs text-muted-foreground">{d.date}</span>}
          </div>
          {d.en_une_ligne && <p className="text-xs text-slate-600 italic">{d.en_une_ligne}</p>}
          {d.ecli && <p className="text-xs font-mono text-slate-500">{d.ecli}</p>}
        </div>
        {open ?
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-white space-y-4 text-sm">
          {d.parties && (
            <p className="text-xs text-slate-500">
              <strong>Parties :</strong> {d.parties}
              {d.formation ? ` · ${d.formation}` : ""}
            </p>
          )}
          {d.rag_source && (
            <p className="text-[10px] text-slate-400">
              Source : {d.rag_source === "indexé" ? "corpus indexé" : "connaissance modèle"}
            </p>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Ce que la juridiction a décidé</p>
            <p className="text-slate-700 leading-relaxed">{ratio}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Apport au droit positif</p>
            <p className="text-slate-700">{apport}</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xs font-semibold text-emerald-800 uppercase mb-1">Implication pratique</p>
            <p className="text-emerald-950">{implication}</p>
          </div>
          {d.textes_eu_interpretes && d.textes_eu_interpretes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {d.textes_eu_interpretes.map((a, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {a}
                </Badge>
              ))}
            </div>
          )}
          <Link href="/dashboard/tools/jurisprudence">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Gavel className="h-3.5 w-3.5 mr-1" />
              Analyser cette décision en détail
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function RechercheJurisprudentiellePage() {
  const [requete, setRequete] = useState("");
  const [juridiction, setJuridiction] = useState("Toutes juridictions");
  const [texteEu, setTexteEu] = useState("");
  const [periode, setPeriode] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<RechercheResult | null>(null);
  const [ragHits, setRagHits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!requete.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRagHits(null);
    try {
      const res = await fetch("/api/generate/recherche-jurisprudentielle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requete, filtres: juridiction, texte_eu: texteEu, periode }),
      });
      const data = (await res.json()) as { error?: string; result?: RechercheResult; rag_hits?: number };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setResult(data.result ?? null);
      setRagHits(typeof data.rag_hits === "number" ? data.rag_hits : null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  const decisions = result?.decisions ?? [];

  async function downloadPdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title: "Recherche jurisprudentielle",
        subtitle: result.requete,
        sections: [
          ...(result.etat_du_droit?.length
            ? [{ heading: "État du droit", body: result.etat_du_droit.map((p, i) => `${i + 1}. ${p}`).join("\n") }]
            : []),
          {
            heading: `Décisions (${result.nb_resultats})`,
            body: result.decisions
              .map((d) => {
                const ref = d.reference || d.titre || d.en_une_ligne || "Décision";
                const lines = [
                  ref,
                  d.juridiction ? `Juridiction : ${d.juridiction}` : "",
                  d.date ? `Date : ${d.date}` : "",
                  d.ce_que_la_juridiction_a_decide || d.faits_resume || "",
                  d.apport_au_droit_positif || d.solution || "",
                  d.implication_pratique || d.portee || "",
                ].filter(Boolean);
                return lines.join("\n");
              })
              .join("\n\n---\n\n"),
          },
          ...(result.synthese_thematique
            ? [{ heading: "Synthèse thématique", body: result.synthese_thematique }]
            : []),
          ...(result.conseil_pratique ? [{ heading: "Conseil pratique", body: result.conseil_pratique }] : []),
          ...(result.evolution ? [{ heading: "Évolution récente", body: result.evolution }] : []),
          ...(result.lacunes_signalees?.length
            ? [{ heading: "Lacunes signalées", body: result.lacunes_signalees.map((l) => `• ${l}`).join("\n") }]
            : []),
          ...(result.disclaimer ? [{ heading: "Disclaimer", body: result.disclaimer }] : []),
        ],
        filename: "recherche-jurisprudentielle",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-100 rounded-xl">
          <Scale className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Recherche jurisprudentielle européenne</h1>
          <p className="text-muted-foreground mt-1">
            CJUE · CEDH · DPA · EDPB — par article, thème ou mots-clés. Panorama structuré avec implications pratiques.
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">RAG eu_case_law</Badge>
            <Badge variant="outline">ECLI vérifiés</Badge>
            <Badge variant="outline">Pas d&apos;invention</Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-950 space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Modes : article · thème · mots-clés · combinaison
        </p>
        <p className="text-xs">
          Ex. « Art. 22 RGPD », « transferts USA », « consentement cookies + vidéosurveillance ». Les décisions incertaines ne sont pas listées.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ex. Art. 22 RGPD, transferts USA, cookies..."
              value={requete}
              onChange={e => setRequete(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              className="pl-9"
            />
          </div>
          <Button onClick={search} disabled={loading || !requete.trim()} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ?
              <Loader2 className="h-4 w-4 animate-spin" />
            : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {JURIDICTIONS.map(j => (
            <button
              key={j}
              type="button"
              onClick={() => setJuridiction(j)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs border transition-colors",
                juridiction === j ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 hover:border-slate-400",
              )}
            >
              {j}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 text-xs">
          <select
            value={texteEu}
            onChange={e => setTexteEu(e.target.value)}
            className="border rounded-lg px-2 py-1.5 bg-white"
          >
            {TEXTES_EU.map(t => (
              <option key={t || "all"} value={t}>
                {t ? `Texte : ${t}` : "Tous textes EU"}
              </option>
            ))}
          </select>
          <select
            value={periode}
            onChange={e => setPeriode(e.target.value)}
            className="border rounded-lg px-2 py-1.5 bg-white"
          >
            {PERIODES.map(p => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setRequete(s)}
              className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-slate-900">{result.nb_resultats} décision(s) dans le panorama</h2>
              {ragHits !== null && (
                <p className="text-xs text-slate-500">{ragHits} extrait(s) du corpus indexé utilisé(s)</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setRequete("");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Nouvelle recherche
              </Button>
            </div>
          </div>

          {result.lacunes_signalees && result.lacunes_signalees.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Lacunes signalées
              </p>
              <ul className="list-disc pl-5 space-y-1 text-amber-950 text-xs">
                {result.lacunes_signalees.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.etat_du_droit?.length ?? 0) > 0 && (
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">État du droit en bref</p>
              <ul className="space-y-2">
                {result.etat_du_droit!.map((p, i) => (
                  <li key={i} className="text-sm text-slate-700 flex gap-2">
                    <span className="text-indigo-600 font-bold">{i + 1}.</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {decisions.map((d, i) => (
              <DecisionCard key={i} d={d} index={i} />
            ))}
          </div>

          {result.edpb_et_soft_law && result.edpb_et_soft_law.length > 0 && (
            <div className="bg-slate-50 border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase">EDPB & soft law</p>
              {result.edpb_et_soft_law.map((e, i) => (
                <div key={i} className="text-sm border-b border-slate-200 pb-2 last:border-0">
                  <p className="font-medium">{e.document}</p>
                  <p className="text-xs text-slate-500">{e.date}</p>
                  <p className="text-slate-700 mt-1">{e.pertinence || e.objet}</p>
                </div>
              ))}
            </div>
          )}

          {result.questions_ouvertes && result.questions_ouvertes.length > 0 && (
            <div className="border border-violet-200 rounded-xl p-4 bg-violet-50/50">
              <p className="text-xs font-semibold text-violet-800 uppercase mb-2">Questions encore ouvertes</p>
              <ul className="list-disc pl-5 text-sm text-violet-950 space-y-1">
                {result.questions_ouvertes.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}

          {result.evolution_chronologique && result.evolution_chronologique.length > 0 && (
            <div className="border rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Évolution chronologique</p>
              <div className="space-y-2">
                {result.evolution_chronologique.map((e, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-xs text-indigo-600 w-12 shrink-0">{e.annee}</span>
                    <div>
                      <p className="font-medium text-slate-800">{e.decision}</p>
                      <p className="text-slate-600 text-xs">{e.apport}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-indigo-700 uppercase mb-1">Synthèse thématique</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.synthese_thematique}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Conseil pratique</p>
              <p className="text-sm text-slate-700">{result.conseil_pratique}</p>
            </div>
          </div>

          {result.evolution && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
              <strong>Évolution récente :</strong> {result.evolution}
            </p>
          )}

          {result.pour_approfondir && result.pour_approfondir.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.pour_approfondir.map((l, i) =>
                l.chemin?.startsWith("/") ?
                  <Link key={i} href={l.chemin}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      {l.outil}
                    </Button>
                  </Link>
                : null,
              )}
            </div>
          )}

          {result.disclaimer && (
            <p className="text-xs text-slate-500 text-center border-t pt-4">{result.disclaimer}</p>
          )}
        </div>
      )}

      <Link href="/dashboard/tools" className="text-sm text-blue-600 hover:underline inline-block">
        ← Retour aux outils
      </Link>
    </div>
  );
}
