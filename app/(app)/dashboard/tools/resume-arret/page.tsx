"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { BookOpen, Loader2, ChevronDown, ChevronRight, Download, RotateCcw, MessageSquare, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";

type PedagogyMode = "F" | "C" | "FC" | "E" | "M" | "T";
type Niveau = "L1" | "L2" | "L3" | "M1" | "M2" | "Doctorat" | "Professionnel" | "auto";

interface FicheArret {
  reference?: string;
  formation?: string;
  domaines?: string[];
  juridiction?: string;
  date?: string;
  parties?: string;
  mots_cles?: string[];
  faits?: string;
  procedure?: string;
  question_droit?: string;
  solution?: string;
  solution_dispositif?: string;
  solution_motifs?: string;
  portee?: string;
  textes_appliques?: string[];
}

interface SensValeurPortee {
  sens?: string;
  valeur_juridique?: string;
  valeur_extra_juridique?: string;
  portee?: string;
  questions_reflexion?: string[];
}

interface CommentaireGuide {
  problematique?: string;
  plan?: Array<{ partie: string; sous_parties: Array<{ titre: string; idees: string[] }> }>;
  references_doctrinales?: string[];
  conseils?: string;
  questions_reflexion?: string[];
}

interface JsonResult {
  mode_demande?: string;
  niveau?: string;
  fiche?: FicheArret;
  sens_valeur_portee?: SensValeurPortee;
  commentaire?: CommentaireGuide;
  pour_aller_plus_loin?: string[];
  cloture_pedagogique?: string;
  markdown?: string;
  format?: "json" | "markdown";
}

const MODE_OPTIONS: { value: PedagogyMode; label: string; hint: string }[] = [
  { value: "FC", label: "Fiche + guide commentaire", hint: "Complet — fiche §1–5, sens·valeur·portée et plan" },
  { value: "F", label: "Fiche structurée", hint: "Description + sens · valeur · portée" },
  { value: "C", label: "Commentaire guidé", hint: "Plan et pistes — sans rédaction intégrale" },
  { value: "E", label: "Explication", hint: "Points difficiles clarifiés selon votre niveau" },
  { value: "M", label: "Mise en contexte", hint: "Place dans la jurisprudence EU" },
  { value: "T", label: "Entraînement", hint: "Questions progressives (méthode socratique)" },
];

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        <span className="font-semibold text-slate-900">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
      </button>
      {open && <div className="px-5 py-4 bg-white">{children}</div>}
    </div>
  );
}

