"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Globe2, Loader2, Sparkles, ClipboardList, AlignLeft, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ScannerMode = "html" | "url" | "description" | "questionnaire";

const MODE_CHOICES: { id: ScannerMode; label: string; hint: string }[] = [
  { id: "html", label: "A — Coller du HTML", hint: "Code source ou extrait pertinent." },
  { id: "url", label: "A′ — Analyser une URL", hint: "Téléchargement statique côté serveur (pas de rendu JS)." },
  { id: "description", label: "B — Décrire une page", hint: "Sans code : ce que vous voyez + URL optionnelle." },
  { id: "questionnaire", label: "C — Questionnaire guidé", hint: "Sans accès au HTML." },
];

const defaultQs = {
  cookie_banner: "none" as const,
  analytics: "unknown" as const,
  form: "none" as const,
  footer_legal: "no_footer" as const,
  privacy_link: "no" as const,
  google_fonts: "unknown" as const,
  chatbot: "no" as const,
  https: "yes" as const,
};

export default function SiteScannerClient() {
  const [mode, setMode] = useState<ScannerMode>("html");
  const [url, setUrl] = useState("https://");
  const [html, setHtml] = useState("");
  const [observations, setObservations] = useState("");
  const [qs, setQs] = useState(defaultQs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [heuristicsJson, setHeuristicsJson] = useState<unknown>(null);
  const [showHeuristics, setShowHeuristics] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setReport(null);
    setHeuristicsJson(null);

    const body: Record<string, unknown> = { mode };
    if (mode === "html") {
      body.html = html;
      if (url && url !== "https://" && url.length > 8) body.url = url;
    } else if (mode === "url") {
      body.url = url;
    } else if (mode === "description") {
      body.url = url && url !== "https://" ? url : undefined;
      body.observations = observations;
    } else {
      body.questionnaire = qs;
    }

    try {
      const res = await fetch("/api/generate/scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; report_markdown?: string; heuristics?: unknown };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setReport(data.report_markdown ?? null);
      setHeuristicsJson(data.heuristics ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    mode === "html" ? html.trim().length > 20
    : mode === "url" ? url.startsWith("http")
    : mode === "description" ? observations.trim().length >= 10
    : true;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe2 className="h-7 w-7 text-teal-600" /> Scanner page web (bêta)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicateurs automatiques RGPD / ePrivacy / transparence sur HTML statique — outil exploratoire en bêta, pas un audit RGPD ni un conseil juridique
          juridique.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950 space-y-2">
        <p className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0" /> Limites — affichage permanent
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
          <li>Ce scanner analyse uniquement le HTML statique fourni ou récupéré (pas d’exécution JavaScript).</li>
          <li>Il ne détecte pas les scripts injectés dynamiquement (React, Vue, Angular, GTM après chargement…).</li>
          <li>Il ne vérifie pas le fonctionnement réel d’un mécanisme de consentement ni les cookies réellement déposés.</li>
          <li>Il ne lit pas le contenu des pages liées (politique de confidentialité, CGU…).</li>
          <li>Résultats indicatifs — faux positifs / négatifs possibles. Non substituable à un audit professionnel.</li>
        </ul>
      </div>

      <form onSubmit={run} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">Mode d’analyse</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODE_CHOICES.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer text-sm ${
                  mode === m.id ? "border-teal-500 bg-teal-50/60" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="scan-mode"
                  checked={mode === m.id}
                  onChange={() => setMode(m.id)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium block">{m.label}</span>
                  <span className="text-xs text-slate-500">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {(mode === "url" || mode === "html" || mode === "description") && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              {mode === "description" ? "URL (optionnel)" : "URL"}
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.exemple.fr"
              className="font-mono text-sm"
            />
          </div>
        )}

        {mode === "html" && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Code HTML</label>
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder={'Collez le résultat de « Afficher le code source de la page »…'}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        )}

        {mode === "description" && (
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Ce que vous observez</label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Bandeau cookies, boutons, formulaires, liens footer, chatbot…"
              rows={6}
            />
          </div>
        )}

        {mode === "questionnaire" && (
          <div className="rounded-xl border bg-white p-4 space-y-4 text-sm">
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Répondez selon votre observation réelle de la page.
            </p>

            <div>
              <p className="font-medium mb-2">Bandeau cookies</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.cookie_banner}
                onChange={(e) => setQs((q) => ({ ...q, cookie_banner: e.target.value as typeof qs.cookie_banner }))}
              >
                <option value="accept_refuse">Oui — Accepter et Refuser</option>
                <option value="accept_only">Oui — seulement Accepter</option>
                <option value="prechecked">Oui — cases pré-cochées</option>
                <option value="none">Non / pas de bandeau</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Analytics</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.analytics}
                onChange={(e) => setQs((q) => ({ ...q, analytics: e.target.value as typeof qs.analytics }))}
              >
                <option value="ga">Google Analytics</option>
                <option value="matomo">Matomo (auto-hébergé)</option>
                <option value="plausible">Plausible</option>
                <option value="fathom">Fathom</option>
                <option value="none">Pas d’analytics</option>
                <option value="unknown">Inconnu</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Formulaire contact / inscription</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.form}
                onChange={(e) => setQs((q) => ({ ...q, form: e.target.value as typeof qs.form }))}
              >
                <option value="none">Non</option>
                <option value="with_consent">Oui — avec case consentement + liens</option>
                <option value="without_consent">Oui — sans case consentement</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Lien « Mentions légales » (footer)</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.footer_legal}
                onChange={(e) => setQs((q) => ({ ...q, footer_legal: e.target.value as typeof qs.footer_legal }))}
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
                <option value="no_footer">Pas de footer visible</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Lien politique de confidentialité</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.privacy_link}
                onChange={(e) => setQs((q) => ({ ...q, privacy_link: e.target.value as typeof qs.privacy_link }))}
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Google Fonts ou polices externes</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.google_fonts}
                onChange={(e) => setQs((q) => ({ ...q, google_fonts: e.target.value as typeof qs.google_fonts }))}
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
                <option value="unknown">Je ne sais pas</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">Chatbot / assistant</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.chatbot}
                onChange={(e) => setQs((q) => ({ ...q, chatbot: e.target.value as typeof qs.chatbot }))}
              >
                <option value="no">Non</option>
                <option value="labeled">Oui — mention explicite IA / chatbot</option>
                <option value="unlabeled">Oui — sans indication claire</option>
              </select>
            </div>

            <div>
              <p className="font-medium mb-2">HTTPS</p>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={qs.https}
                onChange={(e) => setQs((q) => ({ ...q, https: e.target.value as typeof qs.https }))}
              >
                <option value="yes">Oui (cadenas)</option>
                <option value="no">Non (http)</option>
              </select>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}

        <Button type="submit" disabled={busy || !canSubmit} className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto">
          {busy ?
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Génération du rapport…
            </>
          : <>
              <AlignLeft className="h-4 w-4 mr-2" />
              Lancer le scan exploratoire
            </>
          }
        </Button>
      </form>

      {report && (
        <div className="space-y-4 rounded-xl border bg-white overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800">Rapport Markdown</p>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/dashboard/chat">
                <MessageSquare className="h-4 w-4 mr-1" />
                Consultant IA
              </Link>
            </Button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none px-4 py-4 [&_table]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
          </div>

          {heuristicsJson != null && (
            <div className="border-t px-4 py-3 bg-slate-50">
              <button
                type="button"
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
                onClick={() => setShowHeuristics((v) => !v)}
              >
                {showHeuristics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Indices techniques automatiques (JSON)
              </button>
              {showHeuristics && (
                <pre className="mt-2 text-[10px] overflow-x-auto bg-white border rounded p-2 max-h-64 overflow-y-auto">
                  {JSON.stringify(heuristicsJson, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 text-sm">
        <Link href="/dashboard/tools" className="text-blue-600 hover:underline">
          ← Retour aux outils
        </Link>
      </div>
    </div>
  );
}
