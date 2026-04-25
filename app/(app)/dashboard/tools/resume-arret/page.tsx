"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, ChevronDown, ChevronRight, Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FicheArret {
  fiche: {
    reference: string; juridiction: string; date: string; parties: string;
    faits: string; procedure: string; question_droit: string; solution: string;
    portee: string; textes_appliques: string[];
  };
  commentaire: {
    problematique: string;
    plan: Array<{ partie: string; sous_parties: Array<{ titre: string; idees: string[] }> }>;
    references_doctrinales: string[];
    conseils: string;
  };
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="font-semibold text-slate-900">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 py-4 bg-white">{children}</div>}
    </div>
  );
}

export default function ResumeArretPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FicheArret | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fiche" | "commentaire">("fiche");

  async function generate() {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/legal-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "resume-arret", text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    }
    setLoading(false);
  }

  function downloadTxt() {
    if (!result) return;
    const f = result.fiche;
    const c = result.commentaire;
    const content = `FICHE D'ARRÊT — ${f.reference}
${"=".repeat(60)}

JURIDICTION : ${f.juridiction}
DATE : ${f.date}
PARTIES : ${f.parties}

FAITS
${f.faits}

PROCÉDURE
${f.procedure}

QUESTION(S) DE DROIT
${f.question_droit}

SOLUTION
${f.solution}

PORTÉE
${f.portee}

TEXTES APPLIQUÉS
${f.textes_appliques.join(", ")}

${"=".repeat(60)}
PLAN DE COMMENTAIRE

PROBLÉMATIQUE : ${c.problematique}

${c.plan.map(p => `${p.partie}\n${p.sous_parties.map(sp => `  ${sp.titre}\n${sp.idees.map(i => `    - ${i}`).join("\n")}`).join("\n")}`).join("\n\n")}

RÉFÉRENCES DOCTRINALES
${c.references_doctrinales.join("\n")}

CONSEILS MÉTHODOLOGIQUES
${c.conseils}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `fiche-arret.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-xl"><BookOpen className="h-6 w-6 text-blue-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Résumé d'arrêts et commentaires guidés</h1>
          <p className="text-muted-foreground mt-1">Collez un arrêt CJUE, CEDH ou une décision DPA → Claude génère la fiche et le plan de commentaire.</p>
          <div className="flex gap-2 mt-2">
            <Badge variant="outline">Pédagogique</Badge>
            <Badge variant="outline">Master droit numérique</Badge>
          </div>
        </div>
      </div>

      {!result ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Texte de l'arrêt ou de la décision</label>
            <Textarea
              placeholder="Collez ici le texte de l'arrêt CJUE, CEDH, ou d'une décision CNIL/DPC/EDPB...

Exemple : CJUE, arrêt du 4 octobre 2024, Glawischnig-Piesczek c. Facebook, C-18/18..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[280px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{text.length} caractères — pour de meilleurs résultats, fournissez au minimum les faits et le dispositif.</p>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
          <Button onClick={generate} disabled={loading || text.trim().length < 50} className="w-full">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Génération en cours...</> : <><BookOpen className="h-4 w-4" />Générer la fiche d'arrêt et le commentaire</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              {(["fiche", "commentaire"] as const).map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors", activeTab === t ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                  {t === "fiche" ? "Fiche d'arrêt" : "Plan de commentaire"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTxt}><Download className="h-4 w-4" />Télécharger</Button>
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setText(""); }}><RotateCcw className="h-4 w-4" />Nouveau</Button>
            </div>
          </div>

          {activeTab === "fiche" && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="font-bold text-blue-900 text-lg">{result.fiche.reference}</p>
                <div className="flex gap-3 mt-1 text-sm text-blue-700">
                  <span>{result.fiche.juridiction}</span>
                  <span>·</span><span>{result.fiche.date}</span>
                </div>
                <p className="text-sm text-blue-800 mt-1">{result.fiche.parties}</p>
              </div>
              {[
                { label: "Faits", value: result.fiche.faits },
                { label: "Procédure", value: result.fiche.procedure },
                { label: "Question(s) de droit", value: result.fiche.question_droit },
                { label: "Solution", value: result.fiche.solution },
                { label: "Portée", value: result.fiche.portee },
              ].map((item) => (
                <Section key={item.label} title={item.label}>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.value}</p>
                </Section>
              ))}
              <Section title="Textes appliqués">
                <div className="flex flex-wrap gap-2">
                  {result.fiche.textes_appliques.map((t, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "commentaire" && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Problématique suggérée</p>
                <p className="text-slate-900 font-medium">{result.commentaire.problematique}</p>
              </div>

              <div className="space-y-3">
                {result.commentaire.plan.map((partie, pi) => (
                  <div key={pi} className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-5 py-3">
                      <p className="font-bold text-sm">{partie.partie}</p>
                    </div>
                    <div className="divide-y">
                      {partie.sous_parties.map((sp, si) => (
                        <div key={si} className="px-5 py-4">
                          <p className="font-semibold text-slate-800 mb-2">{sp.titre}</p>
                          <ul className="space-y-1">
                            {sp.idees.map((idee, ii) => (
                              <li key={ii} className="flex items-start gap-2 text-sm text-slate-600">
                                <span className="text-slate-400 flex-shrink-0 mt-0.5">→</span>{idee}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Section title="Références doctrinales">
                <ul className="space-y-1">
                  {result.commentaire.references_doctrinales.map((r, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-slate-400 flex-shrink-0">📚</span>{r}
                    </li>
                  ))}
                </ul>
              </Section>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Conseils méthodologiques</p>
                <p className="text-sm text-slate-700">{result.commentaire.conseils}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
