"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ArrowLeft,
  ListChecks,
  Loader2,
  Download,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Printer,
  ExternalLink,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ItemStatus = "not_started" | "in_progress" | "done" | "not_applicable";

const REGULATIONS = [
  "AI Act (UE 2024/1689)",
  "RGPD (UE 2016/679)",
  "DSA (UE 2022/2065)",
  "DMA (UE 2022/1925)",
  "NIS2 (UE 2022/2555)",
  "DORA (UE 2022/2554)",
  "Data Act (UE 2023/2854)",
  "Multi-textes UE — pilotage combiné",
];
const SECTORS = [
  "Finance / Assurance / Banque",
  "Santé / Médical / Pharmaceutique",
  "RH / Recrutement",
  "Éducation / Formation",
  "Justice / Droit / Audit",
  "Retail / E-commerce",
  "Tech / SaaS / IA",
  "Industrie / Manufacturing",
  "Service public / Administration",
  "Media / Contenu / Communication",
  "Autre (préciser ci-dessous)",
];
const SIZES = [
  "< 10 salariés",
  "10-49 salariés",
  "50-249 salariés",
  "250-999 salariés",
  "1000+ salariés",
];

/** Valeur sentinel pour les listes select natives (pas de chaîne vide). */
const SEL_NONE = "__none__";

const IA_ROLES = [
  { v: SEL_NONE, l: "Non précisé" },
  { v: "Fournisseur — développe et commercialise des systèmes IA", l: "Fournisseur" },
  { v: "Déployeur — utilise des systèmes IA tiers", l: "Déployeur" },
  { v: "Les deux — développe et déploie", l: "Les deux" },
  { v: "Fournisseur de modèle GPAI / fondation", l: "Fournisseur GPAI" },
];

const CLASSIFICATIONS = [
  { v: SEL_NONE, l: "Non précisé" },
  { v: "Pratiques interdites Art. 5 — à confirmer", l: "Pratiques interdites (à vérifier)" },
  { v: "Haut risque Annexe III", l: "Haut risque (Annexe III)" },
  { v: "Risque limité Art. 50", l: "Risque limité" },
  { v: "Risque minimal", l: "Risque minimal" },
  { v: "GPAI Art. 51-56", l: "GPAI" },
  { v: "Non encore évalué", l: "Non encore évalué" },
];

const PERSONAL_DATA = [
  { v: SEL_NONE, l: "Non précisé" },
  { v: "Oui — données ordinaires", l: "Oui — données ordinaires" },
  { v: "Oui — données sensibles Art. 9", l: "Oui — sensibles Art. 9" },
  { v: "Oui — mix ordinaires/sensibles (préciser contexte)", l: "Oui — mix" },
  { v: "Non / pas à ce stade", l: "Non" },
];

const MATURITY = [
  { v: SEL_NONE, l: "Non précisé" },
  { v: "Démarrage — aucune action", l: "Démarrage" },
  { v: "Diagnostic — identification systèmes", l: "Diagnostic" },
  { v: "En cours — actions partielles", l: "En cours" },
  { v: "Avancé — documentation partielle", l: "Avancé" },
  { v: "Pré-audit", l: "Pré-audit" },
];

const DEADLINE_FOCUS = [
  { v: SEL_NONE, l: "Non précisé" },
  { v: "2 fév. 2025 — pratiques interdites (déjà applicable)", l: "Art. 5 — fév. 2025" },
  { v: "2 août 2025 — GPAI / documentation (déjà applicable)", l: "GPAI — août 2025" },
  { v: "2 août 2026 — Haut risque (principal)", l: "Haut risque — août 2026" },
  { v: "Audit imminent (< 6 mois)", l: "Audit < 6 mois" },
  { v: "Due diligence / levée de fonds", l: "Due diligence" },
];

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  critique: { color: "bg-red-100 text-red-700 border-red-200", label: "Critique" },
  haute: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "Haute" },
  moyenne: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Moyenne" },
  faible: { color: "bg-green-100 text-green-700 border-green-200", label: "Faible" },
};

const URGENCY_CONFIG: Record<string, { label: string; shortcut: string }> = {
  already_applicable: { label: "Déjà applicable", shortcut: "urgent" },
  aug_2026_hr_window: { label: "Fenêtre haut risque 2026", shortcut: "2026" },
  within_6_months_audit: { label: "Audit < 6 mois", shortcut: "audit" },
  foundation_or_good_practice: { label: "Bonnes pratiques", shortcut: "later" },
};

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "not_started", label: "⬜ À faire" },
  { value: "in_progress", label: "🔄 En cours" },
  { value: "done", label: "✅ Terminé" },
  { value: "not_applicable", label: "⊘ N/A" },
];