export default function ResumeArretPage() {
  const [uiMode, setUiMode] = useState<"fiche" | "dialogue">("fiche");
  const [pedagogyMode, setPedagogyMode] = useState<PedagogyMode>("FC");
  const [niveau, setNiveau] = useState<Niveau>("L3");
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<JsonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"fiche" | "svp" | "commentaire" | "prose">("fiche");

  const [dlgMessages, setDlgMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [dlgInput, setDlgInput] = useState("");
  const [dlgCaseText, setDlgCaseText] = useState("");
  const [dlgPedagogyMode, setDlgPedagogyMode] = useState<PedagogyMode>("C");
  const [dlgStreaming, setDlgStreaming] = useState(false);
  const [dlgError, setDlgError] = useState<string | null>(null);

  const isProse = ["E", "M", "T"].includes(pedagogyMode);

  async function sendDialogue() {
    const q = dlgInput.trim();
    if (!q || dlgStreaming) return;
    setDlgStreaming(true);
    setDlgError(null);
    setDlgInput("");
    const history = dlgMessages;
    setDlgMessages((prev) => [...prev, { role: "user", content: q }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/arrets-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          history,
          caseText: dlgCaseText.trim() || undefined,
          mode: dlgPedagogyMode,
          niveau: niveau !== "auto" ? niveau : undefined,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const data = (await res.json()) as { error?: string; out_of_scope?: boolean; message?: string };
        if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
        if (data.out_of_scope) throw new Error(data.message ?? "Question hors du périmètre de l'outil.");
        throw new Error(data.error ?? "Réponse inattendue du serveur.");
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as { type?: string; text?: string; message?: string };
            if (event.type === "text" && event.text) {
              full += event.text;
              setDlgMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") next[next.length - 1] = { ...last, content: full };
                return next;
              });
            } else if (event.type === "error") {
              throw new Error(event.message ?? "Erreur de flux");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (e: unknown) {
      setDlgError(e instanceof Error ? e.message : "Erreur lors de l'envoi");
      setDlgMessages((prev) => prev.slice(0, -2));
    } finally {
      setDlgStreaming(false);
    }
  }

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/resume-arret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: pedagogyMode,
          niveau: niveau !== "auto" ? niveau : undefined,
          reference: reference.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; result?: JsonResult };
      if (!res.ok) throw new Error(data.error);
      const r = data.result ?? null;
      setResult(r);
      if (r?.markdown || isProse) setActiveTab("prose");
      else if (r?.sens_valeur_portee) setActiveTab("svp");
      else setActiveTab("fiche");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération");
    }
    setLoading(false);
  }

  function buildExportSections(): { title: string; sections: { heading: string; body: string }[] } {
    if (!result) return { title: "Résumé d'arrêt", sections: [] };
    if (result.markdown) {
      return {
        title: reference.trim() || "Résumé d'arrêt",
        sections: [{ heading: "Réponse", body: result.markdown }],
      };
    }
    const f = result.fiche ?? {};
    const svp = result.sens_valeur_portee ?? {};
    const c = result.commentaire ?? {};
    const sections: { heading: string; body: string }[] = [];
    const ficheBody = [
      f.faits && `Faits\n${f.faits}`,
      f.procedure && `Procédure\n${f.procedure}`,
      f.question_droit && `Problème de droit\n${f.question_droit}`,
      f.solution && `Solution\n${f.solution}`,
      f.portee && `Portée\n${f.portee}`,
    ].filter(Boolean).join("\n\n");
    if (ficheBody) sections.push({ heading: "Fiche structurée", body: ficheBody });
    const svpBody = [
      svp.sens && `Sens\n${svp.sens}`,
      svp.valeur_juridique && `Valeur juridique\n${svp.valeur_juridique}`,
      svp.valeur_extra_juridique && `Valeur extra-juridique\n${svp.valeur_extra_juridique}`,
      svp.portee && `Portée\n${svp.portee}`,
    ].filter(Boolean).join("\n\n");
    if (svpBody) sections.push({ heading: "Sens · Valeur · Portée", body: svpBody });
    if (c.problematique) sections.push({ heading: "Problématique", body: c.problematique });
    if (c.plan?.length) {
      sections.push({
        heading: "Plan du commentaire",
        body: c.plan
          .map((p) => `${p.partie}\n${p.sous_parties.map((sp) => `  ${sp.titre}\n${sp.idees.map((i) => `    • ${i}`).join("\n")}`).join("\n")}`)
          .join("\n\n"),
      });
    }
    if (c.conseils) sections.push({ heading: "Conseils", body: c.conseils });
    return { title: String(f.reference ?? (reference.trim() || "Résumé d'arrêt")), sections };
  }

  function downloadTxt() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    const content = sections.length === 1 && sections[0].heading === "Réponse"
      ? sections[0].body
      : [`FICHE — ${title}`, "=".repeat(60), "", ...sections.flatMap((s) => [s.heading.toUpperCase(), s.body, ""])].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "arret-pedagogie.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPdf() {
    if (!result) return;
    const { title, sections } = buildExportSections();
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title,
        subtitle: `Mode : ${pedagogyMode} · Niveau : ${niveau}`,
        sections,
        filename: "resume-arret",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  const fiche = result?.fiche;
  const svp = result?.sens_valeur_portee;
  const commentaire = result?.commentaire;
  const showCommentaire = commentaire && (pedagogyMode === "FC" || pedagogyMode === "C");

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-100 rounded-xl">
          <BookOpen className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Résumé d&apos;arrêts et commentaires guidés</h1>
          <p className="text-muted-foreground mt-1">
            Fiche structurée, commentaire guidé, explication, mise en contexte ou entraînement — méthode sens · valeur · portée.
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">Pédagogique</Badge>
            <Badge variant="outline">L1 à Doctorat</Badge>
            <Badge variant="outline">CJUE · CEDH · RGPD</Badge>
          </div>
        </div>
      </div>

      <div className="flex bg-slate-100 rounded-lg p-1 gap-1 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setUiMode("fiche")}
          className={cn(
            "flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-2",
            uiMode === "fiche" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <BookOpen className="h-4 w-4" />
          À partir d&apos;un texte
        </button>
        <button
          type="button"
          onClick={() => setUiMode("dialogue")}
          className={cn(
            "flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center justify-center gap-2",
            uiMode === "dialogue" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Dialogue professeur
        </button>
      </div>

      {uiMode === "dialogue" ? (
        <div className="space-y-4 border rounded-xl p-5 bg-white">
          <p className="text-sm text-slate-600">
            Échange guidé : l&apos;outil pose des questions et ne rédige pas le commentaire à votre place (Règle N1).
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Mode</label>
              <Select
                value={dlgPedagogyMode}
                onChange={(e) => setDlgPedagogyMode(e.target.value as PedagogyMode)}
              >
                {MODE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    [{m.value}] {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Niveau</label>
              <Select value={niveau} onChange={(e) => setNiveau(e.target.value as Niveau)}>
                {["L1", "L2", "L3", "M1", "M2", "Doctorat", "Professionnel"].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Texte d&apos;arrêt (optionnel)</label>
            <Textarea
              value={dlgCaseText}
              onChange={(e) => setDlgCaseText(e.target.value)}
              placeholder="Collez l'arrêt ici pour ancrer la conversation…"
              className="min-h-[120px] font-mono text-sm"
            />
          </div>
          {dlgError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {dlgError}
            </div>
          )}
          <div className="space-y-3 max-h-[420px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            {dlgMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Ex. : « [C] Aide-moi à formuler le problème de droit dans Schrems II » ou « [T] Entraîne-moi sur l&apos;arrêt SCHUFA ».
              </p>
            ) : (
              dlgMessages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm",
                    m.role === "user" ? "bg-blue-600 text-white ml-8" : "bg-white border border-slate-200 mr-8 whitespace-pre-wrap"
                  )}
                >
                  {m.content ||
                    (dlgStreaming && i === dlgMessages.length - 1 ? (
                      <span className="text-muted-foreground inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Rédaction…
                      </span>
                    ) : null)}
                </div>
              ))
            )}
          </div>
          <Textarea
            value={dlgInput}
            onChange={(e) => setDlgInput(e.target.value)}
            placeholder="Votre question…"
            className="min-h-[100px]"
            disabled={dlgStreaming}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendDialogue();
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void sendDialogue()} disabled={dlgStreaming || dlgInput.trim().length < 4}>
              {dlgStreaming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  En cours…
                </>
              ) : (
                "Envoyer"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDlgMessages([]);
                setDlgError(null);
              }}
              disabled={dlgStreaming || dlgMessages.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Vérification :{" "}
            <a href="https://curia.europa.eu" className="underline" target="_blank" rel="noreferrer">
              curia.europa.eu
            </a>{" "}
            ·{" "}
            <a href="https://hudoc.echr.coe.int" className="underline" target="_blank" rel="noreferrer">
              hudoc.echr.coe.int
            </a>{" "}
            — analyse pédagogique, pas un avis juridique.
          </p>
        </div>
      ) : !result ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Mode pédagogique</label>
              <Select
                value={pedagogyMode}
                onChange={(e) => setPedagogyMode(e.target.value as PedagogyMode)}
              >
                {MODE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    [{m.value}] {m.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {MODE_OPTIONS.find((m) => m.value === pedagogyMode)?.hint}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Niveau d&apos;études</label>
              <Select value={niveau} onChange={(e) => setNiveau(e.target.value as Niveau)}>
                {["L1", "L2", "L3", "M1", "M2", "Doctorat", "Professionnel"].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Référence (optionnel)</label>
            <Textarea
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex. C-634/21 SCHUFA, ECLI:EU:C:2023:957…"
              className="min-h-[60px] text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Texte de l&apos;arrêt ou de la décision</label>
            <Textarea
              placeholder="Collez le texte (faits + dispositif minimum)…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[280px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{text.length} caractères</p>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <Button onClick={() => void generate()} disabled={loading || text.trim().length < 50} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                Générer
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
              {result.markdown || isProse ?
                <button
                  type="button"
                  onClick={() => setActiveTab("prose")}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                    activeTab === "prose" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                  )}
                >
                  Réponse
                </button>
              : (
                <>
                  {fiche && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("fiche")}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-medium",
                        activeTab === "fiche" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                      )}
                    >
                      Fiche
                    </button>
                  )}
                  {svp && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("svp")}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-medium",
                        activeTab === "svp" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                      )}
                    >
                      Sens · Valeur · Portée
                    </button>
                  )}
                  {showCommentaire && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("commentaire")}
                      className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-medium",
                        activeTab === "commentaire" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                      )}
                    >
                      Guide commentaire
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTxt}>
                <Download className="h-4 w-4" />
                TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setText("");
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Nouveau
              </Button>
            </div>
          </div>

          {(result.markdown || isProse) && activeTab === "prose" && (
            <div className="prose prose-slate max-w-none border rounded-xl p-6 bg-white whitespace-pre-wrap text-sm">
              {result.markdown}
            </div>
          )}

          {activeTab === "fiche" && fiche && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="font-bold text-blue-900 text-lg">{String(fiche.reference ?? "")}</p>
                <div className="flex gap-3 mt-1 text-sm text-blue-700 flex-wrap">
                  {fiche.juridiction ? <span>{String(fiche.juridiction)}</span> : null}
                  {fiche.date ? (
                    <>
                      <span>·</span>
                      <span>{String(fiche.date)}</span>
                    </>
                  ) : null}
                  {fiche.formation ? (
                    <>
                      <span>·</span>
                      <span>{String(fiche.formation)}</span>
                    </>
                  ) : null}
                </div>
                {fiche.parties ? <p className="text-sm text-blue-800 mt-1">{String(fiche.parties)}</p> : null}
                {fiche.mots_cles && fiche.mots_cles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {fiche.mots_cles.map((k, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {k}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {[
                { label: "Faits", value: fiche.faits },
                { label: "Procédure", value: fiche.procedure },
                { label: "Problème de droit", value: fiche.question_droit },
                { label: "Solution", value: fiche.solution ?? [fiche.solution_dispositif, fiche.solution_motifs].filter(Boolean).join("\n\n") },
                { label: "Portée (synthèse)", value: fiche.portee },
              ].map((item) =>
                item.value ? (
                  <Section key={item.label} title={item.label}>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{String(item.value)}</p>
                  </Section>
                ) : null
              )}
              {fiche.textes_appliques && fiche.textes_appliques.length > 0 && (
                <Section title="Textes appliqués">
                  <div className="flex flex-wrap gap-2">
                    {fiche.textes_appliques.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          {activeTab === "svp" && svp && (
            <div className="space-y-3">
              {[
                { label: "Sens", value: svp.sens },
                { label: "Valeur — pertinence juridique", value: svp.valeur_juridique },
                { label: "Valeur — dimension extra-juridique", value: svp.valeur_extra_juridique },
                { label: "Portée", value: svp.portee },
              ].map((item) =>
                item.value ? (
                  <Section key={item.label} title={item.label}>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{String(item.value)}</p>
                  </Section>
                ) : null
              )}
              {svp.questions_reflexion && svp.questions_reflexion.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-800 uppercase mb-2">Questions de réflexion</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {svp.questions_reflexion.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "commentaire" && showCommentaire && commentaire && (
            <div className="space-y-4">
              {commentaire.problematique && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Problématique</p>
                  <p className="text-slate-900 font-medium">{commentaire.problematique}</p>
                </div>
              )}
              {commentaire.plan?.map((partie, pi) => (
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
                              <span className="text-slate-400 flex-shrink-0 mt-0.5">→</span>
                              {idee}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {commentaire.references_doctrinales && commentaire.references_doctrinales.length > 0 && (
                <Section title="Références doctrinales">
                  <ul className="space-y-1">
                    {commentaire.references_doctrinales.map((r, i) => (
                      <li key={i} className="text-sm text-slate-700">
                        {r}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {commentaire.conseils && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">Conseils méthodologiques</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{commentaire.conseils}</p>
                </div>
              )}
            </div>
          )}

          {result.cloture_pedagogique && (
            <p className="text-xs text-muted-foreground border-t pt-4">{result.cloture_pedagogique}</p>
          )}
        </div>
      )}
    </div>
  );
}
