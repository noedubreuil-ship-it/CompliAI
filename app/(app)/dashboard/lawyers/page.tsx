"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Scale, ExternalLink, Globe, Star, Sparkles, Search, X, MapPin, Languages,
} from "lucide-react";
import {
  LAW_FIRMS, ALL_COUNTRIES, ALL_SPECIALIZATIONS,
  type LawFirm, type Country, type Specialization,
} from "@/lib/data/law-firms";

const TIER_CONFIG = {
  top: { label: "Top cabinet", color: "bg-blue-100 text-blue-700 border-blue-200", border: "border-blue-200" },
  recommended: { label: "Recommandé", color: "bg-green-100 text-green-700 border-green-200", border: "border-green-200" },
  specialist: { label: "Spécialiste", color: "bg-purple-100 text-purple-700 border-purple-200", border: "border-purple-200" },
};

const SPEC_COLORS: Record<string, string> = {
  "AI Act": "bg-red-50 text-red-700 border-red-200",
  "RGPD / Data Protection": "bg-blue-50 text-blue-700 border-blue-200",
  "DSA / DMA": "bg-orange-50 text-orange-700 border-orange-200",
  "Droit des contrats IA": "bg-slate-100 text-slate-700 border-slate-200",
  "Propriété intellectuelle IA": "bg-violet-50 text-violet-700 border-violet-200",
  "Cybersécurité": "bg-amber-50 text-amber-700 border-amber-200",
  "Droit du travail numérique": "bg-teal-50 text-teal-700 border-teal-200",
  "Due diligence IA": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function FirmCard({ firm }: { firm: LawFirm }) {
  const tier = TIER_CONFIG[firm.tier];
  return (
    <Card className={`hover:shadow-md transition-all border ${firm.tier === "top" ? "border-blue-200" : ""}`}>
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">{firm.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tier.color}`}>
                {tier.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span>{firm.city ?? firm.countries.join(", ")}</span>
            </div>
          </div>
          <a
            href={firm.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            Site web
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed">{firm.description}</p>

        {/* Highlights */}
        <ul className="space-y-1">
          {firm.highlights.map((h, i) => (
            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
              <Star className="h-3 w-3 text-amber-400 flex-shrink-0 mt-0.5" />
              {h}
            </li>
          ))}
        </ul>

        {/* Specializations */}
        <div className="flex flex-wrap gap-1.5">
          {firm.specializations.map(spec => (
            <span key={spec} className={`text-xs px-2 py-0.5 rounded-full border ${SPEC_COLORS[spec] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
              {spec}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Languages className="h-3 w-3" />
            {firm.languages.join(" · ")}
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {firm.countries.slice(0, 4).map(c => (
              <span key={c} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c}</span>
            ))}
            {firm.countries.length > 4 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">+{firm.countries.length - 4}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LawyersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | "">("");
  const [selectedSpec, setSelectedSpec] = useState<Specialization | "">("");

  const filtered = useMemo(() => {
    return LAW_FIRMS.filter(firm => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        firm.name.toLowerCase().includes(q) ||
        firm.description.toLowerCase().includes(q) ||
        firm.specializations.some(s => s.toLowerCase().includes(q)) ||
        firm.city?.toLowerCase().includes(q);
      const matchesCountry = !selectedCountry || firm.countries.includes(selectedCountry as Country);
      const matchesSpec = !selectedSpec || firm.specializations.includes(selectedSpec as Specialization);
      return matchesSearch && matchesCountry && matchesSpec;
    }).sort((a, b) => {
      const order = { top: 0, recommended: 1, specialist: 2 };
      return order[a.tier] - order[b.tier];
    });
  }, [searchQuery, selectedCountry, selectedSpec]);

  const hasFilters = searchQuery || selectedCountry || selectedSpec;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-slate-700" />
            Avocats spécialisés IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Cabinets européens sélectionnés pour leur expertise en AI Act, RGPD et droit du numérique
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{filtered.length} cabinet{filtered.length > 1 ? "s" : ""}</span>
      </div>

      {/* AI recommendation banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong className="text-slate-900">Conseil personnalisé</strong>
          {" "}— Pour trouver le cabinet idéal selon votre problématique spécifique, posez la question à votre{" "}
          <a href="/dashboard/chat" className="text-blue-600 underline hover:text-blue-800">
            Consultant juridique IA
          </a>
          . Il identifiera les enjeux clés de votre situation et recommandera les spécialisations à rechercher.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un cabinet, une ville, une spécialité…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Country filter */}
        <select
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value as Country | "")}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tous les pays</option>
          {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Specialization filter */}
        <select
          value={selectedSpec}
          onChange={e => setSelectedSpec(e.target.value as Specialization | "")}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Toutes les spécialités</option>
          {ALL_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedCountry(""); setSelectedSpec(""); }}>
            <X className="h-4 w-4" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* Specialization quick filters */}
      <div className="flex flex-wrap gap-2">
        {ALL_SPECIALIZATIONS.map(spec => (
          <button
            key={spec}
            onClick={() => setSelectedSpec(selectedSpec === spec ? "" : spec as Specialization)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              selectedSpec === spec
                ? SPEC_COLORS[spec] + " font-medium"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {spec}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Scale className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aucun cabinet trouvé</p>
          <p className="text-sm mt-1">Essayez d'élargir vos critères de recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(firm => <FirmCard key={firm.id} firm={firm} />)}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-slate-50 border rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-700">Avertissement :</strong> Cette liste est fournie à titre informatif uniquement.
        CompliAI ne perçoit aucune rémunération de ces cabinets et ne peut garantir l&apos;exactitude des informations affichées.
        Les classements (Legal 500, Chambers) sont cités à titre indicatif. Vérifiez toujours les qualifications, honoraires
        et disponibilités directement auprès des cabinets. Cette liste ne constitue pas une recommandation juridique.
      </div>
    </div>
  );
}
