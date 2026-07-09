"use client";

import { ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DocumentWithStats,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  getDocumentId,
} from "./rag-types";

interface DocumentCardProps {
  doc: DocumentWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
}

function ProgressBar({ total, approved, rejected }: { total: number; approved: number; rejected: number }) {
  if (total === 0) return null;
  const approvedPct = Math.round((approved / total) * 100);
  const rejectedPct = Math.round((rejected / total) * 100);
  const pendingPct = 100 - approvedPct - rejectedPct;
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10">
      <div className="bg-green-500 transition-all" style={{ width: `${approvedPct}%` }} />
      <div className="bg-red-400 transition-all" style={{ width: `${rejectedPct}%` }} />
      <div className="bg-amber-300 dark:bg-amber-600 transition-all" style={{ width: `${pendingPct}%` }} />
    </div>
  );
}

export function DocumentCard({ doc, isSelected, onSelect, onApproveAll, onRejectAll }: DocumentCardProps) {
  const identifier = getDocumentId(doc);
  const typeLabel = DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type;
  const typeColor = DOC_TYPE_COLORS[doc.document_type] ?? DOC_TYPE_COLORS.other;
  const detectedDate = new Date(doc.detected_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });

  const allValidated = doc.total_chunks > 0 && doc.pending_chunks === 0;
  const hasRejected = doc.rejected_chunks > 0;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      className={cn(
        "w-full text-left px-3 py-3 rounded-lg border transition-all duration-150 group cursor-pointer",
        isSelected
          ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
          : "border-transparent hover:border-neutral-200 dark:hover:border-white/15 hover:bg-neutral-50 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", typeColor)}>
            {doc.document_type === "cjeu_judgment" && doc.ecli ? "ECLI" : null}
            {doc.document_type !== "cjeu_judgment" && doc.celex ? "CELEX" : null}
            {" "}{typeLabel}
          </span>

          {/* Title — traduit en français si disponible */}
          <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
            {doc.title_fr ?? doc.title ?? identifier}
          </p>
          {/* Titre original + badge langue si traduction disponible */}
          {doc.title_fr && doc.title && doc.title_fr !== doc.title && (
            <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500 line-clamp-1 italic">
              <span className="inline-block mr-1 rounded bg-neutral-100 dark:bg-white/10 px-1 py-px font-mono not-italic text-neutral-500 dark:text-neutral-400">
                {doc.language.toUpperCase()}
              </span>
              {doc.title}
            </p>
          )}

          {/* Identifier */}
          {doc.title && (
            <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono truncate">
              {identifier}
            </p>
          )}

          {/* Chunks stats */}
          <div className="mt-2">
            <ProgressBar
              total={doc.total_chunks}
              approved={doc.approved_chunks}
              rejected={doc.rejected_chunks}
            />
            <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" />
                {doc.pending_chunks} en attente
              </span>
              {doc.approved_chunks > 0 && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {doc.approved_chunks} validés
                </span>
              )}
              {doc.rejected_chunks > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-400" />
                  {doc.rejected_chunks} rejetés
                </span>
              )}
            </div>
          </div>

          {/* Detected date */}
          <p className="mt-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
            Détecté le {detectedDate}
          </p>

          {/* Bulk action buttons */}
          {doc.pending_chunks > 0 && (onApproveAll || onRejectAll) && (
            <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {onApproveAll && (
                <button
                  onClick={onApproveAll}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                  title={`Approuver les ${doc.pending_chunks} chunks en attente`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Tout approuver ({doc.pending_chunks})
                </button>
              )}
              {onRejectAll && (
                <button
                  onClick={onRejectAll}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                  title="Rejeter le document entier"
                >
                  <XCircle className="h-3 w-3" />
                  Rejeter tout
                </button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1 mt-0.5">
          {allValidated && (
            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-1.5 py-0.5">
              {hasRejected ? "Partiel" : "Complet"}
            </span>
          )}
          <ChevronRight className={cn("h-4 w-4 transition-colors", isSelected ? "text-blue-500" : "text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400")} />
        </div>
      </div>
    </div>
  );
}
