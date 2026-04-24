"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Newspaper, ExternalLink, Loader2, RefreshCw, Star, Filter,
  Scale, Gavel, BookOpen, Mic, Globe, Flag, X, ChevronDown,
} from "lucide-react";
import type { JournalArticle, ArticleCategory } from "@/app/api/journal/route";
import { EU_AUTHORITIES, getCountryFlag } from "@/lib/data/eu-authorities";

const CATEGORY_CONFIG: Record<ArticleCategory, { icon: React.ElementType; color: string; bg: string }> = {
  "Législation EU":                     { icon: BookOpen,  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  "Jurisprudence CJUE":                 { icon: Gavel,     color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  "Décision CNIL/DPA":                  { icon: Scale,     color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  "Discours & positions politiques":    { icon: Mic,       color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  "Soft law & lignes directrices":      { icon: Globe,     color: "text-teal-700",   bg: "bg-teal-50 border-teal-200" },
  "Droit national":                     { icon: Flag,      color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
};

const ALL_CATEGORIES: ArticleCategory[] = [
  "Législation EU", "Jurisprudence CJUE", "Décision CNIL/DPA",
  "Discours & positions politiques", "Soft law & lignes directrices", "Droit national",
];

const RELEVANCE_LABEL = (score: number) => {
  if (score >= 0.85) return { label: "Très pertinent", color: "text-green-700 bg-green-50 border-green-200" };
  if (score >= 0.6) return { label: "Pertinent", color: "text-blue-700 bg-blue-50 border-blue-200" };
  return null;
};

function ArticleCard({ article }: { article: JournalArticle & { relevanceScore?: number } }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[article.category] ?? CATEGORY_CONFIG["Législation EU"];
  const Icon = cat.icon;
  const rel = article.relevanceScore != null ? RELEVANCE_LABEL(article.relevanceScore) : null;
  const authority = article.authorityId ? EU_AUTHORITIES.find(a => a.id === article.authorityId) : null;

  return (
    <Card className={`hover:shadow-md transition-all ${article.isNew ? "border-blue-200" : ""}`}>
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg border flex-shrink-0 ${cat.bg}`}>
            <Icon className={`h-4 w-4 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cat.bg} ${cat.color}`}>
                {article.category}
              </span>
              {authority && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium flex items-center gap-1">
                  <span>{getCountryFlag(authority.countryCode)}</span>
                  {authority.name}
                </span>
              )}
              {article.isNew && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-slate-900 text-white border-slate-900">
                  Nouveau
                </span>
              )}
              {rel && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${rel.color}`}>
                  <Star className="h-2.5 w-2.5" /> {rel.label} pour vous
                </span>
              )}
            </div>
            <h3 className="font-semibold text-sm text-slate-900 leading-snug">{article.title}</h3>
          </div>
        </div>

        {/* Summary */}
        <div>
          <p className={`text-sm text-slate-600 leading-relaxed ${!expanded && "line-clamp-3"}`}>
            {article.summary}
          </p>
          {article.summary.length > 180 && (
            <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 hover:underline mt-1">
              {expanded ? "Réduire ▲" : "Lire plus ▼"}
            </button>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {article.tags.filter(t => t !== "Live").map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            <span className="font-medium text-slate-600">{article.source}</span>
            {" · "}{new Date(article.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors">
            Source officielle <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JournalPage() {
  const [articles, setArticles] = useState<(JournalArticle & { relevanceScore?: number })[]>([]);
  const [userProfile, setUserProfile] = useState<{ sectors: string[]; topRegulations: string[]; hasHighRiskSystems: boolean; usesGPAI: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | "">("");
  const [selectedAuthority, setSelectedAuthority] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState("");
  const [onlyRelevant, setOnlyRelevant] = useState(false);
  const [showAuthorityDropdown, setShowAuthorityDropdown] = useState(false);

  // Group authorities by type for the dropdown
  const euInstitutions = EU_AUTHORITIES.filter(a => a.type === "EU Institution" || a.type === "Court");
  const dpas = EU_AUTHORITIES.filter(a => a.type === "DPA").sort((a, b) => a.country.localeCompare(b.country));
  const otherBodies = EU_AUTHORITIES.filter(a => a.type === "Regulatory Body");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/journal");
      const data = await res.json();
      setArticles(data.articles ?? []);
      setUserProfile(data.userProfile ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    articles.forEach(a => a.tags.filter(t => t !== "Live").forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (selectedCategory && a.category !== selectedCategory) return false;
      if (selectedAuthority && a.authorityId !== selectedAuthority) return false;
      if (selectedTag && !a.tags.includes(selectedTag)) return false;
      if (onlyRelevant && (a.relevanceScore ?? 0) < 0.6) return false;
      return true;
    });
  }, [articles, selectedCategory, selectedAuthority, selectedTag, onlyRelevant]);

  const hasFilters = selectedCategory || selectedAuthority || selectedTag || onlyRelevant;

  const selectedAuthorityObj = selectedAuthority ? EU_AUTHORITIES.find(a => a.id === selectedAuthority) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-slate-700" />
            Journal du droit européen
          </h1>
          <p className="text-muted-foreground mt-1">
            Actualité juridique EU personnalisée — Législation, jurisprudence, décisions, discours
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* User profile banner */}
      {userProfile && (userProfile.sectors.length > 0 || userProfile.hasHighRiskSystems) && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Star className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Contenu personnalisé pour votre profil</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {userProfile.sectors.map(s => (
                  <span key={s} className="bg-white/10 px-2 py-0.5 rounded-full">{s}</span>
                ))}
                {userProfile.hasHighRiskSystems && (
                  <span className="bg-red-500/30 border border-red-400/30 px-2 py-0.5 rounded-full">Systèmes haut risque</span>
                )}
                {userProfile.usesGPAI && (
                  <span className="bg-blue-500/30 border border-blue-400/30 px-2 py-0.5 rounded-full">GPAI détecté</span>
                )}
              </div>
              {userProfile.topRegulations.length > 0 && (
                <p className="text-xs text-slate-300 mt-2">
                  Réglementations prioritaires : {userProfile.topRegulations.join(" · ")}
                </p>
              )}
            </div>
            <button onClick={() => setOnlyRelevant(!onlyRelevant)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${onlyRelevant ? "bg-amber-400 text-slate-900 border-amber-400 font-medium" : "border-white/30 hover:bg-white/10"}`}>
              <Star className="h-3 w-3 inline mr-1" />
              {onlyRelevant ? "Tout afficher" : "Pertinents uniquement"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory("")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!selectedCategory ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            Toutes ({articles.length})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = articles.filter(a => a.category === cat).length;
            if (count === 0) return null;
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${selectedCategory === cat ? `${cfg.bg} ${cfg.color} font-medium` : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                <Icon className="h-3 w-3" />{cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Authority filter */}
        <div className="flex items-center gap-2 flex-wrap relative">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Globe className="h-3 w-3" /> Autorité :
          </div>

          {/* Authority dropdown button */}
          <div className="relative">
            <button
              onClick={() => setShowAuthorityDropdown(v => !v)}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedAuthority
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300 font-medium"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {selectedAuthorityObj ? (
                <>{getCountryFlag(selectedAuthorityObj.countryCode)} {selectedAuthorityObj.name}</>
              ) : "Toutes les autorités"}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showAuthorityDropdown && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-10" onClick={() => setShowAuthorityDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
                  {/* All */}
                  <button
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 border-b ${!selectedAuthority ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                    onClick={() => { setSelectedAuthority(""); setShowAuthorityDropdown(false); }}
                  >
                    🌐 Toutes les autorités
                  </button>

                  {/* EU institutions */}
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b">
                    Institutions européennes
                  </div>
                  {euInstitutions.map(auth => (
                    <button key={auth.id}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 ${selectedAuthority === auth.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                      onClick={() => { setSelectedAuthority(auth.id); setShowAuthorityDropdown(false); }}
                    >
                      <span>{getCountryFlag(auth.countryCode)}</span>
                      <span className="font-medium">{auth.name}</span>
                      <span className="text-gray-400 text-xs ml-auto truncate">{auth.country}</span>
                    </button>
                  ))}

                  {/* National DPAs */}
                  <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-b">
                    DPA — Autorités nationales ({dpas.length} États)
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {dpas.map(auth => (
                      <button key={auth.id}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 ${selectedAuthority === auth.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                        onClick={() => { setSelectedAuthority(auth.id); setShowAuthorityDropdown(false); }}
                      >
                        <span>{getCountryFlag(auth.countryCode)}</span>
                        <span className="font-medium">{auth.name}</span>
                        <span className="text-gray-400 text-xs ml-auto">{auth.country}</span>
                      </button>
                    ))}
                  </div>

                  {/* Other bodies */}
                  {otherBodies.length > 0 && (
                    <>
                      <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-t border-b">
                        Autres organismes
                      </div>
                      {otherBodies.map(auth => (
                        <button key={auth.id}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 ${selectedAuthority === auth.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                          onClick={() => { setSelectedAuthority(auth.id); setShowAuthorityDropdown(false); }}
                        >
                          <span>{getCountryFlag(auth.countryCode)}</span>
                          <span className="font-medium">{auth.name}</span>
                          <span className="text-gray-400 text-xs ml-auto">{auth.country}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {selectedAuthority && (
            <button onClick={() => setSelectedAuthority("")}
              className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1">
              <X className="h-3 w-3" /> {selectedAuthorityObj?.name}
            </button>
          )}
        </div>

        {/* Tag search + reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Filter className="h-3 w-3" /> Tags :
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTags.slice(0, 16).map(tag => (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedTag === tag ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"}`}>
                {tag}
              </button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSelectedCategory(""); setSelectedAuthority(""); setSelectedTag(""); setOnlyRelevant(false); }}>
              <X className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">{filtered.length} article{filtered.length > 1 ? "s" : ""}{hasFilters ? " (filtré)" : ""}</p>

      {/* Articles */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
            <p className="text-sm text-muted-foreground">Chargement et personnalisation en cours…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun article trouvé</p>
          <p className="text-sm mt-1">Élargissez vos filtres</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(article => <ArticleCard key={article.id} article={article} />)}
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground border rounded-xl p-4 bg-slate-50 leading-relaxed">
        <strong className="text-slate-700">Sources :</strong> Journal Officiel de l&apos;UE (EUR-Lex), CJUE (CURIA), EDPB, EDPS, AI Office, et les autorités nationales de protection des données des 27 États membres (CNIL, DPC, Garante, BfDI, AEPD, AP, APD, IMY, DSB, UODO…).
        Les résumés sont rédigés par CompliAI à titre informatif. Consultez toujours les textes officiels originaux pour une information juridique complète.
        La pertinence est calculée automatiquement en fonction de vos projets, secteurs et données déclarés.
      </div>
    </div>
  );
}
