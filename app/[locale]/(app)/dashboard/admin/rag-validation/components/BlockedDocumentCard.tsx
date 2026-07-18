"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { BlockedDocument, BlockedReason } from "./rag-types";

/**
 * Libellé et couleur par famille d'échec.
 *
 * `document_non_juridique` est délibérément neutre et non alarmant : c'est le
 * tri qualité qui a fonctionné, pas une panne. Un communiqué de presse écarté
 * est un succès du pipeline, pas un incident.
 */
const REASON_META: Record<BlockedReason, { label: string; className: string }> = {
  acces_bloque: {
    label: "Accès bloqué",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  },
  document_non_juridique: {
    label: "Sans valeur juridique",
    className: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  },
  telechargement_impossible: {
    label: "Source injoignable",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  },
  trop_long: {
    label: "Document trop long",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  },
  parsing_invalide: {
    label: "Parsing invalide",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  },
  quota_api: {
    label: "Quota API",
    className: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  },
  autre: {
    label: "Non classé",
    className: "bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  },
};

export function BlockedDocumentCard({ doc }: { doc: BlockedDocument }) {
  const [expanded, setExpanded] = useState(false);
  const meta = REASON_META[doc.reason] ?? REASON_META.autre;

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-900 p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
        >
          {meta.label}
        </span>
        <a
          href={doc.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          title="Ouvrir la source"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-snug mb-1.5">
        {doc.title || doc.source_url}
      </p>

      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        {doc.hint}
      </p>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
        {expanded ? "Masquer" : "Message d'erreur complet"}
      </button>

      {expanded && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-neutral-50 dark:bg-black/30 p-2 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words">
          {doc.error_message ?? "(aucun message enregistré)"}
        </pre>
      )}
    </div>
  );
}
