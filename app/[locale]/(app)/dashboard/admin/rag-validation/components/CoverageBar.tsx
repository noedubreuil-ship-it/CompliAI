"use client";

import { Clock, FileText, Scale, BookOpen, Building2, RefreshCw } from "lucide-react";
import { ValidationStats, DOC_TYPE_LABELS } from "./rag-types";

interface CoverageBarProps {
  stats: ValidationStats | null;
  loading: boolean;
  onRefresh: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  eu_regulation: FileText,
  eu_directive: FileText,
  cjeu_judgment: Scale,
  edpb_guideline: BookOpen,
  edpb_recommendation: BookOpen,
  edpb_binding_decision: BookOpen,
  ai_office_guidance: BookOpen,
  national_decision: Building2,
};

export function CoverageBar({ stats, loading, onRefresh }: CoverageBarProps) {
  const lastValidation = stats?.last_validation
    ? new Date(stats.last_validation).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 px-5 py-4 animate-pulse">
        <div className="h-4 w-64 bg-neutral-200 dark:bg-white/10 rounded mb-2" />
        <div className="h-3 w-48 bg-neutral-200 dark:bg-white/10 rounded" />
      </div>
    );
  }

  if (!stats) return null;

  const hasData = stats.total_staged > 0;
  const typeEntries = Object.entries(stats.by_type).sort((a, b) => b[1].documents - a[1].documents);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {hasData ? (
            <>
              <p className="text-sm font-semibold text-neutral-900">
                {lastValidation ? (
                  <>Depuis votre dernière validation le {lastValidation}, </>
                ) : (
                  "Aucune validation précédente — "
                )}
                <span className="font-bold">
                  {stats.total_staged} document{stats.total_staged > 1 ? "s" : ""} en attente
                </span>
                {stats.total_pending_chunks > 0 && (
                  <> ({stats.total_pending_chunks} chunk{stats.total_pending_chunks > 1 ? "s" : ""} à réviser)</>
                )}
              </p>

              {typeEntries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {typeEntries.map(([type, counts]) => {
                    const Icon = TYPE_ICONS[type] ?? FileText;
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center gap-1.5 text-xs text-neutral-800"
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <strong>{counts.documents}</strong>{" "}
                        {DOC_TYPE_LABELS[type] ?? type}
                        {counts.documents > 1 ? "s" : ""}
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-neutral-900">
              ✓ Aucun document en attente de validation — la base est à jour.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastValidation && (
            <span className="flex items-center gap-1 text-xs text-neutral-700">
              <Clock className="h-3 w-3" />
              Dernière : {lastValidation}
            </span>
          )}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-neutral-700 hover:bg-amber-100 transition-colors"
            title="Rafraîchir les statistiques"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
