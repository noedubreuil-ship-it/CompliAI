"use client";

import { useState, useMemo } from "react";
import { ExternalLink, Rss, Search, Globe, BookOpen, Scale, Shield, Database, TrendingUp, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LEGAL_SOURCES,
  getSourcesByCategory,
  CATEGORY_ORDER,
  type SourceCategory,
  type LegalSource,
} from "@/lib/data/legal-sources";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<SourceCategory, React.ElementType> = {
  "Institutions EU officielles": Shield,
  "Suivi AI Act": TrendingUp,
  "Autorités de protection des données": Lock,
  "Juridictions & droit": Scale,
  "Cabinets & académique": BookOpen,
  "Régulateurs sectoriels": Database,
  "Cybersécurité & numérique": Globe,
};

const CATEGORY_COLORS: Record<SourceCategory, string> = {
  "Institutions EU officielles": "bg-blue-50 text-blue-700 border-blue-200",
  "Suivi AI Act": "bg-purple-50 text-purple-700 border-purple-200",
  "Autorités de protection des données": "bg-red-50 text-red-700 border-red-200",
  "Juridictions & droit": "bg-amber-50 text-amber-700 border-amber-200",
  "Cabinets & académique": "bg-green-50 text-green-700 border-green-200",
  "Régulateurs sectoriels": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Cybersécurité & numérique": "bg-slate-50 text-slate-700 border-slate-200",
};

const TYPE_BADGE: Record<LegalSource["type"], string> = {
  officiel: "bg-blue-100 text-blue-800",
  tracker: "bg-purple-100 text-purple-800",
  académique: "bg-green-100 text-green-800",
  cabinet: "bg-amber-100 text-amber-800",
  régulateur: "bg-red-100 text-red-800",
  juridiction: "bg-orange-100 text-orange-800",
};

function SourceCard({ source }: { source: LegalSource }) {
  return (
    <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{source.name}</h3>
            {source.country && (
              <span className="text-xs text-slate-500">({source.country})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", TYPE_BADGE[source.type])}>
              {source.type}
            </span>
            {source.rssUrl && (
              <span className="flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full font-medium">
                <Rss className="h-2.5 w-2.5" /> RSS
              </span>
            )}
          </div>
        </div>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{source.description}</p>

      <div className="flex flex-wrap gap-1 mt-auto">
        {source.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
            {tag}
          </Badge>
        ))}
        {source.tags.length > 3 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-slate-400">
            +{source.tags.length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SourceCategory | "Toutes">("Toutes");

  const byCategory = useMemo(() => getSourcesByCategory(), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return LEGAL_SOURCES.filter((s) => {
      const matchCat = selectedCategory === "Toutes" || s.category === selectedCategory;
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [query, selectedCategory]);

  const rssCount = LEGAL_SOURCES.filter((s) => s.rssUrl).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sources de veille juridique</h1>
        <p className="text-muted-foreground mt-1">
          {LEGAL_SOURCES.length} sources officielles et spécialisées — dont {rssCount} avec flux RSS actif
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sources totales", value: LEGAL_SOURCES.length, color: "text-blue-600" },
          { label: "Avec flux RSS", value: rssCount, color: "text-orange-600" },
          { label: "Catégories", value: CATEGORY_ORDER.length, color: "text-purple-600" },
          { label: "Pays couverts", value: [...new Set(LEGAL_SOURCES.map((s) => s.country).filter(Boolean))].length, color: "text-green-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-xl p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une source, un tag, un pays..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory("Toutes")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors",
              selectedCategory === "Toutes"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            Toutes ({LEGAL_SOURCES.length})
          </button>
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors flex items-center gap-1.5",
                  selectedCategory === cat
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="h-3 w-3" />
                {byCategory[cat]?.length ?? 0}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p>Aucune source trouvée pour &quot;{query}&quot;</p>
        </div>
      ) : selectedCategory !== "Toutes" ? (
        <div>
          <div className={cn("flex items-center gap-2 p-3 rounded-lg border mb-4", CATEGORY_COLORS[selectedCategory as SourceCategory])}>
            {(() => { const Icon = CATEGORY_ICONS[selectedCategory as SourceCategory]; return <Icon className="h-4 w-4" />; })()}
            <span className="text-sm font-medium">{selectedCategory}</span>
            <span className="text-xs opacity-70">— {filtered.length} source{filtered.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {CATEGORY_ORDER.map((cat) => {
            const sources = query
              ? filtered.filter((s) => s.category === cat)
              : byCategory[cat] ?? [];
            if (sources.length === 0) return null;
            const Icon = CATEGORY_ICONS[cat];
            return (
              <div key={cat}>
                <div className={cn("flex items-center gap-2 p-3 rounded-lg border mb-4", CATEGORY_COLORS[cat])}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-xs opacity-70">— {sources.length} source{sources.length > 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sources.map((s) => <SourceCard key={s.id} source={s} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center pt-4">
        Ces sources alimentent le Consultant Juridique IA, la Veille réglementaire et le Journal juridique EU.
      </p>
    </div>
  );
}