const FILTER_STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label })),
];

const CHECKLIST_STORAGE_KEY = "compliai_checklist_state";

function toolHref(slug: string | null | undefined): string | null {
  if (!slug || slug === "null") return null;
  const map: Record<string, string> = {
    classifier: "/dashboard/tools/classifier",
    art11: "/dashboard/tools/art11",
    fria: "/dashboard/tools/fria",
    policy: "/dashboard/tools/policy",
    contracts: "/dashboard/tools/contracts",
    dpia: "/dashboard/tools/dpia",
    consultant: "/dashboard/chat",
  };
  return map[slug] ?? null;
}

function itemDeadline(item: { deadline?: string; deadline_label?: string; deadline_iso?: string }): string {
  return item.deadline || item.deadline_label || item.deadline_iso || "";
}

function itemArticle(item: { article?: string; legal_basis?: string }): string {
  return item.article || item.legal_basis || "";
}

function itemEvidence(item: { evidence?: string; validation?: string }): string {
  return item.evidence || item.validation || "";
}

function statusLabelFR(s: ItemStatus): string {
  const m = { not_started: "À faire", in_progress: "En cours", done: "Terminé", not_applicable: "N/A" };
  return m[s];
}

function migrateLocalState(parsed: {
  result?: unknown;
  itemStatuses?: Record<string, ItemStatus>;
  checked?: Record<string, boolean>;
  checklist_id?: string | null;
}): { result: Record<string, unknown>; itemStatuses: Record<string, ItemStatus> } | null {
  if (!parsed?.result || typeof parsed.result !== "object") return null;
  const result = parsed.result as Record<string, unknown>;
  const itemStatuses: Record<string, ItemStatus> = {};

  if (parsed.itemStatuses && typeof parsed.itemStatuses === "object") {
    Object.assign(itemStatuses, parsed.itemStatuses);
  } else if (parsed.checked && typeof parsed.checked === "object") {
    for (const [id, v] of Object.entries(parsed.checked)) {
      itemStatuses[id] = v ? "done" : "not_started";
    }
  }

  return { result, itemStatuses };
}

function collectAllItems(result: Record<string, unknown> | null): Record<string, unknown>[] {
  const cats = Array.isArray(result?.categories) ? result.categories : [];
  return cats.flatMap((c: unknown) =>
    typeof c === "object" && c !== null && Array.isArray((c as { items?: unknown }).items) ?
      (c as { items: Record<string, unknown>[] }).items
    : []
  );
}

function progressStats(allItems: { id?: string }[], itemStatuses: Record<string, ItemStatus>) {
  const relevant = allItems.filter(i => typeof i.id === "string" && (itemStatuses[i.id] ?? "not_started") !== "not_applicable");
  const done = relevant.filter(i => itemStatuses[i.id as string] === "done").length;
  const pct = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0;
  return { relevantCount: relevant.length, doneCount: done, pct };
}

interface ChecklistForm {
  regulation: string;
  company_size: string;
  sector: string;
  specific_context: string;
  organization_name: string;
  activity_sector_detail: string;
  ops_country: string;
  ia_role: string;
  system_types: string;
  ai_act_classification: string;
  personal_data: string;
  compliance_maturity: string;
  milestones_done: string;
  priority_deadline: string;
  compliance_resources: string;
}

const defaultForm = (): ChecklistForm => ({
  regulation: REGULATIONS[0],
  company_size: SIZES[2],
  sector: SECTORS[6],
  specific_context: "",
  organization_name: "",
  activity_sector_detail: "",
  ops_country: "France",
  ia_role: SEL_NONE,
  system_types: "",
  ai_act_classification: SEL_NONE,
  personal_data: SEL_NONE,
  compliance_maturity: SEL_NONE,
  milestones_done: "",
  priority_deadline: SEL_NONE,
  compliance_resources: "",
});

