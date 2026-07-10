"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, Loader2, RotateCcw, ArrowLeftRight, LayoutGrid, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadToolExportPdf } from "@/lib/utils/tool-export-pdf";
import { EU27 } from "@/lib/data/eu27-registry";
import { getEu27IsoCodesSorted } from "@/lib/data/eu27-codes";
import { ToolPageShell } from "@/components/tools/ToolPageShell";

const FOCUSES = [
  { id: "transversal", label: "Transversal", desc: "RGPD + AI Act + NIS2" },
  { id: "rgpd", label: "RGPD", desc: "Lois nationales + DPA" },
  { id: "ai_act", label: "AI Act", desc: "Autorités nationales" },
  { id: "nis2", label: "NIS2", desc: "Transposition" },
] as const;

type FocusId = (typeof FOCUSES)[number]["id"];

const DIVERGENCE_COLOR: Record<string, string> = {
  Forte: "bg-red-100 text-red-700",
  Moyenne: "bg-amber-100 text-amber-700",
  Faible: "bg-green-100 text-green-700",
};

interface TableRow {
  aspect: string;
  pays1: string;
  pays2: string;
  divergence: string;
  commentaire?: string;
  fiabilite?: string;
}

interface ComparateurData {
  mode?: string;
  focus?: string;
  pays_codes?: string[];
  pays_labels?: string[];
  synthese: string;
  registry_notice?: string;
  tableau: TableRow[];
  divergences_cles?: Array<{ theme: string; resume: string; fiabilite?: string }>;
  points_convergence: string[];
  points_divergence: Array<{ point: string; avantage: string; explication: string; fiabilite?: string }>;
  implications_pratiques: string;
  limitations?: string[];
  sources: string[];
  disclaimer?: string;
}