function formPayloadForApi(f: ChecklistForm): Record<string, string> {
  const clean = (s: string) => (s === SEL_NONE ? "" : s);
  return {
    regulation: f.regulation,
    company_size: f.company_size,
    sector: f.sector,
    specific_context: f.specific_context,
    organization_name: f.organization_name,
    activity_sector_detail: f.activity_sector_detail,
    ops_country: f.ops_country,
    ia_role: clean(f.ia_role),
    system_types: f.system_types,
    ai_act_classification: clean(f.ai_act_classification),
    personal_data: clean(f.personal_data),
    compliance_maturity: clean(f.compliance_maturity),
    milestones_done: f.milestones_done,
    priority_deadline: clean(f.priority_deadline),
    compliance_resources: f.compliance_resources,
  };
}

export default function ChecklistPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const [form, setForm] = useState<ChecklistForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterUrgency, setFilterUrgency] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = migrateLocalState(
      typeof window !== "undefined" ?
        (() => {
          try {
            const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as Parameters<typeof migrateLocalState>[0]) : {};
          } catch {
            return {};
          }
        })()
      : {}
    );

    if (saved) {
      setResult(saved.result);
      setItemStatuses(saved.itemStatuses);
      const cats = Array.isArray(saved.result.categories) ? saved.result.categories : [];
      const first =
        cats[0] && typeof cats[0] === "object" && cats[0] !== null ?
          String((cats[0] as { id?: unknown }).id ?? "")
        : "";
      if (first) setExpandedCat(first);
    }
  }, []);

  useEffect(() => {
    if (!result) return;
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ result, itemStatuses }));
    } catch {/* ignore */}
  }, [result, itemStatuses]);

  const set =
    <K extends keyof ChecklistForm>(k: K) =>
    (v: string) =>
      setForm(f => ({ ...f, [k]: v }));

  const allItems = useMemo(() => collectAllItems(result), [result]);

  const { relevantCount, doneCount, pct } = useMemo(
    () => progressStats(allItems, itemStatuses),
    [allItems, itemStatuses]
  );

  const criticalRemaining = useMemo(() => {
    return allItems.filter(i => {
      const id = typeof i.id === "string" ? i.id : "";
      const pr = typeof i.priority === "string" ? i.priority : "";
      const st = itemStatuses[id] ?? "not_started";
      return pr === "critique" && st !== "done" && st !== "not_applicable";
    }).length;
  }, [allItems, itemStatuses]);

  const categoryOptions = useMemo(() => {
    const cats = Array.isArray(result?.categories) ? result.categories : [];
    return cats
      .filter((c): c is { id?: string; name?: string } => typeof c === "object" && c !== null)
      .map(c => ({
        id: typeof c.id === "string" ? c.id : "",
        name: typeof c.name === "string" ? c.name : c.id ?? "Catégorie",
      }))
      .filter(c => c.id);
  }, [result]);

  const urgencyOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const i of allItems) {
      const u = typeof (i as { urgency_band?: string }).urgency_band === "string" ?
        (i as { urgency_band: string }).urgency_band
      : "";
      if (u) keys.add(u);
    }
    return [...keys].sort();
  }, [allItems]);

  const filteredCategories = useMemo(() => {
    if (!result || !Array.isArray(result.categories)) return [];
    const q = search.trim().toLowerCase();

    return result.categories
      .map((cat: unknown) => {
        if (typeof cat !== "object" || cat === null) return null;
        const c = cat as {
          id?: string;
          name?: string;
          article_ref?: string;
          items?: Record<string, unknown>[];
        };
        const catId = typeof c.id === "string" ? c.id : "";
        if (filterCategory !== "all" && catId !== filterCategory) return null;

        const items = (Array.isArray(c.items) ? c.items : []).filter(item => {
          const id = typeof item.id === "string" ? item.id : "";
          const st = itemStatuses[id] ?? "not_started";
          if (filterStatus !== "all" && st !== filterStatus) return false;

          const pr = typeof item.priority === "string" ? item.priority : "";
          if (filterPriority !== "all" && pr !== filterPriority) return false;

          const ub =
            typeof (item as { urgency_band?: string }).urgency_band === "string" ?
              (item as { urgency_band: string }).urgency_band
            : "";
          if (filterUrgency !== "all" && ub !== filterUrgency) return false;

          if (q) {
            const blob = [
              item.title,
              item.description,
              (item as { legal_basis?: string }).legal_basis,
              (item as { article?: string }).article,
              (item as { tool_link_label?: string }).tool_link_label,
            ]
              .map(x => String(x ?? ""))
              .join(" ")
              .toLowerCase();
            if (!blob.includes(q)) return false;
          }
          return true;
        });

        return { ...c, items };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null && (c.items?.length ?? 0) > 0);
  }, [result, filterStatus, filterPriority, filterUrgency, filterCategory, search, itemStatuses]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formPayloadForApi(form),
          project_id: projectId || undefined,
          locale,
        }),
      });
      const data = (await res.json()) as { error?: string; content?: Record<string, unknown>; doc_id?: string };
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      const content = data.content!;
      setResult(content);
      setItemStatuses({});
      setDocId(typeof data.doc_id === "string" ? data.doc_id : null);
      const cats = Array.isArray(content.categories) ? content.categories : [];
      const first =
        cats[0] && typeof cats[0] === "object" && cats[0] !== null ?
          String((cats[0] as { id?: unknown }).id ?? "")
        : "";
      setExpandedCat(first || null);

      resetFilters();

      try {
        localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ result: content, itemStatuses: {} }));
      } catch {/* ignore */}
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function exportPdf() {
    if (!result) return;
    const title = typeof result.title === "string" && result.title.trim() ? result.title.trim() : "Checklist conformité";
    const summary = typeof result.summary === "string" ? result.summary : "";
    const { relevantCount, doneCount, pct } = progressStats(allItems as any[], itemStatuses);

    const sections = [
      { heading: "Résumé", body: summary || "—" },
      { heading: "Progression", body: `${pct}% (${doneCount}/${relevantCount})` },
      {
        heading: "Items",
        body: (allItems as any[])
          .map((it) => {
            const id = typeof it.id === "string" ? it.id : "";
            const st = id ? (itemStatuses[id] ?? "not_started") : "not_started";
            const pr = typeof it.priority === "string" ? it.priority : "";
            return `- [${statusLabelFR(st)}] ${id} — ${String(it.title ?? "")}${pr ? ` (${pr})` : ""}`;
          })
          .join("\n"),
      },
    ];

    const res = await fetch("/api/generate/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle: docId ? `Document: ${docId}` : undefined,
        filename: "checklist-compliai",
        sections,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Erreur export PDF");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-compliai.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  const resetFilters = useCallback(() => {
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterUrgency("all");
    setFilterCategory("all");
    setSearch("");
  }, []);

  function setStatusForItem(id: string, s: ItemStatus) {
    setItemStatuses(prev => ({ ...prev, [id]: s }));
  }

  function downloadCsv() {
    if (!result) return;
    const headers = [
      "ID",
      "Catégorie",
      "Titre",
      "Base juridique",
      "Priorité",
      "Effort",
      "Échéance",
      "Preuve",
      "Outil slug",
      "Statut",
    ];
    const rows: string[][] = [];
    const cats = Array.isArray(result.categories) ? result.categories : [];
    cats.forEach((cat: unknown) => {
      if (typeof cat !== "object" || cat === null) return;
      const cid = typeof (cat as { id?: unknown }).id === "string" ? (cat as { id: string }).id : "";
      const cname =
        typeof (cat as { name?: unknown }).name === "string" ? (cat as { name: string }).name : cid;
      const items = Array.isArray((cat as { items?: unknown }).items) ? (cat as { items: unknown[] }).items : [];
      items.forEach((item: unknown) => {
        if (typeof item !== "object" || item === null || typeof (item as { id?: unknown }).id !== "string") return;
        const it = item as Record<string, unknown>;
        const id = it.id as string;
        const st = itemStatuses[id] ?? "not_started";
        rows.push([
          id,
          cname,
          String(it.title ?? ""),
          itemArticle(it),
          String(it.priority ?? ""),
          String(it.effort ?? ""),
          itemDeadline(it),
          itemEvidence(it),
          typeof it.tool_link_slug === "string" ? it.tool_link_slug : "",
          statusLabelFR(st),
        ]);
      });
    });

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checklist-${typeof result.checklist_id === "string" ? result.checklist_id.slice(0, 8) : "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!result) return;
    const payload = {
      checklist_id: result.checklist_id,
      exported_at: new Date().toISOString(),
      checklist: result,
      itemStatuses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checklist-${typeof result.checklist_id === "string" ? result.checklist_id.slice(0, 8) : "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copySharePayload() {
    if (!result) return;
    const payload = {
      checklist_id: result.checklist_id,
      itemStatuses,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    } catch {/* ignore */}
  }

  const exclusions = Array.isArray(result?.non_applicable_exclusions) ? result.non_applicable_exclusions : [];

  return (
    <div className="space-y-6 max-w-4xl checklist-print-root">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/dashboard/tools">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-emerald-600" /> Checklist de conformité interactive
          </h1>
          <p className="text-sm text-muted-foreground">
            Questionnaire intake · AI Act · RGPD · NIS2 · Sectoriel · Suivi et export
          </p>
        </div>
      </div>

      {!result ? (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base">Configuration — Checklist personnalisée</CardTitle>
            <p className="text-sm text-muted-foreground">
              Répondez précisément : la checklist sera filtrée au profil (pas d&apos;items hors champ artificiels).
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Section A — Organisation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="org_name">Nom organisation / dossier</Label>
                  <Input
                    id="org_name"
                    value={form.organization_name}
                    onChange={e => setForm(f => ({ ...f, organization_name: e.target.value }))}
                    placeholder="Facultatif"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Texte principal / focus réglementaire</Label>
                  <Select value={form.regulation} onChange={e => set("regulation")(e.target.value)}>
                    {REGULATIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Secteur d&apos;activité</Label>
                  <Select value={form.sector} onChange={e => set("sector")(e.target.value)}>
                    {SECTORS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="sector_detail">Précisions secteur (si « Autre »)</Label>
                  <Input
                    id="sector_detail"
                    value={form.activity_sector_detail}
                    onChange={e => setForm(f => ({ ...f, activity_sector_detail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taille</Label>
                  <Select value={form.company_size} onChange={e => set("company_size")(e.target.value)}>
                    {SIZES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">État membre UE principal</Label>
                  <Input
                    id="country"
                    value={form.ops_country}
                    onChange={e => setForm(f => ({ ...f, ops_country: e.target.value }))}
                    placeholder="ex. France"
                  />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Rôle vis-à-vis de l&apos;IA</Label>
                  <Select value={form.ia_role} onChange={e => set("ia_role")(e.target.value)}>
                    {IA_ROLES.map(o => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Section B — Systèmes IA</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systems">Types de systèmes (liste libre : chatbot, scoring, GPAI…)</Label>
                  <textarea
                    id="systems"
                    value={form.system_types}
                    onChange={e => setForm(f => ({ ...f, system_types: e.target.value }))}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Ex. Chatbot support, scoring crédit interne, recommandations produit…"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Classification AI Act (si connue)</Label>
                    <Select
                      value={form.ai_act_classification}
                      onChange={e => set("ai_act_classification")(e.target.value)}
                    >
                      {CLASSIFICATIONS.map(o => (
                        <option key={o.v} value={o.v}>{o.l}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Données personnelles ?</Label>
                    <Select value={form.personal_data} onChange={e => set("personal_data")(e.target.value)}>
                      {PERSONAL_DATA.map(o => (
                        <option key={o.v} value={o.v}>{o.l}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Section C — Avancement</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maturité conformité</Label>
                  <Select
                    value={form.compliance_maturity}
                    onChange={e => set("compliance_maturity")(e.target.value)}
                  >
                    {MATURITY.map(o => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="milestones">Déjà réalisé ? (inventaire, AIPD, Doc Art.11, Politique IA, Formation Art. 4, DPO…)</Label>
                <textarea
                  id="milestones"
                  value={form.milestones_done}
                  onChange={e => setForm(f => ({ ...f, milestones_done: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Section D — Échéances & ressources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Échéance prioritaire déclarée</Label>
                  <Select
                    value={form.priority_deadline}
                    onChange={e => set("priority_deadline")(e.target.value)}
                  >
                    {DEADLINE_FOCUS.map(o => (
                      <option key={o.v} value={o.v}>{o.l}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="resources">Ressources (compliance dédiée, DPO, budget conseil, tech…)</Label>
                <textarea
                  id="resources"
                  value={form.compliance_resources}
                  onChange={e => setForm(f => ({ ...f, compliance_resources: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ctx">Contexte narratif complémentaire</Label>
              <textarea
                id="ctx"
                value={form.specific_context}
                onChange={e => setForm(f => ({ ...f, specific_context: e.target.value }))}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Volumes, géographies, sous-traitants, incidents, contraintes audit…"
              />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
            <Button onClick={generate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />Génération…
                </>
              ) : (
                "Générer la checklist"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
            <div>
              <h2 className="text-lg font-bold">{typeof result.title === "string" ? result.title : "Checklist"}</h2>
              <p className="text-xs text-slate-500 font-mono">
                ID checklist : {typeof result.checklist_id === "string" ? result.checklist_id : "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setResult(null); setError(""); }}>
                Nouvelle checklist
              </Button>
              <Button size="sm" onClick={downloadCsv} className="bg-emerald-600 hover:bg-emerald-700">
                <Download className="h-4 w-4 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportJson}>
                JSON
              </Button>
              <Button variant="outline" size="sm" onClick={copySharePayload}>
                <ClipboardCopy className="h-4 w-4 mr-1" /> Copier états
              </Button>
              <Button variant="outline" size="sm" onClick={() => globalThis.window?.print()}>
                <Printer className="h-4 w-4 mr-1" /> PDF (impression)
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportPdf().catch((e) => setError(e instanceof Error ? e.message : String(e)))}>
                <Printer className="h-4 w-4 mr-1" /> PDF (export)
              </Button>
            </div>
          </div>

          {(typeof result.profile_summary === "string" || typeof result.applicable_frameworks === "string") && (
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Synthèse profil</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700 space-y-2">
                {typeof result.profile_summary === "string" && result.profile_summary ? (
                  <p>{result.profile_summary}</p>
                ) : null}
                {typeof result.applicable_frameworks === "string" && result.applicable_frameworks ?
                  <p className="text-xs text-slate-500">{result.applicable_frameworks}</p>
                : null}
                {typeof result.summary === "string" && result.summary ?
                  <p className="text-xs text-slate-600 italic">{result.summary}</p>
                : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">
                    Progression ({doneCount} / {relevantCount} items applicables)
                  </p>
                  <p className="text-xs text-slate-500">
                    Les items « N/A » sont exclus du dénominateur · restants critiques :{" "}
                    <strong>{criticalRemaining}</strong>
                  </p>
                </div>
                <p className="text-sm font-bold text-emerald-600">{pct}%</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {typeof result.estimated_total_effort === "string" && (
                <p className="text-xs text-slate-500 mt-2">
                  Effort global estimé : <strong>{result.estimated_total_effort}</strong>
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-1 print:hidden">
                Progression et statuts enregistrés automatiquement dans ce navigateur.
              </p>
            </CardContent>
          </Card>

          {exclusions.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-900">Zones non retenues (justification)</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {exclusions.map((ex: unknown, i: number) => {
                    if (typeof ex !== "object" || ex === null) return null;
                    const area = typeof (ex as { area?: string }).area === "string" ? (ex as { area: string }).area : "?";
                    const just =
                      typeof (ex as { justification?: string }).justification === "string" ?
                        (ex as { justification: string }).justification
                      : "";
                    return (
                      <li key={i} className="text-amber-950">
                        <strong>{area}</strong> — {just}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Filtres */}
          <Card className="print:hidden border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" /> Filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Recherche</Label>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Titre, base légale…" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Statut</Label>
                <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9">
                  {FILTER_STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priorité</Label>
                <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="h-9">
                  <option value="all">Toutes</option>
                  <option value="critique">Critique</option>
                  <option value="haute">Haute</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="faible">Faible</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bande d&apos;urgence (déjà applicable / 2026…)</Label>
                <Select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} className="h-9">
                  <option value="all">Toutes</option>
                  {urgencyOptions.map(u => (
                    <option key={u} value={u}>
                      {URGENCY_CONFIG[u]?.label ?? u}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Catégorie affichée</Label>
                <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-9">
                  <option value="all">Toutes</option>
                  {categoryOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={resetFilters}>
                  Réinitialiser filtres
                </Button>
              </div>
            </CardContent>
          </Card>

          {typeof result.quick_wins === "object" &&
            Array.isArray(result.quick_wins) &&
            result.quick_wins.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50 print:break-inside-avoid">
                <CardHeader>
                  <CardTitle className="text-sm text-emerald-800">Quick wins suggérées</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {result.quick_wins.map((w: unknown, i: number) =>
                      typeof w === "string" ? (
                        <li key={i} className="text-sm text-emerald-900 flex gap-2 items-start">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          {w}
                        </li>
                      ) : null
                    )}
                  </ul>
                </CardContent>
              </Card>
            )}

          {filteredCategories.map((cat: unknown) => {
            if (typeof cat !== "object" || cat === null) return null;
            const c = cat as { id?: string; name?: string; article_ref?: string; items?: Record<string, unknown>[] };
            const catId = typeof c.id === "string" ? c.id : "";
            const catItems = Array.isArray(c.items) ? c.items : [];
            const catProg = progressStats(catItems as { id?: string }[], itemStatuses);
            const isOpen = expandedCat === catId;

            return (
              <Card key={catId} className="print:break-inside-avoid">
                <CardHeader className="pb-2">
                  <button type="button" className="w-full text-left" onClick={() => setExpandedCat(isOpen ? null : catId)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                        <span className="text-xs text-slate-400 truncate">{c.article_ref}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-500">
                          {catProg.doneCount}/{catProg.relevantCount}
                        </span>
                        {isOpen ?
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{
                          width: catProg.relevantCount > 0 ? `${catProg.pct}%` : "0%",
                        }}
                      />
                    </div>
                  </button>
                </CardHeader>

                {isOpen && (
                  <CardContent className="space-y-3">
                    {catItems.map((item: Record<string, unknown>) => {
                      const id = typeof item.id === "string" ? item.id : "";
                      const st = itemStatuses[id] ?? "not_started";
                      const pc = PRIORITY_CONFIG[typeof item.priority === "string" ? item.priority : ""] ??
                        PRIORITY_CONFIG.faible;
                      const slug =
                        typeof item.tool_link_slug === "string" && item.tool_link_slug !== "null" ?
                          item.tool_link_slug
                        : null;
                      const href = toolHref(slug);
                      const tol =
                        typeof item.tool_link_label === "string" && item.tool_link_label.trim() ?
                          item.tool_link_label
                        : "Outil CompliAI";
                      const ub =
                        typeof item.urgency_band === "string" ? URGENCY_CONFIG[item.urgency_band] : undefined;

                      return (
                        <div
                          key={id}
                          className={`rounded-lg border p-3 transition-colors ${
                            st === "done" ? "bg-emerald-50 border-emerald-200"
                            : st === "not_applicable" ? "bg-slate-50 border-dashed opacity-75"
                            : "bg-white"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className={`text-sm font-medium ${
                                    st === "done" ? "line-through text-slate-400"
                                    : ""
                                  }`}
                                >
                                  {String(item.title ?? "")}
                                </p>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${pc.color}`}>
                                  {pc.label}
                                </span>
                                {item.canonical_ref ?
                                  <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                    {String(item.canonical_ref)}
                                  </span>
                                : null}
                                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                  {itemArticle(item)}
                                </span>
                                {ub ?
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200">
                                    {ub.label}
                                  </span>
                                : null}
                              </div>
                              {typeof item.description === "string" && item.description ?
                                <p className="text-xs text-slate-600">{item.description}</p>
                              : null}
                              {itemDeadline(item) ?
                                <p className="text-xs text-slate-500">⏱ {itemDeadline(item)}</p>
                              : null}
                              {itemEvidence(item) ?
                                <p className="text-xs text-slate-500">📋 {itemEvidence(item)}</p>
                              : null}
                              {typeof item.responsible === "string" && item.responsible ?
                                <p className="text-xs text-slate-500">👤 {item.responsible}</p>
                              : null}

                              <div className="flex flex-wrap gap-2 pt-1">
                                {href ?
                                  <Button variant="secondary" size="sm" className="h-7 text-xs" asChild>
                                    <Link href={href}>
                                      Utiliser {tol} → <ExternalLink className="inline h-3 w-3 ml-0.5 opacity-70" />
                                    </Link>
                                  </Button>
                                : null}
                              </div>
                            </div>

                            <div className="w-full sm:w-44 shrink-0 print:hidden space-y-1">
                              <Label className="text-xs">Statut</Label>
                              <Select
                                value={st}
                                onChange={e => setStatusForItem(id, e.target.value as ItemStatus)}
                                className="h-8 text-xs"
                              >
                                {STATUS_OPTIONS.map(o => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </Select>
                              {slug ?
                                <p className="text-[10px] text-muted-foreground">Slug : {slug}</p>
                              : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {filteredCategories.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">Aucun item ne correspond aux filtres.</p>
          )}

          {typeof result.priority_roadmap === "object" && Array.isArray(result.priority_roadmap) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Feuille de route suggérée</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.priority_roadmap.map((phase: unknown, i: number) =>
                    typeof phase === "string" ? (
                      <div key={i} className="flex gap-3 items-start text-sm">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                          {i + 1}
                        </span>
                        <p className="text-slate-700">{phase}</p>
                      </div>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