export default function ComparateurPage() {
  const countries = useMemo(
    () => getEu27IsoCodesSorted().map((code) => ({ code, label: EU27[code].name_fr })),
    [],
  );

  const [focus, setFocus] = useState<FocusId>("transversal");
  const [country1, setCountry1] = useState("FR");
  const [country2, setCountry2] = useState("DE");
  const [aspect, setAspect] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [result, setResult] = useState<ComparateurData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadPdf() {
    if (!result) return;
    const pano = result.mode === "panorama";
    const l1 = result.pays_labels?.[0] ?? countries.find((c) => c.code === country1)?.label ?? country1;
    const l2 = result.pays_labels?.[1] ?? countries.find((c) => c.code === country2)?.label ?? country2;
    setPdfLoading(true);
    try {
      await downloadToolExportPdf({
        title: pano ? "Panorama UE-27" : `${l1} vs ${l2}`,
        subtitle: `Focus : ${result.focus ?? focus}`,
        sections: [
          { heading: "Synthèse", body: result.synthese },
          {
            heading: "Tableau comparatif",
            body: result.tableau
              .map((r) => `${r.aspect} [${r.divergence}]\n• ${l1} : ${r.pays1}\n• ${pano ? "Synthèse" : l2} : ${r.pays2}`)
              .join("\n\n"),
          },
          {
            heading: "Points de convergence",
            body: result.points_convergence.map((p) => `• ${p}`).join("\n"),
          },
          {
            heading: "Divergences majeures",
            body: result.points_divergence
              .map((d) => `• ${d.point} (${d.avantage}) — ${d.explication}`)
              .join("\n"),
          },
          { heading: "Implications pratiques", body: result.implications_pratiques },
          ...(result.sources.length > 0 ?
            [{ heading: "Sources", body: result.sources.join("\n") }]
          : []),
          ...(result.disclaimer ?
            [{ heading: "Disclaimer", body: result.disclaimer }]
          : []),
        ],
        filename: "comparateur-ue27",
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur export PDF");
    }
    setPdfLoading(false);
  }

  async function run(mode: "bilateral" | "panorama") {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate/comparateur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          focus,
          country1,
          country2,
          aspect: aspect.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; result?: ComparateurData };
      if (!res.ok) throw new Error(data.error);
      setResult(data.result ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
    setLoading(false);
  }

  const isPanorama = result?.mode === "panorama";
  const label1 = result?.pays_labels?.[0] ?? countries.find((c) => c.code === country1)?.label ?? country1;
  const label2 = result?.pays_labels?.[1] ?? countries.find((c) => c.code === country2)?.label ?? country2;

  if (!result) {
    return (
      <ToolPageShell
        title="Comparateur de législations — UE-27"
        breadcrumb="Comparateur"
        icon={Globe2}
        description="Registre EU-27 CompliAI : 27 DPA, lois RGPD nationales, AI Act et NIS2. Comparaison bilatérale ou panorama."
        badges={
          <>
            <Badge variant="outline">27 États membres</Badge>
            <Badge variant="outline">Règles N1–N5</Badge>
          </>
        }
      >
        <div className="bg-white border rounded-xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Focus réglementaire</label>
            <div className="grid grid-cols-2 gap-2">
              {FOCUSES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFocus(f.id)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-colors",
                    focus === f.id ? "border-cyan-500 bg-cyan-50" : "border-slate-200",
                  )}
                >
                  <p className="font-medium text-sm">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Premier pays", value: country1, set: setCountry1 },
              { label: "Deuxième pays", value: country2, set: setCountry2 },
            ].map((p) => (
              <div key={p.label} className="space-y-2">
                <label className="text-sm font-medium">{p.label}</label>
                <select
                  value={p.value}
                  onChange={(e) => p.set(e.target.value)}
                  className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Aspects prioritaires (optionnel)</label>
            <input
              type="text"
              value={aspect}
              onChange={(e) => setAspect(e.target.value)}
              placeholder="Ex. DPO, données salariés, transferts…"
              className="w-full text-sm px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => run("bilateral")}
              disabled={loading || country1 === country2}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              {loading ?
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparaison…
                </>
              : <>
                  <ArrowLeftRight className="h-4 w-4" />
                  Comparer {EU27[country1]?.name_fr} vs {EU27[country2]?.name_fr}
                </>
              }
            </Button>
            <Button variant="outline" onClick={() => run("panorama")} disabled={loading} className="flex-1">
              <LayoutGrid className="h-4 w-4" />
              Panorama UE-27
            </Button>
          </div>
        </div>
      </ToolPageShell>
    );
  }

  return (
    <ToolPageShell
      title={isPanorama ? "Panorama UE-27" : `${label1} vs ${label2}`}
      breadcrumb="Comparateur"
      icon={Globe2}
      maxWidth="max-w-5xl"
      description={`Focus : ${result.focus ?? focus}`}
      className="pb-10"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => void downloadPdf()} disabled={pdfLoading}>
            {pdfLoading ?
              <Loader2 className="h-4 w-4 animate-spin" />
            : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResult(null)}>
            <RotateCcw className="h-4 w-4" />
            Nouveau
          </Button>
        </>
      }
    >
      <div className="space-y-5">
      {result.registry_notice && (
        <div className="bg-slate-100 border rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
          {result.registry_notice}
        </div>
      )}

      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-cyan-700 uppercase tracking-wide mb-1">Synthèse</p>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.synthese}</p>
      </div>

      {result.divergences_cles && result.divergences_cles.length > 0 && (
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Divergences clés (cahier)</p>
          {result.divergences_cles.map((d, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium">{d.theme}</span>
              {d.fiabilite && <span className="ml-2">{d.fiabilite}</span>}
              <p className="text-slate-600 text-xs mt-0.5">{d.resume}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-xl overflow-x-auto">
        <div
          className={cn(
            "grid bg-slate-800 text-white text-xs font-semibold min-w-[640px]",
            isPanorama ? "grid-cols-3" : "grid-cols-3",
          )}
        >
          <div className="px-4 py-3">Aspect</div>
          <div className="px-4 py-3 border-l border-slate-600">{isPanorama ? "État / code" : label1}</div>
          <div className="px-4 py-3 border-l border-slate-600">{isPanorama ? "Synthèse" : label2}</div>
        </div>
        <div className="divide-y min-w-[640px]">
          {result.tableau.map((row, i) => (
            <div key={i} className="grid grid-cols-3 hover:bg-slate-50 transition-colors">
              <div className="px-4 py-3">
                <p className="text-xs font-semibold text-slate-700">{row.aspect}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      DIVERGENCE_COLOR[row.divergence] || "bg-slate-100 text-slate-600",
                    )}
                  >
                    {row.divergence}
                  </span>
                  {row.fiabilite && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{row.fiabilite}</span>
                  )}
                </div>
                {row.commentaire && (
                  <p className="text-[10px] text-slate-500 mt-1 leading-tight">{row.commentaire}</p>
                )}
              </div>
              <div className="px-4 py-3 border-l text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {row.pays1}
              </div>
              <div className="px-4 py-3 border-l text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {row.pays2}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Points de convergence</p>
          <ul className="space-y-1">
            {result.points_convergence.map((p, i) => (
              <li key={i} className="text-xs text-slate-700">
                • {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Divergences majeures</p>
          {result.points_divergence.map((d, i) => (
            <div key={i} className="mb-2">
              <p className="text-xs font-medium text-slate-800">
                {d.point} {d.fiabilite}
              </p>
              <p className="text-[10px] text-slate-500">
                {d.avantage} — {d.explication}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Implications pratiques</p>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.implications_pratiques}</p>
      </div>

      {result.limitations && result.limitations.length > 0 && (
        <div className="text-xs text-slate-500 space-y-1">
          <strong>Limitations :</strong>
          <ul>
            {result.limitations.map((l, i) => (
              <li key={i}>• {l}</li>
            ))}
          </ul>
        </div>
      )}

      {result.sources.length > 0 && (
        <div className="text-xs text-slate-500">
          <strong>Sources :</strong> {result.sources.join(" · ")}
        </div>
      )}

      {result.disclaimer && <p className="text-xs text-slate-400 italic">{result.disclaimer}</p>}
      </div>
    </ToolPageShell>
  );
}
